'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Pedido, ItemPedido, ApiResponse } from '@/types';
import { apiFetch } from '@/lib/api-fetch';
import { formatLempira } from '@/lib/format';
import { useAuth } from '@/contexts/auth-context';

const ESTADOS = ['pendiente', 'pagado', 'enviado', 'entregado', 'cancelado'] as const;

const ESTADO_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  pendiente:  { color: '#f59e0b', bg: '#fffbeb', label: 'Pendiente'  },
  pagado:     { color: '#3b82f6', bg: '#eff6ff', label: 'Pagado'     },
  enviado:    { color: '#8b5cf6', bg: '#f5f3ff', label: 'Enviado'    },
  entregado:  { color: '#10b981', bg: '#f0fdf4', label: 'Entregado'  },
  cancelado:  { color: '#ef4444', bg: '#fef2f2', label: 'Cancelado'  },
};

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', paypal: 'PayPal', otro: 'Otro',
};

interface Pago { id: number; id_pedido: number; monto: number; metodo_pago: string; estado: string }
interface CuponPedido { descuento: number; codigo: string; tipo: string; valor: number }
interface VentaDetalle extends Pedido { items?: ItemPedido[]; pagos?: Pago[]; cupon?: CuponPedido | null }

// ── Factura imprimible ────────────────────────────────────────────────────────
function Factura({ venta }: { venta: VentaDetalle }) {
  const pago = venta.pagos?.[0];
  const esSucursal = Number(venta.rol_usuario) === 2;
  const nombreCliente = venta.nombre_cliente
    ? `${venta.nombre_cliente} ${venta.apellido_cliente || ''}`.trim()
    : (venta as any).nombre_cliente_directo || null;

  return (
    <div id="factura-admin" style={{ fontFamily: 'monospace', fontSize: 13, color: '#000', maxWidth: 340, margin: '0 auto', padding: 16 }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 8, marginBottom: 8 }}>
        <p style={{ fontSize: 18, fontWeight: 'bold', margin: 0 }}>TechHN</p>
        {venta.nombre_tienda && <p style={{ margin: '2px 0' }}>{venta.nombre_tienda}</p>}
        {esSucursal && <p style={{ margin: '2px 0', fontSize: 11 }}>Atendido por: {venta.nombre_usuario || 'N/A'}</p>}
      </div>
      <div style={{ borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
        <p style={{ margin: '2px 0' }}><strong>Venta #:</strong> {venta.id}</p>
        <p style={{ margin: '2px 0' }}><strong>Fecha:</strong> {new Date(venta.creado_en).toLocaleString('es-HN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        <p style={{ margin: '2px 0' }}><strong>Canal:</strong> {esSucursal ? `Sucursal — ${venta.nombre_tienda || ''}` : 'Venta en línea'}</p>
      </div>
      <div style={{ borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
        <p style={{ margin: '2px 0' }}><strong>Cliente:</strong> {nombreCliente || (esSucursal ? 'Sin nombre' : `${venta.nombre_usuario || ''} ${venta.apellido_usuario || ''}`.trim())}</p>
        {(venta.telefono_cliente || (venta as any).telefono_cliente_directo || venta.telefono_usuario) && <p style={{ margin: '2px 0' }}><strong>Tel:</strong> {venta.telefono_cliente || (venta as any).telefono_cliente_directo || venta.telefono_usuario}</p>}
        {(venta.correo_cliente || (venta as any).correo_cliente_directo || venta.correo_usuario) && <p style={{ margin: '2px 0', fontSize: 11 }}>{venta.correo_cliente || (venta as any).correo_cliente_directo || venta.correo_usuario}</p>}
      </div>
      {(venta.envio_direccion || venta.envio_ciudad) && (
        <div style={{ borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
          <p style={{ margin: '2px 0' }}><strong>Dirección de envío:</strong></p>
          {venta.envio_direccion && <p style={{ margin: '2px 0', fontSize: 12 }}>{venta.envio_direccion}</p>}
          {(venta.envio_ciudad || venta.envio_codigo_postal) && (
            <p style={{ margin: '2px 0', fontSize: 12 }}>{[venta.envio_ciudad, venta.envio_codigo_postal].filter(Boolean).join(', ')}</p>
          )}
        </div>
      )}
      <div style={{ borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
        <p style={{ fontWeight: 'bold', marginBottom: 4 }}>PRODUCTOS</p>
        {venta.items?.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12 }}>{item.nombre_producto}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#555' }}>{item.nombre_variante} x{item.cantidad}</p>
            </div>
            <p style={{ margin: 0, fontWeight: 'bold' }}>{formatLempira(item.precio_unitario * item.cantidad)}</p>
          </div>
        ))}
      </div>
      <div style={{ borderBottom: '2px solid #000', paddingBottom: 6, marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Subtotal</span>
          <span>{formatLempira(venta.cupon ? venta.monto_total + venta.cupon.descuento : venta.monto_total)}</span>
        </div>
        {venta.cupon && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', marginTop: 2 }}>
            <span>Cupón ({venta.cupon.codigo})</span>
            <span>-{formatLempira(venta.cupon.descuento)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 16, marginTop: 4 }}>
          <span>TOTAL</span><span>{formatLempira(venta.monto_total)}</span>
        </div>
      </div>
      {pago && (
        <div style={{ borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
          <p style={{ margin: '2px 0' }}><strong>Forma de pago:</strong> {METODO_LABEL[pago.metodo_pago] || pago.metodo_pago}</p>
          <p style={{ margin: '2px 0' }}><strong>Estado pago:</strong> {pago.estado}</p>
        </div>
      )}
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <p style={{ margin: '2px 0' }}>Gracias por su compra</p>
        <p style={{ margin: '2px 0', fontSize: 11 }}>Venta #{venta.id}</p>
      </div>
    </div>
  );
}

export default function AdminVentasPage() {
  const { isLoading: authLoading } = useAuth();

  const [pedidos, setPedidos] = useState<VentaDetalle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCanal, setFiltroCanal] = useState<'todos' | 'online' | 'sucursal'>('todos');
  const [search, setSearch] = useState('');
  const [detalle, setDetalle] = useState<VentaDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [showFacturaModal, setShowFacturaModal] = useState(false);

  const fetchPedidos = async () => {
    setIsLoading(true);
    try {
      const url = filtroEstado ? `/api/pedidos?estado=${filtroEstado}` : '/api/pedidos';
      const res = await apiFetch(url);
      const data: ApiResponse<VentaDetalle[]> = await res.json();
      if (data.success && data.data) setPedidos(data.data);
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  };

  useEffect(() => { if (!authLoading) fetchPedidos(); }, [filtroEstado, authLoading]);

  const handleEstado = async (id: number, estado: string) => {
    setUpdatingId(id);
    try {
      const res = await apiFetch('/api/pedidos', { method: 'PUT', body: JSON.stringify({ id, estado }) });
      const data = await res.json();
      if (data.success) {
        setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado: estado as Pedido['estado'] } : p));
        if (detalle?.id === id) setDetalle(prev => prev ? { ...prev, estado: estado as Pedido['estado'] } : prev);
      } else {
        console.error('Error al cambiar estado:', data.error);
      }
    } catch (e) {
      console.error('Error al cambiar estado:', e);
    } finally {
      setUpdatingId(null);
    }
  };

  const openDetalle = async (pedido: VentaDetalle) => {
    setLoadingDetalle(true);
    setDetalle(pedido);
    setShowFacturaModal(false);
    try {
      const [pedRes, pagRes] = await Promise.all([
        apiFetch(`/api/pedidos?id=${pedido.id}`),
        apiFetch(`/api/pagos?id_pedido=${pedido.id}`),
      ]);
      const pedData: ApiResponse<VentaDetalle> = await pedRes.json();
      const pagData: ApiResponse<Pago[]> = await pagRes.json();
      setDetalle({
        ...pedido,
        ...(pedData.success && pedData.data ? pedData.data : {}),
        pagos: pagData.success && pagData.data ? pagData.data : [],
      });
    } catch { /* ignore */ }
    finally { setLoadingDetalle(false); }
  };

  const handlePrint = () => {
    const contenido = document.getElementById('factura-admin');
    if (!contenido) return;
    const w = window.open('', '_blank', 'width=420,height=680');
    if (!w) return;
    w.document.write(`<html><head><title>Factura</title>
      <style>body{margin:0;padding:16px;font-family:monospace;font-size:13px}@media print{body{margin:0}}</style>
      </head><body>${contenido.innerHTML}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  const handleDescargarPDF = async () => {
    const contenido = document.getElementById('factura-admin');
    if (!contenido) return;
    const html2pdf = (await import('html2pdf.js')).default;
    html2pdf().set({
      margin: 10,
      filename: `factura-techhn-${detalle?.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' },
    }).from(contenido).save();
  };

  // Filtrar por canal
  const porCanal = pedidos.filter(p => {
    if (filtroCanal === 'online')   return Number(p.rol_usuario) !== 2;
    if (filtroCanal === 'sucursal') return Number(p.rol_usuario) === 2;
    return true;
  });

  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 10;

  // Filtrar por búsqueda
  const filtered = porCanal.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    const clienteNombre = p.nombre_cliente
      ? `${p.nombre_cliente} ${p.apellido_cliente || ''}`.toLowerCase()
      : `${p.nombre_usuario || ''} ${p.apellido_usuario || ''}`.toLowerCase();
    return clienteNombre.includes(q) || String(p.id).includes(q) || (p.nombre_tienda || '').toLowerCase().includes(q);
  });

  const counts = ESTADOS.reduce((acc, e) => { acc[e] = pedidos.filter(p => p.estado === e).length; return acc; }, {} as Record<string, number>);
  const totalFiltrado = filtered.filter(p => p.estado !== 'cancelado').reduce((s, p) => s + Number(p.monto_total), 0);

  // Paginación
  const totalPaginas = Math.ceil(filtered.length / POR_PAGINA);
  const paginado = filtered.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  // Reset página al cambiar filtros
  const setFiltroEstadoConReset = (v: string) => { setFiltroEstado(v); setPagina(1); };
  const setFiltroCanalConReset = (c: typeof filtroCanal) => { setFiltroCanal(c); setPagina(1); };
  const setSearchConReset = (v: string) => { setSearch(v); setPagina(1); };

  // Nombre del cliente a mostrar
  const clienteDisplay = (p: VentaDetalle) => {
    const esSucursal = Number(p.rol_usuario) === 2;
    // Nombre del cliente FK (usuario registrado)
    if (p.nombre_cliente) return `${p.nombre_cliente} ${p.apellido_cliente || ''}`.trim();
    // Nombre directo ingresado por el cajero
    if ((p as any).nombre_cliente_directo) return (p as any).nombre_cliente_directo;
    if (!esSucursal && p.nombre_usuario) return `${p.nombre_usuario} ${p.apellido_usuario || ''}`.trim();
    return 'Sin nombre';
  };

  const FILTER_STYLE: Record<string, { active: string; bg: string }> = {
    '': { active: 'var(--blue)', bg: 'var(--blue-light)' },
    pendiente: { active: '#f59e0b', bg: '#fffbeb' },
    pagado:    { active: '#3b82f6', bg: '#eff6ff' },
    enviado:   { active: '#8b5cf6', bg: '#f5f3ff' },
    entregado: { active: '#10b981', bg: '#f0fdf4' },
    cancelado: { active: '#ef4444', bg: '#fef2f2' },
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Ventas</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} venta{filtered.length !== 1 ? 's' : ''} · {formatLempira(totalFiltrado)}
          </p>
        </div>
        {/* Filtro canal */}
        <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          {([
            { key: 'todos',    label: 'Todas'     },
            { key: 'online',   label: 'En línea'  },
            { key: 'sucursal', label: 'Sucursal'  },
          ] as const).map(c => (
            <button key={c.key} onClick={() => setFiltroCanalConReset(c.key)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
              style={filtroCanal === c.key
                ? { backgroundColor: 'var(--card)', color: 'var(--blue)', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }
                : { color: 'var(--text-muted)' }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros estado */}
      <div className="flex gap-2 flex-wrap">
        {[{ key: '', label: 'Todos', count: porCanal.length }, ...ESTADOS.map(e => ({ key: e, label: ESTADO_STYLE[e].label, count: porCanal.filter(p => p.estado === e).length }))].map(f => {
          const isActive = filtroEstado === f.key;
          const style = FILTER_STYLE[f.key];
          return (
            <button key={f.key} onClick={() => setFiltroEstadoConReset(f.key)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
              style={isActive
                ? { backgroundColor: style.bg, color: style.active, border: `1.5px solid ${style.active}` }
                : { backgroundColor: 'var(--card)', color: 'var(--text-muted)', border: '1.5px solid var(--border)' }}>
              {f.key && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: isActive ? style.active : 'var(--text-muted)' }} />}
              {f.label}
              <span className="rounded-full px-1.5 py-0.5 text-xs"
                style={{ backgroundColor: isActive ? style.active + '20' : 'var(--bg-secondary)', color: isActive ? style.active : 'var(--text-muted)' }}>
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Buscador */}
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input type="text" value={search}
          placeholder="Buscar por cliente, # o sucursal..." className="input pl-9"
          onChange={e => setSearchConReset(e.target.value)} />
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin ventas con los filtros seleccionados</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Cliente</th>
                <th className="table-header hidden md:table-cell">Fecha</th>
                <th className="table-header hidden lg:table-cell">Canal</th>
                <th className="table-header hidden lg:table-cell">Pago</th>
                <th className="table-header">Estado</th>
                <th className="table-header hidden sm:table-cell text-right">Total</th>
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginado.map(pedido => {
                const st = ESTADO_STYLE[pedido.estado];
                const esSucursal = Number(pedido.rol_usuario) === 2;
                return (
                  <tr key={pedido.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold"
                          style={{ backgroundColor: esSucursal ? '#10b981' : 'var(--blue)' }}>
                          {clienteDisplay(pedido).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: clienteDisplay(pedido) === 'Sin nombre' ? 'var(--text-muted)' : 'var(--text)' }}>
                            {clienteDisplay(pedido)}
                          </p>
                          {(pedido.telefono_cliente || pedido.telefono_usuario) && (
                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                              {pedido.telefono_cliente || pedido.telefono_usuario}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(pedido.creado_en).toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={esSucursal
                          ? { backgroundColor: '#f0fdf4', color: '#10b981' }
                          : { backgroundColor: '#eff6ff', color: '#3b82f6' }}>
                        {esSucursal ? `${pedido.nombre_tienda || 'Sucursal'}` : 'En línea'}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3">
                      {pedido.metodo_pago ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text)' }}>
                          {METODO_LABEL[pedido.metodo_pago] || pedido.metodo_pago}
                        </span>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full w-fit"
                          style={{ backgroundColor: st?.bg, color: st?.color }}>
                          {st?.label || pedido.estado}
                        </span>
                        {(pedido as any).pendiente_entrega === true || (pedido as any).pendiente_entrega === 1 ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full w-fit"
                            style={{ backgroundColor: '#fffbeb', color: '#f59e0b', border: '1px solid #fcd34d' }}>
                            Pendiente entrega
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {formatLempira(pedido.monto_total)}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openDetalle(pedido)} className="btn-icon" title="Ver detalle / Factura">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                        </button>
                        <select value={pedido.estado} onChange={e => handleEstado(pedido.id, e.target.value)}
                          disabled={updatingId === pedido.id} className="select py-1 px-2 text-xs w-auto" style={{ minWidth: 110 }}>
                          {(esSucursal
                            ? ESTADOS.filter(e => e === 'pagado' || e === 'pendiente' || e === 'entregado' || e === 'cancelado')
                            : ESTADOS.filter(e => e === 'pagado' || e === 'enviado' || e === 'entregado' || e === 'cancelado')
                          ).map(e => <option key={e} value={e}>{ESTADO_STYLE[e].label}</option>)}
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, filtered.length)} de {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} className="btn-icon disabled:opacity-40">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 1)
              .reduce<(number | '...')[]>((acc, n, i, arr) => {
                if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('...');
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) => n === '...'
                ? <span key={`e${i}`} className="px-1 text-xs" style={{ color: 'var(--text-muted)' }}>…</span>
                : <button key={n} onClick={() => setPagina(n as number)}
                    className="h-7 w-7 rounded-lg text-xs font-semibold transition-all"
                    style={pagina === n
                      ? { backgroundColor: 'var(--blue)', color: '#fff' }
                      : { backgroundColor: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                    {n}
                  </button>
              )}
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} className="btn-icon disabled:opacity-40">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Modal detalle + factura */}
      {detalle && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetalle(null)} />
          <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Venta #{detalle.id}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {new Date(detalle.creado_en).toLocaleDateString('es-HN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="btn-secondary text-xs px-3 py-1.5">Imprimir</button>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: ESTADO_STYLE[detalle.estado]?.bg, color: ESTADO_STYLE[detalle.estado]?.color }}>
                  {ESTADO_STYLE[detalle.estado]?.label || detalle.estado}
                </span>
                <button onClick={() => setDetalle(null)} className="btn-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-5 space-y-4">
              {/* Info cliente + cajero */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Cliente</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{clienteDisplay(detalle)}</p>
                  {(detalle.telefono_cliente || detalle.telefono_usuario) && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{detalle.telefono_cliente || detalle.telefono_usuario}</p>
                  )}
                  {(detalle.correo_cliente || detalle.correo_usuario) && (
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{detalle.correo_cliente || detalle.correo_usuario}</p>
                  )}
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                    {Number(detalle.rol_usuario) === 2 ? 'Cajero / Sucursal' : 'Canal'}
                  </p>
                  {Number(detalle.rol_usuario) === 2 ? (
                    <>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{detalle.nombre_usuario || '—'}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#10b981' }}>{detalle.nombre_tienda || 'Sucursal'}</p>
                    </>
                  ) : (
                    <p className="text-sm font-semibold" style={{ color: '#3b82f6' }}>Venta en línea</p>
                  )}
                  {detalle.metodo_pago && (
                    <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Pago: {METODO_LABEL[detalle.metodo_pago] || detalle.metodo_pago}
                    </p>
                  )}
                </div>
              </div>

              {/* Dirección de envío */}
              {(detalle.envio_direccion || detalle.envio_ciudad) && (
                <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Dirección de envío</p>
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-4 w-4 shrink-0 mt-0.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                    <div>
                      {detalle.envio_direccion && <p className="text-sm" style={{ color: 'var(--text)' }}>{detalle.envio_direccion}</p>}
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {[detalle.envio_ciudad, detalle.envio_codigo_postal].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cambiar estado */}
              <div className="flex items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider shrink-0" style={{ color: 'var(--text-muted)' }}>Estado</p>
                <select value={detalle.estado} onChange={e => handleEstado(detalle.id, e.target.value)} className="select flex-1 py-1.5 text-sm">
                  {(Number(detalle.rol_usuario) === 2
                    ? ESTADOS.filter(e => e === 'pagado' || e === 'pendiente' || e === 'entregado' || e === 'cancelado')
                    : ESTADOS.filter(e => e === 'pagado' || e === 'enviado' || e === 'entregado' || e === 'cancelado')
                  ).map(e => <option key={e} value={e}>{ESTADO_STYLE[e].label}</option>)}
                </select>
              </div>

              {/* Productos */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Productos</p>
                {loadingDetalle ? (
                  <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />)}</div>
                ) : detalle.items?.length ? (
                  <div className="space-y-2">
                    {detalle.items.map((item: ItemPedido, i: number) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                          {item.imagen_url
                            ? <img src={item.imagen_url} alt="" className="h-full w-full object-contain p-0.5" />
                            : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-5 w-5" style={{ color: 'var(--border)' }}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{item.nombre_producto}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{item.nombre_variante || item.sku} · x{item.cantidad}</p>
                        </div>
                        <p className="text-sm font-semibold shrink-0" style={{ color: 'var(--text)' }}>
                          {formatLempira(item.precio_unitario * item.cantidad)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>Sin productos</p>
                )}
              </div>

              {/* Total */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--blue-muted)' }}>
                {detalle.cupon && (
                  <div className="px-4 py-2 flex justify-between text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                    <span style={{ color: 'var(--text)' }}>{formatLempira(detalle.monto_total + detalle.cupon.descuento)}</span>
                  </div>
                )}
                {detalle.cupon && (
                  <div className="px-4 py-2 flex justify-between text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--success)' }}>
                      Cupón <span className="font-semibold">{detalle.cupon.codigo}</span>
                      {' '}({detalle.cupon.tipo === 'porcentaje' ? `${detalle.cupon.valor}%` : formatLempira(detalle.cupon.valor)})
                    </span>
                    <span style={{ color: 'var(--success)' }}>-{formatLempira(detalle.cupon.descuento)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: 'var(--blue-light)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--blue)' }}>Total de la venta</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--blue)' }}>{formatLempira(detalle.monto_total)}</p>
                </div>
              </div>

              {/* Factura expandible */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <button
                  onClick={() => setShowFacturaModal(v => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold transition-colors"
                  style={{ color: 'var(--text)', backgroundColor: 'var(--bg-secondary)' }}
                >
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    Ver factura
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                    className="h-4 w-4 transition-transform" style={{ transform: showFacturaModal ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {showFacturaModal && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="flex justify-end gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--card)' }}>
                      <button onClick={handleDescargarPDF}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                        style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Descargar PDF
                      </button>
                      <button onClick={handlePrint}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                        style={{ backgroundColor: 'var(--blue-light)', color: 'var(--blue)', border: '1px solid var(--blue-muted)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                        </svg>
                        Imprimir
                      </button>
                    </div>
                    <div className="p-4 flex justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <div className="rounded-xl overflow-hidden shadow-lg" style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}>
                        <Factura venta={detalle} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Factura oculta para imprimir */}
              <div style={{ display: 'none' }}>
                <Factura venta={detalle} />
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
