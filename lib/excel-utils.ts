import * as XLSX from 'xlsx'

// Column definition for Excel templates
export interface ColumnDef {
  name: string           // Header name in Excel
  key: string            // Key for the parsed object
  required: boolean
  type: 'string' | 'number' | 'boolean'
  options?: string[]     // For enum/select fields
  description?: string   // Help text for template
  isPrimary?: boolean    // Mark the main field for single-column detection
}

// Parsed row from Excel
export interface ParsedRow {
  rowIndex: number
  data: Record<string, unknown>
  errors: string[]
  isValid: boolean
}

// Validation result
export interface ValidationResult {
  rows: ParsedRow[]
  validCount: number
  errorCount: number
  duplicateCount: number
  errors: string[]
}

// Parse result with metadata
export interface ParseResult {
  rows: ParsedRow[]
  isSingleColumn: boolean
  detectedHeader: boolean
  columnCount: number
}

// Common header-like words that indicate a header row
const HEADER_INDICATORS = [
  'prompt', 'keyword', 'text', 'name', 'title', 'query', 'search',
  'volume', 'difficulty', 'intent', 'category', 'notes', 'cpc',
  'description', 'url', 'link', 'type', 'status', 'date', 'id',
  'item', 'data', 'value', 'column', 'field', 'entry', 'list'
]

/**
 * Check if a value looks like a header rather than data
 */
function looksLikeHeader(value: string): boolean {
  if (!value || typeof value !== 'string') return false

  const normalized = value.toLowerCase().trim()

  // Check if it matches common header patterns
  if (HEADER_INDICATORS.some(h => normalized.includes(h))) return true

  // Check if it's a short label-like string (headers are usually short)
  if (normalized.length < 30 && !normalized.includes(' ') && /^[a-z_]+$/i.test(normalized)) return true

  // Check if it looks like a column name (Title Case or UPPERCASE)
  if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(value.trim())) return true
  if (/^[A-Z_]+$/.test(value.trim())) return true

  return false
}

/**
 * Check if the first row appears to be a header row
 */
function isHeaderRow(firstRow: unknown[], columns: ColumnDef[]): boolean {
  if (!firstRow || firstRow.length === 0) return false

  // Build a set of known column names and keys
  const knownHeaders = new Set<string>()
  columns.forEach(col => {
    knownHeaders.add(col.name.toLowerCase())
    knownHeaders.add(col.key.toLowerCase())
  })

  // Check each cell in the first row
  let headerLikeCount = 0
  let matchesKnownHeader = false

  for (const cell of firstRow) {
    const cellStr = String(cell || '').toLowerCase().trim()
    if (!cellStr) continue

    if (knownHeaders.has(cellStr)) {
      matchesKnownHeader = true
      headerLikeCount++
    } else if (looksLikeHeader(cellStr)) {
      headerLikeCount++
    }
  }

  // If any cell matches a known column name, it's definitely a header
  if (matchesKnownHeader) return true

  // If most cells look like headers, treat as header row
  const nonEmptyCells = firstRow.filter(c => c !== '' && c !== null && c !== undefined).length
  return nonEmptyCells > 0 && headerLikeCount >= nonEmptyCells * 0.5
}

/**
 * Get the primary (required) column from column definitions
 */
function getPrimaryColumn(columns: ColumnDef[]): ColumnDef | undefined {
  // First check for explicitly marked primary column
  const primary = columns.find(col => col.isPrimary)
  if (primary) return primary

  // Otherwise use the first required column
  return columns.find(col => col.required)
}

/**
 * Parse an Excel or CSV file with smart single-column detection
 */
export async function parseExcelFile(
  file: File,
  columns: ColumnDef[]
): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })

        // Get first sheet
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Get raw array data to detect structure
        const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
          header: 1,
          defval: '',
          raw: false,
        })

        if (!rawData || rawData.length === 0) {
          resolve([])
          return
        }

        // Detect column count (max columns across all rows)
        const columnCount = Math.max(...rawData.map(row =>
          Array.isArray(row) ? row.filter(c => c !== '' && c !== null && c !== undefined).length : 0
        ))

        const isSingleColumn = columnCount === 1
        const primaryColumn = getPrimaryColumn(columns)

        // Check if first row is a header
        const firstRow = rawData[0] as unknown[]
        const hasHeader = isHeaderRow(firstRow, columns)

        let parsedRows: ParsedRow[]

        if (isSingleColumn && primaryColumn) {
          // Single column mode - map everything to primary field
          const startIndex = hasHeader ? 1 : 0

          parsedRows = rawData.slice(startIndex).map((row, index) => {
            const rowArray = Array.isArray(row) ? row : [row]
            const value = String(rowArray[0] || '').trim()

            const errors: string[] = []
            if (!value) {
              errors.push(`${primaryColumn.name} is required`)
            }

            return {
              rowIndex: index + startIndex + 1, // 1-indexed
              data: { [primaryColumn.key]: value },
              errors,
              isValid: errors.length === 0 && value !== '',
            }
          }).filter(row => {
            // Filter out empty rows
            const value = row.data[primaryColumn.key]
            return value !== '' && value !== null && value !== undefined
          })
        } else {
          // Multi-column mode - use header mapping
          // Convert to JSON with headers
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
            defval: '',
            raw: false,
          })

          // Build column name map
          const columnNameMap = new Map<string, ColumnDef>()
          columns.forEach(col => {
            columnNameMap.set(col.name.toLowerCase(), col)
            columnNameMap.set(col.key.toLowerCase(), col)
          })

          // Check if we got any recognized headers
          const firstRowKeys = jsonData.length > 0 ? Object.keys(jsonData[0]) : []
          const hasRecognizedHeaders = firstRowKeys.some(key =>
            columnNameMap.has(key.toLowerCase())
          )

          if (!hasRecognizedHeaders && primaryColumn && jsonData.length > 0) {
            // No recognized headers - use first column as primary field
            const firstColumnKey = firstRowKeys[0]

            parsedRows = jsonData.map((row, index) => {
              const value = String(row[firstColumnKey] || '').trim()
              const errors: string[] = []

              if (!value) {
                errors.push(`${primaryColumn.name} is required`)
              }

              return {
                rowIndex: index + 2,
                data: { [primaryColumn.key]: value },
                errors,
                isValid: errors.length === 0 && value !== '',
              }
            })
          } else {
            // Standard multi-column parsing with header mapping
            parsedRows = jsonData.map((row, index) => {
              const errors: string[] = []
              const parsedData: Record<string, unknown> = {}

              // Map headers to keys
              Object.entries(row).forEach(([header, value]) => {
                const col = columnNameMap.get(header.toLowerCase())
                if (col) {
                  // Type conversion
                  if (col.type === 'number' && value !== '') {
                    const numValue = Number(value)
                    if (isNaN(numValue)) {
                      errors.push(`${col.name}: Invalid number`)
                    } else {
                      parsedData[col.key] = numValue
                    }
                  } else if (col.type === 'boolean') {
                    const strValue = String(value).toLowerCase()
                    parsedData[col.key] = strValue === 'true' || strValue === 'yes' || strValue === '1'
                  } else {
                    parsedData[col.key] = String(value).trim()
                  }

                  // Enum validation
                  if (col.options && value !== '') {
                    const strValue = String(value).toLowerCase()
                    if (!col.options.map(o => o.toLowerCase()).includes(strValue)) {
                      errors.push(`${col.name}: Must be one of: ${col.options.join(', ')}`)
                    }
                  }
                } else if (!hasRecognizedHeaders && primaryColumn) {
                  // No recognized headers - put first column value in primary field
                  const val = String(value).trim()
                  if (val && !parsedData[primaryColumn.key]) {
                    parsedData[primaryColumn.key] = val
                  }
                }
              })

              // Check required fields
              columns
                .filter(col => col.required)
                .forEach(col => {
                  const value = parsedData[col.key]
                  if (value === undefined || value === null || value === '') {
                    errors.push(`${col.name} is required`)
                  }
                })

              return {
                rowIndex: index + 2,
                data: parsedData,
                errors,
                isValid: errors.length === 0,
              }
            })
          }

          // Filter out completely empty rows
          parsedRows = parsedRows.filter(row => {
            const values = Object.values(row.data)
            return values.some(v => v !== '' && v !== null && v !== undefined)
          })
        }

        resolve(parsedRows)
      } catch (error) {
        reject(new Error('Failed to parse file. Please check the format.'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsBinaryString(file)
  })
}

/**
 * Validate parsed rows and check for duplicates
 */
export function validateRows(
  rows: ParsedRow[],
  columns: ColumnDef[],
  uniqueKey?: string,
  existingValues?: Set<string>
): ValidationResult {
  const errors: string[] = []
  let duplicateCount = 0
  const seenValues = new Set<string>()

  // Check for duplicates within the upload
  if (uniqueKey) {
    rows.forEach(row => {
      const value = String(row.data[uniqueKey] || '').toLowerCase()
      if (value) {
        if (seenValues.has(value)) {
          row.errors.push(`Duplicate in upload`)
          row.isValid = false
          duplicateCount++
        } else if (existingValues?.has(value)) {
          row.errors.push(`Already exists`)
          row.isValid = false
          duplicateCount++
        }
        seenValues.add(value)
      }
    })
  }

  const validCount = rows.filter(r => r.isValid).length
  const errorCount = rows.length - validCount

  if (rows.length === 0) {
    errors.push('No data found in file')
  }

  return {
    rows,
    validCount,
    errorCount,
    duplicateCount,
    errors,
  }
}

/**
 * Generate and download an Excel template
 */
export function generateTemplate(
  columns: ColumnDef[],
  filename: string
): void {
  // Create header row with column names
  const headers = columns.map(col => col.name)

  // Create example row
  const exampleRow = columns.map(col => {
    if (col.options) return col.options[0]
    if (col.type === 'number') return col.required ? '100' : ''
    if (col.type === 'boolean') return 'true'
    return col.required ? `Example ${col.name}` : ''
  })

  // Create help row with descriptions
  const helpRow = columns.map(col => {
    let help = col.required ? '(Required) ' : '(Optional) '
    if (col.description) help += col.description
    if (col.options) help += ` Options: ${col.options.join(', ')}`
    return help
  })

  // Create worksheet
  const wsData = [headers, exampleRow, helpRow]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Set column widths
  ws['!cols'] = columns.map(col => ({
    wch: Math.max(col.name.length + 5, 20)
  }))

  // Create workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Template')

  // Download
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/**
 * Export data to Excel
 */
export function exportToExcel(
  data: Record<string, unknown>[],
  columns: ColumnDef[],
  filename: string
): void {
  // Create header row
  const headers = columns.map(col => col.name)

  // Create data rows
  const rows = data.map(item =>
    columns.map(col => {
      const value = item[col.key]
      if (value === null || value === undefined) return ''
      return String(value)
    })
  )

  // Create worksheet
  const wsData = [headers, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Set column widths
  ws['!cols'] = columns.map(col => ({
    wch: Math.max(col.name.length + 5, 15)
  }))

  // Create workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')

  // Download
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// Column definitions for different upload types

export const PROMPT_COLUMNS: ColumnDef[] = [
  {
    name: 'Prompt Text',
    key: 'prompt_text',
    required: true,
    type: 'string',
    description: 'The prompt to monitor in AI platforms',
    isPrimary: true,
  },
  {
    name: 'Category',
    key: 'category',
    required: false,
    type: 'string',
    description: 'Category or tag for organization',
  },
  {
    name: 'Intent Type',
    key: 'intent_type',
    required: false,
    type: 'string',
    options: ['organic', 'commercial'],
    description: 'Search intent type',
  },
  {
    name: 'Notes',
    key: 'notes',
    required: false,
    type: 'string',
    description: 'Any additional notes',
  },
]

export const KEYWORD_COLUMNS: ColumnDef[] = [
  {
    name: 'Keyword',
    key: 'keyword',
    required: true,
    type: 'string',
    description: 'The keyword to track',
    isPrimary: true,
  },
  {
    name: 'Search Volume',
    key: 'search_volume',
    required: false,
    type: 'number',
    description: 'Monthly search volume if known',
  },
  {
    name: 'Difficulty',
    key: 'keyword_difficulty',
    required: false,
    type: 'number',
    description: 'Keyword difficulty score (0-100)',
  },
  {
    name: 'Intent',
    key: 'intent_type',
    required: false,
    type: 'string',
    options: ['informational', 'commercial', 'transactional', 'navigational'],
    description: 'Search intent type',
  },
  {
    name: 'CPC',
    key: 'cpc',
    required: false,
    type: 'number',
    description: 'Cost per click if known',
  },
  {
    name: 'Notes',
    key: 'notes',
    required: false,
    type: 'string',
    description: 'Any additional notes',
  },
]
