import { jsPDF } from 'jspdf'
import type { Project } from './types'

// Brand Bible data structure for export
export interface BrandBibleData {
  name: string
  tracked_brand: string
  website_url: string | null
  industry?: string
  description?: string
  target_audience?: string
  brand_voice?: string
  tone_guidelines?: string
  key_differentiators?: string[]
  important_keywords?: string[]
  content_pillars?: string[]
  key_messages?: string[]
  unique_selling_points?: string[]
  target_personas?: string[]
  avoid_topics?: string[]
}

// Helper to sanitize filename
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Export Brand Bible as JSON
export function exportBrandBibleAsJSON(project: Project): void {
  const brandBibleData: BrandBibleData = {
    name: project.name,
    tracked_brand: project.tracked_brand,
    website_url: project.website_url,
    industry: project.industry,
    description: project.description,
    target_audience: project.target_audience,
    brand_voice: project.brand_voice,
    tone_guidelines: project.tone_guidelines,
    key_differentiators: project.key_differentiators,
    important_keywords: project.important_keywords,
    content_pillars: project.content_pillars,
    key_messages: project.key_messages,
    unique_selling_points: project.unique_selling_points,
    target_personas: project.target_personas,
    avoid_topics: project.avoid_topics,
  }

  const jsonString = JSON.stringify(brandBibleData, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${sanitizeFilename(project.name)}-brand-bible.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Export Brand Bible as PDF
export function exportBrandBibleAsPDF(project: Project): void {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let yPosition = 20

  // Helper to add text with word wrap
  const addText = (text: string, fontSize: number, isBold = false): number => {
    doc.setFontSize(fontSize)
    doc.setFont('helvetica', isBold ? 'bold' : 'normal')
    const lines = doc.splitTextToSize(text, contentWidth)

    // Check if we need a new page
    const lineHeight = fontSize * 0.5
    const textHeight = lines.length * lineHeight
    if (yPosition + textHeight > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage()
      yPosition = 20
    }

    doc.text(lines, margin, yPosition)
    return yPosition + textHeight + 5
  }

  // Helper to add a section
  const addSection = (title: string, content: string | string[] | undefined): void => {
    if (!content || (Array.isArray(content) && content.length === 0)) return

    // Check if we need a new page for section header
    if (yPosition > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage()
      yPosition = 20
    }

    // Section title
    yPosition = addText(title, 12, true)
    yPosition += 2

    // Section content
    if (Array.isArray(content)) {
      content.forEach((item, index) => {
        yPosition = addText(`• ${item}`, 10)
      })
    } else {
      yPosition = addText(content, 10)
    }
    yPosition += 8
  }

  // Title
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  yPosition = addText('Brand Bible', 24, true)
  yPosition += 5

  // Brand name
  doc.setFontSize(18)
  doc.setTextColor(100, 100, 100)
  yPosition = addText(project.name || project.tracked_brand, 18, true)
  yPosition += 5

  // Generated date
  doc.setFontSize(10)
  doc.setTextColor(150, 150, 150)
  yPosition = addText(`Generated on ${new Date().toLocaleDateString()}`, 10)
  yPosition += 15

  // Reset text color
  doc.setTextColor(0, 0, 0)

  // Horizontal line
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 15

  // Basic Information Section
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  yPosition = addText('Basic Information', 16, true)
  yPosition += 5

  if (project.tracked_brand) {
    addSection('Brand Name', project.tracked_brand)
  }
  if (project.website_url) {
    addSection('Website', project.website_url)
  }
  if (project.industry) {
    addSection('Industry', project.industry)
  }
  if (project.description) {
    addSection('Description', project.description)
  }

  // Voice & Tone Section
  if (project.brand_voice || project.target_audience || project.tone_guidelines) {
    yPosition += 10
    doc.setFontSize(16)
    yPosition = addText('Voice & Tone', 16, true)
    yPosition += 5

    if (project.brand_voice) {
      const voiceLabel = project.brand_voice.charAt(0).toUpperCase() + project.brand_voice.slice(1)
      addSection('Brand Voice', voiceLabel)
    }
    if (project.target_audience) {
      addSection('Target Audience', project.target_audience)
    }
    if (project.tone_guidelines) {
      addSection('Tone Guidelines', project.tone_guidelines)
    }
  }

  // Differentiators & Value Props Section
  if ((project.unique_selling_points && project.unique_selling_points.length > 0) ||
      (project.key_differentiators && project.key_differentiators.length > 0)) {
    yPosition += 10
    doc.setFontSize(16)
    yPosition = addText('Differentiators & Value Props', 16, true)
    yPosition += 5

    addSection('Unique Selling Points', project.unique_selling_points)
    addSection('Key Differentiators', project.key_differentiators)
  }

  // Content Strategy Section
  if ((project.content_pillars && project.content_pillars.length > 0) ||
      (project.important_keywords && project.important_keywords.length > 0) ||
      (project.key_messages && project.key_messages.length > 0)) {
    yPosition += 10
    doc.setFontSize(16)
    yPosition = addText('Content Strategy', 16, true)
    yPosition += 5

    addSection('Content Pillars', project.content_pillars)
    addSection('Important Keywords', project.important_keywords)
    addSection('Key Messages', project.key_messages)
  }

  // Personas & Guidelines Section
  if ((project.target_personas && project.target_personas.length > 0) ||
      (project.avoid_topics && project.avoid_topics.length > 0)) {
    yPosition += 10
    doc.setFontSize(16)
    yPosition = addText('Personas & Guidelines', 16, true)
    yPosition += 5

    addSection('Target Personas', project.target_personas)
    addSection('Topics to Avoid', project.avoid_topics)
  }

  // Footer on last page
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Page ${i} of ${pageCount} | Generated by Luminari`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  // Save the PDF
  doc.save(`${sanitizeFilename(project.name)}-brand-bible.pdf`)
}
