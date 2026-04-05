'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Usuario, Rol, ApiResponse } from '@/types';
import { apiFetch } from '@/lib/api-fetch';
import { useAuth } from '@/contexts/auth-context';

// Usuarios del sistema: Cajero y Admin Sucursal (Super Admin no se puede crear desde aquí)
const ROL_SISTEMA = [1, 2, 4];
const ROL_CREABLES = [2, 4]; // Solo estos se pueden crear

const ROL_STYLE: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Super Admin',    color: '#ef4444', bg: '#fef2f2' },
  2: { label: 'Cajero',         color: '#f59e0b', bg: '#fffbeb' },
  4: { label: 'Admin Sucursal', color: '#8b5cf6', bg: '#f5f3ff' },
};

export default function AdminUsuariosPage() {
  const { usuario: authUsuario } = useAuth();
  const isAdminSucursal = Number(authUsuario?.id_rol) === 4;
  const idTiendaAdmin   = authUsuario?.id_tienda ?? null;
  const FORM_VACIO = { nombre: '', apellido: '', correo: '', telefono: '+504 ', id_rol: '2', contrasena: '', id_tienda: isAdminSucursal && idTiendaAdmin ? String(idTiendaAdmin) : '', identidad: '', fecha_nacimiento: '' };

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Usuario | null>(null);
  const [search, setSearch] = useState('');
  const [tiendas, setTiendas] = useState<{ id: number; nombre: string }[]>([]);

  const fetchUsuarios = async () => {
    try {
      const res = await apiFetch('/api/usuarios');
      const data: ApiResponse<Usuario[]> = await res.json();
      if (data.success && data.data) {
        let lista = data.data.filter(u => ROL_SISTEMA.includes(Number(u.id_rol)));
        // Admin sucursal solo ve cajeros de su tienda
        if (isAdminSucursal && idTiendaAdmin) {
          lista = lista.filter(u => Number(u.id_rol) === 2 && Number(u.id_tienda) === Number(idTiendaAdmin));
        }
        setUsuarios(lista);
      }
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (authUsuario === undefined) return; // esperar auth
    fetchUsuarios();
    apiFetch('/api/roles').then(r => r.json()).then((d: ApiResponse<Rol[]>) => {
      if (d.success && d.data)
        setRoles(d.data.filter(r => ROL_SISTEMA.includes(Number(r.id))));
    });
    apiFetch('/api/tiendas').then(r => r.json()).then((d: any) => {
      if (d.success && d.data) setTiendas(d.data);
    });
  }, [authUsuario]);

  const notify = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };
  const notifyError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 5000); };

  const openCreate = () => { setEditId(null); setForm(FORM_VACIO); setError(''); setShowModal(true); };
  const openEdit = (u: Usuario) => {
    setEditId(u.id);
    setForm({ nombre: u.nombre, apellido: u.apellido, correo: u.correo, telefono: u.telefono ? (u.telefono.startsWith('+504') ? u.telefono : '+504 ' + u.telefono) : '+504 ', id_rol: String(u.id_rol), contrasena: '', id_tienda: u.id_tienda ? String(u.id_tienda) : '', identidad: (u as any).identidad || '', fecha_nacimiento: (u as any).fecha_nacimiento ? String((u as any).fecha_nacimiento).slice(0, 10) : '' });
    setError(''); setShowModal(true);
  };

  // Formatea teléfono: +504 XXXX-XXXX
  const formatTelefono = (raw: string) => {
    // Siempre mantener el prefijo +504
    const prefix = '+504 ';
    const digits = raw.replace(/^\+504\s?/, '').replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 4) return prefix + digits;
    return prefix + digits.slice(0, 4) + '-' + digits.slice(4);
  };
  const formatIdentidad = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 13);
    if (digits.length <= 4) return digits;
    if (digits.length <= 8) return `${digits.slice(0,4)}-${digits.slice(4)}`;
    return `${digits.slice(0,4)}-${digits.slice(4,8)}-${digits.slice(8)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true);
    // Validar identidad: exactamente 13 dígitos
    const identidadDigits = form.identidad.replace(/\D/g, '');
    if (form.identidad && identidadDigits.length !== 13) {
      setError('La identidad debe tener exactamente 13 dígitos'); setSaving(false); return;
    }
    if (form.fecha_nacimiento) {
      const maxDate = new Date(); maxDate.setFullYear(maxDate.getFullYear() - 18);
      if (new Date(form.fecha_nacimiento) > maxDate) {
        setError('El usuario debe tener al menos 18 años'); setSaving(false); return;
      }
    }
    try {
      const extra = {
        ...(form.identidad ? { identidad: form.identidad } : {}),
        ...(form.fecha_nacimiento ? { fecha_nacimiento: form.fecha_nacimiento } : {}),
      };
      const body = editId
        ? { id: editId, nombre: form.nombre, apellido: form.apellido, telefono: form.telefono || null, id_rol: Number(form.id_rol), id_tienda: form.id_tienda ? Number(form.id_tienda) : null, ...(form.contrasena ? { contrasena: form.contrasena } : {}), ...extra }
        : { nombre: form.nombre, apellido: form.apellido, correo: form.correo, telefono: form.telefono || null, id_rol: Number(form.id_rol), id_tienda: form.id_tienda ? Number(form.id_tienda) : null, contrasena: form.contrasena, ...extra };
      const res = await apiFetch('/api/usuarios', { method: editId ? 'PUT' : 'POST', body: JSON.stringify(body) });
      const data: ApiResponse<Usuario> = await res.json();
      if (data.success) { setShowModal(false); fetchUsuarios(); notify(editId ? 'Usuario actualizado' : 'Usuario creado'); }
      else setError(data.message || 'Error al guardar');
    } catch { setError('Error de conexión'); }
    finally { setSaving(false); }
  };

  const handleToggleActivo = async (u: Usuario) => {
    const nuevoActivo = !(u as any).activo;
    try {
      const res = await apiFetch('/api/usuarios', {
        method: 'PUT',
        body: JSON.stringify({ id: u.id, activo: nuevoActivo }),
      });
      const data: ApiResponse<unknown> = await res.json();
      if (data.success) {
        setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, activo: nuevoActivo } as any : x));
        notify(nuevoActivo ? 'Usuario activado' : 'Usuario desactivado');
      }
    } catch { notifyError('Error al cambiar estado'); }
  };

  const handleDelete = async (u: Usuario) => {
    setConfirmDelete(null);
    try {
      const res = await apiFetch(`/api/usuarios?id=${u.id}`, { method: 'DELETE' });
      const data: ApiResponse<unknown> = await res.json();
      if (data.success) { setUsuarios(prev => prev.filter(x => x.id !== u.id)); notify('Usuario eliminado'); }
      else notifyError(data.error || data.message || 'No se pudo eliminar');
    } catch { notifyError('Error de conexión al eliminar'); }
  };

  const rolOptions = roles.length > 0
    ? roles.filter(r => ROL_CREABLES.includes(Number(r.id)) && (!isAdminSucursal || Number(r.id) === 2))
    : [{ id: 2, nombre: 'Cajero', creado_en: '' }, ...(isAdminSucursal ? [] : [{ id: 4, nombre: 'Admin Sucursal', creado_en: '' }])];

  const filtered = usuarios.filter(u =>
    `${u.nombre} ${u.apellido} ${u.correo}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Usuarios del sistema</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Administradores y cajeros — {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo usuario
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { id: 1, title: 'Super Admins',    soloSuperAdmin: true  },
          { id: 2, title: 'Cajeros',          soloSuperAdmin: false },
          { id: 4, title: 'Admins Sucursal',  soloSuperAdmin: true  },
        ].filter(s => !s.soloSuperAdmin || !isAdminSucursal).map(s => {
          const style = ROL_STYLE[s.id];
          const count = usuarios.filter(u => Number(u.id_rol) === s.id).length;
          return (
            <div key={s.id} className="card p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white text-sm font-bold"
                style={{ backgroundColor: style.color }}>
                {s.id === 1 ? '🛡️' : s.id === 4 ? '🏢' : '🏪'}
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: style.color }}>{count}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.title}</p>
              </div>
            </div>
          );
        })}
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          {message}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o correo..." className="input pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{search ? `Sin resultados para "${search}"` : 'No hay usuarios del sistema'}</p>
          {!search && <button onClick={openCreate} className="btn-primary text-sm mt-4">Crear usuario</button>}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Usuario</th>
                <th className="table-header hidden sm:table-cell">Correo</th>
                <th className="table-header hidden md:table-cell">Teléfono</th>
                <th className="table-header hidden lg:table-cell">Identidad</th>
                <th className="table-header hidden lg:table-cell">Nacimiento</th>
                <th className="table-header hidden xl:table-cell">Sucursal</th>
                <th className="table-header">Rol</th>
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const rol = ROL_STYLE[u.id_rol];
                return (
                  <tr key={u.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold"
                          style={{ backgroundColor: rol?.color || 'var(--blue)' }}>
                          {u.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{u.nombre} {u.apellido}</p>
                          <p className="text-xs sm:hidden truncate" style={{ color: 'var(--text-muted)' }}>{u.correo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{u.correo}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{u.telefono || '—'}</td>
                    <td className="hidden lg:table-cell px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {(u as any).identidad || '—'}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {(u as any).fecha_nacimiento
                        ? new Date((u as any).fecha_nacimiento).toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="hidden xl:table-cell px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {u.id_tienda ? (tiendas.find(t => Number(t.id) === Number(u.id_tienda))?.nombre || '—') : '—'}
                    </td>
                    <td className="table-cell">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={{ backgroundColor: rol?.bg || 'var(--bg-secondary)', color: rol?.color || 'var(--text-muted)' }}>
                        {rol?.label || 'Desconocido'}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Toggle activo */}
                        <button
                          onClick={() => handleToggleActivo(u)}
                          title={(u as any).activo === false ? 'Activar usuario' : 'Desactivar usuario'}
                          className="btn-icon"
                          style={{ color: (u as any).activo === false ? 'var(--danger)' : 'var(--success)' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                            {(u as any).activo === false
                              ? <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                              : <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            }
                          </svg>
                        </button>
                        <button onClick={() => openEdit(u)} className="btn-icon" title="Editar">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                          </svg>
                        </button>
                        <button onClick={() => setConfirmDelete(u)} className="btn-icon" title="Eliminar"
                          style={{ color: 'var(--danger)' }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--danger-bg)')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear/editar */}
      {showModal && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl shadow-2xl"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{editId ? 'Editar usuario' : 'Nuevo usuario del sistema'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5">
              {error && <div className="rounded-xl px-3 py-2 text-xs mb-4" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Nombre <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input required type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="input py-2" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Apellido <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input required type="text" value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} className="input py-2" />
                  </div>
                </div>
                {!editId && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Correo <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input required type="email" value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} className="input py-2" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Teléfono</label>
                  <input type="text" value={form.telefono} onChange={e => setForm({ ...form, telefono: formatTelefono(e.target.value) })} className="input py-2" placeholder="+504 9999-9999" maxLength={14} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      Número de identidad
                    </label>
                    <input
                      type="text"
                      value={form.identidad}
                      onChange={e => setForm({ ...form, identidad: formatIdentidad(e.target.value) })}
                      className="input py-2"
                      placeholder="0000-0000-00000"
                      maxLength={15}
                    />
                    {form.identidad && form.identidad.replace(/\D/g, '').length !== 13 && (
                      <p className="text-xs mt-1" style={{ color: 'var(--warning)' }}>
                        {form.identidad.replace(/\D/g, '').length}/13 dígitos
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      Fecha de nacimiento
                    </label>
                    <input
                      type="date"
                      value={form.fecha_nacimiento}
                      onChange={e => setForm({ ...form, fecha_nacimiento: e.target.value })}
                      className="input py-2"
                      max={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().slice(0, 10); })()}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Rol <span style={{ color: 'var(--danger)' }}>*</span></label>
                  {editId && Number(form.id_rol) === 1 ? (
                    <div className="select py-2 cursor-not-allowed opacity-60">Super Admin</div>
                  ) : (
                    <select value={form.id_rol} onChange={e => setForm({ ...form, id_rol: e.target.value })} className="select py-2">
                      {rolOptions.map(r => <option key={r.id} value={r.id}>{ROL_STYLE[Number(r.id)]?.label ?? r.nombre}</option>)}
                    </select>
                  )}
                  {ROL_STYLE[Number(form.id_rol)] && (
                    <span className="mt-2 inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: ROL_STYLE[Number(form.id_rol)].bg, color: ROL_STYLE[Number(form.id_rol)].color }}>
                      {ROL_STYLE[Number(form.id_rol)].label}
                    </span>
                  )}
                </div>
                {/* Sucursal — para cajeros y admin sucursal */}
                {(Number(form.id_rol) === 2 || Number(form.id_rol) === 4) && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      Sucursal asignada <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    {isAdminSucursal ? (
                      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#10b981" className="h-4 w-4 shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                        </svg>
                        <span className="text-sm font-semibold" style={{ color: '#10b981' }}>
                          {tiendas.find(t => Number(t.id) === Number(idTiendaAdmin))?.nombre || 'Tu sucursal'}
                        </span>
                      </div>
                    ) : (
                      <>
                        <select value={form.id_tienda} onChange={e => setForm({ ...form, id_tienda: e.target.value })} className="select py-2">
                          <option value="">Seleccionar sucursal...</option>
                          {tiendas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                        {!form.id_tienda && (
                          <p className="text-xs mt-1" style={{ color: 'var(--warning)' }}>El cajero necesita una sucursal asignada</p>
                        )}
                      </>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    {editId ? 'Nueva contraseña (vacío = sin cambios)' : <>Contraseña <span style={{ color: 'var(--danger)' }}>*</span></>}
                  </label>
                  <input type="password" required={!editId} value={form.contrasena} onChange={e => setForm({ ...form, contrasena: e.target.value })} className="input py-2" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-2.5">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">
                    {saving ? <><span className="spinner h-4 w-4 border-2" />Guardando...</> : (editId ? 'Actualizar' : 'Crear usuario')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Confirmar eliminación */}
      {confirmDelete && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl mx-auto mb-4" style={{ backgroundColor: 'var(--danger-bg)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--danger)" className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            </div>
            <h3 className="text-base font-semibold text-center mb-1" style={{ color: 'var(--text)' }}>Eliminar usuario</h3>
            <p className="text-sm text-center mb-5" style={{ color: 'var(--text-muted)' }}>
              ¿Eliminar a <span className="font-semibold" style={{ color: 'var(--text)' }}>{confirmDelete.nombre} {confirmDelete.apellido}</span>? Esta acción no se puede deshacer.
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
