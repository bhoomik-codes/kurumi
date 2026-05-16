import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import * as xlsx from 'xlsx'

export interface ParsedDocument {
  text: string
  warning?: string
}

export class ParseService {
  public async parseFile(filePath: string): Promise<ParsedDocument> {
    const ext = path.extname(filePath).toLowerCase()

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }

    const buffer = fs.readFileSync(filePath)

    switch (ext) {
      case '.pdf': {
        const data = await pdfParse(buffer)
        const text = data.text?.trim() ?? ''
        if (!text) {
          return {
            text: '',
            warning: 'PDF appears to be image-only or encrypted — no extractable text found.',
          }
        }
        return { text }
      }

      case '.docx': {
        const result = await mammoth.extractRawText({ buffer })
        return { text: result.value ?? '' }
      }

      case '.xlsx':
      case '.xls': {
        const workbook = xlsx.read(buffer, { type: 'buffer' })
        let text = ''
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName]
          text += `Sheet: ${sheetName}\n${xlsx.utils.sheet_to_csv(sheet)}\n\n`
        })
        return { text }
      }

      case '.csv':
      case '.txt':
      case '.md':
      case '.json':
        return { text: buffer.toString('utf-8') }

      default:
        throw new Error(`Unsupported file type: ${ext}`)
    }
  }
}

export const parseService = new ParseService()
