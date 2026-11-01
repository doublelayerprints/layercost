import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useFieldIds } from './field-context'
import { cn } from '@/lib/cn'

interface SelectItem {
  value: string
  label: ReactNode
  text: string
  disabled: boolean
}

interface OptionProps {
  children?: ReactNode
  value?: string | number
  disabled?: boolean
}

interface ListPosition {
  left: number
  top?: number
  bottom?: number
  minWidth: number
  maxWidth: number
  maxHeight: number
}

export interface SelectProps {
  id?: string
  name?: string
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
  disabled?: boolean
  required?: boolean
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
}

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children)
  return ''
}

function collectItems(children: ReactNode, items: SelectItem[]): void {
  Children.forEach(children, (child) => {
    if (!isValidElement<OptionProps>(child)) return
    if (child.type === 'optgroup') {
      collectItems(child.props.children, items)
      return
    }
    if (child.type !== 'option') return
    const label = child.props.children
    const text = textOf(label)
    items.push({
      value: child.props.value === undefined ? text : String(child.props.value),
      label,
      text,
      disabled: child.props.disabled === true,
    })
  })
}

function describedBy(
  ariaDescribedBy: string | undefined,
  ids: { errorId?: string; hintId?: string },
): string | undefined {
  return [ariaDescribedBy, ids.errorId, ids.hintId].filter(Boolean).join(' ') || undefined
}

function SelectChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={cn(
        'size-4 shrink-0 text-muted transition-transform duration-150',
        open && 'rotate-180',
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  )
}

function OptionCheck() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-4 shrink-0 text-data"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  )
}

export function Select({
  id,
  name,
  value,
  onValueChange,
  children,
  disabled,
  required,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: SelectProps) {
  const ids = useFieldIds()
  const generatedId = useId()
  const triggerId = id ?? `${generatedId}-trigger`
  const listId = `${generatedId}-listbox`
  const optionId = (index: number) => `${generatedId}-option-${index}`

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [position, setPosition] = useState<ListPosition | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<Array<HTMLDivElement | null>>([])
  const searchRef = useRef<{ query: string; timer?: number }>({ query: '' })

  const items: SelectItem[] = []
  collectItems(children, items)
  const selectedIndex = items.findIndex((item) => item.value === value)
  const selected = selectedIndex >= 0 ? items[selectedIndex] : undefined

  const firstEnabled = () => items.findIndex((item) => !item.disabled)
  const lastEnabled = () => {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      if (!items[index]?.disabled) return index
    }
    return -1
  }
  const initialActive = () =>
    selectedIndex >= 0 && !items[selectedIndex]?.disabled ? selectedIndex : firstEnabled()

  function closeList() {
    window.clearTimeout(searchRef.current.timer)
    searchRef.current.query = ''
    setOpen(false)
    setPosition(null)
  }

  function openList() {
    if (items.length === 0) return
    optionRefs.current = []
    setPosition(null)
    setActiveIndex(initialActive())
    setOpen(true)
  }

  function selectItem(item: SelectItem | undefined) {
    if (!item || item.disabled) return
    if (item.value !== value) onValueChange(item.value)
    closeList()
    triggerRef.current?.focus({ preventScroll: true })
  }

  function moveActive(delta: 1 | -1) {
    if (items.length === 0) return
    let index = activeIndex
    if (index < 0) index = delta > 0 ? -1 : 0
    for (let step = 0; step < items.length; step += 1) {
      index = (index + delta + items.length) % items.length
      if (!items[index]?.disabled) {
        setActiveIndex(index)
        return
      }
    }
  }

  function findMatch(query: string, start: number): number {
    for (let step = 0; step < items.length; step += 1) {
      const index = (((start + step) % items.length) + items.length) % items.length
      const item = items[index]
      if (item && !item.disabled && item.text.toLowerCase().startsWith(query)) return index
    }
    return -1
  }

  function typeAhead(key: string) {
    const search = searchRef.current
    const query = search.query + key.toLowerCase()
    search.query = query
    window.clearTimeout(search.timer)
    search.timer = window.setTimeout(() => {
      search.query = ''
    }, 600)

    if (!open) openList()
    const repeated = query.length > 1 && query[query.length - 1] === query[query.length - 2]
    const start = activeIndex + (repeated ? 1 : 0)
    const match = findMatch(query, Math.max(start, 0))
    if (match >= 0) setActiveIndex(match)
  }

  function updatePosition() {
    const trigger = triggerRef.current
    const list = listRef.current
    if (!trigger || !list) return

    const rect = trigger.getBoundingClientRect()
    const margin = 8
    const gap = 4
    const maxWidth = Math.min(352, window.innerWidth - margin * 2)
    const width = Math.max(rect.width, list.getBoundingClientRect().width)
    const contentHeight = Math.min(list.scrollHeight, 288)
    const spaceBelow = window.innerHeight - rect.bottom - gap - margin
    const spaceAbove = rect.top - gap - margin
    const openUp = contentHeight > spaceBelow && spaceAbove > spaceBelow
    const maxHeight = Math.max(96, Math.min(288, openUp ? spaceAbove : spaceBelow))
    const left = Math.min(
      Math.max(margin, rect.left),
      Math.max(margin, window.innerWidth - width - margin),
    )

    setPosition({
      left,
      top: openUp ? undefined : rect.bottom + gap,
      bottom: openUp ? window.innerHeight - rect.top + gap : undefined,
      minWidth: rect.width,
      maxWidth,
      maxHeight,
    })
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (open) moveActive(1)
        else openList()
        break
      case 'ArrowUp':
        event.preventDefault()
        if (open) moveActive(-1)
        else openList()
        break
      case 'Home':
        if (!open) return
        event.preventDefault()
        setActiveIndex(firstEnabled())
        break
      case 'End':
        if (!open) return
        event.preventDefault()
        setActiveIndex(lastEnabled())
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (open) selectItem(items[activeIndex])
        else openList()
        break
      case 'Escape':
        if (!open) return
        event.preventDefault()
        event.stopPropagation()
        closeList()
        break
      case 'Tab':
        if (open) closeList()
        break
      default:
        if (
          event.key.length === 1 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey &&
          event.key !== ' '
        ) {
          event.preventDefault()
          typeAhead(event.key)
        }
    }
  }

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
  }, [open])

  useEffect(() => {
    if (!open || activeIndex < 0) return
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  useEffect(() => {
    if (!open) return
    let frame = 0
    const update = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        updatePosition()
      })
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return
      closeList()
    }
    const handleScroll = (event: Event) => {
      if (listRef.current?.contains(event.target as Node)) return
      update()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', update)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  useEffect(() => {
    const search = searchRef.current
    return () => window.clearTimeout(search.timer)
  }, [])

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-describedby={describedBy(ariaDescribedBy, ids)}
        aria-invalid={ids.errorId ? true : ariaInvalid}
        aria-required={required || undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        disabled={disabled}
        data-value={value}
        title={selected?.text || undefined}
        onClick={() => {
          if (open) closeList()
          else openList()
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-control border border-control bg-surface px-3 text-left text-sm text-ink transition-feedback disabled:bg-raised disabled:text-muted max-sm:h-11',
          open && 'border-data',
          className,
        )}
      >
        <span className="truncate">{selected?.label ?? ''}</span>
        <SelectChevron open={open} />
      </button>
      {name ? <input type="hidden" name={name} value={value} /> : null}

      {open
        ? createPortal(
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              aria-labelledby={triggerId}
              style={{
                left: position?.left ?? 0,
                top: position?.top,
                bottom: position?.bottom,
                minWidth: position?.minWidth,
                maxWidth: position?.maxWidth,
                maxHeight: position?.maxHeight,
                visibility: position ? 'visible' : 'hidden',
              }}
              className="fixed z-[60] overflow-y-auto overscroll-contain rounded-card border border-line bg-surface p-1 shadow-overlay"
            >
              {items.map((item, index) => {
                const isSelected = index === selectedIndex
                const isActive = index === activeIndex
                return (
                  <div
                    key={`${item.value}-${index}`}
                    ref={(node) => {
                      optionRefs.current[index] = node
                    }}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={item.disabled || undefined}
                    onClick={() => selectItem(item)}
                    onPointerEnter={() => {
                      if (!item.disabled && activeIndex !== index) setActiveIndex(index)
                    }}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-control px-2.5 py-1.5 text-sm sm:min-h-9',
                      isActive && 'bg-raised',
                      isSelected && 'font-medium',
                      item.disabled && 'cursor-not-allowed text-muted opacity-60',
                    )}
                  >
                    <span className="min-w-0 truncate">{item.label}</span>
                    {isSelected ? <OptionCheck /> : null}
                  </div>
                )
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
