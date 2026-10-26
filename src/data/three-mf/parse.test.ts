/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { DOMParser as XmlDomParser, onErrorStopParsing } from '@xmldom/xmldom'
import { zipSync, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { ThreeMfImportError, type ThreeMfImportErrorCode } from './errors'
import { parseThreeMf } from './parse'
import type { XmlDocumentLike, XmlParser } from './xml'

const xmlParser: XmlParser = (source) =>
  new XmlDomParser({ onError: onErrorStopParsing }).parseFromString(
    source,
    'application/xml',
  ) as unknown as XmlDocumentLike

function fixture(name: string): Uint8Array {
  return new Uint8Array(
    readFileSync(new URL(`../../../tests/fixtures/3mf/${name}`, import.meta.url)),
  )
}

function fixtureFiles(name: string): Record<string, Uint8Array> {
  return unzipSync(fixture(name)) as Record<string, Uint8Array>
}

function buildZip(files: Record<string, Uint8Array | string>): Uint8Array {
  const entries: Record<string, Uint8Array> = {}
  for (const [name, value] of Object.entries(files)) {
    entries[name] = typeof value === 'string' ? new TextEncoder().encode(value) : value
  }
  return zipSync(entries)
}

function parse(bytes: Uint8Array, limits?: Parameters<typeof parseThreeMf>[2]) {
  return parseThreeMf('test.3mf', bytes, { xmlParser, ...limits })
}

function errorCode(
  bytes: Uint8Array,
  options?: Parameters<typeof parseThreeMf>[2],
): ThreeMfImportErrorCode {
  try {
    parseThreeMf('test.3mf', bytes, { xmlParser, ...options })
  } catch (error) {
    if (error instanceof ThreeMfImportError) return error.code
    throw error
  }
  throw new Error('Atteso ThreeMfImportError')
}

const minimalModel =
  '<?xml version="1.0" encoding="UTF-8"?><model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Application">AnycubicSlicerNext 2.0.0.3</metadata><resources/><build/></model>'

describe('parser .3mf', () => {
  it('normalizza il fixture Kobra 3', () => {
    const summary = parse(fixture('anycubic-kobra3-pla.gcode.3mf'))
    expect(summary.slicer).toBe('anycubic')
    expect(summary.slicerVersion).toContain('2.0.0.3')
    expect(summary.printerModel).toBe('Anycubic Kobra 3')
    expect(summary.printerSettingsId).toBe('Anycubic Kobra 3 0.4 nozzle')
    expect(summary.plates).toHaveLength(1)
    expect(summary.plates[0]).toMatchObject({
      index: 1,
      predictionSeconds: 200,
      weightCentigrams: 146,
      source: 'slice_info',
      filaments: [
        {
          id: 1,
          type: 'PLA',
          materialFamily: 'PLA',
          color: '#FF9016',
          usedCentigrams: 146,
          usedMeters: 0.49,
        },
      ],
    })
    expect(summary.warnings).toEqual([])
  })

  it('normalizza il fixture Kobra X e usa printer_model_id come conferma', () => {
    const summary = parse(fixture('anycubic-kobrax-pla.gcode.3mf'))
    expect(summary.printerModel).toBe('Anycubic Kobra X')
    expect(summary.printerModelId).toBe('Anycubic Kobra X')
    expect(summary.plates[0]?.predictionSeconds).toBe(513)
    expect(summary.plates[0]?.weightCentigrams).toBe(376)
    expect(summary.plates[0]?.filaments[0]?.usedCentigrams).toBe(376)
  })

  it('normalizza più piatti', () => {
    const summary = parse(fixture('anycubic-kobrax-2plates.gcode.3mf'))
    expect(summary.plates.map((plate) => plate.index)).toEqual([1, 2])
    expect(summary.plates.map((plate) => plate.predictionSeconds)).toEqual([6069, 2650])
    expect(summary.plates.map((plate) => plate.weightCentigrams)).toEqual([3841, 1379])
    expect(summary.plates.map((plate) => plate.filaments[0]?.usedCentigrams)).toEqual([3841, 1379])
  })

  it('riconosce Bambu Studio e usa printer_model da project_settings', () => {
    const summary = parse(
      buildZip({
        '[Content_Types].xml': '<Types/>',
        '3D/3dmodel.model': minimalModel,
        'Metadata/project_settings.config': JSON.stringify({
          printer_model: 'Bambu Lab P1S',
          printer_settings_id: 'Bambu Lab P1S 0.2 nozzle',
          filament_type: ['PLA', 'PLA', 'PLA'],
          filament_colour: ['#F72323', '#FFFFFF', '#C46200'],
        }),
        'Metadata/model_settings.config':
          '<config><plate><metadata key="plater_id" value="1"/><metadata key="plater_name" value=""/></plate></config>',
        'Metadata/slice_info.config': `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <header><header_item key="X-BBL-Client-Version" value="01.10.02.73"/></header>
  <plate>
    <metadata key="index" value="1"/>
    <metadata key="printer_model_id" value="C12"/>
    <metadata key="prediction" value="8103"/>
    <metadata key="weight" value="10.03"/>
    <filament id="1" type="PLA" color="#F72323" used_m="1.01" used_g="3.01"/>
    <filament id="2" type="PLA" color="#FFFFFF" used_m="1.47" used_g="4.47"/>
    <filament id="3" type="PLA" color="#C46200" used_m="0.84" used_g="2.56"/>
  </plate>
</config>`,
      }),
    )
    expect(summary.slicer).toBe('bambu')
    expect(summary.slicerVersion).toBe('01.10.02.73')
    expect(summary.printerModel).toBe('Bambu Lab P1S')
    expect(summary.printerModelId).toBe('C12')
    expect(summary.plates[0]?.predictionSeconds).toBe(8103)
    expect(summary.plates[0]?.filaments).toHaveLength(3)
    expect(summary.warnings).toEqual([])
  })

  it('rifiuta un progetto non slicato', () => {
    expect(errorCode(fixture('anycubic-unsliced-project.3mf'))).toBe('NOT_SLICED')
  })

  it('rifiuta un file che non è uno ZIP', () => {
    expect(errorCode(new Uint8Array([1, 2, 3]))).toBe('NOT_A_ZIP')
    expect(errorCode(new Uint8Array())).toBe('NOT_A_ZIP')
  })

  it('rifiuta uno ZIP senza la struttura 3MF', () => {
    expect(errorCode(buildZip({ 'readme.txt': 'ciao' }))).toBe('NOT_A_3MF')
  })

  it('legge il nome del piatto da model_settings.config', () => {
    const files = fixtureFiles('anycubic-kobra3-pla.gcode.3mf')
    const modelSettings = new TextDecoder().decode(files['Metadata/model_settings.config'])
    files['Metadata/model_settings.config'] = new TextEncoder().encode(
      modelSettings.replace(/key="plater_name" value="[^"]*"/, 'key="plater_name" value="Gancio"'),
    )
    const summary = parse(buildZip(files))
    expect(summary.plates[0]?.name).toBe('Gancio')
  })

  it('avvisa se il peso del piatto non coincide con i filamenti', () => {
    const files = fixtureFiles('anycubic-kobra3-pla.gcode.3mf')
    const sliceInfo = new TextDecoder().decode(files['Metadata/slice_info.config'])
    files['Metadata/slice_info.config'] = new TextEncoder().encode(
      sliceInfo.replace(/key="weight" value="[^"]*"/, 'key="weight" value="2.00"'),
    )
    const summary = parse(buildZip(files))
    expect(summary.warnings.some((warning) => warning.code === 'WEIGHT_MISMATCH')).toBe(true)
  })

  it('avvisa su un materiale sconosciuto senza crearlo', () => {
    const files = fixtureFiles('anycubic-kobra3-pla.gcode.3mf')
    const sliceInfo = new TextDecoder().decode(files['Metadata/slice_info.config'])
    files['Metadata/slice_info.config'] = new TextEncoder().encode(
      sliceInfo.replace('type="PLA"', 'type="PEEK"'),
    )
    const summary = parse(buildZip(files))
    expect(summary.plates[0]?.filaments[0]?.materialFamily).toBeNull()
    expect(summary.warnings.some((warning) => warning.code === 'UNKNOWN_MATERIAL')).toBe(true)
  })

  it('segnala un piatto senza tempo come non utilizzabile', () => {
    const files = fixtureFiles('anycubic-kobra3-pla.gcode.3mf')
    const sliceInfo = new TextDecoder().decode(files['Metadata/slice_info.config'])
    files['Metadata/slice_info.config'] = new TextEncoder().encode(
      sliceInfo.replace(/\s*<metadata key="prediction" value="[^"]*"\/>/, ''),
    )
    expect(errorCode(buildZip(files))).toBe('NO_USABLE_PLATES')
  })

  it('rifiuta XML malformato e DOCTYPE', () => {
    const malformed = fixtureFiles('anycubic-kobra3-pla.gcode.3mf')
    malformed['Metadata/slice_info.config'] = new TextEncoder().encode('<config><plate>')
    expect(errorCode(buildZip(malformed))).toBe('INVALID_SLICE_INFO')

    const doctype = fixtureFiles('anycubic-kobra3-pla.gcode.3mf')
    doctype['Metadata/slice_info.config'] = new TextEncoder().encode(
      '<!DOCTYPE config [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><config><header/><plate/></config>',
    )
    expect(errorCode(buildZip(doctype))).toBe('UNSAFE_XML')
  })

  it('rifiuta project_settings non JSON', () => {
    const files = fixtureFiles('anycubic-kobra3-pla.gcode.3mf')
    files['Metadata/project_settings.config'] = new TextEncoder().encode('{')
    expect(errorCode(buildZip(files))).toBe('INVALID_PROJECT_SETTINGS')
  })

  it('usa i tipi di slice_info se manca project_settings', () => {
    const files = fixtureFiles('anycubic-kobra3-pla.gcode.3mf')
    delete files['Metadata/project_settings.config']
    const summary = parse(buildZip(files))
    expect(summary.plates[0]?.filaments[0]?.type).toBe('PLA')
    expect(summary.warnings.some((warning) => warning.code === 'PROJECT_SETTINGS_MISSING')).toBe(
      true,
    )
    expect(summary.warnings.some((warning) => warning.code === 'PRINTER_UNKNOWN')).toBe(true)
  })

  it('usa il fallback del G-code quando manca slice_info', () => {
    const gcode = [
      '; generated by AnycubicSlicerNext 2.0.0.3 on 2026-10-26 at 09:54:47',
      '; filament used [g] = 1.46',
      '; total filament used [g] = 1.46',
      '; estimated printing time (normal mode) = 3m 20s',
    ].join('\n')
    const summary = parse(
      buildZip({
        '[Content_Types].xml': '<Types/>',
        '3D/3dmodel.model': minimalModel,
        'Metadata/project_settings.config': JSON.stringify({
          printer_model: 'Anycubic Kobra 3',
          filament_type: ['PLA'],
        }),
        'Metadata/plate_1.gcode': gcode,
      }),
    )
    expect(summary.slicer).toBe('anycubic')
    expect(summary.plates[0]).toMatchObject({
      index: 1,
      predictionSeconds: 200,
      weightCentigrams: 146,
      source: 'gcode',
      filaments: [{ type: 'UNKNOWN', usedCentigrams: 146 }],
    })
    expect(summary.warnings.some((warning) => warning.code === 'GCODE_FALLBACK')).toBe(true)
  })

  it('rifiuta un G-code troppo grande per il fallback', () => {
    const gcode = 'x'.repeat(200)
    expect(
      errorCode(
        buildZip({
          '[Content_Types].xml': '<Types/>',
          '3D/3dmodel.model': minimalModel,
          'Metadata/project_settings.config': '{}',
          'Metadata/plate_1.gcode': gcode,
        }),
        { limits: { maxGcodeFallbackBytes: 100 } },
      ),
    ).toBe('GCODE_FALLBACK_TOO_LARGE')
  })

  it('applica i limiti di sicurezza', () => {
    const bytes = fixture('anycubic-kobra3-pla.gcode.3mf')
    expect(errorCode(bytes, { limits: { maxCompressedBytes: 10 } })).toBe('ARCHIVE_TOO_LARGE')
    expect(errorCode(bytes, { limits: { maxEntries: 1 } })).toBe('TOO_MANY_ENTRIES')
    expect(
      errorCode(fixture('anycubic-kobrax-2plates.gcode.3mf'), { limits: { maxPlates: 1 } }),
    ).toBe('TOO_MANY_PLATES')
  })

  it('rifiuta percorsi non sicuri e archivi cifrati', () => {
    expect(errorCode(buildZip({ '../evil.txt': 'x' }))).toBe('UNSAFE_PATH')

    const bytes = fixture('anycubic-kobra3-pla.gcode.3mf')
    const encrypted = new Uint8Array(bytes)
    const view = new DataView(encrypted.buffer)
    for (let offset = 0; offset < encrypted.length - 4; offset += 1) {
      const signature = view.getUint32(offset, true)
      if (signature === 0x04034b50) {
        view.setUint16(offset + 6, view.getUint16(offset + 6, true) | 1, true)
      }
      if (signature === 0x02014b50) {
        view.setUint16(offset + 8, view.getUint16(offset + 8, true) | 1, true)
      }
    }
    expect(errorCode(encrypted)).toBe('ENCRYPTED_ENTRY')
  })
})
