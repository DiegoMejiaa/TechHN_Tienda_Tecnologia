'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '@/lib/api-fetch';
import { formatLempira } from '@/lib/format';

interface MetodoEnvio {
  id: number; nombre: string; descripcion?: string; costo: number; activo: boolean;
}

const FORM_VACIO = { nombre: '', descripcion: '', costo: '', activo: true };

export default function AdminEnviosPage() {
  const [metodos, setMetodos] = useState<MetodoEnvio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<MetodoEnvio | null>(null);

  const fetchMetodos = async () => {
    try {
      const res = await apiFetch('/api/metodos-envio');
      const data = await res.json();
      if (data.success && data.data) setMetodos(data.data);
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchMetodos(); }, []);

  const notify = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

  const openCreate = () => { setEditId(null); setForm(FORM_VACIO); setError(''); setShowModal(true); };
  const openEdit = (m: MetodoEnvio) => {
    setEditId(m.id);
    setForm({ nombre: m.nombre, descripcion: m.descripcion || '', costo: String(m.costo), activo: m.activo });
    setError(''); setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      const body = { nombre: form.nombre, descripcion: form.descripcion || null, costo: Number(form.costo), activo: form.activo };
      const res = await apiFetch('/api/metodos-envio', {
        method: editId ? 'PUT' : 'POST',
        body: JSON.stringify(editId ? { id: editId, ...body } : body),
      });
      const data = await res.json();
      if (data.success) { setShowModal(false); fetchMetodos(); notify(editId ? 'Método actualizado' : 'Método creado'); }
      else setError(data.error || data.message || 'Error al guardar');
    } catch { setError('Error de conexión'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (m: MetodoEnvio) => {
    setConfirmDelete(null);
    const res = await apiFetch(`/api/metodos-envio?id=${m.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) { setMetodos(prev => prev.filter(x => x.id !== m.id)); notify('Método eliminado'); }
  };

  const toggleActivo = async (m: MetodoEnvio) => {
    const res = await apiFetch('/api/metodos-envio', { method: 'PUT', body: JSON.stringify({ id: m.id, activo: !m.activo }) });
    const data = await res.json();
    if (data.success) setMetodos(prev => prev.map(x => x.id === m.id ? { ...x, activo: !x.activo } : x));
  };

  const ENVIO_ICONS = ['🚚', '✈️', '🏪', '📦', '⚡', '🛵'];
  const getIcon = (nombre: string) => ENVIO_ICONS[nombre.length % ENVIO_ICONS.length];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Métodos de envío</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {metodos.length} métodos · {metodos.filter(m => m.activo).length} activos
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Nuevo método
        </button>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
          {message}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />)}
        </div>
      ) : metodos.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">🚚</div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Sin métodos de envío</p>
          <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>Agrega métodos para que los clientes puedan elegir al comprar</p>
          <button onClick={openCreate} className="btn-primary text-sm">Crear primer método</button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metodos.map(m => (
            <div key={m.id} className="card p-4 space-y-3" style={!m.activo ? { opacity: 0.6 } : {}}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    {getIcon(m.nombre)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{m.nombre}</p>
                    {m.descripcion && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.descripcion}</p>}
                  </div>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{ backgroundColor: m.activo ? 'var(--success-bg)' : 'var(--bg-secondary)', color: m.activo ? 'var(--success)' : 'var(--text-muted)' }}>
                  {m.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Costo de envío</span>
                <span className="text-sm font-bold" style={{ color: m.costo === 0 ? 'var(--success)' : 'var(--text)' }}>
                  {m.costo === 0 ? 'Gratis' : formatLempira(m.costo)}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                <button onClick={() => toggleActivo(m)} className="flex-1 text-xs py-1.5 rounded-lg font-semibold transition-all"
                  style={{ backgroundColor: m.activo ? 'var(--success-bg)' : 'var(--bg-secondary)', color: m.activo ? 'var(--success)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  {m.activo ? '✓ Activo' : '○ Inactivo'}
                </button>
                <button onClick={() => openEdit(m)} className="btn-icon" title="Editar">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                </button>
                <button onClick={() => setConfirmDelete(m)} className="btn-icon" style={{ color: 'var(--danger)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--danger-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')} title="Eliminar">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl shadow-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{editId ? 'Editar método' : 'Nuevo método de envío'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-5">
              {error && <div className="rounded-xl px-3 py-2 text-xs mb-4" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Nombre <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input required type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="input py-2" placeholder="Ej: Envío estándar" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Descripción</label>
                  <input type="text" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} className="input py-2" placeholder="Ej: Entrega en 3-5 días hábiles" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Costo (L) <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input required type="number" min="0" step="0.01" value={form.costo} onChange={e => setForm({ ...form, costo: e.target.value })} className="input py-2" placeholder="0.00 = Gratis" />
                  {form.costo === '0' || form.costo === '' ? null : (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>= {formatLempira(Number(form.costo))}</p>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-xl p-3 cursor-pointer" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                  onClick={() => setForm({ ...form, activo: !form.activo })}>
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Método activo</span>
                  <div className="relative h-5 w-9 rounded-full transition-colors" style={{ backgroundColor: form.activo ? 'var(--blue)' : 'var(--border)' }}>
                    <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform" style={{ transform: form.activo ? 'translateX(16px)' : 'translateX(2px)' }} />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-2.5">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">
                    {saving ? <><span className="spinner h-4 w-4 border-2" />Guardando...</> : (editId ? 'Actualizar' : 'Crear método')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      , document.body)}

      {confirmDelete && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl mx-auto mb-4" style={{ backgroundColor: 'var(--danger-bg)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--danger)" className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            </div>
            <h3 className="text-base font-semibold text-center mb-1" style={{ color: 'var(--text)' }}>Eliminar método</h3>
            <p className="text-sm text-center mb-5" style={{ color: 'var(--text-muted)' }}>¿Eliminar <span className="font-semibold" style={{ color: 'var(--text)' }}>{confirmDelete.nombre}</span>?</p>
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
