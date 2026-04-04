'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Tienda, ApiResponse } from '@/types';
import { apiFetch } from '@/lib/api-fetch';

const CITY_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4'];
function getCityColor(nombre: string) {
  let h = 0; for (let i = 0; i < nombre.length; i++) h = nombre.charCodeAt(i) + ((h << 5) - h);
  return CITY_COLORS[Math.abs(h) % CITY_COLORS.length];
}

export default function AdminTiendasPage() {
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ nombre: '', ciudad: '', telefono: '', direccion: '' });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Tienda | null>(null);

  const fetchTiendas = async () => {
    const res = await apiFetch('/api/tiendas');
    const data: ApiResponse<Tienda[]> = await res.json();
    if (data.success && data.data) setTiendas(data.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchTiendas(); }, []);

  const notify = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await apiFetch('/api/tiendas', {
        method: editId ? 'PUT' : 'POST',
        body: JSON.stringify(editId ? { id: editId, ...form } : form),
      });
      const data: ApiResponse<Tienda> = await res.json();
      if (data.success) {
        setForm({ nombre: '', ciudad: '', telefono: '', direccion: '' }); setEditId(null);
        fetchTiendas(); notify(editId ? 'Tienda actualizada' : 'Tienda creada');
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (tienda: Tienda) => {
    setConfirmDelete(null);
    await apiFetch(`/api/tiendas?id=${tienda.id}`, { method: 'DELETE' });
    fetchTiendas(); notify('Tienda eliminada');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Tiendas</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{tiendas.length} tienda{tiendas.length !== 1 ? 's' : ''} registradas</p>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
          {message}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Form */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: editId ? '#fef3c7' : 'var(--blue-light)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={editId ? '#d97706' : 'var(--blue)'} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold flex-1" style={{ color: 'var(--text)' }}>{editId ? 'Editar tienda' : 'Nueva tienda'}</h2>
            {editId && <button onClick={() => { setEditId(null); setForm({ nombre: '', ciudad: '', telefono: '', direccion: '' }); }} className="text-xs" style={{ color: 'var(--text-muted)' }}>Cancelar ✕</button>}
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Nombre <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" placeholder="Ej: TechHN Tegucigalpa" required value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Ciudad</label>
              <input type="text" placeholder="Ej: Tegucigalpa" value={form.ciudad}
                onChange={e => setForm({ ...form, ciudad: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Teléfono</label>
              <input type="text" placeholder="Ej: +504 2222-3333" value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Dirección</label>
              <input type="text" placeholder="Ej: Col. Palmira, Av. Principal" value={form.direccion}
                onChange={e => setForm({ ...form, direccion: e.target.value })} className="input" />
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
              {saving ? <><span className="spinner h-4 w-4 border-2" />Guardando...</> : (editId ? 'Actualizar tienda' : 'Crear tienda')}
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
            <span className="badge badge-blue">{tiendas.length}</span>
          </div>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />)}</div>
          ) : tiendas.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Sin tiendas aún</p>
          ) : (
            <div className="space-y-2">
              {tiendas.map(tienda => {
                const color = getCityColor(tienda.nombre);
                return (
                  <div key={tienda.id} className="flex items-center gap-3 rounded-xl px-3 py-3 group transition-all"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white text-xs font-bold"
                      style={{ backgroundColor: color }}>
                      {tienda.nombre.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{tienda.nombre}</p>
                      {tienda.ciudad && (
                        <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3 w-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                          </svg>
                          {tienda.ciudad}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditId(tienda.id); setForm({ nombre: tienda.nombre || '', ciudad: tienda.ciudad || '', telefono: tienda.telefono || '', direccion: tienda.direccion || '' }); }} className="btn-icon" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                      </button>
                      <button onClick={() => setConfirmDelete(tienda)} className="btn-icon" style={{ color: 'var(--danger)' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--danger-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')} title="Eliminar">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {confirmDelete && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl mx-auto mb-4" style={{ backgroundColor: 'var(--danger-bg)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--danger)" className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            </div>
            <h3 className="text-base font-semibold text-center mb-1" style={{ color: 'var(--text)' }}>Eliminar tienda</h3>
            <p className="text-sm text-center mb-5" style={{ color: 'var(--text-muted)' }}>¿Eliminar <span className="font-semibold" style={{ color: 'var(--text)' }}>{confirmDelete.nombre}</span>? Esta acción no se puede deshacer.</p>
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
