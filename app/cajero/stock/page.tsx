'use client';

import { useEffect, useState } from 'react';
import { useTurno } from '@/contexts/turno-context';
import type { NivelStock, ApiResponse } from '@/types';

function getHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export default function CajeroStockPage() {
  const { turno } = useTurno();
  const [stock, setStock] = useState<NivelStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!turno) return;
    setIsLoading(true);
    fetch(`/api/stock?id_tienda=${turno.id_tienda}`, { headers: getHeaders() })
      .then(r => r.json())
      .then((data: ApiResponse<NivelStock[]>) => {
        if (data.success && data.data) setStock(data.data);
        setIsLoading(false);
      });
  }, [turno]);

  const filtered = stock.filter(s =>
    search
      ? (s.nombre_producto || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.sku || '').toLowerCase().includes(search.toLowerCase())
      : true
  );

  const sorted = [...filtered].sort((a, b) => a.cantidad - b.cantidad);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalUnidades = stock.reduce((s, i) => s + i.cantidad, 0);
  const sinStock = stock.filter(i => i.cantidad === 0).length;
  const stockBajo = stock.filter(i => i.cantidad > 0 && i.cantidad <= 3).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Stock en sucursal</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{turno?.nombre_tienda}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total unidades', value: totalUnidades, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Stock bajo (≤3)', value: stockBajo,    color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Sin stock',       value: sinStock,     color: '#ef4444', bg: '#fef2f2' },
        ].map(s => (
          <div key={s.label} className="card p-3">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar producto o SKU..." className="input pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin datos de stock</p>
        </div>
      ) : (
        <>
        <div className="table-wrapper">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Producto</th>
                <th className="table-header hidden sm:table-cell">SKU</th>
                <th className="table-header text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((item, i) => (
                <tr key={i} className="table-row">
                  <td className="table-cell">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{item.nombre_producto}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.nombre_variante}</p>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    {item.sku}
                  </td>
                  <td className="table-cell text-right">
                    <span className="text-sm font-bold px-3 py-1 rounded-full"
                      style={{
                        backgroundColor: item.cantidad === 0 ? 'var(--danger-bg)' : item.cantidad <= 3 ? 'var(--warning-bg)' : 'var(--success-bg)',
                        color: item.cantidad === 0 ? 'var(--danger)' : item.cantidad <= 3 ? 'var(--warning)' : 'var(--success)',
                      }}>
                      {item.cantidad} uds
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length} items
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-icon disabled:opacity-30">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  className="h-7 w-7 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: page === n ? 'var(--blue)' : 'transparent',
                    color: page === n ? '#fff' : 'var(--text-muted)',
                    border: page === n ? 'none' : '1px solid var(--border)',
                  }}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-icon disabled:opacity-30">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}
