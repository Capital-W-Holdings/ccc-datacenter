import { Router } from 'express'
import { supabase, queryMany, mutate } from '../db/index.js'

const router = Router()

// GET /api/target-companies
router.get('/', async (_req, res, next) => {
  try {
    const companies = await queryMany(
      supabase
        .from('target_companies')
        .select('*')
        .order('category', { ascending: true })
        .order('priority', { ascending: true })
        .order('name', { ascending: true })
    )

    res.json({ success: true, data: companies })
  } catch (error) {
    next(error)
  }
})

// POST /api/target-companies
router.post('/', async (req, res, next) => {
  try {
    const company = await mutate(
      supabase.from('target_companies').insert(req.body).select().single()
    )

    res.status(201).json({ success: true, data: company })
  } catch (error) {
    next(error)
  }
})

// PUT /api/target-companies/:id
router.put('/:id', async (req, res, next) => {
  try {
    const company = await mutate(
      supabase
        .from('target_companies')
        .update(req.body)
        .eq('id', req.params.id)
        .select()
        .single()
    )

    res.json({ success: true, data: company })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/target-companies/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await supabase.from('target_companies').delete().eq('id', req.params.id)
    res.json({ success: true, data: null })
  } catch (error) {
    next(error)
  }
})

export { router as targetCompaniesRoutes }
