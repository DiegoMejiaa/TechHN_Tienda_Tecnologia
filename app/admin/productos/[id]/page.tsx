'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Producto, Categoria, Marca, VarianteProducto, Tienda, ApiResponse } from '@/types';
import { apiFetch } from '@/lib/api-fetch';
import { formatLempira } from '@/lib/format';
import { useAuth } from '@/contexts/auth-context';

const IMG_PLACEHOLDER = (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-6 w-6" style={{ color: 'var(--border)' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  </svg>
);

export default function EditProductoPage() {
  const params = useParams();
  const productId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { usuario } = useAuth();
  const isAdminSucursal = Number(usuario?.id_rol) === 4;
  const idTiendaAdmin   = usuario?.id_tienda ?? null;

  const [producto, setProducto] = useState<Producto | null>(null);
  const [variantes, setVariantes] = useState<VarianteProducto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [confirmDelVariante, setConfirmDelVariante] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    nombre: '', descripcion: '', id_categoria: '', id_marca: '', activo: true,
  });
  const [nuevaVariante, setNuevaVariante] = useState({
    sku: '', nombre_variante: '', precio: '', precio_oferta: '',
  });
  const [nuevaVarianteImagen, setNuevaVarianteImagen] = useState<File | null>(null);
  const [nuevaVarianteImagenPreview, setNuevaVarianteImagenPreview] = useState<string | null>(null);
  const [nuevaVarianteStock, setNuevaVarianteStock] = useState<Record<string, string>>({});
  const [uploadingNueva, setUploadingNueva] = useState(false);
  const [stockForm, setStockForm] = useState<Record<string, string>>({});
  const [editVariante, setEditVariante] = useState<Record<number, { sku: string; nombre_variante: string; precio: string; precio_oferta: string; activo: boolean }>>({});
  const [savingVariante, setSavingVariante] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [prodRes, varRes, catRes, marcasRes, tiendasRes] = await Promise.all([
          apiFetch(`/api/productos?id=${productId}`),
          apiFetch(`/api/variantes?id_producto=${productId}`),
          apiFetch('/api/categorias'),
          apiFetch('/api/marcas'),
          apiFetch('/api/tiendas'),
        ]);
        const prodData: ApiResponse<Producto> = await prodRes.json();
        const varData: ApiResponse<VarianteProducto[]> = await varRes.json();
        const catData: ApiResponse<Categoria[]> = await catRes.json();
        const marcasData: ApiResponse<Marca[]> = await marcasRes.json();
        const tiendasData: ApiResponse<Tienda[]> = await tiendasRes.json();

        if (prodData.success && prodData.data) {
          setProducto(prodData.data);
          setFormData({
            nombre: prodData.data.nombre,
            descripcion: prodData.data.descripcion || '',
            id_categoria: String(prodData.data.id_categoria),
            id_marca: String(prodData.data.id_marca),
            activo: prodData.data.activo,
          });
        }
        if (varData.success && varData.data) setVariantes(varData.data);
        if (catData.success && catData.data) setCategorias(catData.data);
        if (marcasData.success && marcasData.data) setMarcas(marcasData.data);
        if (tiendasData.success && tiendasData.data) {
          const todasTiendas = tiendasData.data;
          // Admin sucursal solo ve su tienda
          const tiendasFiltradas = isAdminSucursal && idTiendaAdmin
            ? todasTiendas.filter(t => Number(t.id) === Number(idTiendaAdmin))
            : todasTiendas;
          setTiendas(tiendasFiltradas);
          if (varData.success && varData.data) {
            const stockMap: Record<string, string> = {};
            for (const v of varData.data) {
              const sRes = await apiFetch(`/api/stock?id_variante=${v.id}`);
              const sData: ApiResponse<{ id_variante: number; id_tienda: number; cantidad: number }[]> = await sRes.json();
              if (sData.success && sData.data)
                for (const s of sData.data) stockMap[`${s.id_variante}_${s.id_tienda}`] = String(s.cantidad);
            }
            setStockForm(stockMap);
          }
        }
      } catch { setError('Error al cargar el producto'); }
      finally { setIsLoading(false); }
    }
    fetchData();
  }, [productId]);

  const notify = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

  const recargarVariantesYStock = async () => {
    const varRes = await apiFetch(`/api/variantes?id_producto=${productId}`);
    const varData: ApiResponse<VarianteProducto[]> = await varRes.json();
    if (varData.success && varData.data) {
      setVariantes(varData.data);
      const stockMap: Record<string, string> = {};
      for (const v of varData.data) {
        const sRes = await apiFetch(`/api/stock?id_variante=${v.id}`);
        const sData: ApiResponse<{ id_variante: number; id_tienda: number; cantidad: number }[]> = await sRes.json();
        if (sData.success && sData.data)
          for (const s of sData.data) stockMap[`${s.id_variante}_${s.id_tienda}`] = String(s.cantidad);
      }
      setStockForm(stockMap);
    }
  };

  const handleUploadImagen = async (file: File) => {
    setUploadingId(-1);
    try {
      const form = new FormData();
      form.append('file', file); form.append('folder', 'productos');
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: form });
      const uploadData: ApiResponse<{ url: string; publicId: string }> = await uploadRes.json();
      if (!uploadData.success || !uploadData.data) return;
      const res = await apiFetch('/api/productos', {
        method: 'PUT',
        body: JSON.stringify({ id: Number(productId), imagen_url: uploadData.data.url, cloudinary_public_id: uploadData.data.publicId }),
      });
      const data: ApiResponse<Producto> = await res.json();
      if (data.success && data.data) { setProducto(data.data); notify('Imagen actualizada'); }
    } catch { /* ignore */ }
    finally { setUploadingId(null); }
  };

  const handleSave = async () => {
    setError(''); setIsSaving(true);
    try {
      const res = await apiFetch('/api/productos', {
        method: 'PUT',
        body: JSON.stringify({
          id: Number(productId), nombre: formData.nombre,
          descripcion: formData.descripcion || null,
          id_categoria: Number(formData.id_categoria),
          id_marca: Number(formData.id_marca),
          activo: formData.activo,
        }),
      });
      const data: ApiResponse<Producto> = await res.json();
      if (data.success) notify('Cambios guardados');
      else setError(data.error || 'Error al actualizar');
    } catch { setError('Error al actualizar'); }
    finally { setIsSaving(false); }
  };

  const handleSaveStock = async (varianteId: number, tiendaId: number) => {
    const key = `${varianteId}_${tiendaId}`;
    await apiFetch('/api/stock', {
      method: 'PUT',
      body: JSON.stringify({ id_variante: varianteId, id_tienda: tiendaId, cantidad: parseInt(stockForm[key] || '0') }),
    });
    notify('Stock actualizado');
    await recargarVariantesYStock();
  };

  const handleAddVariante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaVariante.sku || !nuevaVariante.precio) {
      setError('SKU y precio son requeridos');
      return;
    }
    setUploadingNueva(true);
    setError('');
    try {
      const res = await apiFetch('/api/variantes', {
        method: 'POST',
        body: JSON.stringify({
          id_producto: Number(productId), sku: nuevaVariante.sku,
          nombre_variante: nuevaVariante.nombre_variante || null,
          precio: Number(nuevaVariante.precio),
          precio_oferta: nuevaVariante.precio_oferta ? Number(nuevaVariante.precio_oferta) : null,
        }),
      });
      const data: ApiResponse<VarianteProducto> = await res.json();
      if (!data.success || !data.data) {
        setError(data.error || data.message || 'Error al crear la variante');
        return;
      }
      const varianteId = data.data.id;
      // Subir imagen si hay
      if (nuevaVarianteImagen) {
        const form = new FormData();
        form.append('file', nuevaVarianteImagen); form.append('folder', 'variantes');
        const token = sessionStorage.getItem('token');
        const uploadRes = await fetch('/api/upload', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
        const uploadData: ApiResponse<{ url: string; publicId: string }> = await uploadRes.json();
        if (uploadData.success && uploadData.data) {
          await apiFetch('/api/variantes', {
            method: 'PUT',
            body: JSON.stringify({ id: varianteId, imagen_url: uploadData.data.url, cloudinary_public_id: uploadData.data.publicId }),
          });
        }
      }
      // Guardar stock por tienda
      const stockEntries = Object.entries(nuevaVarianteStock).filter(([, v]) => parseInt(v) > 0);
      await Promise.all(stockEntries.map(([tiendaId, cantidad]) =>
        apiFetch('/api/stock', {
          method: 'PUT',
          body: JSON.stringify({ id_variante: varianteId, id_tienda: Number(tiendaId), cantidad: parseInt(cantidad) }),
        })
      ));
      // Recargar variantes y stock
      await recargarVariantesYStock();
      setNuevaVariante({ sku: '', nombre_variante: '', precio: '', precio_oferta: '' });
      setNuevaVarianteImagen(null);
      setNuevaVarianteImagenPreview(null);
      setNuevaVarianteStock({});
      notify('Variante agregada');
    } catch (err) {
      console.error(err);
      setError('Error al crear la variante');
    }
    finally { setUploadingNueva(false); }
  };

  const handleDeleteVariante = async (id: number) => {
    setConfirmDelVariante(null);
    try {
      const res = await apiFetch(`/api/variantes?id=${id}`, { method: 'DELETE' });
      const data: ApiResponse<unknown> = await res.json();
      if (data.success) setVariantes(variantes.filter(v => v.id !== id));
    } catch { /* ignore */ }
  };

  const handleUploadVarianteImagen = async (varianteId: number, file: File) => {
    setUploadingId(varianteId);
    try {
      const form = new FormData();
      form.append('file', file); form.append('folder', 'variantes');
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: form });
      const uploadData: ApiResponse<{ url: string; publicId: string }> = await uploadRes.json();
      if (!uploadData.success || !uploadData.data) return;
      const res = await apiFetch('/api/variantes', {
        method: 'PUT',
        body: JSON.stringify({ id: varianteId, imagen_url: uploadData.data.url, cloudinary_public_id: uploadData.data.publicId }),
      });
      const data: ApiResponse<VarianteProducto> = await res.json();
      if (data.success && data.data) {
        setVariantes(variantes.map(v => v.id === varianteId ? { ...v, imagen_url: data.data!.imagen_url } : v));
        notify('Imagen de variante actualizada');
      }
    } catch { /* ignore */ }
    finally { setUploadingId(null); }
  };

  const startEditVariante = (v: VarianteProducto) => {
    setEditVariante(prev => ({
      ...prev,
      [v.id]: {
        sku: v.sku,
        nombre_variante: v.nombre_variante || '',
        precio: String(v.precio),
        precio_oferta: v.precio_oferta != null ? String(v.precio_oferta) : '',
        activo: v.activo,
      },
    }));
  };

  const cancelEditVariante = (id: number) => {
    setEditVariante(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const handleSaveVariante = async (id: number) => {
    const form = editVariante[id];
    if (!form || !form.sku || !form.precio) return;
    setSavingVariante(id);
    try {
      const res = await apiFetch('/api/variantes', {
        method: 'PUT',
        body: JSON.stringify({
          id,
          sku: form.sku,
          nombre_variante: form.nombre_variante || null,
          precio: Number(form.precio),
          precio_oferta: form.precio_oferta ? Number(form.precio_oferta) : null,
          activo: form.activo,
        }),
      });
      const data: ApiResponse<VarianteProducto> = await res.json();
      if (data.success && data.data) {
        await recargarVariantesYStock();
        cancelEditVariante(id);
        notify('Variante actualizada');
      } else {
        setError(data.error || 'Error al actualizar variante');
      }
    } catch { setError('Error al actualizar variante'); }
    finally { setSavingVariante(null); }
  };

  if (isLoading) return (
    <div className="mx-auto max-w-5xl space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-96 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)' }} />
        <div className="h-96 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)' }} />
      </div>
    </div>
  );

  if (!producto) return (
    <div className="text-center py-20">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Producto no encontrado</p>
      <Link href="/admin/productos" className="mt-3 inline-block text-sm" style={{ color: 'var(--blue)' }}>← Volver</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/productos" className="btn-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Editar producto</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{producto.nombre}</p>
        </div>
        <Link href={`/productos/${producto.id}`} target="_blank" className="btn-ghost text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          Ver en tienda
        </Link>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {error}
        </div>
      )}
      {message && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          {message}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* LEFT — Info + Imagen */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--blue-light)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Información del producto</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Nombre</label>
              <input type="text" value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                className="input" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Descripción</label>
              <textarea rows={3} value={formData.descripcion}
                onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                className="input resize-none" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Categoría</label>
                <select value={formData.id_categoria}
                  onChange={e => setFormData({ ...formData, id_categoria: e.target.value })}
                  className="select">
                  {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Marca</label>
                <select value={formData.id_marca}
                  onChange={e => setFormData({ ...formData, id_marca: e.target.value })}
                  className="select">
                  {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
            </div>

            {/* Toggle activo */}
            <div
              className="flex items-center justify-between rounded-xl p-3 cursor-pointer transition-all"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              onClick={() => setFormData({ ...formData, activo: !formData.activo })}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: formData.activo ? 'var(--success-bg)' : 'var(--bg-secondary)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={formData.activo ? 'var(--success)' : 'var(--text-muted)'} className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Producto activo</span>
              </div>
              <div className="relative h-5 w-9 rounded-full transition-colors duration-200" style={{ backgroundColor: formData.activo ? 'var(--blue)' : 'var(--border)' }}>
                <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200" style={{ transform: formData.activo ? 'translateX(16px)' : 'translateX(2px)' }} />
              </div>
            </div>

            <button onClick={handleSave} disabled={isSaving} className="btn-primary w-full py-2.5">
              {isSaving ? <><span className="spinner h-4 w-4 border-2" />Guardando...</> : <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Guardar cambios
              </>}
            </button>
          </div>

          {/* Imagen del producto */}
          <div className="card p-5">
            <div className="flex items-center gap-2 pb-3 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--blue-light)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Imagen del producto</h2>
            </div>
            <div className="flex items-center gap-4">
              {/* Imagen clickeable */}
              <button
                type="button"
                onClick={() => producto.imagen_url && setLightboxUrl(producto.imagen_url)}
                className="relative h-24 w-24 shrink-0 rounded-2xl overflow-hidden transition-all group"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border)' }}
                disabled={!producto.imagen_url}
              >
                {producto.imagen_url ? (
                  <>
                    <img src={producto.imagen_url} alt={producto.nombre} className="h-full w-full object-contain p-2" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="h-6 w-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6" />
                      </svg>
                    </div>
                  </>
                ) : IMG_PLACEHOLDER}
              </button>
              <div className="space-y-2">
                <label className={`btn-secondary text-xs cursor-pointer ${uploadingId === -1 ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploadingId === -1 ? 'Subiendo...' : producto.imagen_url ? 'Cambiar imagen' : 'Subir imagen'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                    disabled={uploadingId === -1}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadImagen(f); e.target.value = ''; }} />
                </label>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>JPEG, PNG o WebP — máx. 5MB</p>
                {producto.imagen_url && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Haz clic en la imagen para ampliarla</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Variantes */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--blue-light)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold flex-1" style={{ color: 'var(--text)' }}>Variantes</h2>
            <span className="badge badge-blue">{variantes.length}</span>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {variantes.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>Sin variantes. Agrega una abajo.</p>
            ) : variantes.map((variante) => (
              <div key={variante.id} className="rounded-xl p-3 space-y-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3">
                  {/* Imagen variante */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="relative h-12 w-12 rounded-xl overflow-hidden flex items-center justify-center group"
                      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                      {variante.imagen_url
                        ? <img src={variante.imagen_url} alt="" className="h-full w-full object-contain p-0.5 cursor-pointer"
                            onClick={() => setLightboxUrl(variante.imagen_url!)} />
                        : IMG_PLACEHOLDER}
                      {uploadingId === variante.id && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                          <span className="spinner h-4 w-4 border-2 border-white" />
                        </div>
                      )}
                    </div>
                    <label className="text-xs cursor-pointer font-medium" style={{ color: 'var(--blue)' }}>
                      {variante.imagen_url ? 'Cambiar' : '+ Imagen'}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                        disabled={uploadingId === variante.id}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadVarianteImagen(variante.id, f); e.target.value = ''; }} />
                    </label>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{variante.nombre_variante || variante.sku}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      SKU: {variante.sku} · {formatLempira(variante.precio)}
                      {variante.precio_oferta ? ` · Oferta: ${formatLempira(variante.precio_oferta)}` : ''}
                    </p>
                    <p className="text-xs mt-0.5">
                      Stock: <span className="font-semibold" style={{ color: (variante.stock_total ?? 0) > 0 ? 'var(--success)' : 'var(--danger)' }}>{variante.stock_total ?? 0}</span>
                    </p>
                  </div>
                  <button onClick={() => setConfirmDelVariante(variante.id)} className="btn-icon shrink-0" style={{ color: 'var(--danger)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--danger-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
                {/* Edición inline */}
                {editVariante[variante.id] ? (
                  <div className="space-y-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--blue)' }}>Editando variante</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>SKU *</label>
                        <input type="text" value={editVariante[variante.id].sku}
                          onChange={e => setEditVariante(prev => ({ ...prev, [variante.id]: { ...prev[variante.id], sku: e.target.value } }))}
                          className="input text-sm py-1.5" />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Nombre variante</label>
                        <input type="text" value={editVariante[variante.id].nombre_variante}
                          onChange={e => setEditVariante(prev => ({ ...prev, [variante.id]: { ...prev[variante.id], nombre_variante: e.target.value } }))}
                          className="input text-sm py-1.5" />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Precio *</label>
                        <input type="number" step="0.01" min="0" value={editVariante[variante.id].precio}
                          onChange={e => setEditVariante(prev => ({ ...prev, [variante.id]: { ...prev[variante.id], precio: e.target.value } }))}
                          className="input text-sm py-1.5" />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Precio oferta</label>
                        <input type="number" step="0.01" min="0" value={editVariante[variante.id].precio_oferta}
                          onChange={e => setEditVariante(prev => ({ ...prev, [variante.id]: { ...prev[variante.id], precio_oferta: e.target.value } }))}
                          className="input text-sm py-1.5" placeholder="Sin oferta" />
                      </div>
                    </div>
                    <div
                      className="flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer"
                      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
                      onClick={() => setEditVariante(prev => ({ ...prev, [variante.id]: { ...prev[variante.id], activo: !prev[variante.id].activo } }))}
                    >
                      <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>Variante activa</span>
                      <div className="relative h-4 w-8 rounded-full transition-colors" style={{ backgroundColor: editVariante[variante.id].activo ? 'var(--blue)' : 'var(--border)' }}>
                        <div className="absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform" style={{ transform: editVariante[variante.id].activo ? 'translateX(16px)' : 'translateX(2px)' }} />
                      </div>
                    </div>
                    {/* Stock por tienda editable */}
                    {tiendas.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Stock por tienda</p>
                        {tiendas.map(tienda => {
                          const key = `${variante.id}_${tienda.id}`;
                          return (
                            <div key={tienda.id} className="flex items-center gap-2">
                              <span className="flex-1 text-xs truncate" style={{ color: 'var(--text)' }}>{tienda.nombre}</span>
                              <input type="number" min="0" step="1"
                                value={stockForm[key] ?? '0'}
                                onChange={e => {
                                  const v = Math.max(0, Math.floor(Number(e.target.value)));
                                  setStockForm(prev => ({ ...prev, [key]: String(isNaN(v) ? 0 : v) }));
                                }}
                                className="input w-16 text-center py-1 px-2 text-xs" />
                              <button type="button" onClick={() => handleSaveStock(variante.id, tienda.id)} className="btn-primary text-xs px-2.5 py-1 shrink-0">
                                Guardar
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => cancelEditVariante(variante.id)} className="btn-ghost flex-1 text-xs py-1.5">Cancelar</button>
                      <button onClick={() => handleSaveVariante(variante.id)} disabled={savingVariante === variante.id} className="btn-primary flex-1 text-xs py-1.5">
                        {savingVariante === variante.id ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => startEditVariante(variante)} className="w-full text-xs py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5"
                    style={{ color: 'var(--blue)', backgroundColor: 'var(--blue-light)', border: '1px solid var(--blue-muted)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                    </svg>
                    Editar variante
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Agregar variante */}
          <form onSubmit={handleAddVariante} className="space-y-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Agregar variante</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input type="text" placeholder="SKU *" value={nuevaVariante.sku}
                onChange={e => setNuevaVariante({ ...nuevaVariante, sku: e.target.value })}
                className="input text-sm py-2" />
              <input type="text" placeholder="Nombre variante" value={nuevaVariante.nombre_variante}
                onChange={e => setNuevaVariante({ ...nuevaVariante, nombre_variante: e.target.value })}
                className="input text-sm py-2" />
              <input type="number" step="0.01" min="0" placeholder="Precio *" value={nuevaVariante.precio}
                onChange={e => setNuevaVariante({ ...nuevaVariante, precio: e.target.value })}
                className="input text-sm py-2" />
              <input type="number" step="0.01" min="0" placeholder="Precio oferta" value={nuevaVariante.precio_oferta}
                onChange={e => setNuevaVariante({ ...nuevaVariante, precio_oferta: e.target.value })}
                className="input text-sm py-2" />
            </div>

            {/* Imagen */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Imagen (opcional)</p>
              <div className="flex items-center gap-3">
                {nuevaVarianteImagenPreview ? (
                  <div className="relative h-14 w-14 rounded-xl overflow-hidden shrink-0" style={{ border: '1px solid var(--border)' }}>
                    <img src={nuevaVarianteImagenPreview} alt="" className="h-full w-full object-contain p-1" />
                    <button type="button" onClick={() => { setNuevaVarianteImagen(null); setNuevaVarianteImagenPreview(null); }}
                      className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-white text-xs"
                      style={{ backgroundColor: 'var(--danger)' }}>✕</button>
                  </div>
                ) : (
                  <div className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px dashed var(--border)' }}>
                    {IMG_PLACEHOLDER}
                  </div>
                )}
                <label className="btn-secondary text-xs cursor-pointer">
                  {nuevaVarianteImagen ? 'Cambiar imagen' : 'Seleccionar imagen'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) { setNuevaVarianteImagen(f); setNuevaVarianteImagenPreview(URL.createObjectURL(f)); }
                      e.target.value = '';
                    }} />
                </label>
              </div>
            </div>

            {/* Stock inicial por tienda */}
            {tiendas.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Stock inicial por tienda</p>
                <div className="space-y-1.5">
                  {tiendas.map(tienda => (
                    <div key={tienda.id} className="flex items-center gap-2">
                      <span className="flex-1 text-xs truncate" style={{ color: 'var(--text)' }}>{tienda.nombre}</span>
                      <input type="number" min="0" step="1"
                        value={nuevaVarianteStock[String(tienda.id)] ?? '0'}
                        onChange={e => {
                          const v = Math.max(0, Math.floor(Number(e.target.value)));
                          setNuevaVarianteStock(prev => ({ ...prev, [String(tienda.id)]: String(isNaN(v) ? 0 : v) }));
                        }}
                        className="input w-16 text-center py-1 px-2 text-xs" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" disabled={uploadingNueva} className="btn-secondary w-full py-2 text-sm disabled:opacity-50">
              {uploadingNueva ? (
                <><span className="spinner h-4 w-4 border-2" />Creando...</>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Agregar variante
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}
          onClick={() => setLightboxUrl(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              Cerrar
            </button>
            <img src={lightboxUrl} alt="Vista ampliada"
              className="w-full rounded-2xl object-contain shadow-2xl"
              style={{ maxHeight: '80vh', backgroundColor: 'white', padding: 16 }} />
          </div>
        </div>
      , document.body)}

      {/* Confirm delete variante */}
      {confirmDelVariante !== null && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelVariante(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl mx-auto mb-4" style={{ backgroundColor: 'var(--danger-bg)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--danger)" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-center mb-1" style={{ color: 'var(--text)' }}>Eliminar variante</h3>
            <p className="text-sm text-center mb-5" style={{ color: 'var(--text-muted)' }}>Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelVariante(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={() => handleDeleteVariante(confirmDelVariante)} className="btn-danger flex-1">Eliminar</button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
