'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Categoria, ApiResponse } from '@/types';
import { apiFetch } from '@/lib/api-fetch';

const CATEGORY_ICONS: Record<string, string> = {
  smartphones: '📱', laptops: '💻', audio: '🎧', electronica: '⚡',
  accesorios: '🔌', tablets: '📟', gaming: '🎮', camaras: '📷',
};

function getCategoryIcon(nombre: string) {
  const key = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return CATEGORY_ICONS[key] || '📦';
}

export default function AdminCategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ nombre: '', slug: '', id_categoria_padre: '' });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Categoria | null>(null);

  const fetchCategorias = async () => {
    const res = await apiFetch('/api/categorias');
    const data: ApiResponse<Categoria[]> = await res.json();
    if (data.success && data.data) setCategorias(data.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchCategorias(); }, []);

  const notify = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

  // Auto-generate slug from nombre
  const handleNombreChange = (nombre: string) => {
    const slug = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setForm(f => ({ ...f, nombre, slug: editId ? f.slug : slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      const body = { nombre: form.nombre, slug: form.slug, id_categoria_padre: form.id_categoria_padre ? Number(form.id_categoria_padre) : null };
      const res = await apiFetch('/api/categorias', {
        method: editId ? 'PUT' : 'POST',
        body: JSON.stringify(editId ? { id: editId, ...body } : body),
      });
      const data: ApiResponse<Categoria> = await res.json();
      if (data.success) {
        setForm({ nombre: '', slug: '', id_categoria_padre: '' });
        setEditId(null);
        fetchCategorias();
        notify(editId ? 'Categoría actualizada' : 'Categoría creada');
      } else setError(data.message || 'Error');
    } catch { setError('Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleEdit = (cat: Categoria) => {
    setEditId(cat.id);
    setForm({ nombre: cat.nombre, slug: cat.slug, id_categoria_padre: cat.id_categoria_padre ? String(cat.id_categoria_padre) : '' });
  };

  const handleDelete = async (cat: Categoria) => {
    setConfirmDelete(null);
    await apiFetch(`/api/categorias?id=${cat.id}`, { method: 'DELETE' });
    fetchCategorias();
    notify('Categoría eliminada');
  };

  const raices = categorias.filter(c => !c.id_categoria_padre);
  const hijas = categorias.filter(c => c.id_categoria_padre);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Categorías</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {categorias.length} categoría{categorias.length !== 1 ? 's' : ''} registradas
        </p>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          {message}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Form */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: editId ? '#fef3c7' : 'var(--blue-light)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={editId ? '#d97706' : 'var(--blue)'} className="h-4 w-4">
                {editId
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                }
              </svg>
            </div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {editId ? 'Editar categoría' : 'Nueva categoría'}
            </h2>
            {editId && (
              <button onClick={() => { setEditId(null); setForm({ nombre: '', slug: '', id_categoria_padre: '' }); setError(''); }}
                className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
                Cancelar edición ✕
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Nombre <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input type="text" placeholder="Ej: Smartphones" required value={form.nombre}
                onChange={e => handleNombreChange(e.target.value)}
                className="input" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Slug <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs select-none" style={{ color: 'var(--text-muted)' }}>/</span>
                <input type="text" placeholder="smartphones" required value={form.slug}
                  onChange={e => setForm({ ...form, slug: e.target.value })}
                  className="input pl-6 font-mono text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Categoría padre
              </label>
              <select value={form.id_categoria_padre}
                onChange={e => setForm({ ...form, id_categoria_padre: e.target.value })}
                className="select">
                <option value="">Sin categoría padre (raíz)</option>
                {raices.filter(c => c.id !== editId).map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
              {saving ? <><span className="spinner h-4 w-4 border-2" />Guardando...</> : (
                <>{editId ? 'Actualizar categoría' : 'Crear categoría'}</>
              )}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="card p-5">
          <div className="flex items-center gap-2 pb-3 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--blue-light)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold flex-1" style={{ color: 'var(--text)' }}>Lista</h2>
            <span className="badge badge-blue">{categorias.length}</span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />
              ))}
            </div>
          ) : categorias.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Sin categorías aún</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {/* Raíces con sus hijas */}
              {raices.map(cat => (
                <div key={cat.id}>
                  <div
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 group transition-all"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                  >
                    <span className="text-xl shrink-0">{getCategoryIcon(cat.nombre)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{cat.nombre}</p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>/{cat.slug}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(cat)} className="btn-icon" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                        </svg>
                      </button>
                      <button onClick={() => setConfirmDelete(cat)} className="btn-icon" style={{ color: 'var(--danger)' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--danger-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')} title="Eliminar">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {/* Subcategorías */}
                  {hijas.filter(h => h.id_categoria_padre === cat.id).map(sub => (
                    <div key={sub.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 ml-6 mt-1 group transition-all"
                      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
                    >
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>↳</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{sub.nombre}</p>
                        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>/{sub.slug}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(sub)} className="btn-icon" title="Editar">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                          </svg>
                        </button>
                        <button onClick={() => setConfirmDelete(sub)} className="btn-icon" style={{ color: 'var(--danger)' }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--danger-bg)')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')} title="Eliminar">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm delete */}
      {confirmDelete && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl mx-auto mb-4" style={{ backgroundColor: 'var(--danger-bg)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--danger)" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-center mb-1" style={{ color: 'var(--text)' }}>Eliminar categoría</h3>
            <p className="text-sm text-center mb-5" style={{ color: 'var(--text-muted)' }}>
              ¿Eliminar <span className="font-semibold" style={{ color: 'var(--text)' }}>{confirmDelete.nombre}</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} className="btn-danger flex-1">Eliminar</button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
