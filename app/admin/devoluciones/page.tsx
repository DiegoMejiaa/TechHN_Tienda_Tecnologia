'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import { formatLempira } from '@/lib/format';

interface Devolucion {
  id: number; id_pedido: number; motivo: string;
  estado: 'solicitada' | 'aprobada' | 'rechazada' | 'completada'; creado_en: string;
}

const ESTADO_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  solicitada:  { color: '#f59e0b', bg: '#fffbeb', label: 'Solicitada'  },
  aprobada:    { color: '#3b82f6', bg: '#eff6ff', label: 'Aprobada'    },
  rechazada:   { color: '#ef4444', bg: '#fef2f2', label: 'Rechazada'   },
  completada:  { color: '#10b981', bg: '#f0fdf4', label: 'Completada'  },
};

const ESTADOS = ['solicitada', 'aprobada', 'rechazada', 'completada'] as const;

export default function AdminDevolucionesPage() {
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const fetchDevoluciones = async () => {
    try {
      const res = await apiFetch('/api/devoluciones');
      const data = await res.json();
      if (data.success && data.data) setDevoluciones(data.data);
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchDevoluciones(); }, []);

  const notify = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

  const handleEstado = async (id: number, estado: string) => {
    setUpdatingId(id);
    try {
      const res = await apiFetch('/api/devoluciones', { method: 'PUT', body: JSON.stringify({ id, estado }) });
      const data = await res.json();
      if (data.success) {
        setDevoluciones(prev => prev.map(d => d.id === id ? { ...d, estado: estado as Devolucion['estado'] } : d));
        notify('Estado actualizado');
      }
    } catch { /* ignore */ }
    finally { setUpdatingId(null); }
  };

  const filtered = devoluciones.filter(d => filtro ? d.estado === filtro : true);
  const counts = ESTADOS.reduce((acc, e) => { acc[e] = devoluciones.filter(d => d.estado === e).length; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Devoluciones</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{devoluciones.length} solicitudes en total</p>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
          {message}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ESTADOS.map(e => {
          const s = ESTADO_STYLE[e];
          return (
            <button key={e} onClick={() => setFiltro(filtro === e ? '' : e)}
              className="card p-3 text-left transition-all"
              style={filtro === e ? { borderColor: s.color, boxShadow: `0 0 0 2px ${s.color}30` } : {}}>
              <p className="text-xl font-bold" style={{ color: s.color }}>{counts[e] || 0}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hay devoluciones{filtro ? ` con estado "${filtro}"` : ''}</p></div>
      ) : (
        <div className="table-wrapper">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Pedido</th>
                <th className="table-header hidden md:table-cell">Motivo</th>
                <th className="table-header hidden sm:table-cell">Fecha</th>
                <th className="table-header">Estado</th>
                <th className="table-header text-right">Cambiar estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const s = ESTADO_STYLE[d.estado];
                return (
                  <tr key={d.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--blue-light)' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Pedido #{d.id_pedido}</p>
                          <p className="text-xs md:hidden truncate max-w-[140px]" style={{ color: 'var(--text-muted)' }}>{d.motivo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3">
                      <p className="text-sm truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>{d.motivo}</p>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(d.creado_en).toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="table-cell">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: s.bg, color: s.color }}>{s.label}</span>
                    </td>
                    <td className="table-cell text-right">
                      <select
                        value={d.estado}
                        onChange={e => handleEstado(d.id, e.target.value)}
                        disabled={updatingId === d.id}
                        className="select py-1 px-2 text-xs w-auto"
                        style={{ minWidth: 120 }}
                      >
                        {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_STYLE[e].label}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
