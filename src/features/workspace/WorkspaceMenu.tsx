import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { Alert, Button, ChevronDown, Field, Input, Modal } from '@/components/ui'
import { isCloudConfigured } from '@/data/cloud/client'
import { useAuthStore } from '@/state/auth-store'
import { useWorkspaceStore } from '@/state/workspace-store'
import { cn } from '@/lib/cn'
import { workspaceErrorKeys } from './messages'

function Check() {
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

function Plus() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  )
}

function Key() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="5.5" cy="10.5" r="2.5" />
      <path d="m7.5 8.5 5-5M10.5 5.5 12 7M12.5 3.5 14 5" />
    </svg>
  )
}

function Sliders() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M3 5h10M3 11h10" />
      <circle cx="6" cy="5" r="1.5" />
      <circle cx="10" cy="11" r="1.5" />
    </svg>
  )
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initial = name.trim().charAt(0).toUpperCase() || '·'
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center rounded-[5px] border border-line bg-transparent font-semibold text-ink',
        size === 'md' ? 'size-5 text-[10px]' : 'size-7 text-xs',
      )}
    >
      {initial}
    </span>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  role = 'menuitem',
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  role?: 'menuitem'
}) {
  return (
    <button
      type="button"
      role={role}
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-control px-2 py-2 text-left text-sm text-muted transition-feedback hover:bg-raised hover:text-ink"
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

/**
 * Workspace switcher as a compact pill menu for the top bar. It replaces the
 * old select + buttons block in the sidebar without changing guest mode: in
 * guest mode it renders nothing.
 */
export function WorkspaceMenu({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const menuId = useId()
  const buttonId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const authStatus = useAuthStore((state) => state.status)
  const status = useWorkspaceStore((state) => state.status)
  const workspaces = useWorkspaceStore((state) => state.workspaces)
  const activeId = useWorkspaceStore((state) => state.activeId)
  const error = useWorkspaceStore((state) => state.error)
  const activate = useWorkspaceStore((state) => state.activate)
  const load = useWorkspaceStore((state) => state.load)
  const create = useWorkspaceStore((state) => state.create)
  const redeem = useWorkspaceStore((state) => state.redeem)
  const clearError = useWorkspaceStore((state) => state.clearError)

  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const active = workspaces.find((workspace) => workspace.id === activeId)
  const errorMessage = error ? t(workspaceErrorKeys[error]) : undefined

  useEffect(() => {
    if (!open) return

    const activeItem = menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')
    const firstItem = menuRef.current?.querySelector<HTMLElement>('[role^="menuitem"]')
    ;(activeItem ?? firstItem)?.focus()

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
      buttonRef.current?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!isCloudConfigured() || authStatus !== 'authenticated') return null

  const openCreate = () => {
    clearError()
    setName('')
    setOpen(false)
    setCreateOpen(true)
  }

  const openRedeem = () => {
    clearError()
    setCode('')
    setOpen(false)
    setRedeemOpen(true)
  }

  const submitCreate = async () => {
    if (name.trim() === '' || busy) return
    setBusy(true)
    const id = await create(name)
    setBusy(false)
    if (id) {
      setCreateOpen(false)
      setName('')
    }
  }

  const submitRedeem = async () => {
    if (code.trim() === '' || busy) return
    setBusy(true)
    const id = await redeem(code)
    setBusy(false)
    if (id) {
      setRedeemOpen(false)
      setCode('')
    }
  }

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [],
    )
    if (items.length === 0) return
    const index = items.indexOf(document.activeElement as HTMLElement)
    const next =
      event.key === 'ArrowDown'
        ? (index + 1 + items.length) % items.length
        : (index - 1 + items.length) % items.length
    items[next]?.focus()
  }

  if (status === 'error' && !active) {
    return (
      <button
        type="button"
        onClick={() => void load()}
        title={errorMessage}
        className="flex h-9 items-center gap-2 rounded-control bg-raised px-2.5 text-xs font-medium text-negative transition-feedback hover:bg-line"
      >
        <span
          aria-hidden="true"
          className="grid size-5 place-items-center rounded-[5px] border border-line bg-surface"
        >
          !
        </span>
        {!compact ? <span>{t('workspace.retry')}</span> : null}
      </button>
    )
  }

  if (!active) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-control bg-raised px-2.5">
        <span
          className="size-5 animate-pulse rounded-[5px] border border-line bg-surface"
          aria-hidden="true"
        />
        {!compact ? <span className="text-xs text-muted">{t('workspace.loading')}</span> : null}
      </div>
    )
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex h-9 items-center gap-2 rounded-control bg-raised pl-1.5 text-left transition-feedback hover:bg-line',
          compact ? 'pr-2' : 'pr-2.5',
        )}
      >
        <span className="sr-only">{t('workspace.spaces')}: </span>
        <Avatar name={active.name} />
        <span
          className={
            compact ? 'sr-only' : 'max-w-[12rem] truncate text-sm font-medium text-ink'
          }
        >
          {active.name}
        </span>
        <ChevronDown open={open} />
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-labelledby={buttonId}
          onKeyDown={handleMenuKeyDown}
          className={cn(
            'absolute top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-card border border-line bg-surface p-1.5 shadow-overlay',
            compact ? 'right-0' : 'left-0',
          )}
        >
          <p className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            {t('workspace.spaces')}
          </p>

          {workspaces.map((workspace) => {
            const selected = workspace.id === active.id
            return (
              <button
                key={workspace.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  activate(workspace.id)
                  setOpen(false)
                  buttonRef.current?.focus()
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-control px-2 py-2 text-left transition-feedback hover:bg-raised',
                  selected && 'bg-raised',
                )}
              >
                <Avatar name={workspace.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {workspace.name}
                  </span>
                  <span className="block text-[11px] text-muted">
                    {workspace.role === 'owner'
                      ? t('workspace.roleOwner')
                      : t('workspace.roleEditor')}
                  </span>
                </span>
                {selected ? <Check /> : null}
              </button>
            )
          })}

          <div className="my-1 h-px bg-line" />

          <MenuItem icon={<Plus />} label={t('workspace.new')} onClick={openCreate} />
          <MenuItem icon={<Key />} label={t('workspace.redeem')} onClick={openRedeem} />
          <MenuItem
            icon={<Sliders />}
            label={t('workspace.manage')}
            onClick={() => {
              setOpen(false)
              buttonRef.current?.focus()
              navigate('/settings')
            }}
          />

          {errorMessage ? (
            <p role="alert" className="px-2 pb-1 pt-1.5 text-xs text-negative">
              {errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('workspace.newTitle')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void submitCreate()} disabled={busy || name.trim() === ''}>
              {t('workspace.create')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">{t('workspace.newDescription')}</p>
          <Field label={t('workspace.name')} htmlFor={`${menuId}-name`}>
            <Input
              id={`${menuId}-name`}
              value={name}
              maxLength={80}
              placeholder={t('workspace.namePlaceholder')}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          {errorMessage ? (
            <Alert tone="danger" title={t('common.error')}>
              {errorMessage}
            </Alert>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={redeemOpen}
        onClose={() => setRedeemOpen(false)}
        title={t('workspace.redeemTitle')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRedeemOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void submitRedeem()} disabled={busy || code.trim() === ''}>
              {t('workspace.redeemAction')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">{t('workspace.redeemDescription')}</p>
          <Field label={t('workspace.redeemCode')} htmlFor={`${menuId}-code`}>
            <Input
              id={`${menuId}-code`}
              value={code}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setCode(event.target.value)}
            />
          </Field>
          {errorMessage ? (
            <Alert tone="danger" title={t('common.error')}>
              {errorMessage}
            </Alert>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
