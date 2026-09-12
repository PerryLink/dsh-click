/**
 * OCR seam: tesseract command building, TSV parsing, the unavailable-provider
 * fail-closed path, and the pixel→screen coordinate mapping.
 * @module dsh-click/test/ocr.spec
 */

import { describe, expect, it } from 'vitest'
import { parseTesseractTsv, tesseractArgv, UnavailableOcrProvider } from '../src/vision/ocr.ts'
import { centerOf, screenBoxFor } from '../src/vision/index.ts'

describe('tesseractArgv', () => {
  it('builds the TSV-to-stdout command line', () => {
    expect(tesseractArgv('tesseract', '/tmp/shot.png', 'eng')).toEqual([
      'tesseract', '/tmp/shot.png', 'stdout', '-l', 'eng', 'tsv',
    ])
  })
})

describe('parseTesseractTsv', () => {
  it('extracts word-level boxes and skips the header and non-word rows', () => {
    const tsv = [
      'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext',
      '5\t1\t1\t1\t1\t1\t10\t20\t50\t10\t96.5\tSave',
      '4\t1\t1\t1\t1\t0\t10\t20\t50\t10\t-1\t',
      '5\t1\t1\t1\t1\t2\t70\t20\t40\t10\t90\t\t',
    ].join('\n')
    const words = parseTesseractTsv(tsv)
    expect(words).toHaveLength(1)
    expect(words[0]).toEqual({ text: 'Save', box: { x: 10, y: 20, width: 50, height: 10 }, confidence: 96.5 })
  })

  it('skips rows with malformed numeric fields', () => {
    const words = parseTesseractTsv('5\t1\t1\t1\t1\t1\tNaN\t20\t50\t10\t90\tbad')
    expect(words).toHaveLength(0)
  })

  it('returns an empty list for empty input', () => {
    expect(parseTesseractTsv('')).toEqual([])
  })
})

describe('UnavailableOcrProvider', () => {
  it('reports its reason and fails closed on recognize', async () => {
    const provider = new UnavailableOcrProvider('tesseract', 'not installed')
    expect(provider.available).toBe(false)
    expect(provider.unavailableReason).toBe('not installed')
    await expect(provider.recognize('')).rejects.toMatchObject({ code: 'OCR_UNAVAILABLE' })
  })
})

describe('screenBoxFor / centerOf', () => {
  const rect = { x: 100, y: 200, width: 800, height: 600 }

  it('maps a 1:1 screenshot box to screen coordinates', () => {
    const box = screenBoxFor(rect, 800, 600, { x: 10, y: 20, width: 50, height: 10 })
    expect(box).toEqual({ x: 110, y: 220, width: 50, height: 10 })
    expect(centerOf(box)).toEqual({ x: 135, y: 225 })
  })

  it('scales a downscaled screenshot box back to screen coordinates', () => {
    const box = screenBoxFor(rect, 400, 300, { x: 5, y: 10, width: 25, height: 5 })
    expect(box).toEqual({ x: 110, y: 220, width: 50, height: 10 })
  })
})
