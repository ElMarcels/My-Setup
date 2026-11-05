import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  LogOut,
  Menu,
  Plus,
  Settings2,
  User,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Avatar } from './ui/Avatar'
import { LinkButton, buttonClasses } from './ui/Button'
import { Logo } from './Logo'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { to: '/', label: 'feed' },
  { to: '/new', label: 'nuevo setup' },
]

export function Navbar() {
  const { user, loading, logout } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMenuOpen(false)
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return

    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const handleLogout = async () => {
    await logout()
    setMenuOpen(false)
    push('Sesión cerrada. Hasta pronto.', 'info')
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded px-3 py-1.5 font-mono text-[11px] tracking-wide transition',
                  isActive
                    ? 'bg-white/[0.04] text-paper'
                    : 'text-dim hover:bg-white/[0.03] hover:text-paper',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-raised" />
          ) : user ? (
            <>
              <LinkButton
                to="/new"
                size="sm"
                className="hidden sm:inline-flex"
                leftIcon={<Plus size={13} />}
              >
                publicar
              </LinkButton>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className={cn(
                    'flex items-center gap-2 rounded-md border p-1 pr-1.5 transition',
                    menuOpen
                      ? 'border-line-bright bg-panel'
                      : 'border-transparent hover:border-line hover:bg-panel',
                  )}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <Avatar user={user} size="sm" />
                  <span className="hidden max-w-[110px] truncate font-mono text-[11px] text-dim lg:block">
                    @{user.username}
                  </span>
                  <ChevronDown
                    size={13}
                    className={cn('text-faint transition', menuOpen && 'rotate-180')}
                  />
                </button>

                {menuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+8px)] w-60 animate-rise overflow-hidden rounded-lg border border-line bg-panel shadow-2xl shadow-black/60"
                  >
                    <div className="border-b border-line bg-surface/60 px-3 py-3">
                      <p className="truncate font-mono text-[11px] text-paper">@{user.username}</p>
                      <p className="mt-0.5 truncate text-[11px] text-faint">{user.email}</p>
                    </div>
                    <div className="p-1.5">
                      <MenuItem to={`/u/${user.username}`} icon={<User size={14} />}>
                        mi perfil
                      </MenuItem>
                      <MenuItem to="/new" icon={<Plus size={14} />}>
                        nuevo setup
                      </MenuItem>
                      <MenuItem to="/settings" icon={<Settings2 size={14} />}>
                        ajustes
                      </MenuItem>
                    </div>
                    <div className="border-t border-line p-1.5">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 font-mono text-[11px] text-dim transition hover:bg-danger/10 hover:text-danger"
                        role="menuitem"
                      >
                        <LogOut size={14} />
                        cerrar sesión
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden rounded px-3 py-2 font-mono text-[11px] text-dim transition hover:text-paper sm:block"
              >
                entrar
              </Link>
              <LinkButton to="/register" size="sm" className="hidden sm:inline-flex">
                crear cuenta
              </LinkButton>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="grid h-9 w-9 place-items-center rounded-md border border-line text-dim transition hover:bg-panel hover:text-paper md:hidden"
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-line bg-surface/95 px-4 py-4 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded px-3 py-2.5 font-mono text-xs transition',
                    isActive ? 'bg-white/[0.04] text-paper' : 'text-dim hover:bg-white/[0.03]',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          {!user && !loading ? (
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
              <Link to="/login" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                entrar
              </Link>
              <Link to="/register" className={buttonClasses({ size: 'sm' })}>
                crear cuenta
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  )
}

function MenuItem({
  to,
  icon,
  children,
}: {
  to: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      role="menuitem"
      className="flex items-center gap-2.5 rounded px-2.5 py-2 font-mono text-[11px] text-dim transition hover:bg-white/[0.04] hover:text-paper"
    >
      {icon}
      {children}
    </Link>
  )
}
