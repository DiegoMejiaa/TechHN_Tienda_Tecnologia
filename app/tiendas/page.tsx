'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import type { Tienda, ApiResponse } from '@/types';

export default function TiendasPage() {
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tiendas')
      .then(r => r.json())
      .then((data: ApiResponse<Tienda[]>) => { if (data.success && data.data) setTiendas(data.data); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>

        {/* Hero */}
        <div style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 text-center">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-4"
              style={{ backgroundColor: 'var(--blue-light)', color: 'var(--blue)', border: '1px solid var(--blue-muted)' }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--blue)' }} />
              TechHN Honduras
            </div>
            <h1 className="text-3xl font-bold sm:text-4xl" style={{ color: 'var(--text)' }}>
              Nuestras Tiendas
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              Visítanos en cualquiera de nuestras {tiendas.length > 0 ? tiendas.length : ''} ubicaciones para una experiencia de compra personalizada
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse rounded-2xl p-6"
                  style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', height: 200 }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-11 w-11 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                    <div className="space-y-2">
                      <div className="h-4 w-28 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                      <div className="h-3 w-20 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                    </div>
                  </div>
                  <div className="h-3 w-full rounded mb-2" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                  <div className="h-3 w-3/4 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                </div>
              ))}
            </div>
          ) : tiendas.length === 0 ? (
            <div className="text-center py-20">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor"
                className="mx-auto h-12 w-12 mb-4" style={{ color: 'var(--text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
              </svg>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hay tiendas disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {tiendas.map((tienda) => (
                <div
                  key={tienda.id}
                  className="group rounded-2xl overflow-hidden transition-all duration-200"
                  style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(37,99,235,0.08)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLElement).style.transform = '';
                  }}
                >
                  {/* Barra superior */}
                  <div className="h-0.5 w-full transition-all duration-200 group-hover:h-1"
                    style={{ backgroundColor: 'var(--blue)' }} />

                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-5">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: 'var(--blue-light)', border: '1px solid var(--blue-muted)' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-5 w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>{tienda.nombre}</h2>
                        {tienda.ciudad && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                            </svg>
                            {tienda.ciudad}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Horario */}
                    <div
                      className="mb-5 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      Lun - Sab: 8:00 AM – 6:00 PM
                    </div>

                    {/* CTA */}
                    <Link
                      href={`/tiendas/${tienda.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold transition-all duration-150"
                      style={{ color: 'var(--blue)' }}
                    >
                      Ver detalles
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
