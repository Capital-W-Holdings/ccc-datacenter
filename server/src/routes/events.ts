import { Router } from 'express'
import { supabase, queryOne, mutate } from '../db/index.js'

const router = Router()

// Event status types
type EventStatus = 'upcoming' | 'active' | 'completed' | 'cancelled'
type ProspectEventStatus = 'Identified' | 'Invited' | 'Registered' | 'Confirmed' | 'Attended' | 'No Show' | 'Declined'

// GET /api/events - List all events
router.get('/', async (req, res, next) => {
  try {
    const status = req.query.status as EventStatus | undefined

    let query = supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    // Get prospect counts for each event
    const eventsWithCounts = await Promise.all(
      (data || []).map(async (event) => {
        const { count: prospectCount } = await supabase
          .from('prospect_events')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)

        const { count: registeredCount } = await supabase
          .from('prospect_events')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .in('status', ['Registered', 'Confirmed', 'Attended'])

        const { count: confirmedCount } = await supabase
          .from('prospect_events')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .in('status', ['Confirmed', 'Attended'])

        return {
          ...event,
          prospect_count: prospectCount || 0,
          registered_count: registeredCount || 0,
          confirmed_count: confirmedCount || 0,
        }
      })
    )

    res.json({ success: true, data: eventsWithCounts })
  } catch (error) {
    next(error)
  }
})

// GET /api/events/:id - Get single event
router.get('/:id', async (req, res, next) => {
  try {
    const event = await queryOne(
      supabase.from('events').select('*').eq('id', req.params.id).single()
    )

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' })
    }

    res.json({ success: true, data: event })
  } catch (error) {
    next(error)
  }
})

// POST /api/events - Create event
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      slug,
      location_city,
      location_state,
      venue,
      date,
      end_date,
      description,
      status,
      expected_attendees,
      website_url,
    } = req.body

    if (!name || !location_city || !location_state || !date) {
      return res.status(400).json({
        success: false,
        error: 'Name, location_city, location_state, and date are required',
      })
    }

    const event = await mutate(
      supabase
        .from('events')
        .insert({
          name,
          slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          location_city,
          location_state,
          venue,
          date,
          end_date,
          description,
          status: status || 'upcoming',
          expected_attendees,
          website_url,
        })
        .select()
        .single()
    )

    res.status(201).json({ success: true, data: event })
  } catch (error) {
    next(error)
  }
})

// PUT /api/events/:id - Update event
router.put('/:id', async (req, res, next) => {
  try {
    const event = await mutate(
      supabase
        .from('events')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select()
        .single()
    )

    res.json({ success: true, data: event })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/events/:id - Delete event
router.delete('/:id', async (req, res, next) => {
  try {
    // First delete all prospect_events (cascade)
    const { error: cascadeError } = await supabase
      .from('prospect_events')
      .delete()
      .eq('event_id', req.params.id)

    if (cascadeError) throw cascadeError

    // Then delete the event
    const { error } = await supabase.from('events').delete().eq('id', req.params.id)

    if (error) throw error

    res.json({ success: true, data: null })
  } catch (error) {
    next(error)
  }
})

// GET /api/events/:id/prospects - Get prospects for an event
router.get('/:id/prospects', async (req, res, next) => {
  try {
    const status = req.query.status as ProspectEventStatus | undefined

    let query = supabase
      .from('prospect_events')
      .select(`
        *,
        prospect:prospects(*)
      `)
      .eq('event_id', req.params.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    res.json({ success: true, data: data || [] })
  } catch (error) {
    next(error)
  }
})

// POST /api/events/:id/prospects - Add prospect to event
router.post('/:id/prospects', async (req, res, next) => {
  try {
    const { prospect_id, target_role, status, notes } = req.body

    if (!prospect_id || !target_role) {
      return res.status(400).json({
        success: false,
        error: 'prospect_id and target_role are required',
      })
    }

    // Check if already exists
    const existing = await queryOne(
      supabase
        .from('prospect_events')
        .select('id')
        .eq('event_id', req.params.id)
        .eq('prospect_id', prospect_id)
        .single()
    )

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Prospect already added to this event',
      })
    }

    const prospectEvent = await mutate(
      supabase
        .from('prospect_events')
        .insert({
          event_id: req.params.id,
          prospect_id,
          target_role,
          status: status || 'Identified',
          notes,
        })
        .select(`
          *,
          prospect:prospects(*)
        `)
        .single()
    )

    res.status(201).json({ success: true, data: prospectEvent })
  } catch (error) {
    next(error)
  }
})

// POST /api/events/:id/prospects/bulk - Bulk add prospects
router.post('/:id/prospects/bulk', async (req, res, next) => {
  try {
    const { prospect_ids, target_role, status } = req.body

    if (!prospect_ids?.length || !target_role) {
      return res.status(400).json({
        success: false,
        error: 'prospect_ids array and target_role are required',
      })
    }

    // Get existing prospect IDs for this event
    const { data: existing } = await supabase
      .from('prospect_events')
      .select('prospect_id')
      .eq('event_id', req.params.id)
      .in('prospect_id', prospect_ids)

    const existingIds = new Set((existing || []).map((e) => e.prospect_id))
    const newIds = prospect_ids.filter((id: string) => !existingIds.has(id))

    if (newIds.length === 0) {
      return res.json({ success: true, data: { added: 0 } })
    }

    const toInsert = newIds.map((prospect_id: string) => ({
      event_id: req.params.id,
      prospect_id,
      target_role,
      status: status || 'Identified',
    }))

    const { error } = await supabase.from('prospect_events').insert(toInsert)

    if (error) throw error

    res.json({ success: true, data: { added: newIds.length } })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/events/:eventId/prospects/:prospectEventId - Update prospect status
router.patch('/:eventId/prospects/:prospectEventId', async (req, res, next) => {
  try {
    const { status } = req.body

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' })
    }

    const validStatuses: ProspectEventStatus[] = [
      'Identified',
      'Invited',
      'Registered',
      'Confirmed',
      'Attended',
      'No Show',
      'Declined',
    ]

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' })
    }

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    // Set timestamp fields based on status
    if (status === 'Invited') {
      updateData.invited_at = new Date().toISOString()
    } else if (status === 'Registered') {
      updateData.registered_at = new Date().toISOString()
    } else if (status === 'Confirmed') {
      updateData.confirmed_at = new Date().toISOString()
    }

    const prospectEvent = await mutate(
      supabase
        .from('prospect_events')
        .update(updateData)
        .eq('id', req.params.prospectEventId)
        .eq('event_id', req.params.eventId)
        .select(`
          *,
          prospect:prospects(*)
        `)
        .single()
    )

    res.json({ success: true, data: prospectEvent })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/events/:eventId/prospects/:prospectEventId - Remove prospect from event
router.delete('/:eventId/prospects/:prospectEventId', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('prospect_events')
      .delete()
      .eq('id', req.params.prospectEventId)
      .eq('event_id', req.params.eventId)

    if (error) throw error

    res.json({ success: true, data: null })
  } catch (error) {
    next(error)
  }
})

// GET /api/events/:id/stats - Get event stats
router.get('/:id/stats', async (req, res, next) => {
  try {
    const { data: allProspects, error } = await supabase
      .from('prospect_events')
      .select('status, target_role')
      .eq('event_id', req.params.id)

    if (error) throw error

    const prospects = allProspects || []

    // Count by status
    const byStatus: Record<string, number> = {}
    const byRole: Record<string, number> = {}

    prospects.forEach((p) => {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1
      byRole[p.target_role] = (byRole[p.target_role] || 0) + 1
    })

    res.json({
      success: true,
      data: {
        total: prospects.length,
        by_status: byStatus,
        by_role: byRole,
      },
    })
  } catch (error) {
    next(error)
  }
})

// ==============================
// Prospect-side event routes
// ==============================

// GET /api/prospects/:id/events - Get events for a prospect
router.get('/prospect/:prospectId/events', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('prospect_events')
      .select(`
        *,
        event:events(*)
      `)
      .eq('prospect_id', req.params.prospectId)
      .order('created_at', { ascending: false })

    if (error) throw error

    res.json({ success: true, data: data || [] })
  } catch (error) {
    next(error)
  }
})

export { router as eventsRoutes }
