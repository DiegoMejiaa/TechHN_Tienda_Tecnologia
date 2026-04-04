'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Usuario, Pedido, ApiResponse } from '@/types';
import { apiFetch } from '@/lib/api-fetch';
import { formatLempira } from '@/lib/format';
import { useAuth } from '@/contexts/auth-context';

interface ClienteStats {
  totalPedidos: number;
  totalGastado: number;
  ultimoPedido?: string;
}

interface ClienteConStats extends Usuario {
  stats?: ClienteStats;
}

export default function AdminClientesPage() {
  const { usuario, isLoading: authLoading } = useAuth();
  const isAdminSucursal = Number(usuario?.id_rol) === 4;

  const [clientes, setClientes] = useState<ClienteConStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detalle, setDetalle] = useState<ClienteConStats | null>(null);
  const [pedidosCliente, setPedidosCliente] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ClienteConStats | null>(null);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const notify = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };
  const notifyError = (msg: string) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 5000); };

  useEffect(() => {
    if (authLoading) return;
    async function fetchData() {
      try {
        const [uRes, oRes] = await Promise.all([
          apiFetch('/api/usuarios?rol=3'),   // pasar rol=3 para que el filtro de sucursal funcione
          apiFetch('/api/pedidos'),
        ]);
        const uData: ApiResponse<Usuario[]> = await uRes.json();
        const oData: ApiResponse<Pedido[]> = await oRes.json();

        const pedidos = oData.data || [];
        const soloClientes = (uData.data || []).filter(u => Number(u.id_rol) === 3);

        const conStats: ClienteConStats[] = soloClientes.map(u => {
          const misPedidos = pedidos.filter(p => Number(p.id_usuario) === Number(u.id));
          const totalGastado = misPedidos
            .filter(p => p.estado !== 'cancelado')
            .reduce((s, p) => s + Number(p.monto_total), 0);
          const ultimo = misPedidos.sort((a, b) =>
            new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
          )[0];
          return {
            ...u,
            stats: {
              totalPedidos: misPedidos.length,
              totalGastado,
              ultimoPedido: ultimo?.creado_en,
            },
          };
        });

        conStats.sort((a, b) => (b.stats?.totalGastado || 0) - (a.stats?.totalGastado || 0));
        setClientes(conStats);
      } catch { /* ignore */ }
      finally { setIsLoading(false); }
    }
    fetchData();
  }, [authLoading]);

  const openDetalle = async (c: ClienteConStats) => {
    setDetalle(c);
    setLoadingPedidos(true);
    try {
      const res = await apiFetch(`/api/pedidos?id_usuario=${c.id}`);
      const data: ApiResponse<Pedido[]> = await res.json();
      if (data.success && data.data) {
        const sorted = data.data.sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
        setPedidosCliente(sorted);
        // Recalcular stats con pedidos filtrados por sucursal
        if (isAdminSucursal) {
          const totalGastado = sorted.filter(p => p.estado !== 'cancelado').reduce((s, p) => s + Number(p.monto_total), 0);
          setDetalle(prev => prev ? { ...prev, stats: { totalPedidos: sorted.length, totalGastado, ultimoPedido: sorted[0]?.creado_en } } : prev);
        }
      }
    } catch { /* ignore */ }
    finally { setLoadingPedidos(false); }
  };

  const handleDelete = async (c: ClienteConStats) => {
    setConfirmDelete(null);
    try {
      const res = await apiFetch(`/api/usuarios?id=${c.id}`, { method: 'DELETE' });
      const data: ApiResponse<unknown> = await res.json();
      if (data.success) { setClientes(prev => prev.filter(x => x.id !== c.id)); notify('Cliente eliminado'); }
      else notifyError(data.error || data.message || 'No se pudo eliminar');
    } catch { notifyError('Error de conexión'); }
  };

  const ESTADO_STYLE: Record<string, { color: string; bg: string }> = {
    pendiente:  { color: '#f59e0b', bg: '#fffbeb' },
    pagado:     { color: '#3b82f6', bg: '#eff6ff' },
    enviado:    { color: '#8b5cf6', bg: '#f5f3ff' },
    entregado:  { color: '#10b981', bg: '#f0fdf4' },
    cancelado:  { color: '#ef4444', bg: '#fef2f2' },
  };

  const filtered = clientes.filter(c =>
    `${c.nombre} ${c.apellido} ${c.correo} ${c.telefono || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalIngresos = clientes.reduce((s, c) => s + (c.stats?.totalGastado || 0), 0);
  const conPedidos = clientes.filter(c => (c.stats?.totalPedidos || 0) > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Clientes</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrados
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total clientes', value: clientes.length, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Con pedidos',    value: conPedidos,      color: '#10b981', bg: '#f0fdf4' },
          { label: 'Ingresos',       value: formatLempira(totalIngresos), color: '#8b5cf6', bg: '#f5f3ff' },
        ].map(s => (
          <div key={s.label} className="card p-3">
            <p className="text-lg font-bold truncate" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
          {message}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
          {errorMsg}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, correo o teléfono..." className="input pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{search ? `Sin resultados para "${search}"` : 'No hay clientes registrados'}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Cliente</th>
                <th className="table-header hidden sm:table-cell">Correo</th>
                <th className="table-header hidden md:table-cell">Teléfono</th>
                <th className="table-header text-right hidden sm:table-cell">Pedidos</th>
                <th className="table-header text-right hidden md:table-cell">Total gastado</th>
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold"
                        style={{ backgroundColor: '#3b82f6' }}>
                        {c.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{c.nombre} {c.apellido}</p>
                        {c.stats?.ultimoPedido && (
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            Último pedido: {new Date(c.stats.ultimoPedido).toLocaleDateString('es-HN', { day: '2-digit', month: 'short' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{c.correo}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{c.telefono || '—'}</td>
                  <td className="hidden sm:table-cell px-4 py-3 text-right">
                    <span className="text-sm font-semibold" style={{ color: (c.stats?.totalPedidos || 0) > 0 ? 'var(--blue)' : 'var(--text-muted)' }}>
                      {c.stats?.totalPedidos || 0}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {formatLempira(c.stats?.totalGastado || 0)}
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openDetalle(c)} className="btn-icon" title="Ver historial">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      </button>
                      <button onClick={() => setConfirmDelete(c)} className="btn-icon" title="Eliminar"
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal detalle cliente */}
      {detalle && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetalle(null)} />
          <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold"
                  style={{ backgroundColor: '#3b82f6' }}>
                  {detalle.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{detalle.nombre} {detalle.apellido}</h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{detalle.correo}</p>
                </div>
              </div>
              <button onClick={() => setDetalle(null)} className="btn-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4">
              {/* Info */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Pedidos', value: detalle.stats?.totalPedidos || 0, color: '#3b82f6' },
                  { label: 'Total gastado', value: formatLempira(detalle.stats?.totalGastado || 0), color: '#8b5cf6' },
                  { label: 'Teléfono', value: detalle.telefono || '—', color: 'var(--text)' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <p className="text-sm font-bold truncate" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Historial de pedidos */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Historial de pedidos
                </p>
                {loadingPedidos ? (
                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />)}</div>
                ) : pedidosCliente.length === 0 ? (
                  <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>Sin pedidos aún</p>
                ) : (
                  <div className="space-y-2">
                    {pedidosCliente.map(p => {
                      const s = ESTADO_STYLE[p.estado] || { color: 'var(--text-muted)', bg: 'var(--bg-secondary)' };
                      return (
                        <div key={p.id} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                          <div>
                            <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                              {new Date(p.creado_en).toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 inline-block"
                              style={{ backgroundColor: s.bg, color: s.color }}>
                              {p.estado}
                            </span>
                          </div>
                          <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{formatLempira(p.monto_total)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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
            <h3 className="text-base font-semibold text-center mb-1" style={{ color: 'var(--text)' }}>Eliminar cliente</h3>
            <p className="text-sm text-center mb-2" style={{ color: 'var(--text-muted)' }}>
              ¿Eliminar a <span className="font-semibold" style={{ color: 'var(--text)' }}>{confirmDelete.nombre} {confirmDelete.apellido}</span>?
            </p>
            {(confirmDelete.stats?.totalPedidos || 0) > 0 && (
              <p className="text-xs text-center mb-4 rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
                Este cliente tiene {confirmDelete.stats?.totalPedidos} pedido{(confirmDelete.stats?.totalPedidos || 0) !== 1 ? 's' : ''}. Se eliminarán todos sus datos.
              </p>
            )}
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
