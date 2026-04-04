'use client';

import Link from 'next/link';
import type { Producto } from '@/types';
import { formatLempira } from '@/lib/format';

export function ProductCard({ producto }: { producto: Producto }) {
  const precio = producto.precio_oferta_minimo ?? producto.precio_minimo;
  const precioOriginal = producto.precio_oferta_minimo ? producto.precio_minimo : null;

  return (
    <Link
      href={`/productos/${producto.id}`}
      className="group block rounded-2xl overflow-hidden transition-all duration-200"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgb(37 99 235 / 0.13)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLElement).style.transform = 'none';
      }}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-secondary)' }}>
        {producto.imagen_url ? (
          <img
            src={producto.imagen_url}
            alt={producto.nombre}
            className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={0.5} stroke="currentColor" className="h-16 w-16" style={{ color: 'var(--border)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
        )}
        {producto.precio_oferta_minimo && (
          <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: 'var(--danger)' }}>
            Oferta
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        {producto.nombre_marca && (
          <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--blue)' }}>
            {producto.nombre_marca}
          </p>
        )}
        <h3 className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: 'var(--text)' }}>
          {producto.nombre}
        </h3>
        {producto.nombre_categoria && (
          <p className="text-xs mt-0.5 mb-2" style={{ color: 'var(--text-muted)' }}>
            {producto.nombre_categoria}
          </p>
        )}
        {precio != null ? (
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-base font-bold" style={{ color: 'var(--text)' }}>
              {formatLempira(precio)}
            </span>
            {precioOriginal && (
              <span className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>
                {formatLempira(precioOriginal)}
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Sin precio</p>
        )}
      </div>
    </Link>
  );
}
