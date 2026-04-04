'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { apiFetch } from '@/lib/api-fetch';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z' },
  { href: '/admin/productos', label: 'Productos', icon: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z' },
  { href: '/admin/categorias', label: 'Categorías', icon: 'M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z' },
  { href: '/admin/marcas', label: 'Marcas', icon: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21' },
  { href: '/admin/pedidos', label: 'Ventas', icon: 'M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185Z' },
  { href: '/admin/tiendas', label: 'Tiendas', icon: 'M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z' },
  { href: '/admin/usuarios', label: 'Usuarios', icon: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z' },
  { href: '/admin/clientes', label: 'Clientes', icon: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z' },
  { href: '/admin/cupones', label: 'Cupones', icon: 'M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185ZM9.75 9h.008v.008H9.75V9Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 4.5h.008v.008h-.008V13.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { usuario, isAdmin, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [nombreSucursal, setNombreSucursal] = useState<string>('');

  const isSuperAdmin     = Number(usuario?.id_rol) === 1;
  const isAdminSucursal  = Number(usuario?.id_rol) === 4;

  // Cargar nombre de la sucursal del admin logueado
  useEffect(() => {
    if (!isAdminSucursal || !usuario) return;
    apiFetch('/api/tiendas').then(r => r.json()).then((d: any) => {
      const tiendas: any[] = d.data || [];
      if (usuario.id_tienda) {
        const tienda = tiendas.find((t: any) => Number(t.id) === Number(usuario.id_tienda));
        if (tienda) setNombreSucursal(tienda.nombre);
      } else {
        // Token viejo: buscar la tienda via pedidos recientes
        apiFetch('/api/pedidos').then(r2 => r2.json()).then((pd: any) => {
          const nombre = (pd.data || []).find((p: any) => p.nombre_tienda)?.nombre_tienda;
          if (nombre) setNombreSucursal(nombre);
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [usuario]);

  // Nav filtrado: admin sucursal solo ve ventas, usuarios, clientes, productos, marcas
  const NAV_SUCURSAL = ['/admin', '/admin/pedidos', '/admin/clientes', '/admin/usuarios', '/admin/productos', '/admin/marcas', '/admin/categorias'];
  const navItems = isSuperAdmin
    ? NAV_ITEMS
    : NAV_ITEMS.filter(i => NAV_SUCURSAL.includes(i.href));

  useEffect(() => {
    if (!isLoading && (!usuario || !isAdmin)) {
      router.push('/auth/login');
    }
  }, [usuario, isAdmin, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!usuario || !isAdmin) return null;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
      >
        <div className="flex h-14 items-center justify-between px-4" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-xs font-bold shadow-lg" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
              TW
            </div>
            <div>
              <span className="font-bold text-sm text-white block leading-tight">TechHN</span>
              <span className="text-xs" style={{ color: 'var(--sidebar-text)', fontSize: 10 }}>
                {isSuperAdmin ? 'Super Admin' : nombreSucursal || 'Admin Sucursal'}
              </span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded" style={{ color: 'var(--sidebar-text)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="sidebar-link"
                style={isActive ? { backgroundColor: 'var(--sidebar-active-bg)', color: 'var(--sidebar-active-text)' } : {}}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
          <div className="pt-1" style={{ borderTop: '1px solid var(--sidebar-border)', marginTop: 4 }}>
            <Link href="/" onClick={() => setSidebarOpen(false)} className="sidebar-link mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              Ver tienda
            </Link>
          </div>
        </nav>

        <div className="px-3 py-3" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          <button onClick={logout} className="sidebar-link w-full text-left" style={{ color: 'var(--danger)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        <header
          className="sticky top-0 z-30 flex h-14 items-center justify-between px-4 lg:px-6"
          style={{ backgroundColor: 'var(--card)', borderBottom: '1px solid var(--border)' }}
        >
          <button onClick={() => setSidebarOpen(true)} className="btn-icon lg:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--blue)' }}
              >
                {usuario.nombre.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium hidden sm:block" style={{ color: 'var(--text)' }}>
                {usuario.nombre} {usuario.apellido}
              </span>
              <span className="badge badge-blue hidden sm:inline-flex">
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </span>
              {isAdminSucursal && nombreSucursal && (
                <span className="hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: '#f0fdf4', color: '#10b981' }}>
                  {nombreSucursal}
                </span>
              )}
              <button
                onClick={logout}
                className="btn-icon hidden sm:flex"
                title="Cerrar sesión"
                style={{ color: 'var(--danger)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--danger-bg)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
