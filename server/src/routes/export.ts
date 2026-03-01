import { Router } from 'express'
import { supabase, queryMany, mutate } from '../db/index.js'
import ExcelJS from 'exceljs'
import { v4 as uuidv4 } from 'uuid'
import { validateBody } from '../middleware/validateInput.js'
import { createExportSchema } from '../validators/export.validator.js'
import { createLogger } from '../utils/logger.js'

const router = Router()
const logger = createLogger({ module: 'export' })

// Storage bucket for exports
const EXPORTS_BUCKET = 'exports'

// POST /api/export
router.post('/', validateBody(createExportSchema), async (req, res, next) => {
  try {
    const { format = 'xlsx', filters, columns, name } = req.body

    // Build query based on filters
    let query = supabase.from('prospects').select('*')

    if (filters) {
      if (filters.statuses?.length > 0) {
        query = query.in('status', filters.statuses)
      }
      if (filters.company_types?.length > 0) {
        query = query.in('company_type', filters.company_types)
      }
      if (filters.score_min > 0) {
        query = query.gte('relevance_score', filters.score_min)
      }
      if (filters.score_max < 100) {
        query = query.lte('relevance_score', filters.score_max)
      }
    }

    const prospects = await queryMany(
      query.order('relevance_score', { ascending: false })
    )

    const exportId = uuidv4()
    const timestamp = new Date().toISOString().split('T')[0]
    const fileName = name || `CCC_DataCenter_Summit_Export_${timestamp}`

    // Generate export based on format
    let fileBuffer: Buffer
    let fileExtension: string

    switch (format) {
      case 'xlsx':
        fileBuffer = await generateExcel(prospects, columns)
        fileExtension = 'xlsx'
        break
      case 'csv':
        fileBuffer = await generateCSV(prospects, columns)
        fileExtension = 'csv'
        break
      default:
        return res.status(400).json({ success: false, error: 'Unsupported format' })
    }

    // Save export record
    await mutate(
      supabase.from('exports').insert({
        id: exportId,
        name: `${fileName}.${fileExtension}`,
        format,
        filters: filters || {},
        record_count: prospects.length,
      }).select().single()
    )

    // Upload to Supabase Storage
    const storagePath = `${exportId}/${fileName}.${fileExtension}`

    const { error: uploadError } = await supabase.storage
      .from(EXPORTS_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: getContentType(fileExtension),
        upsert: false,
      })

    if (uploadError) {
      logger.error({ error: uploadError.message, exportId }, 'Failed to upload export to storage')
      // Fallback to direct response if storage fails
      const contentTypes: Record<string, string> = {
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv',
        pdf: 'application/pdf',
      }
      res.setHeader('Content-Type', contentTypes[fileExtension] || 'application/octet-stream')
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}.${fileExtension}"`)
      return res.send(fileBuffer)
    }

    // Log activity
    await supabase.from('activity_log').insert({
      action: 'export',
      details: {
        format,
        count: prospects.length,
        export_id: exportId,
        file_path: storagePath,
      },
    })

    // Update export record with file path
    await supabase
      .from('exports')
      .update({ file_path: storagePath })
      .eq('id', exportId)

    res.json({
      success: true,
      data: {
        export_id: exportId,
        download_url: `/api/export/${exportId}/download`,
        record_count: prospects.length,
      },
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/export/history
router.get('/history', async (_req, res, next) => {
  try {
    const exports = await queryMany(
      supabase
        .from('exports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
    )

    res.json({ success: true, data: exports })
  } catch (error) {
    next(error)
  }
})

// GET /api/export/:id/download
router.get('/:id/download', async (req, res, next) => {
  try {
    const { id } = req.params

    // Get export record
    const { data: exportRecord, error: fetchError } = await supabase
      .from('exports')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !exportRecord) {
      return res.status(404).json({ success: false, error: 'Export not found' })
    }

    // If we have a file path, get signed URL
    if (exportRecord.file_path) {
      const { data: signedUrlData, error: signError } = await supabase.storage
        .from(EXPORTS_BUCKET)
        .createSignedUrl(exportRecord.file_path, 3600) // 1 hour expiry

      if (signError) {
        logger.error({ error: signError.message, exportId: id }, 'Failed to create signed URL')
        return res.status(500).json({ success: false, error: 'Failed to generate download URL' })
      }

      // Redirect to signed URL
      return res.redirect(signedUrlData.signedUrl)
    }

    // Fallback: no storage path (legacy exports)
    return res.status(404).json({
      success: false,
      error: 'Export file not found in storage. This may be a legacy export.',
    })
  } catch (error) {
    next(error)
  }
})

// Helper function for content types
function getContentType(extension: string): string {
  const contentTypes: Record<string, string> = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
    pdf: 'application/pdf',
  }
  return contentTypes[extension] || 'application/octet-stream'
}

// Generate Excel workbook
async function generateExcel(
  prospects: Array<Record<string, unknown>>,
  _columns?: string[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'CCC Summit Intelligence'
  workbook.created = new Date()

  // CCC Brand colors
  const goldColor = 'FFD4A843'
  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: goldColor },
  }

  // All Prospects Sheet
  const allSheet = workbook.addWorksheet('All Prospects')
  allSheet.columns = [
    { header: 'Name', key: 'full_name', width: 25 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Company', key: 'company', width: 25 },
    { header: 'Company Type', key: 'company_type', width: 18 },
    { header: 'CCC Verticals', key: 'ccc_verticals', width: 25 },
    { header: 'Target Roles', key: 'target_roles', width: 20 },
    { header: 'Score', key: 'relevance_score', width: 8 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'LinkedIn', key: 'linkedin_url', width: 35 },
    { header: 'Location', key: 'location', width: 20 },
    { header: 'AI Summary', key: 'ai_summary', width: 50 },
  ]

  // Style header row
  const headerRow = allSheet.getRow(1)
  headerRow.eachCell((cell) => {
    cell.fill = headerFill
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { vertical: 'middle' }
  })
  headerRow.height = 24

  // Add data
  prospects.forEach((p) => {
    allSheet.addRow({
      full_name: p.full_name,
      title: p.title,
      company: p.company,
      company_type: p.company_type,
      ccc_verticals: Array.isArray(p.ccc_verticals) ? p.ccc_verticals.join(', ') : '',
      target_roles: Array.isArray(p.target_roles) ? p.target_roles.join(', ') : '',
      relevance_score: p.relevance_score,
      status: p.status,
      email: p.email,
      linkedin_url: p.linkedin_url,
      location: [p.location_city, p.location_state].filter(Boolean).join(', '),
      ai_summary: p.ai_summary,
    })
  })

  // Freeze header row
  allSheet.views = [{ state: 'frozen', ySplit: 1 }]

  // Add filtered sheets
  const attendees = prospects.filter((p) =>
    (p.target_roles as string[])?.includes('Attendee')
  )
  const sponsors = prospects.filter((p) =>
    (p.target_roles as string[])?.includes('Sponsor')
  )
  const speakers = prospects.filter((p) =>
    (p.target_roles as string[])?.includes('Speaker')
  )

  addFilteredSheet(workbook, 'Potential Attendees', attendees, headerFill)
  addFilteredSheet(workbook, 'Potential Sponsors', sponsors, headerFill)
  addFilteredSheet(workbook, 'Potential Speakers', speakers, headerFill)

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

function addFilteredSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  prospects: Array<Record<string, unknown>>,
  headerFill: ExcelJS.Fill
) {
  const sheet = workbook.addWorksheet(name)
  sheet.columns = [
    { header: 'Name', key: 'full_name', width: 25 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Company', key: 'company', width: 25 },
    { header: 'Score', key: 'relevance_score', width: 8 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'LinkedIn', key: 'linkedin_url', width: 35 },
  ]

  const headerRow = sheet.getRow(1)
  headerRow.eachCell((cell) => {
    cell.fill = headerFill
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  })
  headerRow.height = 24

  prospects
    .sort((a, b) => (b.relevance_score as number) - (a.relevance_score as number))
    .forEach((p) => {
      sheet.addRow({
        full_name: p.full_name,
        title: p.title,
        company: p.company,
        relevance_score: p.relevance_score,
        email: p.email,
        linkedin_url: p.linkedin_url,
      })
    })

  sheet.views = [{ state: 'frozen', ySplit: 1 }]
}

// Generate CSV
async function generateCSV(
  prospects: Array<Record<string, unknown>>,
  _columns?: string[]
): Promise<Buffer> {
  const headers = [
    'Name',
    'Title',
    'Company',
    'Company Type',
    'CCC Verticals',
    'Target Roles',
    'Score',
    'Status',
    'Email',
    'Phone',
    'LinkedIn',
    'City',
    'State',
    'AI Summary',
  ]

  const rows = prospects.map((p) => [
    escapeCsv(p.full_name as string),
    escapeCsv(p.title as string),
    escapeCsv(p.company as string),
    escapeCsv(p.company_type as string),
    escapeCsv(Array.isArray(p.ccc_verticals) ? p.ccc_verticals.join('; ') : ''),
    escapeCsv(Array.isArray(p.target_roles) ? p.target_roles.join('; ') : ''),
    p.relevance_score || '',
    p.status || '',
    escapeCsv(p.email as string),
    escapeCsv(p.phone as string),
    escapeCsv(p.linkedin_url as string),
    escapeCsv(p.location_city as string),
    escapeCsv(p.location_state as string),
    escapeCsv(p.ai_summary as string),
  ])

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  return Buffer.from(csv, 'utf-8')
}

function escapeCsv(value: string | null | undefined): string {
  if (!value) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export { router as exportRoutes }
