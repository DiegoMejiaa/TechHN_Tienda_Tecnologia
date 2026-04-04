'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import type { Producto, VarianteProducto, Tienda, ApiResponse } from '@/types';
import { apiFetch } from '@/lib/api-fetch';
import { useAuth } from '@/contexts/auth-context';
import { formatLempira } from '@/lib/format';

interface StockModal {
  producto: Producto;
  variantes: VarianteProducto[];
  tiendas: Tienda[];
}

const PLACEHOLDER_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-7 w-7" style={{ color: 'var(--border)' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  </svg>
);

export default function AdminProductosPage() {
  const { usuario, isLoading: authLoading } = useAuth();
  const isAdminSucursal = Number(usuario?.id_rol) === 4;
  const idTiendaAdmin   = usuario?.id_tienda ?? null;

  const [productos, setProductos] = useState<Producto[]>([]);
  const [stockSucursal, setStockSucursal] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [stockModal, setStockModal] = useState<StockModal | null>(null);
  const [stockForm, setStockForm] = useState<Record<string, string>>({});
  const [loadingStock, setLoadingStock] = useState(false);
  const [savingStock, setSavingStock] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Producto | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchProductos = async () => {
    try {
      const res = await apiFetch('/api/productos');
      const data: ApiResponse<Producto[]> = await res.json();
      if (data.success && data.data) {
        if (isAdminSucursal && idTiendaAdmin) {
          const stockRes = await apiFetch(`/api/stock?id_tienda=${idTiendaAdmin}`);
          const stockData: ApiResponse<{ id_variante: number; id_tienda: number; cantidad: number; id_producto: number }[]> = await stockRes.json();
          const stockItems = stockData.data || [];

          const stockPorProducto: Record<number, number> = {};
          stockItems.forEach(s => {
            if (s.id_producto && Number(s.cantidad) > 0) {
              stockPorProducto[Number(s.id_producto)] = (stockPorProducto[Number(s.id_producto)] || 0) + Number(s.cantidad);
            }
          });
          setStockSucursal(stockPorProducto);
          const productosConStock = new Set(Object.keys(stockPorProducto).map(Number));
          // Mostrar todos los productos que tienen al menos una variante con stock
          // Comparar como string para evitar problemas de tipo
          const productosConStockStr = new Set(Object.keys(stockPorProducto));
          setProductos(data.data.filter(p => productosConStockStr.has(String(p.id))));
        } else {
          setProductos(data.data);
        }
      }
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (authLoading || usuario === null) return;
    // Si es admin sucursal, esperar a tener id_tienda
    if (isAdminSucursal && !idTiendaAdmin) return;
    fetchProductos();
  }, [authLoading, usuario]);

  const handleDelete = async (producto: Producto) => {
    setDeletingId(producto.id);
    setConfirmDelete(null);
    try {
      const res = await apiFetch(`/api/productos?id=${producto.id}`, { method: 'DELETE' });
      const data: ApiResponse<unknown> = await res.json();
      if (data.success) setProductos(prev => prev.filter(p => p.id !== producto.id));
    } catch { /* ignore */ }
    finally { setDeletingId(null); }
  };

  const handleOpenStock = async (producto: Producto) => {
    setLoadingStock(true);
    try {
      const [varRes, tiendasRes] = await Promise.all([
        apiFetch(`/api/variantes?id_producto=${producto.id}`),
        apiFetch('/api/tiendas'),
      ]);
      const varData: ApiResponse<VarianteProducto[]> = await varRes.json();
      const tiendasData: ApiResponse<Tienda[]> = await tiendasRes.json();
      const variantes = varData.success && varData.data ? varData.data : [];
      let tiendas = tiendasData.success && tiendasData.data ? tiendasData.data : [];
      // Admin sucursal solo ve su tienda
      if (isAdminSucursal && idTiendaAdmin) {
        tiendas = tiendas.filter(t => Number(t.id) === Number(idTiendaAdmin));
      }
      const map: Record<string, string> = {};
      for (const v of variantes) {
        const sRes = await apiFetch(`/api/stock?id_variante=${v.id}`);
        const sData: ApiResponse<{ id_variante: number; id_tienda: number; cantidad: number }[]> = await sRes.json();
        if (sData.success && sData.data) {
          for (const s of sData.data) map[`${s.id_variante}_${s.id_tienda}`] = String(s.cantidad);
        }
      }
      setStockForm(map);
      setStockModal({ producto, variantes, tiendas });
    } catch { /* ignore */ }
    finally { setLoadingStock(false); }
  };

  const handleSaveStock = async (varianteId: number, tiendaId: number) => {
    const key = `${varianteId}_${tiendaId}`;
    setSavingStock(key);
    try {
      await apiFetch('/api/stock', {
        method: 'PUT',
        body: JSON.stringify({ id_variante: varianteId, id_tienda: tiendaId, cantidad: parseInt(stockForm[key] || '0') }),
      });
      if (stockModal) {
        const varRes = await apiFetch(`/api/variantes?id_producto=${stockModal.producto.id}`);
        const varData: ApiResponse<VarianteProducto[]> = await varRes.json();
        if (varData.success && varData.data) setStockModal({ ...stockModal, variantes: varData.data });
      }
    } catch { /* ignore */ }
    finally { setSavingStock(null); }
  };

  const filtered = productos.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (p.nombre_marca || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.nombre_categoria || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (val: string) => { setSearch(val); setPage(1); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Productos</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {isAdminSucursal
              ? `${productos.length} producto${productos.length !== 1 ? 's' : ''} con stock en tu sucursal`
              : `${productos.length} producto${productos.length !== 1 ? 's' : ''} en el catálogo`}
          </p>
        </div>
        <Link href="/admin/productos/nuevo" className="btn-primary text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo producto
          </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text" value={search} onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar por nombre, marca o categoría..."
          className="input pl-9"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card p-4 flex gap-3 animate-pulse">
              <div className="h-16 w-16 rounded-xl shrink-0" style={{ backgroundColor: 'var(--bg-secondary)' }} />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 rounded w-3/4" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'var(--bg-secondary)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl mx-auto mb-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-8 w-8" style={{ color: 'var(--text-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            {search ? 'Sin resultados' : 'No hay productos'}
          </p>
          <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>
            {search ? `No se encontró "${search}"` : 'Agrega tu primer producto al catálogo'}
          </p>
          {!search && (
            <Link href="/admin/productos/nuevo" className="btn-primary text-sm">Crear producto</Link>
          )}
        </div>
      ) : (
        <>
        <div className="table-wrapper">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Producto</th>
                <th className="table-header hidden md:table-cell">Categoría</th>
                <th className="table-header hidden sm:table-cell">Marca</th>
                <th className="table-header hidden md:table-cell">Precio</th>
                <th className="table-header">Estado</th>
                {isAdminSucursal && <th className="table-header text-center">Stock</th>}
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((producto) => (
                <tr key={producto.id} className="table-row">
                  {/* Producto con imagen */}
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl overflow-hidden"
                        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                      >
                        {producto.imagen_url ? (
                          <img
                            src={producto.imagen_url}
                            alt={producto.nombre}
                            className="h-full w-full object-contain p-1"
                          />
                        ) : PLACEHOLDER_ICON}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{producto.nombre}</p>
                        {producto.descripcion && (
                          <p className="text-xs truncate max-w-[180px]" style={{ color: 'var(--text-muted)' }}>{producto.descripcion}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-4 py-3">
                    {producto.nombre_categoria ? (
                      <span className="badge badge-muted">{producto.nombre_categoria}</span>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                    {producto.nombre_marca || '—'}
                  </td>
                  <td className="hidden md:table-cell px-4 py-3">
                    {producto.precio_minimo != null ? (
                      <div className="flex flex-col gap-0.5">
                        {producto.precio_oferta_minimo != null ? (
                          <>
                            <span className="text-sm font-semibold" style={{ color: 'var(--success)' }}>
                              {formatLempira(producto.precio_oferta_minimo)}
                            </span>
                            <span className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>
                              {formatLempira(producto.precio_minimo)}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                            {formatLempira(producto.precio_minimo)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin precio</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <span className={producto.activo ? 'badge badge-success' : 'badge badge-muted'}>
                      {producto.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {isAdminSucursal && (
                    <td className="table-cell text-center">
                      <span className="text-sm font-bold px-2.5 py-1 rounded-full"
                        style={{
                          backgroundColor: (stockSucursal[producto.id] || 0) > 5 ? '#f0fdf4' : (stockSucursal[producto.id] || 0) > 0 ? '#fffbeb' : '#fef2f2',
                          color: (stockSucursal[producto.id] || 0) > 5 ? '#10b981' : (stockSucursal[producto.id] || 0) > 0 ? '#f59e0b' : '#ef4444',
                        }}>
                        {stockSucursal[producto.id] || 0}
                      </span>
                    </td>
                  )}
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Stock */}
                      <button
                        onClick={() => handleOpenStock(producto)}
                        disabled={loadingStock}
                        className="btn-icon"
                        title="Ver stock"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                        </svg>
                      </button>
                      {/* Editar */}
                      <Link href={`/admin/productos/${producto.id}`} className="btn-icon" title="Editar">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                          </svg>
                        </Link>
                      {/* Eliminar */}
                      <button
                          onClick={() => setConfirmDelete(producto)}
                          disabled={deletingId === producto.id}
                          className="btn-icon disabled:opacity-50"
                          title="Eliminar"
                          style={{ color: 'var(--danger)' }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--danger-bg)')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                        >
                          {deletingId === producto.id ? (
                            <span className="spinner h-3.5 w-3.5 border-2" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          )}
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} productos
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-icon disabled:opacity-30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className="h-7 w-7 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: page === n ? 'var(--blue)' : 'transparent',
                    color: page === n ? '#fff' : 'var(--text-muted)',
                    border: page === n ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-icon disabled:opacity-30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl mx-auto mb-4" style={{ backgroundColor: 'var(--danger-bg)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--danger)" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-center mb-1" style={{ color: 'var(--text)' }}>Eliminar producto</h3>
            <p className="text-sm text-center mb-5" style={{ color: 'var(--text-muted)' }}>
              ¿Seguro que deseas eliminar <span className="font-semibold" style={{ color: 'var(--text)' }}>{confirmDelete.nombre}</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} className="btn-danger flex-1">Eliminar</button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Stock Modal */}
      {stockModal && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setStockModal(null)} />
          <div
            className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-xl overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  {stockModal.producto.imagen_url
                    ? <img src={stockModal.producto.imagen_url} alt="" className="h-full w-full object-contain p-1" />
                    : PLACEHOLDER_ICON}
                </div>
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{stockModal.producto.nombre}</h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {stockModal.variantes.length} variante{stockModal.variantes.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => setStockModal(null)} className="btn-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">
              {stockModal.variantes.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin variantes registradas.</p>
                  <Link href={`/admin/productos/${stockModal.producto.id}`} className="mt-2 inline-block text-sm" style={{ color: 'var(--blue)' }}>
                    Agregar variantes →
                  </Link>
                </div>
              ) : stockModal.tiendas.length === 0 ? (
                <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No hay tiendas registradas.</p>
              ) : (
                <div className="space-y-4">
                  {stockModal.variantes.map((variante) => (
                    <div key={variante.id} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                          {variante.imagen_url
                            ? <img src={variante.imagen_url} alt="" className="h-full w-full object-contain p-0.5" />
                            : PLACEHOLDER_ICON}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{variante.nombre_variante || variante.sku}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>SKU: {variante.sku}</p>
                        </div>
                        <span className={(variante.stock_total ?? 0) > 0 ? 'badge badge-success' : 'badge badge-danger'}>
                          Stock: {variante.stock_total ?? 0}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {stockModal.tiendas.map((tienda) => {
                          const key = `${variante.id}_${tienda.id}`;
                          return (
                            <div key={tienda.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                              <span className="flex-1 text-sm truncate" style={{ color: 'var(--text)' }}>{tienda.nombre}</span>
                              <input
                                type="number" min="0" step="1"
                                value={stockForm[key] ?? '0'}
                                onChange={e => {
                                  const v = Math.max(0, Math.floor(Number(e.target.value)));
                                  setStockForm(prev => ({ ...prev, [key]: String(isNaN(v) ? 0 : v) }));
                                }}
                                className="input w-20 text-center py-1.5 px-2"
                              />
                              <button
                                onClick={() => handleSaveStock(variante.id, tienda.id)}
                                disabled={savingStock === key}
                                className="btn-primary text-xs px-3 py-1.5 shrink-0"
                              >
                                {savingStock === key ? '...' : 'Guardar'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
