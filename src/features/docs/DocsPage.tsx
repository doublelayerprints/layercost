import { useEffect, useRef } from 'react'
import { Link, Navigate, NavLink, useParams } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { Alert, Card } from '@/components/ui'
import { cn } from '@/lib/cn'
import {
  DEFAULT_DOCS_SECTION,
  DOCS_SECTIONS,
  docsSectionNeighbours,
  findDocsSection,
  type DocsBlock,
} from './content'
import { translateDocs, type DocsKey } from './i18n'

function useDocsTranslator() {
  const { locale } = useI18n()
  return (key: DocsKey) => translateDocs(locale, key)
}

function DocsIndex({ sectionId }: { sectionId: string }) {
  const t = useDocsTranslator()

  return (
    <nav aria-label={t('docs.index')} className="lg:sticky lg:top-6">
      <p className="hidden px-3 pb-2 text-xs font-medium text-muted lg:block">{t('docs.index')}</p>
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0">
        <ul className="flex w-max gap-1 lg:w-auto lg:flex-col lg:gap-px">
          {DOCS_SECTIONS.map((section) => (
            <li key={section.id} className="shrink-0">
              <NavLink
                to={`/docs/${section.id}`}
                aria-current={section.id === sectionId ? 'page' : undefined}
                className={cn(
                  'block whitespace-nowrap rounded-control px-3 py-2 text-sm transition-feedback lg:whitespace-normal lg:py-[7px]',
                  section.id === sectionId
                    ? 'bg-raised font-medium text-ink'
                    : 'text-muted hover:bg-raised hover:text-ink',
                )}
              >
                {t(section.labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

function DocsBlockView({
  block,
  sectionId,
  index,
}: {
  block: DocsBlock
  sectionId: string
  index: number
}) {
  const t = useDocsTranslator()

  if (block.kind === 'paragraph') {
    return <p className="mt-4 text-sm leading-relaxed text-ink">{t(block.textKey)}</p>
  }

  if (block.kind === 'steps' || block.kind === 'bullets') {
    const headingId = `${sectionId}-block-${index}`
    const List = block.kind === 'steps' ? 'ol' : 'ul'
    return (
      <section className="mt-7" aria-labelledby={block.titleKey ? headingId : undefined}>
        {block.titleKey ? (
          <h2 id={headingId} className="text-base font-semibold text-ink">
            {t(block.titleKey)}
          </h2>
        ) : null}
        <List
          className={cn(
            'mt-3 space-y-2.5 text-sm leading-relaxed text-ink',
            block.kind === 'steps'
              ? 'list-decimal pl-5 marker:font-medium marker:text-muted'
              : 'list-disc pl-5 marker:text-muted',
          )}
        >
          {block.items.map((itemKey) => (
            <li key={itemKey}>{t(itemKey)}</li>
          ))}
        </List>
      </section>
    )
  }

  if (block.kind === 'note') {
    return (
      <div className="mt-6">
        <Alert tone={block.tone} title={t(block.titleKey)}>
          <p>{t(block.textKey)}</p>
        </Alert>
      </div>
    )
  }

  return (
    <figure className="mt-7">
      <img
        src={block.src}
        alt={t(block.altKey)}
        width={1440}
        height={1000}
        loading="lazy"
        decoding="async"
        className="h-auto w-full rounded-card border border-line bg-surface"
      />
      <figcaption className="mt-2 text-xs leading-relaxed text-muted">
        {t(block.captionKey)}
      </figcaption>
    </figure>
  )
}

export function DocsPage() {
  const t = useDocsTranslator()
  const { section: sectionId } = useParams<{ section: string }>()
  const section = findDocsSection(sectionId)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousId = useRef(section?.id)

  useEffect(() => {
    if (previousId.current && previousId.current !== section?.id) {
      headingRef.current?.focus()
    }
    previousId.current = section?.id
  }, [section?.id])

  if (!sectionId) {
    return <Navigate to={`/docs/${DEFAULT_DOCS_SECTION}`} replace />
  }

  if (!section) {
    return <Navigate to={`/docs/${DEFAULT_DOCS_SECTION}`} replace />
  }

  const { previous, next } = docsSectionNeighbours(section.id)

  return (
    <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
      <DocsIndex sectionId={section.id} />

      <article aria-labelledby="docs-section-title" className="min-w-0 max-w-3xl">
        <header>
          <p className="text-xs font-medium text-muted">{t('docs.title')}</p>
          <h1
            ref={headingRef}
            id="docs-section-title"
            tabIndex={-1}
            className="mt-1 text-2xl font-semibold tracking-title text-ink outline-none"
          >
            {t(section.titleKey)}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{t(section.introKey)}</p>
        </header>

        {section.blocks.map((block, index) => (
          <DocsBlockView
            key={`${section.id}-${index}`}
            block={block}
            sectionId={section.id}
            index={index}
          />
        ))}

        {section.links.length > 0 ? (
          <section className="mt-8" aria-labelledby="docs-related-title">
            <h2 id="docs-related-title" className="text-base font-semibold text-ink">
              {t('docs.related')}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {section.links.map((link) => (
                <li key={`${link.to}-${link.labelKey}`}>
                  <Link
                    to={link.to}
                    className="inline-flex min-h-9 items-center rounded-control border border-line bg-surface px-3 text-sm font-medium text-ink transition-feedback hover:bg-raised"
                  >
                    {t(link.labelKey)}
                    <span aria-hidden="true" className="ml-1.5 text-muted">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <nav
          aria-label={t('docs.pagination')}
          className="mt-10 flex items-start justify-between gap-4 border-t border-line pt-5"
        >
          {previous ? (
            <Link to={`/docs/${previous.id}`} className="group min-w-0 text-sm">
              <span className="block text-xs text-muted">{t('docs.previous')}</span>
              <span className="mt-0.5 block font-medium text-ink underline decoration-line underline-offset-2 group-hover:decoration-ink">
                {t(previous.labelKey)}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to={`/docs/${next.id}`} className="group min-w-0 text-right text-sm">
              <span className="block text-xs text-muted">{t('docs.next')}</span>
              <span className="mt-0.5 block font-medium text-ink underline decoration-line underline-offset-2 group-hover:decoration-ink">
                {t(next.labelKey)}
              </span>
            </Link>
          ) : (
            <span />
          )}
        </nav>

        <Card className="mt-8 p-5">
          <h2 className="text-base font-semibold text-ink">{t('docs.feedback.title')}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{t('docs.feedback.body')}</p>
          <Link
            to="/feedback"
            className="mt-3 inline-flex min-h-9 items-center rounded-control bg-ink px-3 text-sm font-medium text-surface transition-feedback hover:opacity-90"
          >
            {t('docs.feedback.action')}
          </Link>
        </Card>
      </article>
    </div>
  )
}
