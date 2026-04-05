'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/contexts/auth-context';

const NAV = [
  { href: '/pedidos', label: 'Mis pedidos', icon: 'M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z', desc: 'Revisa el estado de tus compras' },
  { href: '/carrito', label: 'Mi carrito', icon: 'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z', desc: 'Productos guardados' },
  { href: '/productos', label: 'Explorar', icon: 'M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z', desc: 'Descubre nuevos productos' },
];

export default function CuentaPage() {
  const { usuario, logout } = useAuth();

  if (!usuario) {
    return (
      <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'var(--bg)' }}>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text)' }}>Inicia sesión para ver tu cuenta</h1>
            <Link href="/auth/login" className="btn-primary px-8 py-3">Iniciar sesión</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const iniciales = `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`.toUpperCase();
  const miembroDesde = new Date(usuario.creado_en).toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <Header />
      <main className="flex-1">
        {/* Hero banner */}
        <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)', minHeight: 160 }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-xl"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))', border: '2px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)' }}>
                {iniciales}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{usuario.nombre} {usuario.apellido}</h1>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{usuario.correo}</p>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.25)' }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  Cliente · Miembro desde {miembroDesde}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Info card */}
              <div className="card p-5 space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Información personal</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Nombre completo', value: `${usuario.nombre} ${usuario.apellido}` },
                    { label: 'Correo', value: usuario.correo },
                    { label: 'Teléfono', value: usuario.telefono || 'No especificado' },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl px-3 py-2.5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                      <p className="text-sm font-medium mt-0.5 truncate" style={{ color: 'var(--text)' }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Logout */}
              <button onClick={logout}
                className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all"
                style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                Cerrar sesión
              </button>
            </div>

            {/* Acciones rápidas */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Acceso rápido</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {NAV.map((item, i) => (
                  <Link key={item.href} href={item.href}
                    className="group card p-5 flex flex-col gap-3 transition-all duration-200"
                    style={{ borderColor: 'var(--border)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(37,99,235,0.15)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ backgroundColor: i === 0 ? '#eff6ff' : i === 1 ? '#f0fdf4' : '#fdf4ff' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"
                        style={{ color: i === 0 ? '#3b82f6' : i === 1 ? '#10b981' : '#a855f7' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{item.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                      className="h-4 w-4 mt-auto transition-transform group-hover:translate-x-1" style={{ color: 'var(--text-muted)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                ))}
              </div>

              {/* Stats decorativas */}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
