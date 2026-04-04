'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Tienda, ApiResponse } from '@/types';

export function StoresSection() {
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tiendas')
      .then(r => r.json())
      .then((data: ApiResponse<Tienda[]>) => {
        if (data.success && data.data) setTiendas(data.data.slice(0, 3));
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <section className="py-16 lg:py-20" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-4" style={{ backgroundColor: 'var(--blue-light)', color: 'var(--blue)' }}>
              Presencia física
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--text)' }}>
              Visítanos en nuestras tiendas
            </h2>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              ¿Prefieres la experiencia en persona? Visítanos en cualquiera de nuestras ubicaciones
              para recibir atención personalizada y ver nuestros productos de cerca.
            </p>
            <Link href="/tiendas" className="btn-primary mt-6 inline-flex px-6 py-2.5">
              Ver todas las tiendas
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          <div className="space-y-3">
            {isLoading
              ? [1,2,3].map(i => (
                  <div key={i} className="animate-pulse rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                    <div className="h-4 w-1/3 rounded" style={{ backgroundColor: 'var(--border)' }} />
                    <div className="mt-2 h-3 w-1/2 rounded" style={{ backgroundColor: 'var(--border)' }} />
                  </div>
                ))
              : tiendas.length > 0
                ? tiendas.map(tienda => (
                    <div
                      key={tienda.id}
                      className="flex items-center justify-between rounded-xl p-5 transition-all"
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
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--blue-light)' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4" style={{ color: 'var(--blue)' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{tienda.nombre}</p>
                          {tienda.ciudad && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tienda.ciudad}</p>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/tiendas/${tienda.id}`}
                        className="btn-ghost text-xs px-3 py-1.5"
                      >
                        Ver tienda
                      </Link>
                    </div>
                  ))
                : (
                    <div className="rounded-xl p-8 text-center" style={{ border: '1px dashed var(--border)' }}>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hay tiendas disponibles</p>
                    </div>
                  )
            }
          </div>
        </div>
      </div>
    </section>
  );
}
