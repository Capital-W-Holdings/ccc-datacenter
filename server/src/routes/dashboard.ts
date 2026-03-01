import { Router } from 'express'
import { supabase, queryMany } from '../db/index.js'

const router = Router()

// GET /api/dashboard/stats
router.get('/stats', async (_req, res, next) => {
  try {
    // Get total prospects
    const { count: totalProspects, error: totalError } = await supabase
      .from('prospects')
      .select('*', { count: 'exact', head: true })
    if (totalError) throw totalError

    // Get prospects by status
    const { data: statusData, error: statusError } = await supabase
      .from('prospects')
      .select('status')
    if (statusError) throw statusError

    const byStatus = (statusData || []).reduce(
      (acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Get prospects by target role
    const { data: roleData, error: roleError } = await supabase
      .from('prospects')
      .select('target_roles')
    if (roleError) throw roleError

    let attendees = 0
    let sponsors = 0
    let speakers = 0
    ;(roleData || []).forEach((p) => {
      const roles = p.target_roles as string[]
      if (roles?.includes('Attendee')) attendees++
      if (roles?.includes('Sponsor')) sponsors++
      if (roles?.includes('Speaker')) speakers++
    })

    // Get prospects by vertical
    const { data: verticalData, error: verticalError } = await supabase
      .from('prospects')
      .select('ccc_verticals')
    if (verticalError) throw verticalError

    const byVertical = {
      development: 0,
      investment: 0,
      brokerage: 0,
      management: 0,
      construction: 0,
    }
    ;(verticalData || []).forEach((p) => {
      const verticals = p.ccc_verticals as string[]
      if (verticals?.includes('Development')) byVertical.development++
      if (verticals?.includes('Investment')) byVertical.investment++
      if (verticals?.includes('Brokerage')) byVertical.brokerage++
      if (verticals?.includes('Management')) byVertical.management++
      if (verticals?.includes('Construction')) byVertical.construction++
    })

    // Get pipeline counts
    const { count: enriched, error: enrichedError } = await supabase
      .from('prospects')
      .select('*', { count: 'exact', head: true })
      .gt('relevance_score', 0)
    if (enrichedError) throw enrichedError

    const { count: categorized, error: categorizedError } = await supabase
      .from('prospects')
      .select('*', { count: 'exact', head: true })
      .not('company_type', 'is', null)
    if (categorizedError) throw categorizedError

    const { count: qualified, error: qualifiedError } = await supabase
      .from('prospects')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Qualified')
    if (qualifiedError) throw qualifiedError

    const { count: outreachReady, error: outreachError } = await supabase
      .from('prospects')
      .select('*', { count: 'exact', head: true })
      .in('status', ['Contacted', 'Engaged'])
    if (outreachError) throw outreachError

    // Get active sources
    const { count: sourcesActive, error: sourcesError } = await supabase
      .from('scrapers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
    if (sourcesError) throw sourcesError

    // Get enrichment queue count
    const { count: enrichmentQueue, error: queueError } = await supabase
      .from('prospects')
      .select('*', { count: 'exact', head: true })
      .eq('relevance_score', 0)
    if (queueError) throw queueError

    res.json({
      success: true,
      data: {
        total_prospects: totalProspects || 0,
        by_target_role: {
          attendees,
          sponsors,
          speakers,
        },
        by_vertical: byVertical,
        by_status: byStatus,
        pipeline: {
          scraped: totalProspects || 0,
          enriched: enriched || 0,
          categorized: categorized || 0,
          qualified: qualified || 0,
          outreach_ready: outreachReady || 0,
        },
        sources_active: sourcesActive || 0,
        enrichment_queue: enrichmentQueue || 0,
        export_ready: qualified || 0,
      },
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/dashboard/activity
router.get('/activity', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50

    const activity = await queryMany(
      supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
    )

    res.json({
      success: true,
      data: activity,
    })
  } catch (error) {
    next(error)
  }
})

export { router as dashboardRoutes }
