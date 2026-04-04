'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Categoria, ApiResponse } from '@/types';

export function CategoriesSection() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/categorias?solo_raiz=true')
      .then(r => r.json())
      .then((data: ApiResponse<Categoria[]>) => {
        if (data.success && data.data) setCategorias(data.data.slice(0, 6));
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (!isLoading && categorias.length === 0) return null;

  return (
    <section className="py-16 lg:py-20" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--text)' }}>
            Explora por categoría
          </h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            Encuentra exactamente lo que buscas
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {isLoading
            ? [1,2,3,4,5,6].map(i => (
                <div key={i} className="animate-pulse rounded-xl" style={{ backgroundColor: 'var(--border)', width: 120, height: 120 }} />
              ))
            : categorias.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/productos?categoria=${cat.id}`}
                  className="group flex flex-col items-center justify-center gap-3 rounded-xl p-4 text-center transition-all"
                  style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', width: 150, minHeight: 140 }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgb(37 99 235 / 0.12)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-xl transition-colors"
                    style={{ backgroundColor: 'var(--blue-light)' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6" style={{ color: 'var(--blue)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold leading-tight" style={{ color: 'var(--text)', fontSize: '0.8rem' }}>{cat.nombre}</span>
                </Link>
              ))
          }
        </div>

        <div className="mt-8 text-center">
          <Link href="/categorias" className="text-sm font-medium inline-flex items-center gap-1" style={{ color: 'var(--blue)' }}>
            Ver todas las categorías
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
