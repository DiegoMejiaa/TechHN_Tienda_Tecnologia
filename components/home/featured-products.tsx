'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Producto, ApiResponse } from '@/types';
import { ProductCard } from '@/components/products/product-card';

export function FeaturedProducts() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/productos?activo=true')
      .then(r => r.json())
      .then((data: ApiResponse<Producto[]>) => {
        if (data.success && data.data) setProductos(data.data.slice(0, 4));
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (!isLoading && productos.length === 0) return null;

  return (
    <section className="py-16 lg:py-20" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--text)' }}>
              Productos destacados
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              Lo mejor de nuestra selección tecnológica
            </p>
          </div>
          <Link
            href="/productos"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-medium"
            style={{ color: 'var(--blue)' }}
          >
            Ver todos
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? [1,2,3,4].map(i => (
                <div key={i} className="animate-pulse rounded-xl" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}>
                  <div className="aspect-square rounded-t-xl" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                  <div className="p-4 space-y-2">
                    <div className="h-3 w-1/3 rounded" style={{ backgroundColor: 'var(--border)' }} />
                    <div className="h-4 w-3/4 rounded" style={{ backgroundColor: 'var(--border)' }} />
                  </div>
                </div>
              ))
            : productos.map(p => <ProductCard key={p.id} producto={p} />)
          }
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link href="/productos" className="text-sm font-medium inline-flex items-center gap-1" style={{ color: 'var(--blue)' }}>
            Ver todos los productos
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
