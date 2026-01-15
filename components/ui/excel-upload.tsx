'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
} from 'lucide-react'
import {
  ColumnDef,
  ParsedRow,
  ValidationResult,
  parseExcelFile,
  validateRows,
  generateTemplate,
} from '@/lib/excel-utils'
import { cn } from '@/lib/utils'

interface ExcelUploadProps {
  columns: ColumnDef[]
  onImport: (rows: ParsedRow[]) => Promise<{ success: number; failed: number }>
  templateName: string
  title: string
  description?: string
  uniqueKey?: string
  existingValues?: Set<string>
  trigger?: React.ReactNode
}

export function ExcelUpload({
  columns,
  onImport,
  templateName,
  title,
  description,
  uniqueKey,
  existingValues,
  trigger,
}: ExcelUploadProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = () => {
    setValidationResult(null)
    setImportResult(null)
    setError(null)
    setImportProgress(0)
    setIsLoading(false)
    setIsImporting(false)
  }

  const handleClose = () => {
    setIsOpen(false)
    resetState()
  }

  const handleFile = useCallback(async (file: File) => {
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      '.xlsx',
      '.xls',
      '.csv',
    ]
    const isValidType = validTypes.some(
      type => file.type === type || file.name.toLowerCase().endsWith(type.replace('.', ''))
    )

    if (!isValidType) {
      setError('Please upload an Excel (.xlsx, .xls) or CSV file')
      return
    }

    setIsLoading(true)
    setError(null)
    setImportResult(null)

    try {
      const rows = await parseExcelFile(file, columns)
      const result = validateRows(rows, columns, uniqueKey, existingValues)
      setValidationResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setIsLoading(false)
    }
  }, [columns, uniqueKey, existingValues])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }, [handleFile])

  const handleDownloadTemplate = () => {
    generateTemplate(columns, templateName)
  }

  const handleImport = async () => {
    if (!validationResult) return

    const validRows = validationResult.rows.filter(r => r.isValid)
    if (validRows.length === 0) {
      setError('No valid rows to import')
      return
    }

    setIsImporting(true)
    setImportProgress(0)

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const result = await onImport(validRows)

      clearInterval(progressInterval)
      setImportProgress(100)
      setImportResult(result)
      setValidationResult(null)

      // Auto-close on success after delay
      if (result.failed === 0) {
        setTimeout(() => {
          handleClose()
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const validCount = validationResult?.validCount || 0
  const errorCount = validationResult?.errorCount || 0
  const totalCount = validationResult?.rows.length || 0

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <Button variant="outline" onClick={() => setIsOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Excel
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {/* Success State */}
            {importResult && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold">Import Complete</h3>
                  <p className="text-muted-foreground">
                    Successfully imported {importResult.success} items
                    {importResult.failed > 0 && ` (${importResult.failed} failed)`}
                  </p>
                </div>
              </div>
            )}

            {/* Upload Zone */}
            {!validationResult && !importResult && (
              <div className="space-y-4">
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                    isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
                    'hover:border-primary hover:bg-primary/5 cursor-pointer'
                  )}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  {isLoading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <p>Parsing file...</p>
                    </div>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">
                        Drop your Excel or CSV file here
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground mt-4">
                        Supports .xlsx, .xls, and .csv files
                      </p>
                    </>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 text-red-600 rounded-lg">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <div className="flex justify-center">
                  <Button variant="outline" onClick={handleDownloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Expected columns:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {columns.map(col => (
                      <li key={col.key}>
                        <span className={col.required ? 'font-medium' : ''}>
                          {col.name}
                        </span>
                        {col.required && <span className="text-red-500 ml-1">*</span>}
                        {col.description && (
                          <span className="text-muted-foreground/75 ml-1">
                            - {col.description}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Preview Table */}
            {validationResult && !importResult && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{totalCount} rows</Badge>
                    <Badge variant="default" className="bg-green-500">
                      {validCount} valid
                    </Badge>
                    {errorCount > 0 && (
                      <Badge variant="destructive">{errorCount} errors</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetState}
                    className="ml-auto"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 text-red-600 rounded-lg">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {/* Progress */}
                {isImporting && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Importing...</span>
                      <span>{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} />
                  </div>
                )}

                {/* Table */}
                <ScrollArea className="h-[400px] rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">Row</TableHead>
                        <TableHead className="w-[80px]">Status</TableHead>
                        {columns.map(col => (
                          <TableHead key={col.key}>
                            {col.name}
                            {col.required && <span className="text-red-500 ml-0.5">*</span>}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResult.rows.map((row, idx) => (
                        <TableRow
                          key={idx}
                          className={cn(
                            !row.isValid && 'bg-red-500/5'
                          )}
                        >
                          <TableCell className="font-mono text-xs">
                            {row.rowIndex}
                          </TableCell>
                          <TableCell>
                            {row.isValid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="h-4 w-4 text-red-500" />
                                <span className="text-xs text-red-500 truncate max-w-[100px]" title={row.errors.join(', ')}>
                                  {row.errors[0]}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          {columns.map(col => (
                            <TableCell key={col.key} className="max-w-[200px] truncate">
                              {String(row.data[col.key] || '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              {importResult ? 'Close' : 'Cancel'}
            </Button>
            {validationResult && !importResult && (
              <Button
                onClick={handleImport}
                disabled={validCount === 0 || isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import {validCount} {validCount === 1 ? 'Row' : 'Rows'}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
