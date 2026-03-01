import { Worker, Job } from 'bullmq'
import ExcelJS from 'exceljs'
import { createLogger } from '../../utils/logger.js'
import { getRedisConnection, QUEUE_NAMES, ExportJobData, JobResult } from '../queue.js'
import { supabase, queryMany, mutate } from '../../db/index.js'
import { emitNotification } from '../../websocket/server.js'
import { v4 as uuidv4 } from 'uuid'

const logger = createLogger({ module: 'export-worker' })

// Storage bucket for exports
const EXPORTS_BUCKET = 'exports'

interface Prospect {
  id: string
  full_name: string
  title?: string
  company?: string
  company_type?: string
  ccc_verticals?: string[]
  target_roles?: string[]
  relevance_score?: number
  status?: string
  email?: string
  phone?: string
  linkedin_url?: string
  location_city?: string
  location_state?: string
  ai_summary?: string
  [key: string]: unknown
}

/**
 * Process export jobs
 */
async function processExportJob(job: Job<ExportJobData>): Promise<JobResult> {
  const { format, filters, columns } = job.data
  const startTime = Date.now()

  logger.info({ jobId: job.id, format }, 'Processing export job')

  try {
    // Build query based on filters
    let query = supabase.from('prospects').select('*')

    if (filters) {
      if ((filters as Record<string, unknown>).statuses) {
        const statuses = (filters as { statuses: string[] }).statuses
        if (statuses.length > 0) {
          query = query.in('status', statuses)
        }
      }
      if ((filters as Record<string, unknown>).company_types) {
        const companyTypes = (filters as { company_types: string[] }).company_types
        if (companyTypes.length > 0) {
          query = query.in('company_type', companyTypes)
        }
      }
      if ((filters as { score_min?: number }).score_min) {
        query = query.gte('relevance_score', (filters as { score_min: number }).score_min)
      }
      if ((filters as { score_max?: number }).score_max) {
        query = query.lte('relevance_score', (filters as { score_max: number }).score_max)
      }
    }

    const prospects = await queryMany<Prospect>(
      query.order('relevance_score', { ascending: false })
    )

    await job.updateProgress(25)

    const exportId = uuidv4()
    const timestamp = new Date().toISOString().split('T')[0]
    const fileName = `CCC_DataCenter_Summit_Export_${timestamp}`

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
      case 'pdf':
        fileBuffer = await generatePDF(prospects)
        fileExtension = 'pdf'
        break
      default:
        throw new Error(`Unsupported format: ${format}`)
    }

    await job.updateProgress(75)

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
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    // Save export record
    await mutate(
      supabase.from('exports').insert({
        id: exportId,
        name: `${fileName}.${fileExtension}`,
        format,
        filters: filters || {},
        record_count: prospects.length,
        file_path: storagePath,
      }).select().single()
    )

    await job.updateProgress(100)

    const duration = Date.now() - startTime

    logger.info(
      {
        jobId: job.id,
        format,
        recordCount: prospects.length,
        duration,
        file_path: storagePath,
      },
      'Export job completed'
    )

    emitNotification(
      `Export complete: ${prospects.length} prospects exported to ${format.toUpperCase()}`,
      'success'
    )

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

    return {
      success: true,
      data: {
        export_id: exportId,
        download_url: `/api/export/${exportId}/download`,
        record_count: prospects.length,
      },
      metadata: {
        duration,
        fileSize: fileBuffer.length,
        file_path: storagePath,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error({ jobId: job.id, error: errorMessage }, 'Export job failed')

    emitNotification(
      `Export failed: ${errorMessage}`,
      'error'
    )

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Generate Excel workbook
 */
async function generateExcel(
  prospects: Prospect[],
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
  const attendees = prospects.filter((p) => p.target_roles?.includes('Attendee'))
  const sponsors = prospects.filter((p) => p.target_roles?.includes('Sponsor'))
  const speakers = prospects.filter((p) => p.target_roles?.includes('Speaker'))

  addFilteredSheet(workbook, 'Potential Attendees', attendees, headerFill)
  addFilteredSheet(workbook, 'Potential Sponsors', sponsors, headerFill)
  addFilteredSheet(workbook, 'Potential Speakers', speakers, headerFill)

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

function addFilteredSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  prospects: Prospect[],
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
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
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

/**
 * Generate CSV
 */
async function generateCSV(
  prospects: Prospect[],
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
    escapeCsv(p.full_name),
    escapeCsv(p.title),
    escapeCsv(p.company),
    escapeCsv(p.company_type),
    escapeCsv(Array.isArray(p.ccc_verticals) ? p.ccc_verticals.join('; ') : ''),
    escapeCsv(Array.isArray(p.target_roles) ? p.target_roles.join('; ') : ''),
    p.relevance_score || '',
    p.status || '',
    escapeCsv(p.email),
    escapeCsv(p.phone),
    escapeCsv(p.linkedin_url),
    escapeCsv(p.location_city),
    escapeCsv(p.location_state),
    escapeCsv(p.ai_summary),
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

function getContentType(extension: string): string {
  const contentTypes: Record<string, string> = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
    pdf: 'application/pdf',
  }
  return contentTypes[extension] || 'application/octet-stream'
}

/**
 * Generate PDF (placeholder - requires pdf.service.ts)
 */
async function generatePDF(prospects: Prospect[]): Promise<Buffer> {
  // For now, create a simple text-based PDF
  // This will be replaced with the full pdf.service.ts implementation
  const PDFDocument = (await import('pdfkit')).default

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const doc = new PDFDocument({ margin: 50 })

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Header
    doc.fontSize(24).fillColor('#D4A843').text('CCC Summit Intelligence', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(16).fillColor('#333').text('Data Center Dealmakers Summit - Prospect Report', { align: 'center' })
    doc.moveDown()
    doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' })
    doc.moveDown(2)

    // Summary
    doc.fontSize(14).fillColor('#333').text('Summary Statistics')
    doc.moveDown(0.5)
    doc.fontSize(10).fillColor('#666')
    doc.text(`Total Prospects: ${prospects.length}`)
    doc.text(`Potential Sponsors: ${prospects.filter(p => p.target_roles?.includes('Sponsor')).length}`)
    doc.text(`Potential Speakers: ${prospects.filter(p => p.target_roles?.includes('Speaker')).length}`)
    doc.text(`High Score (80+): ${prospects.filter(p => (p.relevance_score || 0) >= 80).length}`)
    doc.moveDown(2)

    // Top Prospects
    doc.fontSize(14).fillColor('#333').text('Top 20 Prospects')
    doc.moveDown()

    const topProspects = prospects
      .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
      .slice(0, 20)

    topProspects.forEach((p, i) => {
      if (doc.y > 700) {
        doc.addPage()
      }

      doc.fontSize(11).fillColor('#333').text(`${i + 1}. ${p.full_name}`, { continued: false })
      doc.fontSize(9).fillColor('#666')
      if (p.title) doc.text(`   ${p.title}${p.company ? ` at ${p.company}` : ''}`)
      if (p.relevance_score) doc.text(`   Score: ${p.relevance_score} | Roles: ${p.target_roles?.join(', ') || 'N/A'}`)
      doc.moveDown(0.5)
    })

    doc.end()
  })
}

/**
 * Create and start the export worker
 */
export function createExportWorker(): Worker<ExportJobData, JobResult> {
  const worker = new Worker<ExportJobData, JobResult>(
    QUEUE_NAMES.EXPORT,
    processExportJob,
    {
      connection: getRedisConnection(),
      concurrency: 2, // Process up to 2 exports at a time
      limiter: {
        max: 20,
        duration: 60000, // Max 20 exports per minute
      },
    }
  )

  worker.on('completed', (job, result) => {
    logger.info({ jobId: job.id, success: result.success }, 'Export job completed')
  })

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error: error.message }, 'Export job failed')
  })

  worker.on('error', (error) => {
    logger.error({ error: error.message }, 'Export worker error')
  })

  logger.info('Export worker started')
  return worker
}

export default createExportWorker
