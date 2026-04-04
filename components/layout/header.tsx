'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useCart } from '@/contexts/cart-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function Header() {
  const { usuario, isAdmin, isCajero, logout } = useAuth();
  const { carrito } = useCart();
  const itemCount = carrito?.items?.length ?? 0;
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--card) 92%, transparent)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm font-bold"
            style={{ backgroundColor: 'var(--blue)' }}
          >
            TW
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ color: 'var(--text)' }}>
            TechHN
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 sm:flex">
          {isAdmin && (
            <>
              <NavLink href="/admin">Panel Admin</NavLink>
              <NavLink href="/productos">Tienda</NavLink>
            </>
          )}
          {isCajero && !isAdmin && (
            <>
              <NavLink href="/cajero">Punto de Venta</NavLink>
              <NavLink href="/cajero/pedidos">Pedidos</NavLink>
              <NavLink href="/cajero/stock">Stock</NavLink>
            </>
          )}
          {!isAdmin && !isCajero && (
            <>
              <NavLink href="/productos">Productos</NavLink>
              <NavLink href="/categorias">Categorías</NavLink>
              <NavLink href="/tiendas">Tiendas</NavLink>
            </>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {!isCajero && (
            <Link
              href="/carrito"
              className="btn-icon relative"
              aria-label="Carrito"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
              {itemCount > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: 'var(--blue)' }}
                >
                  {itemCount}
                </span>
              )}
            </Link>
          )}

          {usuario ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href={isAdmin ? '/admin' : isCajero ? '/cajero' : '/cuenta'}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                style={{ color: 'var(--text)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: 'var(--blue)' }}
                >
                  {usuario.nombre.charAt(0).toUpperCase()}
                </div>
                <span>{usuario.nombre}</span>
                {isAdmin && (
                  <span className="rounded px-1 py-0.5 text-xs font-semibold" style={{ backgroundColor: 'var(--blue-light)', color: 'var(--blue)' }}>
                    Admin
                  </span>
                )}
                {isCajero && (
                  <span className="rounded px-1 py-0.5 text-xs font-semibold" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                    Cajero
                  </span>
                )}
              </Link>
              <button onClick={logout} className="btn-ghost text-xs px-3 py-1.5">
                Salir
              </button>
            </div>
          ) : (
            <Link href="/auth/login" className="btn-primary hidden sm:inline-flex text-xs px-4 py-2">
              Ingresar
            </Link>
          )}

          {/* Mobile menu button */}
          <button
            className="btn-icon sm:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menú"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="border-t sm:hidden"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
        >
          <div className="space-y-1 px-4 py-3">
            {isAdmin && (
              <>
                <MobileNavLink href="/admin" onClick={() => setMobileOpen(false)}>Panel Admin</MobileNavLink>
                <MobileNavLink href="/productos" onClick={() => setMobileOpen(false)}>Tienda</MobileNavLink>
              </>
            )}
            {isCajero && !isAdmin && (
              <>
                <MobileNavLink href="/cajero" onClick={() => setMobileOpen(false)}>Punto de Venta</MobileNavLink>
                <MobileNavLink href="/cajero/pedidos" onClick={() => setMobileOpen(false)}>Pedidos</MobileNavLink>
                <MobileNavLink href="/cajero/stock" onClick={() => setMobileOpen(false)}>Stock</MobileNavLink>
              </>
            )}
            {!isAdmin && !isCajero && (
              <>
                <MobileNavLink href="/productos" onClick={() => setMobileOpen(false)}>Productos</MobileNavLink>
                <MobileNavLink href="/categorias" onClick={() => setMobileOpen(false)}>Categorías</MobileNavLink>
                <MobileNavLink href="/tiendas" onClick={() => setMobileOpen(false)}>Tiendas</MobileNavLink>
              </>
            )}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              {usuario ? (
                <button
                  onClick={() => { logout(); setMobileOpen(false); }}
                  className="w-full text-left rounded-lg px-3 py-2 text-sm font-medium"
                  style={{ color: 'var(--danger)' }}
                >
                  Cerrar sesión
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium"
                  style={{ color: 'var(--blue)' }}
                >
                  Ingresar
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
      style={{ color: 'var(--text-muted)' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.color = 'var(--text)';
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-secondary)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-lg px-3 py-2 text-sm font-medium transition-colors"
      style={{ color: 'var(--text-muted)' }}
    >
      {children}
    </Link>
  );
}
