'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ProductCard } from '@/components/products/product-card';
import type { Producto, Categoria, Marca, ApiResponse } from '@/types';

export default function ProductosPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}><div className="spinner" /></div>}>
      <ProductosContent />
    </Suspense>
  );
}

function ProductosContent() {
  const searchParams = useSearchParams();
  const categoriaParam = searchParams.get('categoria');
  const marcaParam = searchParams.get('marca');

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtros, setFiltros] = useState({ categoria: categoriaParam || '', marca: marcaParam || '' });
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [catRes, marcasRes] = await Promise.all([fetch('/api/categorias'), fetch('/api/marcas')]);
        const catData: ApiResponse<Categoria[]> = await catRes.json();
        const marcasData: ApiResponse<Marca[]> = await marcasRes.json();
        if (catData.success && catData.data) setCategorias(catData.data);
        if (marcasData.success && marcasData.data) setMarcas(marcasData.data);
      } catch {}
    }
    fetchData();
  }, []);

  useEffect(() => {
    async function fetchProductos() {
      setIsLoading(true);
      try {
        let url = '/api/productos?activo=true';
        if (filtros.categoria) url += `&id_categoria=${filtros.categoria}`;
        if (filtros.marca) url += `&id_marca=${filtros.marca}`;
        const res = await fetch(url);
        const data: ApiResponse<Producto[]> = await res.json();
        if (data.success && data.data) setProductos(data.data);
      } catch {} finally { setIsLoading(false); }
    }
    fetchProductos();
  }, [filtros]);

  const clearFilters = () => setFiltros({ categoria: '', marca: '' });
  const hasFilters = filtros.categoria || filtros.marca;

  const filtered = search.trim()
    ? productos.filter(p =>
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (p.nombre_marca || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.nombre_categoria || '').toLowerCase().includes(search.toLowerCase())
      )
    : productos;

  const categoriaActiva = categorias.find(c => String(c.id) === filtros.categoria);
  const marcaActiva = marcas.find(m => String(m.id) === filtros.marca);

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

          {/* Page header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Productos</h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {isLoading ? 'Cargando...' : `${filtered.length} producto${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar productos..."
                  className="input pl-9 w-56 sm:w-72"
                />
              </div>
              {/* Mobile filter button */}
              <button onClick={() => setFiltersOpen(true)}
                className="sm:hidden flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
                style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                </svg>
                Filtros
                {hasFilters && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--blue)' }} />}
              </button>
            </div>
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="mb-4 flex flex-wrap gap-2">
              {categoriaActiva && (
                <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: 'var(--blue-light)', color: 'var(--blue)' }}>
                  {categoriaActiva.nombre}
                  <button onClick={() => setFiltros(f => ({ ...f, categoria: '' }))} className="hover:opacity-70">✕</button>
                </span>
              )}
              {marcaActiva && (
                <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: 'var(--blue-light)', color: 'var(--blue)' }}>
                  {marcaActiva.nombre}
                  <button onClick={() => setFiltros(f => ({ ...f, marca: '' }))} className="hover:opacity-70">✕</button>
                </span>
              )}
              <button onClick={clearFilters} className="text-xs px-3 py-1 rounded-full"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                Limpiar todo
              </button>
            </div>
          )}

          <div className="flex gap-6">
            {/* Sidebar desktop */}
            <aside className="hidden sm:block w-56 shrink-0">
              <div className="sticky top-24 rounded-2xl p-4 space-y-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Categoría</h3>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => setFiltros(f => ({ ...f, categoria: '' }))}
                      className="text-left text-sm px-3 py-1.5 rounded-lg transition-colors"
                      style={{
                        backgroundColor: !filtros.categoria ? 'var(--blue)' : 'transparent',
                        color: !filtros.categoria ? '#fff' : 'var(--text)',
                        fontWeight: !filtros.categoria ? 600 : 400,
                      }}>
                      Todas
                    </button>
                    {categorias.map(cat => (
                      <button key={cat.id}
                        onClick={() => setFiltros(f => ({ ...f, categoria: String(cat.id) }))}
                        className="text-left text-sm px-3 py-1.5 rounded-lg transition-colors"
                        style={{
                          backgroundColor: filtros.categoria === String(cat.id) ? 'var(--blue)' : 'transparent',
                          color: filtros.categoria === String(cat.id) ? '#fff' : 'var(--text)',
                          fontWeight: filtros.categoria === String(cat.id) ? 600 : 400,
                        }}>
                        {cat.nombre}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)' }} />

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Marca</h3>
                  <div className="overflow-y-auto pr-1 space-y-1" style={{ maxHeight: 220 }}>
                    <button
                      onClick={() => setFiltros(f => ({ ...f, marca: '' }))}
                      className="w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors"
                      style={{
                        backgroundColor: !filtros.marca ? 'var(--blue)' : 'transparent',
                        color: !filtros.marca ? '#fff' : 'var(--text)',
                        fontWeight: !filtros.marca ? 600 : 400,
                      }}>
                      Todas
                    </button>
                    {marcas.map(marca => (
                      <button key={marca.id}
                        onClick={() => setFiltros(f => ({ ...f, marca: String(marca.id) }))}
                        className="w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors"
                        style={{
                          backgroundColor: filtros.marca === String(marca.id) ? 'var(--blue)' : 'transparent',
                          color: filtros.marca === String(marca.id) ? '#fff' : 'var(--text)',
                          fontWeight: filtros.marca === String(marca.id) ? 600 : 400,
                        }}>
                        {marca.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* Products grid */}
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="animate-pulse rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                      <div className="aspect-square" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                      <div className="p-4 space-y-2">
                        <div className="h-3 w-1/3 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                        <div className="h-4 w-3/4 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                        <div className="h-4 w-1/2 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl"
                  style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-8 w-8" style={{ color: 'var(--text-muted)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Sin resultados</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Intenta ajustar los filtros</p>
                  {(hasFilters || search) && (
                    <button onClick={() => { clearFilters(); setSearch(''); }}
                      className="mt-4 text-sm font-medium" style={{ color: 'var(--blue)' }}>
                      Limpiar filtros
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map(producto => (
                    <ProductCard key={producto.id} producto={producto} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Mobile filters drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] flex flex-col rounded-t-2xl"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Filtros</h2>
              <button onClick={() => setFiltersOpen(false)} className="btn-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-5">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Categoría</h3>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setFiltros(f => ({ ...f, categoria: '' }))}
                    className="px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{ backgroundColor: !filtros.categoria ? 'var(--blue)' : 'var(--bg-secondary)', color: !filtros.categoria ? '#fff' : 'var(--text)' }}>
                    Todas
                  </button>
                  {categorias.map(cat => (
                    <button key={cat.id} onClick={() => setFiltros(f => ({ ...f, categoria: String(cat.id) }))}
                      className="px-3 py-1.5 rounded-full text-sm font-medium"
                      style={{ backgroundColor: filtros.categoria === String(cat.id) ? 'var(--blue)' : 'var(--bg-secondary)', color: filtros.categoria === String(cat.id) ? '#fff' : 'var(--text)' }}>
                      {cat.nombre}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibond uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Marca</h3>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setFiltros(f => ({ ...f, marca: '' }))}
                    className="px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{ backgroundColor: !filtros.marca ? 'var(--blue)' : 'var(--bg-secondary)', color: !filtros.marca ? '#fff' : 'var(--text)' }}>
                    Todas
                  </button>
                  {marcas.map(marca => (
                    <button key={marca.id} onClick={() => setFiltros(f => ({ ...f, marca: String(marca.id) }))}
                      className="px-3 py-1.5 rounded-full text-sm font-medium"
                      style={{ backgroundColor: filtros.marca === String(marca.id) ? 'var(--blue)' : 'var(--bg-secondary)', color: filtros.marca === String(marca.id) ? '#fff' : 'var(--text)' }}>
                      {marca.nombre}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 flex gap-3" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={clearFilters} className="btn-secondary flex-1">Limpiar</button>
              <button onClick={() => setFiltersOpen(false)} className="btn-primary flex-1">Ver resultados</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
