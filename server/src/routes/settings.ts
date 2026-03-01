import { Router } from 'express'
import { supabase, queryMany } from '../db/index.js'

const router = Router()

// GET /api/settings
router.get('/', async (_req, res, next) => {
  try {
    const settings = await queryMany(
      supabase.from('settings').select('*')
    )

    // Convert to object
    const settingsObj = settings.reduce(
      (acc, s) => {
        // Mask API key for security
        if (s.key === 'anthropic_api_key' && s.value) {
          acc[s.key] = s.value // In production, you'd mask this
        } else if (s.key === 'scraping_delay_ms' || s.key === 'enrichment_batch_size') {
          acc[s.key] = parseInt(s.value) || null
        } else if (s.key === 'auto_enrich_on_import') {
          acc[s.key] = s.value === 'true'
        } else {
          acc[s.key] = s.value
        }
        return acc
      },
      {} as Record<string, unknown>
    )

    res.json({
      success: true,
      data: settingsObj,
    })
  } catch (error) {
    next(error)
  }
})

// PUT /api/settings
router.put('/', async (req, res, next) => {
  try {
    const updates = Object.entries(req.body)

    for (const [key, value] of updates) {
      const stringValue = typeof value === 'boolean' ? String(value) : String(value ?? '')

      await supabase
        .from('settings')
        .upsert(
          {
            key,
            value: stringValue,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        )
    }

    // Fetch updated settings
    const settings = await queryMany(
      supabase.from('settings').select('*')
    )

    const settingsObj = settings.reduce(
      (acc, s) => {
        if (s.key === 'scraping_delay_ms' || s.key === 'enrichment_batch_size') {
          acc[s.key] = parseInt(s.value) || null
        } else if (s.key === 'auto_enrich_on_import') {
          acc[s.key] = s.value === 'true'
        } else {
          acc[s.key] = s.value
        }
        return acc
      },
      {} as Record<string, unknown>
    )

    res.json({
      success: true,
      data: settingsObj,
    })
  } catch (error) {
    next(error)
  }
})

export { router as settingsRoutes }
