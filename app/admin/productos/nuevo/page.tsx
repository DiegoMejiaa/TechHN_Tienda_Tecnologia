'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Categoria, Marca, ApiResponse, Producto, Tienda } from '@/types';
import { apiFetch } from '@/lib/api-fetch';

interface StockTienda { id_tienda: number; nombre: string; cantidad: number }

export default function NuevoProductoPage() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1=info, 2=imagen, 3=variante+stock
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    nombre: '', descripcion: '', id_categoria: '', id_marca: '', activo: true,
  });
  const [marcaInput, setMarcaInput] = useState('');
  const [marcaDropdownOpen, setMarcaDropdownOpen] = useState(false);
  const [marcaNueva, setMarcaNueva] = useState(false);
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Variante base + stock
  const [variante, setVariante] = useState({ sku: '', precio: '', precio_oferta: '' });
  const [stockTiendas, setStockTiendas] = useState<StockTienda[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [catRes, marcasRes, tiendasRes] = await Promise.all([
          apiFetch('/api/categorias'), apiFetch('/api/marcas'), apiFetch('/api/tiendas'),
        ]);
        const catData: ApiResponse<Categoria[]> = await catRes.json();
        const marcasData: ApiResponse<Marca[]> = await marcasRes.json();
        const tiendasData: ApiResponse<Tienda[]> = await tiendasRes.json();
        if (catData.success && catData.data) setCategorias(catData.data);
        if (marcasData.success && marcasData.data) setMarcas(marcasData.data);
        if (tiendasData.success && tiendasData.data) {
          setTiendas(tiendasData.data);
          setStockTiendas(tiendasData.data.map(t => ({ id_tienda: t.id, nombre: t.nombre, cantidad: 0 })));
        }
      } catch { setError('Error al cargar datos'); }
    }
    fetchData();
  }, []);

  const handleFile = (file: File) => { setImagenFile(file); setImagenPreview(URL.createObjectURL(file)); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  };

  const setStock = (id_tienda: number, raw: string) => {
    const val = Math.max(0, parseInt(raw) || 0);
    setStockTiendas(prev => prev.map(s => s.id_tienda === id_tienda ? { ...s, cantidad: val } : s));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!variante.sku || !variante.precio) { setError('SKU y precio son requeridos'); return; }
    const precio = parseFloat(variante.precio);
    const precio_oferta = variante.precio_oferta ? parseFloat(variante.precio_oferta) : null;
    if (isNaN(precio) || precio <= 0) { setError('El precio debe ser mayor a 0'); return; }
    if (precio_oferta !== null && precio_oferta >= precio) { setError('El precio de oferta debe ser menor al precio normal'); return; }
    setIsLoading(true);
    try {
      // 1. Crear marca si es nueva (o reutilizar si ya existe con ese nombre)
      let id_marca = Number(formData.id_marca);
      if (marcaNueva) {
        const nombreMarca = marcaInput.trim();
        const existente = marcas.find(m => m.nombre.toLowerCase() === nombreMarca.toLowerCase());
        if (existente) {
          id_marca = existente.id;
        } else {
          const marcaRes = await apiFetch('/api/marcas', { method: 'POST', body: JSON.stringify({ nombre: nombreMarca }) });
          const marcaData: ApiResponse<Marca> = await marcaRes.json();
          if (!marcaData.success || !marcaData.data) { setError(marcaData.message || 'Error al crear la marca'); setIsLoading(false); return; }
          id_marca = marcaData.data.id;
        }
      }
      // 2. Crear producto
      const prodRes = await apiFetch('/api/productos', {
        method: 'POST',
        body: JSON.stringify({ nombre: formData.nombre, descripcion: formData.descripcion || null, id_categoria: Number(formData.id_categoria), id_marca, activo: formData.activo }),
      });
      const prodData: ApiResponse<Producto> = await prodRes.json();
      if (!prodData.success || !prodData.data) { setError(prodData.error || 'Error al crear el producto'); setIsLoading(false); return; }
      const productoId = prodData.data.id;
      // 3. Subir imagen
      if (imagenFile) {
        const form = new FormData();
        form.append('file', imagenFile); form.append('folder', 'productos');
        const token = sessionStorage.getItem('token');
        const uploadRes = await fetch('/api/upload', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
        const uploadData: ApiResponse<{ url: string; publicId: string }> = await uploadRes.json();
        if (uploadData.success && uploadData.data) {
          const putRes = await apiFetch('/api/productos', { method: 'PUT', body: JSON.stringify({ id: productoId, imagen_url: uploadData.data.url, cloudinary_public_id: uploadData.data.publicId }) });
          const putData = await putRes.json();
          if (!putData.success) { setError('Producto creado pero no se pudo guardar la imagen. Edítalo para subirla.'); setIsLoading(false); return; }
        } else {
          setError(`Producto creado pero falló la subida de imagen: ${uploadData.message || 'Error desconocido'}. Edítalo para subirla.`);
          setIsLoading(false);
          return;
        }
      }
      // 4. Crear variante base
      const varRes = await apiFetch('/api/variantes', {
        method: 'POST',
        body: JSON.stringify({ id_producto: productoId, sku: variante.sku.trim(), nombre_variante: null, precio, precio_oferta, activo: true }),
      });
      const varData: ApiResponse<{ id: number }> = await varRes.json();
      if (!varData.success || !varData.data) { setError('Error al crear la variante'); setIsLoading(false); return; }
      const varianteId = varData.data.id;
      // 5. Asignar stock por tienda (solo las que tienen cantidad > 0)
      const stockConCantidad = stockTiendas.filter(s => s.cantidad > 0);
      await Promise.all(stockConCantidad.map(s =>
        apiFetch('/api/stock', { method: 'PUT', body: JSON.stringify({ id_variante: varianteId, id_tienda: s.id_tienda, cantidad: s.cantidad }) })
      ));
      router.push('/admin/productos');
    } catch (err) {
      console.error(err); setError('Error al crear el producto');
    } finally { setIsLoading(false); }
  };

  const steps = [
    { n: 1, label: 'Información básica' },
    { n: 2, label: 'Imagen' },
    { n: 3, label: 'Variante y stock' },
  ];

  const marcaNombreDisplay = marcaNueva ? `${marcaInput.trim()} (nueva)` : marcas.find(m => String(m.id) === formData.id_marca)?.nombre || '—';
  const totalStock = stockTiendas.reduce((s, t) => s + t.cantidad, 0);

  return (
    <div className="mx-auto max-w-2xl pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/productos" className="btn-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Nuevo producto</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Agrega un nuevo producto al catálogo de TechHN</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center mb-8">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all"
                style={step >= s.n
                  ? { backgroundColor: 'var(--blue)', color: '#fff', boxShadow: '0 0 0 4px var(--blue-light)' }
                  : { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '2px solid var(--border)' }}>
                {step > s.n
                  ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  : s.n}
              </div>
              <span className="text-sm font-medium hidden sm:block" style={{ color: step >= s.n ? 'var(--text)' : 'var(--text-muted)' }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className="flex-1 mx-3 h-px" style={{ backgroundColor: step > s.n ? 'var(--blue)' : 'var(--border)' }} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            {error}
          </div>
        )}

        {/* ── STEP 1: Información básica ── */}
        {step === 1 && (
          <div className="card p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--blue-light)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Información básica</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Datos principales del producto</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Nombre del producto <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="input" placeholder="Ej: Samsung Galaxy S25 Ultra" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Descripción</label>
              <textarea rows={3} value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} className="input resize-none" placeholder="Describe las características principales..." />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Categoría <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select required value={formData.id_categoria} onChange={e => setFormData({ ...formData, id_categoria: e.target.value })} className="select">
                  <option value="">Seleccionar categoría</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Marca <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div className="relative">
                  <input type="text" placeholder="Buscar o escribir nueva marca..." value={marcaInput} autoComplete="off" className="input"
                    onChange={e => {
                      const val = e.target.value; setMarcaInput(val); setMarcaDropdownOpen(true);
                      const exacta = marcas.find(m => m.nombre.trim().toLowerCase() === val.trim().toLowerCase());
                      if (exacta) { setMarcaInput(exacta.nombre); setFormData(p => ({ ...p, id_marca: String(exacta.id) })); setMarcaNueva(false); setMarcaDropdownOpen(false); }
                      else if (val.trim()) { setFormData(p => ({ ...p, id_marca: 'nueva' })); setMarcaNueva(true); }
                      else { setFormData(p => ({ ...p, id_marca: '' })); setMarcaNueva(false); }
                    }}
                    onFocus={() => setMarcaDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setMarcaDropdownOpen(false), 150)}
                  />
                  {marcaNueva && marcaInput.trim() && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--blue-light)', color: 'var(--blue)' }}>Nueva</span>
                  )}
                  {marcaDropdownOpen && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl shadow-xl overflow-auto" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', maxHeight: 200 }}>
                      {marcaInput.trim() && !marcas.find(m => m.nombre.toLowerCase() === marcaInput.toLowerCase()) && (
                        <button type="button" className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm" style={{ borderBottom: '1px solid var(--border)', color: 'var(--blue)' }}
                          onMouseDown={() => { setFormData(p => ({ ...p, id_marca: 'nueva' })); setMarcaNueva(true); setMarcaDropdownOpen(false); }}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                          Crear marca &quot;{marcaInput.trim()}&quot;
                        </button>
                      )}
                      {marcas.filter(m => m.nombre.toLowerCase().includes(marcaInput.toLowerCase())).map(m => (
                        <button key={m.id} type="button" className="flex w-full items-center px-4 py-2.5 text-left text-sm" style={{ color: 'var(--text)' }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                          onMouseDown={() => { setMarcaInput(m.nombre); setFormData(p => ({ ...p, id_marca: String(m.id) })); setMarcaNueva(false); setMarcaDropdownOpen(false); }}>
                          {m.nombre}
                        </button>
                      ))}
                      {marcas.filter(m => m.nombre.toLowerCase().includes(marcaInput.toLowerCase())).length === 0 && !marcaInput.trim() && (
                        <p className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>Escribe para buscar o crear una marca</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Toggle activo */}
            <div className="flex items-center justify-between rounded-xl p-4 cursor-pointer" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              onClick={() => setFormData({ ...formData, activo: !formData.activo })}>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: formData.activo ? 'var(--success-bg)' : 'var(--bg-secondary)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={formData.activo ? 'var(--success)' : 'var(--text-muted)'} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Producto activo</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Visible en la tienda para los clientes</p>
                </div>
              </div>
              <div className="relative h-6 w-11 rounded-full transition-colors duration-200" style={{ backgroundColor: formData.activo ? 'var(--blue)' : 'var(--border)' }}>
                <div className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200" style={{ transform: formData.activo ? 'translateX(20px)' : 'translateX(2px)' }} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Link href="/admin/productos" className="btn-secondary flex-1 text-center py-2.5">Cancelar</Link>
              <button type="button" className="btn-primary flex-1 py-2.5"
                onClick={() => {
                  if (!formData.nombre || !formData.id_categoria || !formData.id_marca) { setError('Nombre, categoría y marca son requeridos'); return; }
                  setError(''); setStep(2);
                }}>
                Siguiente
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Imagen ── */}
        {step === 2 && (
          <div className="card p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--blue-light)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Imagen del producto</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Se sube a Cloudinary automáticamente</p>
              </div>
            </div>

            <div className="relative rounded-2xl transition-all duration-200 cursor-pointer"
              style={{ border: `2px dashed ${dragOver ? 'var(--blue)' : imagenPreview ? 'var(--success)' : 'var(--border)'}`, backgroundColor: dragOver ? 'var(--blue-light)' : 'var(--bg-secondary)', minHeight: 200 }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {imagenPreview ? (
                <div className="flex flex-col items-center justify-center p-6 gap-4">
                  <div className="relative">
                    <img src={imagenPreview} alt="Preview" className="h-36 w-36 rounded-2xl object-contain shadow-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', padding: 8 }} />
                    <button type="button" onClick={e => { e.stopPropagation(); setImagenFile(null); setImagenPreview(null); }}
                      className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full text-white text-xs shadow" style={{ backgroundColor: 'var(--danger)' }}>✕</button>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: 'var(--success)' }}>✓ Imagen seleccionada</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{imagenFile?.name}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-10 gap-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="var(--text-muted)" className="h-7 w-7"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{dragOver ? 'Suelta aquí' : 'Arrastra o haz clic'}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>JPEG, PNG o WebP — máx. 5MB (opcional)</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 py-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                Atrás
              </button>
              <button type="button" className="btn-primary flex-1 py-2.5" onClick={() => { setError(''); setStep(3); }}>
                Siguiente
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Variante y stock ── */}
        {step === 3 && (
          <div className="card p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--blue-light)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Variante y stock inicial</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Precio, SKU y cantidad disponible por tienda</p>
              </div>
            </div>

            {/* SKU y precios */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>SKU <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="text" required value={variante.sku} onChange={e => setVariante(p => ({ ...p, sku: e.target.value }))}
                  className="input" placeholder="Ej: SAM-S25-BLK" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Precio (L) <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="number" required min="0.01" step="0.01" value={variante.precio}
                  onChange={e => setVariante(p => ({ ...p, precio: e.target.value }))}
                  className="input" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Precio oferta (L)</label>
                <input type="number" min="0.01" step="0.01" value={variante.precio_oferta}
                  onChange={e => setVariante(p => ({ ...p, precio_oferta: e.target.value }))}
                  className="input" placeholder="Opcional" />
              </div>
            </div>

            {/* Stock por tienda */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Stock inicial por tienda</label>
                {totalStock > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                    Total: {totalStock} unidades
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {stockTiendas.map(s => (
                  <div key={s.id_tienda} className="flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: 'var(--blue-light)' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" /></svg>
                    </div>
                    <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text)' }}>{s.nombre}</span>
                    {/* Controles +/- */}
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setStock(s.id_tienda, String(s.cantidad - 1))}
                        disabled={s.cantidad <= 0}
                        className="flex h-7 w-7 items-center justify-center rounded-lg font-bold text-sm disabled:opacity-30"
                        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>−</button>
                      <input type="number" min="0" value={s.cantidad}
                        onChange={e => setStock(s.id_tienda, e.target.value)}
                        onBlur={e => { if (parseInt(e.target.value) < 0 || isNaN(parseInt(e.target.value))) setStock(s.id_tienda, '0'); }}
                        className="w-16 text-center text-sm font-semibold rounded-lg py-1"
                        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                      <button type="button" onClick={() => setStock(s.id_tienda, String(s.cantidad + 1))}
                        className="flex h-7 w-7 items-center justify-center rounded-lg font-bold text-sm"
                        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>+</button>
                    </div>
                    <span className="text-xs w-16 text-right" style={{ color: s.cantidad > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {s.cantidad > 0 ? `${s.cantidad} uds.` : 'Sin stock'}
                    </span>
                  </div>
                ))}
              </div>
              {totalStock === 0 && (
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  Puedes dejar en 0 y asignar stock después desde la sección de Stock.
                </p>
              )}
            </div>

            {/* Resumen */}
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Resumen</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span style={{ color: 'var(--text-muted)' }}>Nombre</span><p className="font-semibold truncate" style={{ color: 'var(--text)' }}>{formData.nombre}</p></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Marca</span><p className="font-semibold" style={{ color: 'var(--text)' }}>{marcaNombreDisplay}</p></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Categoría</span><p className="font-semibold" style={{ color: 'var(--text)' }}>{categorias.find(c => String(c.id) === formData.id_categoria)?.nombre || '—'}</p></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Stock total</span><p className="font-semibold" style={{ color: totalStock > 0 ? 'var(--success)' : 'var(--text-muted)' }}>{totalStock} unidades</p></div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1 py-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                Atrás
              </button>
              <button type="submit" disabled={isLoading} className="btn-primary flex-1 py-2.5">
                {isLoading
                  ? <><span className="spinner h-4 w-4 border-2" />Creando...</>
                  : <><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>Crear producto</>}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
