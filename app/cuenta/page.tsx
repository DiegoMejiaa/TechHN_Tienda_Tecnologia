'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/contexts/auth-context';

export default function CuentaPage() {
  const { usuario, logout } = useAuth();

  if (!usuario) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold">Inicia sesion para ver tu cuenta</h1>
            <Link href="/auth/login" className="btn-primary mt-6 inline-flex px-8 py-3 transition-all duration-150 active:scale-95">
              Iniciar sesion
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="font-serif text-3xl font-bold">Mi cuenta</h1>
          <p className="mt-2 text-muted-foreground">
            Administra tu perfil y preferencias
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-2xl font-bold">
                    {usuario.nombre.charAt(0)}{usuario.apellido.charAt(0)}
                  </div>
                  <div>
                    <h2 className="font-semibold">{usuario.nombre} {usuario.apellido}</h2>
                    <p className="text-sm text-muted-foreground">{usuario.correo}</p>
                  </div>
                </div>

                <nav className="mt-6 space-y-1">
                  <Link
                    href="/cuenta"
                    className="flex items-center gap-3 rounded-lg bg-secondary px-4 py-2 text-sm font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                    Perfil
                  </Link>
                  <Link
                    href="/pedidos"
                    className="flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                    Mis pedidos
                  </Link>
                  <Link
                    href="/carrito"
                    className="flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                    </svg>
                    Carrito
                  </Link>
                </nav>

                <div className="mt-6 border-t border-border pt-6">
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-150 active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                    </svg>
                    Cerrar sesion
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-2">
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">Informacion personal</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tu informacion de perfil
                </p>

                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">Nombre</label>
                    <p className="mt-1">{usuario.nombre}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">Apellido</label>
                    <p className="mt-1">{usuario.apellido}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">Correo electronico</label>
                    <p className="mt-1">{usuario.correo}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">Telefono</label>
                    <p className="mt-1">{usuario.telefono || 'No especificado'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">Miembro desde</label>
                    <p className="mt-1">
                      {new Date(usuario.creado_en).toLocaleDateString('es-HN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">Tipo de cuenta</label>
                    <p className="mt-1 capitalize">{usuario.rol_nombre || 'Cliente'}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Link
                  href="/pedidos"
                  className="flex items-center gap-4 rounded-lg border border-border bg-card p-6 transition-colors hover:border-accent"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-accent">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Ver mis pedidos</h3>
                    <p className="text-sm text-muted-foreground">Revisa el estado de tus compras</p>
                  </div>
                </Link>

                <Link
                  href="/productos"
                  className="flex items-center gap-4 rounded-lg border border-border bg-card p-6 transition-colors hover:border-accent"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-accent">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Explorar productos</h3>
                    <p className="text-sm text-muted-foreground">Descubre nuevos productos</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
