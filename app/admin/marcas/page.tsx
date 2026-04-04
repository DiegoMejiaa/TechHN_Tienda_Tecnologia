'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Marca, ApiResponse } from '@/types';
import { apiFetch } from '@/lib/api-fetch';
import { useAuth } from '@/contexts/auth-context';

const BRAND_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
];

function getBrandColor(nombre: string) {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  return BRAND_COLORS[Math.abs(hash) % BRAND_COLORS.length];
}

function BrandAvatar({ nombre }: { nombre: string }) {
  const color = getBrandColor(nombre);
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white text-xs font-bold"
      style={{ backgroundColor: color }}
    >
      {nombre.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function AdminMarcasPage() {
  const { usuario } = useAuth();
  const isAdminSucursal = Number(usuario?.id_rol) === 4;

  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Marca | null>(null);
  const [search, setSearch] = useState('');

  const fetchMarcas = async () => {
    const res = await apiFetch('/api/marcas');
    const data: ApiResponse<Marca[]> = await res.json();
    if (data.success && data.data) setMarcas(data.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchMarcas(); }, []);

  const notify = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/marcas', {
        method: editId ? 'PUT' : 'POST',
        body: JSON.stringify(editId ? { id: editId, nombre } : { nombre }),
      });
      const data: ApiResponse<Marca> = await res.json();
      if (data.success) {
        setNombre(''); setEditId(null);
        fetchMarcas();
        notify(editId ? 'Marca actualizada' : 'Marca creada');
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (marca: Marca) => {
    setConfirmDelete(null);
    await apiFetch(`/api/marcas?id=${marca.id}`, { method: 'DELETE' });
    fetchMarcas();
    notify('Marca eliminada');
  };

  const filtered = marcas.filter(m => m.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Marcas</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {marcas.length} marca{marcas.length !== 1 ? 's' : ''} registradas
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
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: editId ? '#fef3c7' : 'var(--blue-light)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}
                stroke={editId ? '#d97706' : 'var(--blue)'} className="h-4 w-4">
                {editId
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                }
              </svg>
            </div>
            <h2 className="text-sm font-semibold flex-1" style={{ color: 'var(--text)' }}>
              {editId ? 'Editar marca' : 'Nueva marca'}
            </h2>
            {editId && (
              <button
                onClick={() => { setEditId(null); setNombre(''); }}
                className="text-xs" style={{ color: 'var(--text-muted)' }}
              >
                Cancelar ✕
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Preview */}
            {nombre.trim() && (
              <div className="flex items-center gap-3 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <BrandAvatar nombre={nombre} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{nombre}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Vista previa</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Nombre de la marca <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Samsung, Apple, Sony..."
                required
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="input"
                autoFocus
              />
            </div>

            <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
              {saving ? (
                <><span className="spinner h-4 w-4 border-2" />Guardando...</>
              ) : (
                <>{editId ? 'Actualizar marca' : 'Crear marca'}</>
              )}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--blue-light)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold flex-1" style={{ color: 'var(--text)' }}>Lista</h2>
            <span className="badge badge-blue">{marcas.length}</span>
          </div>

          {/* Search */}
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar marca..."
              className="input pl-8 py-2 text-sm"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {search ? `Sin resultados para "${search}"` : 'Sin marcas aún'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {filtered.map(marca => (
                <div
                  key={marca.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 group transition-all"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                >
                  <BrandAvatar nombre={marca.nombre} />
                  <p className="flex-1 text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                    {marca.nombre}
                  </p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditId(marca.id); setNombre(marca.nombre); }}
                      className="btn-icon" title="Editar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setConfirmDelete(marca)}
                      className="btn-icon" title="Eliminar"
                      style={{ color: 'var(--danger)' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--danger-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
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
            <h3 className="text-base font-semibold text-center mb-1" style={{ color: 'var(--text)' }}>Eliminar marca</h3>
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
