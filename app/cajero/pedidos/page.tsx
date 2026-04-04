'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTurno } from '@/contexts/turno-context';
import type { Pedido, ItemPedido, ApiResponse } from '@/types';
import { formatLempira } from '@/lib/format';

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

function getH(): Record<string, string> {
  const t = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

interface Pago { id: number; id_pedido: number; monto: number; metodo_pago: string; estado: string }
interface VentaDetalle extends Pedido { items?: ItemPedido[]; pagos?: Pago[] }

// ── Factura imprimible ────────────────────────────────────────────────────────
function Factura({ venta, turno }: { venta: VentaDetalle; turno: any }) {
  const pago = venta.pagos?.[0];
  // Nombre del cliente: si hay id_cliente usar nombre_cliente, si no "Sin nombre"
  const nombreCliente = venta.cliente_nombre
    || (venta.nombre_cliente ? `${venta.nombre_cliente} ${venta.apellido_cliente || ''}`.trim() : null);
  const telCliente = venta.cliente_telefono || venta.telefono_cliente;
  const correoCliente = venta.cliente_correo || venta.correo_cliente;

  return (
    <div id="factura-contenido" style={{ fontFamily: 'monospace', fontSize: 13, color: '#000', maxWidth: 320, margin: '0 auto', padding: 16 }}>
      {/* Encabezado empresa */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 8, marginBottom: 8 }}>
        <p style={{ fontSize: 18, fontWeight: 'bold', margin: 0 }}>TechHN</p>
        <p style={{ margin: '2px 0' }}>{turno?.nombre_tienda}</p>
        <p style={{ margin: '2px 0', fontSize: 11 }}>Atendido por: {turno?.nombre_cajero || venta.nombre_usuario || 'N/A'}</p>
      </div>

      {/* Info venta */}
      <div style={{ borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
        <p style={{ margin: '2px 0' }}><strong>Venta #:</strong> {venta.id}</p>
        <p style={{ margin: '2px 0' }}><strong>Fecha:</strong> {new Date(venta.creado_en).toLocaleString('es-HN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      </div>

      {/* Cliente */}
      <div style={{ borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
        <p style={{ margin: '2px 0' }}><strong>Cliente:</strong> {nombreCliente || 'Sin nombre'}</p>
        {telCliente && <p style={{ margin: '2px 0' }}><strong>Tel:</strong> {telCliente}</p>}
        {correoCliente && <p style={{ margin: '2px 0', fontSize: 11 }}>{correoCliente}</p>}
      </div>

      {/* Productos */}
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

      {/* Totales */}
      <div style={{ borderBottom: '2px solid #000', paddingBottom: 6, marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Subtotal</span><span>{formatLempira(venta.monto_total)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 16, marginTop: 4 }}>
          <span>TOTAL</span><span>{formatLempira(venta.monto_total)}</span>
        </div>
      </div>

      {/* Pago */}
      {pago && (
        <div style={{ borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
          <p style={{ margin: '2px 0' }}><strong>Forma de pago:</strong> {METODO_LABEL[pago.metodo_pago] || pago.metodo_pago}</p>
          <p style={{ margin: '2px 0' }}><strong>Estado:</strong> {pago.estado}</p>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <p style={{ margin: '2px 0' }}>Gracias por su compra</p>
        <p style={{ margin: '2px 0', fontSize: 11 }}>Venta #{venta.id}</p>
      </div>
    </div>
  );
}

export default function CajeroVentasPage() {
  const { turno } = useTurno();
  const [ventas, setVentas] = useState<VentaDetalle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detalle, setDetalle] = useState<VentaDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!turno) return;
    fetch(`/api/pedidos?id_usuario=${turno.id_usuario}`, { headers: getH() })
      .then(r => r.json())
      .then((data: ApiResponse<Pedido[]>) => {
        if (data.success && data.data) setVentas(data.data);
        setIsLoading(false);
      });
  }, [turno]);

  const openDetalle = async (v: VentaDetalle) => {
    setDetalle(v); setLoadingDetalle(true);
    try {
      const [pedRes, pagRes] = await Promise.all([
        fetch(`/api/pedidos?id=${v.id}`, { headers: getH() }),
        fetch(`/api/pagos?id_pedido=${v.id}`, { headers: getH() }),
      ]);
      const pedData: ApiResponse<VentaDetalle> = await pedRes.json();
      const pagData: ApiResponse<Pago[]> = await pagRes.json();
      setDetalle({
        ...v,
        ...(pedData.success && pedData.data ? pedData.data : {}),
        pagos: pagData.success && pagData.data ? pagData.data : [],
      });
    } catch { /* ignore */ }
    finally { setLoadingDetalle(false); }
  };

  const handlePrint = () => {
    const contenido = document.getElementById('factura-contenido');
    if (!contenido) return;
    const w = window.open('', '_blank', 'width=400,height=650');
    if (!w) return;
    w.document.write(`<html><head><title>Factura</title>
      <style>body{margin:0;padding:16px;font-family:monospace;font-size:13px}@media print{body{margin:0}}</style>
      </head><body>${contenido.innerHTML}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  const ventasTurno = turno
    ? ventas.filter(v => new Date(v.creado_en) >= new Date(turno.hora_inicio))
    : ventas;

  const totalTurno = ventasTurno.filter(v => v.estado !== 'cancelado').reduce((s, v) => s + Number(v.monto_total), 0);

  const filtered = ventasTurno.filter(v =>
    search
      ? String(v.id).includes(search) ||
        (v.nombre_cliente || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.nombre_usuario || '').toLowerCase().includes(search.toLowerCase())
      : true
  );

  const [cancelando, setCancelando] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<VentaDetalle | null>(null);

  const handleCancelar = async (v: VentaDetalle) => {
    setConfirmCancel(null);
    setCancelando(v.id);
    try {
      const res = await fetch('/api/pedidos', {
        method: 'PUT', headers: getH(),
        body: JSON.stringify({ id: v.id, estado: 'cancelado' }),
      });
      const data = await res.json();
      if (data.success) setVentas(prev => prev.map(p => p.id === v.id ? { ...p, estado: 'cancelado' } : p));
    } catch { /* ignore */ }
    finally { setCancelando(null); }
  };
  const clienteDisplay = (v: VentaDetalle) => {
    if (v.cliente_nombre) return v.cliente_nombre;
    if (v.nombre_cliente) return `${v.nombre_cliente} ${v.apellido_cliente || ''}`.trim();
    return 'Sin nombre';
  };
  const tieneCliente = (v: VentaDetalle) => !!(v.cliente_nombre || v.nombre_cliente);
  const telCliente = (v: VentaDetalle) => v.cliente_telefono || v.telefono_cliente || null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Ventas del turno</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {turno?.nombre_tienda} · {ventasTurno.length} venta{ventasTurno.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="card px-4 py-2 text-right">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total del turno</p>
          <p className="text-lg font-bold" style={{ color: 'var(--blue)' }}>{formatLempira(totalTurno)}</p>
        </div>
      </div>

      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente..." className="input pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin ventas en este turno</p></div>
      ) : (
        <div className="table-wrapper">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Cliente</th>
                <th className="table-header hidden sm:table-cell">Cajero</th>
                <th className="table-header hidden md:table-cell">Hora</th>
                <th className="table-header hidden lg:table-cell">Pago</th>
                <th className="table-header">Estado</th>
                <th className="table-header text-right">Total</th>
                <th className="table-header text-right">Factura</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => {
                const s = ESTADO_STYLE[v.estado];
                return (
                  <tr key={v.id} className="table-row">
                    <td className="table-cell">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: tieneCliente(v) ? 'var(--text)' : 'var(--text-muted)' }}>
                          {clienteDisplay(v)}
                        </p>
                        {telCliente(v) && (
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{telCliente(v)}</p>
                        )}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {v.nombre_usuario || '—'}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(v.creado_en).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3">
                      {v.metodo_pago ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text)' }}>
                          {METODO_LABEL[v.metodo_pago] || v.metodo_pago}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full w-fit"
                          style={{ backgroundColor: s?.bg, color: s?.color }}>
                          {s?.label || v.estado}
                        </span>
                        {(v as any).pendiente_entrega === true || (v as any).pendiente_entrega === 1 ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full w-fit"
                            style={{ backgroundColor: '#fffbeb', color: '#f59e0b', border: '1px solid #fcd34d' }}>
                            Pendiente entrega
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="table-cell text-right text-sm font-bold" style={{ color: 'var(--text)' }}>
                      {formatLempira(v.monto_total)}
                    </td>
                    <td className="table-cell text-right">
                      <button onClick={() => openDetalle(v)} className="btn-icon" title="Ver factura">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal confirmar cancelación */}
      {confirmCancel && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999999 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmCancel(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl mx-auto mb-4" style={{ backgroundColor: 'var(--danger-bg)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--danger)" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-center mb-1" style={{ color: 'var(--text)' }}>Cancelar venta</h3>
            <p className="text-sm text-center mb-5" style={{ color: 'var(--text-muted)' }}>
              ¿Cancelar la venta <span className="font-semibold" style={{ color: 'var(--text)' }}>#{confirmCancel.id}</span> de <span className="font-semibold" style={{ color: 'var(--text)' }}>{clienteDisplay(confirmCancel)}</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmCancel(null)} className="btn-secondary flex-1">No, mantener</button>
              <button onClick={() => handleCancelar(confirmCancel)} className="btn-danger flex-1">Sí, cancelar</button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Modal factura */}
      {detalle && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetalle(null)} />
          <div className="relative w-full max-w-sm max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Factura — Venta #{detalle.id}</h2>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="btn-primary text-xs px-3 py-1.5">Imprimir</button>
                <button onClick={() => setDetalle(null)} className="btn-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-4">
              {loadingDetalle ? (
                <div className="space-y-2 py-4">{[1,2,3].map(i => <div key={i} className="h-10 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />)}</div>
              ) : (
                <div className="rounded-xl p-4" style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}>
                  <Factura venta={detalle} turno={turno} />
                </div>
              )}
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
