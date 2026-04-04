'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/contexts/auth-context';
import type { Pedido, ApiResponse } from '@/types';
import { formatLempira } from '@/lib/format';

const ESTADO_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  pendiente: { color: '#f59e0b', bg: '#fffbeb', label: 'Pendiente' },
  pagado:    { color: '#3b82f6', bg: '#eff6ff', label: 'Pagado'    },
  enviado:   { color: '#8b5cf6', bg: '#f5f3ff', label: 'Enviado'   },
  entregado: { color: '#10b981', bg: '#f0fdf4', label: 'Entregado' },
  cancelado: { color: '#ef4444', bg: '#fef2f2', label: 'Cancelado' },
};

export default function PedidosPage() {
  const { usuario } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!usuario) return;
    const token = sessionStorage.getItem('token');
    fetch(`/api/pedidos?id_usuario=${usuario.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then((data: ApiResponse<Pedido[]>) => { if (data.success && data.data) setPedidos(data.data); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [usuario]);

  if (!usuario) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="text-center">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Inicia sesión para ver tus pedidos</h1>
            <Link href="/auth/login" className="btn-primary mt-6 inline-flex px-8 py-3">Iniciar sesión</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <Header />
      <main className="flex-1">

        {/* Hero */}
        <div style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: 'var(--blue-light)', border: '1px solid var(--blue-muted)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Mis pedidos</h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Revisa el estado de tus compras</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="animate-pulse rounded-2xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 w-32 rounded" style={{ backgroundColor: 'var(--border)' }} />
                      <div className="h-3 w-24 rounded" style={{ backgroundColor: 'var(--border)' }} />
                    </div>
                    <div className="h-8 w-20 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : pedidos.length === 0 ? (
            <div className="rounded-2xl p-16 text-center" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl mx-auto mb-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-8 w-8" style={{ color: 'var(--text-muted)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
                </svg>
              </div>
              <p className="text-base font-semibold" style={{ color: 'var(--text)' }}>No tienes pedidos aún</p>
              <p className="text-sm mt-1 mb-6" style={{ color: 'var(--text-muted)' }}>Cuando realices una compra aparecerá aquí</p>
              <Link href="/productos" className="btn-primary px-8 py-2.5">Ir a comprar</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {pedidos.map((pedido) => {
                const estado = ESTADO_STYLE[pedido.estado] || { color: 'var(--text-muted)', bg: 'var(--bg-secondary)', label: pedido.estado };
                return (
                  <Link key={pedido.id} href={`/pedidos/${pedido.id}`}
                    className="group block rounded-2xl overflow-hidden transition-all"
                    style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgb(37 99 235 / 0.1)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    <div className="h-0.5 w-full transition-all" style={{ backgroundColor: estado.color }} />
                    <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          style={{ backgroundColor: estado.bg }}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={estado.color} className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Pedido</span>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                              style={{ backgroundColor: estado.bg, color: estado.color }}>
                              {estado.label}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {new Date(pedido.creado_en).toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                        <span className="text-lg font-bold" style={{ color: 'var(--blue)' }}>
                          {formatLempira(pedido.monto_total)}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--blue)' }}>
                          Ver detalles
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3 w-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
