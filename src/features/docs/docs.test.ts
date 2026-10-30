import { describe, expect, it } from 'vitest'
import { docsEn } from '@/i18n/en/docs'
import { docsIt } from '@/i18n/it/docs'
import {
  DEFAULT_DOCS_SECTION,
  DOCS_SECTIONS,
  docsSectionNeighbours,
  findDocsSection,
} from './content'
import type { DocsKey } from './i18n'

describe('contenuti della documentazione', () => {
  it('ha sezioni con id univoci e contenuto non vuoto', () => {
    const ids = DOCS_SECTIONS.map((section) => section.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids[0]).toBe(DEFAULT_DOCS_SECTION)
    for (const section of DOCS_SECTIONS) {
      expect(section.blocks.length).toBeGreaterThan(0)
      expect(section.links.length).toBeGreaterThan(0)
      for (const block of section.blocks) {
        if (block.kind === 'paragraph') expect(block.textKey).toBeTruthy()
        if (block.kind === 'steps' || block.kind === 'bullets') {
          expect(block.items.length).toBeGreaterThan(0)
        }
        if (block.kind === 'figure') {
          expect(block.src).toMatch(/^(landing|docs)\/[a-z0-9-]+\.jpg$/)
        }
      }
    }
  })

  it('risolve le sezioni e i vicini', () => {
    expect(findDocsSection('materiali')?.id).toBe('materiali')
    expect(findDocsSection('non-esiste')).toBeUndefined()
    expect(findDocsSection(undefined)).toBeUndefined()

    expect(docsSectionNeighbours('primi-passi')).toEqual({
      previous: undefined,
      next: DOCS_SECTIONS[1],
    })
    expect(docsSectionNeighbours('materiali')).toMatchObject({
      previous: { id: 'stampanti' },
      next: { id: 'tariffe-extra' },
    })
    expect(docsSectionNeighbours(DOCS_SECTIONS[DOCS_SECTIONS.length - 1]!.id)).toMatchObject({
      next: undefined,
    })
  })

  it('ha testi italiani e inglesi per ogni chiave', () => {
    const collect = (): DocsKey[] => {
      const keys: DocsKey[] = []
      for (const section of DOCS_SECTIONS) {
        keys.push(section.labelKey, section.titleKey, section.introKey)
        for (const block of section.blocks) {
          if (block.kind === 'paragraph') keys.push(block.textKey)
          if (block.kind === 'steps' || block.kind === 'bullets') {
            keys.push(...block.items)
            if (block.titleKey) keys.push(block.titleKey)
          }
          if (block.kind === 'note') keys.push(block.titleKey, block.textKey)
          if (block.kind === 'figure') keys.push(block.altKey, block.captionKey)
        }
        keys.push(...section.links.map((link) => link.labelKey))
      }
      return keys
    }

    for (const key of collect()) {
      expect(docsIt[key], `it: ${key}`).toBeTruthy()
      expect(docsEn[key], `en: ${key}`).toBeTruthy()
    }
  })
})
