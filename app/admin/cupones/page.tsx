'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '@/lib/api-fetch';
import { formatLempira } from '@/lib/format';

interface Cupon {
  id: number; codigo: string; tipo: 'porcentaje' | 'monto_fijo';
  valor: number; minimo_compra?: number; usos_maximos?: number;
  usos_actuales: number; activo: boolean; fecha_expiracion?: string; creado_en: string;
}

const FORM_VACIO = { codigo: '', tipo: 'porcentaje' as 'porcentaje' | 'monto_fijo', valor: '', minimo_compra: '', usos_maximos: '', fecha_expiracion: '', activo: true };

function isExpired(fecha?: string) { return fecha ? new Date(fecha) < new Date() : false; }

export default function AdminCuponesPage() {
  const [cupones, setCupones] = useState<Cupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Cupon | null>(null);
  const [search, setSearch] = useState('');

  const fetchCupones = async () => {
    try {
      const res = await apiFetch('/api/cupones');
      const data = await res.json();
      if (data.success && data.data) setCupones(data.data);
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchCupones(); }, []);

  const notify = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

  const openCreate = () => { setEditId(null); setForm(FORM_VACIO); setError(''); setShowModal(true); };
  const openEdit = (c: Cupon) => {
    setEditId(c.id);
    setForm({
      codigo: c.codigo, tipo: c.tipo, valor: String(c.valor),
      minimo_compra: c.minimo_compra ? String(c.minimo_compra) : '',
      usos_maximos: c.usos_maximos ? String(c.usos_maximos) : '',
      fecha_expiracion: c.fecha_expiracion ? c.fecha_expiracion.slice(0, 10) : '',
      activo: c.activo,
    });
    setError(''); setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      const body = {
        codigo: form.codigo.toUpperCase(), tipo: form.tipo,
        valor: Number(form.valor),
        minimo_compra: form.minimo_compra ? Number(form.minimo_compra) : null,
        usos_maximos: form.usos_maximos ? Number(form.usos_maximos) : null,
        fecha_expiracion: form.fecha_expiracion || null,
        activo: form.activo,
      };
      const res = await apiFetch('/api/cupones', {
        method: editId ? 'PUT' : 'POST',
        body: JSON.stringify(editId ? { id: editId, ...body } : body),
      });
      const data = await res.json();
      if (data.success) { setShowModal(false); fetchCupones(); notify(editId ? 'Cupón actualizado' : 'Cupón creado'); }
      else setError(data.error || data.message || 'Error al guardar');
    } catch { setError('Error de conexión'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c: Cupon) => {
    setConfirmDelete(null);
    const res = await apiFetch(`/api/cupones?id=${c.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) { setCupones(prev => prev.filter(x => x.id !== c.id)); notify('Cupón eliminado'); }
  };

  const toggleActivo = async (c: Cupon) => {
    const res = await apiFetch('/api/cupones', { method: 'PUT', body: JSON.stringify({ id: c.id, activo: !c.activo }) });
    const data = await res.json();
    if (data.success) { setCupones(prev => prev.map(x => x.id === c.id ? { ...x, activo: !x.activo } : x)); }
  };

  const filtered = cupones.filter(c => c.codigo.toLowerCase().includes(search.toLowerCase()));
  const activos = cupones.filter(c => c.activo && !isExpired(c.fecha_expiracion)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Cupones</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{cupones.length} cupones · {activos} activos</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Nuevo cupón
        </button>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
          {message}
        </div>
      )}

      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cupón..." className="input pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hay cupones</p></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(c => {
            const expired = isExpired(c.fecha_expiracion);
            const statusColor = !c.activo ? 'var(--text-muted)' : expired ? 'var(--danger)' : 'var(--success)';
            const statusBg = !c.activo ? 'var(--bg-secondary)' : expired ? 'var(--danger-bg)' : 'var(--success-bg)';
            const statusLabel = !c.activo ? 'Inactivo' : expired ? 'Expirado' : 'Activo';
            return (
              <div key={c.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--blue-light)' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185ZM9.75 9h.008v.008H9.75V9Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 4.5h.008v.008h-.008V13.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold font-mono tracking-wider" style={{ color: 'var(--text)' }}>{c.codigo}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {c.tipo === 'porcentaje' ? `${c.valor}% descuento` : `${formatLempira(c.valor)} descuento`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: statusBg, color: statusColor }}>{statusLabel}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <div>
                    <p>Usos</p>
                    <p className="font-semibold" style={{ color: 'var(--text)' }}>
                      {c.usos_actuales}{c.usos_maximos ? ` / ${c.usos_maximos}` : ' / ∞'}
                    </p>
                  </div>
                  {c.minimo_compra && (
                    <div>
                      <p>Mínimo</p>
                      <p className="font-semibold" style={{ color: 'var(--text)' }}>{formatLempira(c.minimo_compra)}</p>
                    </div>
                  )}
                  {c.fecha_expiracion && (
                    <div className="col-span-2">
                      <p>Expira</p>
                      <p className="font-semibold" style={{ color: expired ? 'var(--danger)' : 'var(--text)' }}>
                        {new Date(c.fecha_expiracion).toLocaleDateString('es-HN')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Progress bar usos */}
                {c.usos_maximos && (
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (c.usos_actuales / c.usos_maximos) * 100)}%`, backgroundColor: 'var(--blue)' }} />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                  <button onClick={() => toggleActivo(c)} className="flex-1 text-xs py-1.5 rounded-lg font-semibold transition-all"
                    style={{
                      backgroundColor: (c.activo && !expired) ? 'var(--success-bg)' : 'var(--bg-secondary)',
                      color: (c.activo && !expired) ? 'var(--success)' : 'var(--text-muted)',
                      border: '1px solid var(--border)',
                    }}>
                    {(c.activo && !expired) ? '✓ Activo' : expired ? '✗ Expirado' : '○ Inactivo'}
                  </button>
                  <button onClick={() => openEdit(c)} className="btn-icon" title="Editar">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                  </button>
                  <button onClick={() => setConfirmDelete(c)} className="btn-icon" style={{ color: 'var(--danger)' }}
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

      {/* Modal crear/editar */}
      {showModal && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl shadow-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{editId ? 'Editar cupón' : 'Nuevo cupón'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-5">
              {error && <div className="rounded-xl px-3 py-2 text-xs mb-4" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Código <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input required type="text" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase() })} className="input py-2 font-mono tracking-wider" placeholder="PROMO20" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Tipo <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as 'porcentaje' | 'monto_fijo' })} className="select py-2">
                      <option value="porcentaje">Porcentaje (%)</option>
                      <option value="monto_fijo">Monto fijo (L)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Valor <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input required type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} className="input py-2" placeholder={form.tipo === 'porcentaje' ? '20' : '100'} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Compra mínima</label>
                    <input type="number" min="0" step="0.01" value={form.minimo_compra} onChange={e => setForm({ ...form, minimo_compra: e.target.value })} className="input py-2" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Usos máximos</label>
                    <input type="number" min="1" step="1" value={form.usos_maximos} onChange={e => setForm({ ...form, usos_maximos: e.target.value })} className="input py-2" placeholder="∞" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Fecha de expiración</label>
                  <input type="date" value={form.fecha_expiracion}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={e => setForm({ ...form, fecha_expiracion: e.target.value })} className="input py-2" />
                </div>
                <div className="flex items-center justify-between rounded-xl p-3 cursor-pointer" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                  onClick={() => setForm({ ...form, activo: !form.activo })}>
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Cupón activo</span>
                  <div className="relative h-5 w-9 rounded-full transition-colors" style={{ backgroundColor: form.activo ? 'var(--blue)' : 'var(--border)' }}>
                    <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform" style={{ transform: form.activo ? 'translateX(16px)' : 'translateX(2px)' }} />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-2.5">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">
                    {saving ? <><span className="spinner h-4 w-4 border-2" />Guardando...</> : (editId ? 'Actualizar' : 'Crear cupón')}
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
            <h3 className="text-base font-semibold text-center mb-1" style={{ color: 'var(--text)' }}>Eliminar cupón</h3>
            <p className="text-sm text-center mb-5" style={{ color: 'var(--text-muted)' }}>¿Eliminar el cupón <span className="font-mono font-bold" style={{ color: 'var(--text)' }}>{confirmDelete.codigo}</span>?</p>
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
