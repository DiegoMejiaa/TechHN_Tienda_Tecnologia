'use client';

import { useEffect, useState } from 'react';import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/auth-context';
import { useTurno } from '@/contexts/turno-context';
import type { VarianteProducto, ApiResponse } from '@/types';
import { formatLempira } from '@/lib/format';

interface VarConStock extends VarianteProducto { nombre_producto: string; stock_tienda: number; stock_otras?: number; sucursales_disponibles?: { nombre: string; cantidad: number }[] }
interface ItemVenta { variante: VarConStock; cantidad: number }

const METODOS = ['efectivo', 'tarjeta', 'transferencia'] as const;
type Metodo = typeof METODOS[number];
const METODO_LABEL: Record<Metodo, string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
const CUENTA_TRANSFERENCIA = 'Cuenta: 1234-5678-9012 · Banco Atlántida';

function getH(): Record<string, string> {
  const t = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

// ── Modal confirmación de pago externo ───────────────────────────────────────
function ModalPagoExterno({ metodo, total, onConfirm, onCancel }: {
  metodo: 'tarjeta' | 'transferencia'; total: number; onConfirm: (referencia: string) => void; onCancel: () => void;
}) {
  const [referencia, setReferencia] = useState('');
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
            {metodo === 'tarjeta' ? 'Pago con tarjeta' : 'Transferencia bancaria'}
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl px-4 py-3 text-center" style={{ backgroundColor: 'var(--blue-light)', border: '1px solid var(--blue-muted)' }}>
            <p className="text-xs" style={{ color: 'var(--blue)' }}>Monto a cobrar</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--blue)' }}>{formatLempira(total)}</p>
          </div>
          <div className="rounded-xl p-4 space-y-1.5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            {metodo === 'tarjeta' ? (
              <>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Pasos</p>
                <ol className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <li>1. Solicita la tarjeta al cliente</li>
                  <li>2. Pasa la tarjeta por la terminal</li>
                  <li>3. El cliente ingresa su PIN</li>
                  <li>4. Espera la aprobación de la terminal</li>
                </ol>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Datos para transferencia</p>
                <p className="text-xs font-mono font-semibold" style={{ color: 'var(--text)' }}>{CUENTA_TRANSFERENCIA}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Solicita el comprobante antes de confirmar.</p>
              </>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              {metodo === 'tarjeta' ? 'No. de aprobación / últimos 4 dígitos' : 'No. de referencia de transferencia'}
              <span style={{ color: 'var(--danger)' }}> *</span>
            </label>
            <input
              type="text"
              value={referencia}
              onChange={e => setReferencia(e.target.value)}
              placeholder={metodo === 'tarjeta' ? 'Ej: 4521' : 'Ej: TRF-20240403-001'}
              className="input py-2"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={() => onConfirm(referencia)} disabled={!referencia.trim()}
              className="btn-primary flex-1 disabled:opacity-50">
              Confirmar pago
            </button>
          </div>
        </div>
      </div>
    </div>
  , document.body);
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function CajeroVentaPage() {
  const { usuario } = useAuth();
  const { turno } = useTurno();
  const [variantes, setVariantes] = useState<VarConStock[]>([]);
  const [variantesOtrasSucursales, setVariantesOtrasSucursales] = useState<VarConStock[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState<ItemVenta[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [metodo, setMetodo] = useState<Metodo>('efectivo');
  const [efectivoCliente, setEfectivoCliente] = useState('');
  const [showModalPago, setShowModalPago] = useState(false);
  const [ventaCompletada, setVentaCompletada] = useState<{ id: number; total: number; cambio: number | null } | null>(null);
  const [alertSinStock, setAlertSinStock] = useState<string | null>(null);
  const [pageLocal, setPageLocal] = useState(1);
  const [pageOtras, setPageOtras] = useState(1);
  const PAGE_SIZE = 12;

  // Datos del cliente — simples, sin crear usuario
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteCorreo, setClienteCorreo] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [pendienteEntrega, setPendienteEntrega] = useState(false);

  const cargarVariantes = async () => {
    if (!turno) return;
    try {
      const [varRes, stockLocalRes, stockTotalRes] = await Promise.all([
        fetch('/api/variantes?activo=true', { headers: getH() }),
        fetch(`/api/stock?id_tienda=${turno.id_tienda}`, { headers: getH() }),
        fetch('/api/stock', { headers: getH() }), // stock de todas las tiendas
      ]);
      const varData: ApiResponse<(VarianteProducto & { nombre_producto: string })[]> = await varRes.json();
      const stockLocal = await stockLocalRes.json();
      const stockTotal = await stockTotalRes.json();

      // Mapa stock local
      const stockLocalMap: Record<number, number> = {};
      if (stockLocal.success && stockLocal.data)
        stockLocal.data.forEach((s: { id_variante: number; cantidad: number }) => { stockLocalMap[s.id_variante] = s.cantidad; });

      // Mapa stock total (todas las tiendas) y detalle por tienda
      const stockTotalMap: Record<number, number> = {};
      const stockPorTienda: Record<number, { nombre: string; cantidad: number }[]> = {};
      if (stockTotal.success && stockTotal.data)
        stockTotal.data.forEach((s: { id_variante: number; cantidad: number; nombre_tienda: string }) => {
          stockTotalMap[s.id_variante] = (stockTotalMap[s.id_variante] || 0) + s.cantidad;
          if (!stockPorTienda[s.id_variante]) stockPorTienda[s.id_variante] = [];
          if (s.cantidad > 0) stockPorTienda[s.id_variante].push({ nombre: s.nombre_tienda, cantidad: s.cantidad });
        });

      if (varData.success && varData.data) {
        const todas = varData.data.filter(v => v.activo).map(v => {
          const stockLocal = stockLocalMap[v.id] || 0;
          const stockOtras = Math.max(0, (stockTotalMap[v.id] || 0) - stockLocal);
          // Sucursales con stock excluyendo la actual
          const sucursales = (stockPorTienda[v.id] || []).filter(t => t.nombre !== turno.nombre_tienda);
          return { ...v, stock_tienda: stockLocal, stock_otras: stockOtras, sucursales_disponibles: sucursales };
        });

        // Con stock local
        setVariantes(todas.filter(v => v.stock_tienda > 0).sort((a, b) => b.stock_tienda - a.stock_tienda));

        // Sin stock local pero con stock en otras sucursales (agrupar por producto, tomar la de mayor stock_otras)
        const sinStockLocal = todas.filter(v => v.stock_tienda === 0 && (v.stock_otras || 0) > 0);
        const porProducto: Record<string, VarConStock> = {};
        sinStockLocal.forEach(v => {
          const key = v.nombre_producto;
          if (!porProducto[key] || (v.stock_otras || 0) > (porProducto[key].stock_otras || 0)) {
            // Combinar sucursales de todas las variantes del mismo producto
            const existing = porProducto[key];
            if (existing) {
              const merged = [...(existing.sucursales_disponibles || [])];
              (v.sucursales_disponibles || []).forEach(s => {
                const idx = merged.findIndex(m => m.nombre === s.nombre);
                if (idx >= 0) merged[idx].cantidad += s.cantidad;
                else merged.push({ ...s });
              });
              porProducto[key] = { ...v, stock_otras: (existing.stock_otras || 0) + (v.stock_otras || 0), sucursales_disponibles: merged };
            } else {
              porProducto[key] = v;
            }
          }
        });
        setVariantesOtrasSucursales(Object.values(porProducto).sort((a, b) => (b.stock_otras || 0) - (a.stock_otras || 0)));
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { cargarVariantes(); }, [turno]);

  const filtradas = busqueda.length > 1
    ? variantes.filter(v =>
        v.sku.toLowerCase().includes(busqueda.toLowerCase()) ||
        v.nombre_variante?.toLowerCase().includes(busqueda.toLowerCase()) ||
        v.nombre_producto?.toLowerCase().includes(busqueda.toLowerCase())
      ).slice(0, 8)
    : [];

  const agregarItem = (v: VarConStock) => {
    if (v.stock_tienda <= 0) {
      setAlertSinStock(`"${v.nombre_producto}" no tiene stock disponible en esta sucursal`);
      setTimeout(() => setAlertSinStock(null), 3000);
      return;
    }
    setCarrito(prev => {
      const existe = prev.find(i => i.variante.id === v.id);
      if (existe) {
        if (existe.cantidad >= v.stock_tienda) {
          setAlertSinStock(`Stock máximo alcanzado para "${v.nombre_producto}" (${v.stock_tienda} unidades)`);
          setTimeout(() => setAlertSinStock(null), 3000);
          return prev;
        }
        return prev.map(i => i.variante.id === v.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { variante: v, cantidad: 1 }];
    });
    setBusqueda('');
  };

  const setCantidad = (id: number, val: number) => {
    const item = carrito.find(i => i.variante.id === id);
    if (!item) return;
    setCarrito(prev => prev.map(i => i.variante.id === id ? { ...i, cantidad: Math.max(1, Math.min(val, item.variante.stock_tienda)) } : i));
  };

  const eliminarItem = (id: number) => setCarrito(prev => prev.filter(i => i.variante.id !== id));

  const total = carrito.reduce((acc, i) => acc + (i.variante.precio_oferta ?? i.variante.precio) * i.cantidad, 0);
  const cambio = metodo === 'efectivo' && efectivoCliente ? Number(efectivoCliente) - total : null;

  const ejecutarVenta = async (referencia?: string) => {
    if (!carrito.length || !usuario || !turno) return;
    setProcesando(true);
    setShowModalPago(false);
    try {
      const res = await fetch('/api/pedidos', {
        method: 'POST', headers: getH(),
        body: JSON.stringify({
          id_usuario: usuario.id,
          pendiente_entrega: pendienteEntrega,
          cliente_nombre: clienteNombre.trim() || null,
          cliente_telefono: clienteTelefono.trim() || null,
          cliente_correo: clienteCorreo.trim() || null,
          cliente_direccion: pendienteEntrega ? clienteDireccion.trim() || null : null,
          items: carrito.map(i => ({ id_variante: i.variante.id, cantidad: i.cantidad })),
        }),
      });
      const data: ApiResponse<{ id: number }> = await res.json();
      if (data.success && data.data) {
        await fetch('/api/pagos', {
          method: 'POST', headers: getH(),
          body: JSON.stringify({
            id_pedido: data.data.id,
            monto: total,
            metodo_pago: metodo,
            estado: 'pagado',
            ...(referencia ? { referencia } : {}),
          }),
        });
        setVentaCompletada({ id: data.data.id, total, cambio });
        setCarrito([]);
        setEfectivoCliente('');
        setClienteNombre(''); setClienteTelefono(''); setClienteCorreo(''); setClienteDireccion('');
        setPendienteEntrega(false);
        cargarVariantes();
      }
    } finally { setProcesando(false); }
  };

  const formatTelCliente = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 4) return digits;
    return digits.slice(0, 4) + '-' + digits.slice(4);
  };

  const correoValido = (c: string) => !c || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);

  const handleCobrar = () => {
    if (metodo === 'efectivo') ejecutarVenta();
    else setShowModalPago(true);
  };

  // ── Pantalla de venta completada ──
  if (ventaCompletada) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center max-w-sm w-full space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full mx-auto" style={{ backgroundColor: 'var(--success-bg)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="var(--success)" className="h-8 w-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Venta completada</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Venta #{ventaCompletada.id}</p>
            <p className="text-2xl font-bold mt-2" style={{ color: 'var(--success)' }}>{formatLempira(ventaCompletada.total)}</p>
          </div>
          {ventaCompletada.cambio !== null && ventaCompletada.cambio > 0 && (
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--success-bg)' }}>
              <p className="text-xs" style={{ color: 'var(--success)' }}>Cambio al cliente</p>
              <p className="text-xl font-bold" style={{ color: 'var(--success)' }}>{formatLempira(ventaCompletada.cambio)}</p>
            </div>
          )}
          <button onClick={() => setVentaCompletada(null)} className="btn-primary w-full py-3">Nueva venta</button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      {/* Alert sin stock */}
      {alertSinStock && createPortal(
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999999] flex items-center gap-2 rounded-xl px-4 py-3 text-sm shadow-2xl"
          style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)', minWidth: 280 }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          {alertSinStock}
        </div>
      , document.body)}
      {/* ── Productos ── */}
      <div className="lg:col-span-3 space-y-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Nueva venta</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--blue)' }}>{turno?.nombre_tienda}</span>
            {' · '}{variantes.length} producto{variantes.length !== 1 ? 's' : ''} con stock
          </p>
        </div>

        {/* Buscador */}
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input type="text" placeholder="Buscar por SKU, nombre o producto..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)} className="input pl-9" autoFocus />
          {filtradas.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-xl shadow-2xl overflow-hidden"
              style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
              {filtradas.map(v => (
                <button key={v.id} onClick={() => agregarItem(v)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                  {v.imagen_url
                    ? <img src={v.imagen_url} alt="" className="h-10 w-10 rounded-lg object-contain shrink-0" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                    : <div className="h-10 w-10 rounded-lg shrink-0" style={{ backgroundColor: 'var(--bg-secondary)' }} />}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate" style={{ color: 'var(--text)' }}>{v.nombre_producto}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{v.nombre_variante || v.sku}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold" style={{ color: 'var(--blue)' }}>{formatLempira(v.precio_oferta ?? v.precio)}</p>
                    <p className="text-xs" style={{ color: v.stock_tienda <= 3 ? 'var(--warning)' : 'var(--success)' }}>Stock: {v.stock_tienda}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid productos */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Productos disponibles</p>
          {variantes.length === 0 ? (
            <div className="card p-10 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin stock en esta sucursal</p></div>
          ) : (() => {
            const totalPagesLocal = Math.ceil(variantes.length / PAGE_SIZE);
            const paginatedLocal = variantes.slice((pageLocal - 1) * PAGE_SIZE, pageLocal * PAGE_SIZE);
            return (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {paginatedLocal.map(v => {
                    const enCarrito = carrito.find(i => i.variante.id === v.id);
                    const agotado = v.stock_tienda <= 0 || (enCarrito ? enCarrito.cantidad >= v.stock_tienda : false);
                    return (
                      <button key={v.id} onClick={() => agregarItem(v)}
                        className="card p-3 text-left transition-all relative"
                        style={agotado ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                        onMouseEnter={e => !agotado && (e.currentTarget.style.borderColor = 'var(--blue)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                        <div className="h-20 w-full rounded-lg mb-2 overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          {v.imagen_url
                            ? <img src={v.imagen_url} alt={v.nombre_producto} className="h-full w-full object-contain p-1" />
                            : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-8 w-8" style={{ color: 'var(--border)' }}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                          }
                        </div>
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{v.nombre_producto}</p>
                        <p className="text-xs truncate mb-1.5" style={{ color: 'var(--text-muted)' }}>{v.nombre_variante || v.sku}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold" style={{ color: 'var(--blue)' }}>{formatLempira(v.precio_oferta ?? v.precio)}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                            style={v.stock_tienda <= 0
                              ? { backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }
                              : v.stock_tienda <= 3
                                ? { backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }
                                : { backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                            {v.stock_tienda <= 0 ? 'No disponible' : v.stock_tienda}
                          </span>
                        </div>
                        {enCarrito && (
                          <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full text-white text-xs font-bold" style={{ backgroundColor: 'var(--blue)' }}>
                            {enCarrito.cantidad}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {totalPagesLocal > 1 && (
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {(pageLocal - 1) * PAGE_SIZE + 1}–{Math.min(pageLocal * PAGE_SIZE, variantes.length)} de {variantes.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPageLocal(p => Math.max(1, p - 1))} disabled={pageLocal === 1} className="btn-icon disabled:opacity-30">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                      </button>
                      {Array.from({ length: totalPagesLocal }, (_, i) => i + 1).map(n => (
                        <button key={n} onClick={() => setPageLocal(n)}
                          className="h-7 w-7 rounded-lg text-xs font-semibold transition-colors"
                          style={{ backgroundColor: pageLocal === n ? 'var(--blue)' : 'transparent', color: pageLocal === n ? '#fff' : 'var(--text-muted)', border: pageLocal === n ? 'none' : '1px solid var(--border)' }}>
                          {n}
                        </button>
                      ))}
                      <button onClick={() => setPageLocal(p => Math.min(totalPagesLocal, p + 1))} disabled={pageLocal === totalPagesLocal} className="btn-icon disabled:opacity-30">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Disponible en otras sucursales */}
        {variantesOtrasSucursales.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
              </svg>
              Disponible en otras sucursales
            </p>
            {(() => {
              const totalPagesOtras = Math.ceil(variantesOtrasSucursales.length / PAGE_SIZE);
              const paginatedOtras = variantesOtrasSucursales.slice((pageOtras - 1) * PAGE_SIZE, pageOtras * PAGE_SIZE);
              return (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {paginatedOtras.map(v => (
                      <button key={v.id} onClick={() => agregarItem({ ...v, stock_tienda: v.stock_otras || 0 })}
                        className="card p-3 text-left transition-all"
                        style={{ border: '1px dashed var(--border)', opacity: 0.85 }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.opacity = '0.85'; }}>
                        <div className="h-20 w-full rounded-lg mb-2 overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          {v.imagen_url
                            ? <img src={v.imagen_url} alt={v.nombre_producto} className="h-full w-full object-contain p-1" />
                            : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-8 w-8" style={{ color: 'var(--border)' }}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                          }
                        </div>
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{v.nombre_producto}</p>
                        <p className="text-xs truncate mb-1.5" style={{ color: 'var(--text-muted)' }}>{v.nombre_variante || v.sku}</p>
                        <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{formatLempira(v.precio_oferta ?? v.precio)}</p>
                        <div className="mt-1.5 space-y-1">
                          {(v.sucursales_disponibles || []).map(s => (
                            <div key={s.nombre} className="flex items-center justify-between rounded-lg px-2 py-1" style={{ backgroundColor: '#eff6ff' }}>
                              <span className="text-xs font-semibold truncate" style={{ color: '#3b82f6' }}>{s.nombre}</span>
                              <span className="text-xs font-bold ml-1 shrink-0" style={{ color: '#3b82f6' }}>{s.cantidad}</span>
                            </div>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                  {totalPagesOtras > 1 && (
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {(pageOtras - 1) * PAGE_SIZE + 1}–{Math.min(pageOtras * PAGE_SIZE, variantesOtrasSucursales.length)} de {variantesOtrasSucursales.length}
                      </p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setPageOtras(p => Math.max(1, p - 1))} disabled={pageOtras === 1} className="btn-icon disabled:opacity-30">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                        </button>
                        {Array.from({ length: totalPagesOtras }, (_, i) => i + 1).map(n => (
                          <button key={n} onClick={() => setPageOtras(n)}
                            className="h-7 w-7 rounded-lg text-xs font-semibold transition-colors"
                            style={{ backgroundColor: pageOtras === n ? 'var(--blue)' : 'transparent', color: pageOtras === n ? '#fff' : 'var(--text-muted)', border: pageOtras === n ? 'none' : '1px solid var(--border)' }}>
                            {n}
                          </button>
                        ))}
                        <button onClick={() => setPageOtras(p => Math.min(totalPagesOtras, p + 1))} disabled={pageOtras === totalPagesOtras} className="btn-icon disabled:opacity-30">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* ── Resumen ── */}
      <div className="lg:col-span-2">
        <div className="card p-5 sticky top-20 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Resumen de venta</h2>
            {carrito.length > 0 && <span className="badge badge-blue">{carrito.reduce((s, i) => s + i.cantidad, 0)} items</span>}
          </div>

          {carrito.length === 0 ? (
            <div className="py-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-10 w-10 mx-auto mb-2" style={{ color: 'var(--border)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Agrega productos para comenzar</p>
            </div>
          ) : (
            <>
              {/* Items */}
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {carrito.map(item => {
                  const precio = item.variante.precio_oferta ?? item.variante.precio;
                  const tieneOferta = item.variante.precio_oferta && item.variante.precio_oferta < item.variante.precio;
                  return (
                  <div key={item.variante.id} className="rounded-xl p-2.5" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <div className="flex items-start gap-2.5">
                      {/* Imagen */}
                      <div className="h-12 w-12 rounded-lg shrink-0 overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--card)' }}>
                        {item.variante.imagen_url
                          ? <img src={item.variante.imagen_url} alt="" className="h-full w-full object-contain p-0.5" />
                          : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-5 w-5" style={{ color: 'var(--border)' }}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                        }
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{item.variante.nombre_producto}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{item.variante.nombre_variante || item.variante.sku}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-bold" style={{ color: 'var(--blue)' }}>{formatLempira(precio)}</span>
                          {tieneOferta && (
                            <span className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>{formatLempira(item.variante.precio)}</span>
                          )}
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· Stock: {item.variante.stock_tienda}</span>
                        </div>
                      </div>
                      <button onClick={() => eliminarItem(item.variante.id)} className="text-xs shrink-0 mt-0.5" style={{ color: 'var(--danger)' }}>✕</button>
                    </div>
                    {/* Cantidad + subtotal */}
                    <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setCantidad(item.variante.id, item.cantidad - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold"
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>−</button>
                        <input type="number" min={1} max={item.variante.stock_tienda} value={item.cantidad}
                          onChange={e => setCantidad(item.variante.id, Number(e.target.value))}
                          className="w-8 text-center text-xs font-semibold rounded border"
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                        <button onClick={() => setCantidad(item.variante.id, item.cantidad + 1)}
                          disabled={item.cantidad >= item.variante.stock_tienda}
                          className="flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold disabled:opacity-40"
                          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>+</button>
                      </div>
                      <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                        {formatLempira(precio * item.cantidad)}
                      </span>
                    </div>
                  </div>
                  );
                })}
              </div>

              {/* Datos del cliente — nombre obligatorio */}
              <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Datos del cliente <span style={{ color: 'var(--danger)' }}>*</span>
                </p>
                <input type="text" value={clienteNombre} onChange={e => setClienteNombre(e.target.value)}
                  className="input py-1.5 text-sm" placeholder="Nombre completo *" required />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input type="text" value={clienteTelefono}
                      onChange={e => setClienteTelefono(formatTelCliente(e.target.value))}
                      className="input py-1.5 text-sm" placeholder="9999-9999" maxLength={9} />
                    {clienteTelefono && clienteTelefono.replace(/\D/g, '').length < 8 && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--warning)' }}>{clienteTelefono.replace(/\D/g, '').length}/8 dígitos</p>
                    )}
                  </div>
                  <div>
                    <input type="email" value={clienteCorreo} onChange={e => setClienteCorreo(e.target.value)}
                      className="input py-1.5 text-sm" placeholder="correo@ejemplo.com"
                      style={clienteCorreo && !correoValido(clienteCorreo) ? { borderColor: 'var(--danger)' } : {}} />
                    {clienteCorreo && !correoValido(clienteCorreo) && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--danger)' }}>Correo inválido</p>
                    )}
                  </div>
                </div>
                {!clienteNombre.trim() && (
                  <p className="text-xs" style={{ color: 'var(--warning)' }}>El nombre del cliente es requerido</p>
                )}
              </div>

              {/* Pendiente de entrega */}
              <label className="flex items-center gap-2.5 cursor-pointer rounded-xl px-3 py-2.5"
                style={{ backgroundColor: pendienteEntrega ? 'rgba(245,158,11,0.08)' : 'var(--bg-secondary)', border: `1px solid ${pendienteEntrega ? '#f59e0b' : 'var(--border)'}`, transition: 'all 0.15s' }}>
                <input type="checkbox" checked={pendienteEntrega} onChange={e => setPendienteEntrega(e.target.checked)}
                  className="h-4 w-4 rounded accent-amber-500 cursor-pointer" />
                <div>
                  <p className="text-xs font-semibold" style={{ color: pendienteEntrega ? '#f59e0b' : 'var(--text)' }}>
                    Pendiente de entrega
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    El cliente pagó pero el producto se entregará después
                  </p>
                </div>
              </label>

              {/* Dirección de entrega — solo si pendiente */}
              {pendienteEntrega && (
                <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid #f59e0b' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#f59e0b' }}>
                    Dirección de entrega <span style={{ color: 'var(--danger)' }}>*</span>
                  </p>
                  <input
                    type="text"
                    value={clienteDireccion}
                    onChange={e => setClienteDireccion(e.target.value)}
                    className="input py-1.5 text-sm"
                    placeholder="Calle, colonia, ciudad..."
                    autoFocus
                  />
                  {!clienteDireccion.trim() && (
                    <p className="text-xs" style={{ color: 'var(--warning)' }}>La dirección es requerida para entrega</p>
                  )}
                </div>
              )}

              {/* Método de pago */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Método de pago</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {METODOS.map(m => (
                    <button key={m} onClick={() => setMetodo(m)}
                      className="rounded-lg py-2 text-xs font-semibold transition-all"
                      style={metodo === m
                        ? { backgroundColor: 'var(--blue)', color: '#fff' }
                        : { backgroundColor: 'var(--card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      {METODO_LABEL[m]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Efectivo recibido */}
              {metodo === 'efectivo' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Efectivo recibido</label>
                  <input type="number" min={0} step="0.01" value={efectivoCliente}
                    onChange={e => setEfectivoCliente(e.target.value)}
                    className="input py-2" placeholder={formatLempira(total)} />
                  {cambio !== null && (
                    <div className="mt-2 flex items-center justify-between rounded-xl px-3 py-2"
                      style={{ backgroundColor: cambio >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${cambio >= 0 ? 'var(--success)' : 'var(--danger)'}` }}>
                      <span className="text-xs font-semibold" style={{ color: cambio >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {cambio >= 0 ? 'Cambio' : 'Falta'}
                      </span>
                      <span className="text-sm font-bold" style={{ color: cambio >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {formatLempira(Math.abs(cambio))}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Info tarjeta/transferencia */}
              {metodo !== 'efectivo' && (
                <div className="rounded-xl px-3 py-2.5 text-xs" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  {metodo === 'tarjeta'
                    ? 'Se procesará en el datáfono al confirmar'
                    : CUENTA_TRANSFERENCIA}
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ backgroundColor: 'var(--blue-light)', border: '1px solid var(--blue-muted)' }}>
                <span className="text-sm font-semibold" style={{ color: 'var(--blue)' }}>Total</span>
                <span className="text-2xl font-bold" style={{ color: 'var(--blue)' }}>{formatLempira(total)}</span>
              </div>

              <button onClick={handleCobrar}
                disabled={procesando || !clienteNombre.trim() || (pendienteEntrega && !clienteDireccion.trim()) || !correoValido(clienteCorreo) || (metodo === 'efectivo' && !!efectivoCliente && cambio !== null && cambio < 0)}
                className="btn-primary w-full py-3">
                {procesando ? <><span className="spinner h-4 w-4 border-2" />Procesando...</> : `Cobrar ${formatLempira(total)}`}
              </button>
              <button onClick={() => { setCarrito([]); setEfectivoCliente(''); setClienteNombre(''); setClienteTelefono(''); setClienteCorreo(''); setClienteDireccion(''); setPendienteEntrega(false); }}
                className="btn-secondary w-full py-2">
                Cancelar venta
              </button>
            </>
          )}
        </div>
      </div>

      {showModalPago && (metodo === 'tarjeta' || metodo === 'transferencia') && (
        <ModalPagoExterno metodo={metodo} total={total} onConfirm={(ref) => ejecutarVenta(ref)} onCancel={() => setShowModalPago(false)} />
      )}
    </div>
  );
}
