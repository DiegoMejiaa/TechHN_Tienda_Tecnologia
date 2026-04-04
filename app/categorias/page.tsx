'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import type { Categoria, ApiResponse } from '@/types';

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/categorias')
      .then(r => r.json())
      .then((data: ApiResponse<Categoria[]>) => { if (data.success && data.data) setCategorias(data.data); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const raiz = categorias.filter(c => !c.id_categoria_padre);
  const subs = (id: number) => categorias.filter(c => c.id_categoria_padre === id);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>

        {/* Hero */}
        <div style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-4"
              style={{ backgroundColor: 'var(--blue-light)', color: 'var(--blue)', border: '1px solid var(--blue-muted)' }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--blue)' }} />
              Catálogo TechHN
            </div>
            <h1 className="text-3xl font-bold sm:text-4xl" style={{ color: 'var(--text)' }}>Explora por categoría</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              Encuentra exactamente lo que buscas entre nuestras {raiz.length} categorías
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="animate-pulse rounded-2xl p-6" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', height: 160 }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-11 w-11 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                    <div className="space-y-2">
                      <div className="h-4 w-28 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                      <div className="h-3 w-20 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 w-16 rounded-full" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                    <div className="h-6 w-20 rounded-full" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : raiz.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hay categorías disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {raiz.map(cat => {
                const subcats = subs(cat.id);
                return (
                  <div key={cat.id}
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
                    {/* Barra superior azul del tema */}
                    <div className="h-0.5 w-full transition-all duration-200 group-hover:h-1"
                      style={{ backgroundColor: 'var(--blue)' }} />

                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-center gap-4 mb-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-200"
                          style={{ backgroundColor: 'var(--blue-light)', border: '1px solid var(--blue-muted)' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3ZM6 6h.008v.008H6V6Z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>{cat.nombre}</h2>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {subcats.length > 0
                              ? `${subcats.length} subcategoría${subcats.length > 1 ? 's' : ''}`
                              : 'Categoría principal'}
                          </p>
                        </div>
                      </div>

                      {/* Subcategorías como pills */}
                      {subcats.length > 0 && (
                        <div className="mb-5 flex flex-wrap gap-2">
                          {subcats.map(sub => (
                            <Link key={sub.id} href={`/productos?categoria=${sub.id}`}
                              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all duration-150"
                              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                              onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--blue-light)';
                                (e.currentTarget as HTMLElement).style.color = 'var(--blue)';
                                (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue-muted)';
                              }}
                              onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-secondary)';
                                (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                              }}>
                              {sub.nombre}
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* CTA */}
                      <Link href={`/productos?categoria=${cat.id}`}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold transition-all duration-150"
                        style={{ color: 'var(--blue)' }}>
                        Ver productos
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
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
