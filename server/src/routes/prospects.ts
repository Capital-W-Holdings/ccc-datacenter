import { Router } from 'express'
import { supabase, queryOne, mutate } from '../db/index.js'
import { validateBody, validateParams, validateQuery } from '../middleware/validateInput.js'
import {
  createProspectSchema,
  updateProspectSchema,
  listProspectsQuerySchema,
  bulkStatusSchema,
  bulkDeleteSchema,
  uuidParamSchema,
} from '../validators/prospect.validator.js'

const router = Router()

// Whitelist of allowed sort columns to prevent SQL injection
const ALLOWED_SORT_COLUMNS = [
  'full_name',
  'first_name',
  'last_name',
  'company',
  'title',
  'status',
  'relevance_score',
  'email',
  'location_city',
  'location_state',
  'created_at',
  'updated_at',
]

// GET /api/prospects
router.get('/', validateQuery(listProspectsQuerySchema), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const perPage = parseInt(req.query.per_page as string) || 50
    const requestedSort = req.query.sort_by as string
    const sortBy = ALLOWED_SORT_COLUMNS.includes(requestedSort) ? requestedSort : 'updated_at'
    const sortDir = (req.query.sort_dir as string) === 'asc' ? true : false
    const filtersJson = req.query.filters as string

    let query = supabase.from('prospects').select('*', { count: 'exact' })

    // Apply filters
    if (filtersJson) {
      let filters
      try {
        filters = JSON.parse(filtersJson)
      } catch {
        return res.status(400).json({ success: false, error: 'Invalid filters JSON' })
      }

      if (filters.search) {
        query = query.or(
          `full_name.ilike.%${filters.search}%,company.ilike.%${filters.search}%,title.ilike.%${filters.search}%`
        )
      }

      if (filters.statuses?.length > 0) {
        query = query.in('status', filters.statuses)
      }

      if (filters.company_types?.length > 0) {
        query = query.in('company_type', filters.company_types)
      }

      if (filters.score_min !== undefined && filters.score_min > 0) {
        query = query.gte('relevance_score', filters.score_min)
      }

      if (filters.score_max !== undefined && filters.score_max < 100) {
        query = query.lte('relevance_score', filters.score_max)
      }

      // Filter by verticals (check if any vertical matches)
      if (filters.verticals?.length > 0) {
        const verticalConditions = filters.verticals
          .map((v: string) => `ccc_verticals.cs.["${v}"]`)
          .join(',')
        query = query.or(verticalConditions)
      }

      // Filter by target roles (check if any role matches)
      if (filters.target_roles?.length > 0) {
        const roleConditions = filters.target_roles
          .map((r: string) => `target_roles.cs.["${r}"]`)
          .join(',')
        query = query.or(roleConditions)
      }
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortDir })

    // Apply pagination
    const from = (page - 1) * perPage
    const to = from + perPage - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) throw error

    res.json({
      data: data || [],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/prospects/:id
router.get('/:id', validateParams(uuidParamSchema), async (req, res, next) => {
  try {
    const prospect = await queryOne(
      supabase.from('prospects').select('*').eq('id', req.params.id).single()
    )

    if (!prospect) {
      return res.status(404).json({ success: false, error: 'Prospect not found' })
    }

    res.json({ success: true, data: prospect })
  } catch (error) {
    next(error)
  }
})

// POST /api/prospects
router.post('/', validateBody(createProspectSchema), async (req, res, next) => {
  try {
    const prospect = await mutate<{ full_name: string }>(
      supabase.from('prospects').insert(req.body).select().single()
    )

    // Log activity
    await supabase.from('activity_log').insert({
      action: 'prospect_added',
      details: { count: 1, name: prospect.full_name },
    })

    res.status(201).json({ success: true, data: prospect })
  } catch (error) {
    next(error)
  }
})

// PUT /api/prospects/:id
router.put('/:id', validateParams(uuidParamSchema), validateBody(updateProspectSchema), async (req, res, next) => {
  try {
    const oldProspect = await queryOne<{ status: string }>(
      supabase.from('prospects').select('status').eq('id', req.params.id).single()
    )

    const prospect = await mutate(
      supabase
        .from('prospects')
        .update(req.body)
        .eq('id', req.params.id)
        .select()
        .single()
    )

    // Log status change
    if (oldProspect && req.body.status && oldProspect.status !== req.body.status) {
      await supabase.from('activity_log').insert({
        action: 'status_change',
        details: {
          count: 1,
          old_status: oldProspect.status,
          new_status: req.body.status,
        },
      })
    }

    res.json({ success: true, data: prospect })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/prospects/:id
router.delete('/:id', validateParams(uuidParamSchema), async (req, res, next) => {
  try {
    const { error } = await supabase.from('prospects').delete().eq('id', req.params.id)

    if (error) throw error

    // Log activity
    await supabase.from('activity_log').insert({
      action: 'prospect_deleted',
      details: { id: req.params.id },
    })

    res.json({ success: true, data: null })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/prospects/:id/status - Update just the status
router.patch('/:id/status', validateParams(uuidParamSchema), async (req, res, next) => {
  try {
    const { status } = req.body

    if (!status || typeof status !== 'string') {
      return res.status(400).json({ success: false, error: 'Status is required' })
    }

    const validStatuses = ['New', 'Qualified', 'Contacted', 'Engaged', 'Nurturing', 'Archived']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' })
    }

    const { data, error } = await supabase
      .from('prospects')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error

    // Log activity
    await supabase.from('activity_log').insert({
      action: 'status_change',
      details: { count: 1, new_status: status },
    })

    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
})

// POST /api/prospects/bulk-status
router.post('/bulk-status', validateBody(bulkStatusSchema), async (req, res, next) => {
  try {
    const { ids, status } = req.body

    const { error } = await supabase
      .from('prospects')
      .update({ status })
      .in('id', ids)

    if (error) throw error

    // Log activity
    await supabase.from('activity_log').insert({
      action: 'status_change',
      details: { count: ids.length, new_status: status },
    })

    res.json({ success: true, data: { updated: ids.length } })
  } catch (error) {
    next(error)
  }
})

// POST /api/prospects/bulk-delete
router.post('/bulk-delete', validateBody(bulkDeleteSchema), async (req, res, next) => {
  try {
    const { ids } = req.body

    const { error } = await supabase.from('prospects').delete().in('id', ids)

    if (error) throw error

    res.json({ success: true, data: { deleted: ids.length } })
  } catch (error) {
    next(error)
  }
})

export { router as prospectsRoutes }
