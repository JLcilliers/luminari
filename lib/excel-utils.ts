import * as XLSX from 'xlsx'

// Column definition for Excel templates
export interface ColumnDef {
  name: string           // Header name in Excel
  key: string            // Key for the parsed object
  required: boolean
  type: 'string' | 'number' | 'boolean'
  options?: string[]     // For enum/select fields
  description?: string   // Help text for template
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

/**
 * Parse an Excel or CSV file
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

        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          defval: '',
          raw: false,
        })

        // Map column names to keys and validate
        const columnNameMap = new Map<string, ColumnDef>()
        columns.forEach(col => {
          columnNameMap.set(col.name.toLowerCase(), col)
          columnNameMap.set(col.key.toLowerCase(), col)
        })

        const parsedRows: ParsedRow[] = jsonData.map((row, index) => {
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
            rowIndex: index + 2, // +2 because Excel is 1-indexed and has header row
            data: parsedData,
            errors,
            isValid: errors.length === 0,
          }
        })

        // Filter out completely empty rows
        const nonEmptyRows = parsedRows.filter(row => {
          const values = Object.values(row.data)
          return values.some(v => v !== '' && v !== null && v !== undefined)
        })

        resolve(nonEmptyRows)
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
          row.errors.push(`Duplicate ${uniqueKey} in upload`)
          row.isValid = false
          duplicateCount++
        } else if (existingValues?.has(value)) {
          row.errors.push(`${uniqueKey} already exists in database`)
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
