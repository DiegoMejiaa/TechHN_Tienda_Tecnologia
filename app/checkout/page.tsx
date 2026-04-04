'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { useCart } from '@/contexts/cart-context';
import { useAuth } from '@/contexts/auth-context';
import type { ApiResponse, Pedido } from '@/types';
import { formatLempira } from '@/lib/format';

type MetodoPago = 'tarjeta' | 'paypal';

// Tasa de conversión HNL → USD
const TASA_HNL_USD = 0.040;

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: Record<string, unknown>) => { render: (el: string | HTMLElement) => Promise<void>; close: () => void };
    };
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const { carrito, refreshCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('tarjeta');
  const [paypalReady, setPaypalReady] = useState(false);
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const paypalButtonsRef = useRef<{ close: () => void } | null>(null);

  // Campos tarjeta
  const [numTarjeta, setNumTarjeta] = useState('');
  const [expiracion, setExpiracion] = useState('');
  const [cvv, setCvv] = useState('');
  const [nombreTarjeta, setNombreTarjeta] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [cvvVisible, setCvvVisible] = useState(false);

  // Ref para totalFinal accesible en el closure de PayPal
  const totalFinalRef = useRef(0);
  const direccionRef = useRef('');
  const ciudadRef = useRef('');
  const codigoPostalRef = useRef('');
  const cuponAplicadoRef = useRef<{ id: number; codigo: string; tipo: string; valor: number; descuento: number; total_con_descuento: number } | null>(null);

  const handleSetDireccion = (v: string) => { setDireccion(v); direccionRef.current = v; };
  const handleSetCiudad = (v: string) => { setCiudad(v); ciudadRef.current = v; };
  const handleSetCodigoPostal = (v: string) => { setCodigoPostal(v); codigoPostalRef.current = v; };

  const direccionValida = direccion.trim().length > 0;
  const ciudadValida = ciudad.trim().length > 0;
  const codigoPostalValido = codigoPostal.length === 5;

  // Cupón
  const [codigoCupon, setCodigoCupon] = useState('');
  const [cuponAplicado, setCuponAplicado] = useState<{ id: number; codigo: string; tipo: string; valor: number; descuento: number; total_con_descuento: number } | null>(null);
  const [cuponError, setCuponError] = useState('');
  const [validandoCupon, setValidandoCupon] = useState(false);

  const items = carrito?.items || [];
  const total = carrito?.total || 0;

  const totalFinal = cuponAplicado ? cuponAplicado.total_con_descuento : total;
  const totalUSD = (totalFinal * TASA_HNL_USD).toFixed(2);

  // Mantener ref de totalFinal actualizado para el closure de PayPal
  useEffect(() => { totalFinalRef.current = totalFinal; }, [totalFinal]);

  useEffect(() => {
    if (usuario) {
      setNombreTarjeta(`${usuario.nombre || ''} ${usuario.apellido || ''}`.trim());
    }
  }, [usuario]);

  // Cargar y renderizar botones de PayPal
  useEffect(() => {
    if (metodoPago !== 'paypal') return;

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!clientId) return;

    setPaypalReady(false);
    let cancelled = false;

    const renderButtons = () => {
      if (cancelled || !window.paypal || !paypalContainerRef.current) return;
      // Limpiar instancia anterior si existe
      if (paypalButtonsRef.current) {
        try { paypalButtonsRef.current.close(); } catch { /* ignore */ }
        paypalButtonsRef.current = null;
      }
      const buttons = window.paypal.Buttons({
        style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay', height: 48 },
        createOrder: async () => {
          const token = sessionStorage.getItem('token');
          const res = await fetch('/api/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ monto_lempiras: totalFinalRef.current }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Error al crear orden');
          return data.data.id;
        },
        onApprove: async (data: { orderID: string }) => {
          setIsProcessing(true);
          setError('');
          try {
            const token = sessionStorage.getItem('token');
            const captureRes = await fetch('/api/paypal/capture-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({ paypal_order_id: data.orderID }),
            });
            const captureData = await captureRes.json();
            if (!captureData.success) throw new Error(captureData.error || 'Error al capturar pago');

            const pedidoRes = await fetch('/api/pedidos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({
                id_usuario: usuario!.id,
                items: items.map(i => ({ id_variante: i.id_variante, cantidad: i.cantidad })),
                envio_direccion: direccionRef.current.trim() || null,
                envio_ciudad: ciudadRef.current.trim() || null,
                envio_codigo_postal: codigoPostalRef.current.trim() || null,
              }),
            });
            const pedidoData: ApiResponse<Pedido> = await pedidoRes.json();
            if (!pedidoData.success || !pedidoData.data) throw new Error(pedidoData.error || 'Error al crear pedido');

            // Aplicar cupón si hay uno
            if (cuponAplicadoRef.current) {
              const cuponRes = await fetch('/api/cupones-pedido', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ id_pedido: pedidoData.data.id, codigo: cuponAplicadoRef.current.codigo }),
              });
              const cuponData = await cuponRes.json();
              if (!cuponData.success) console.error('Error aplicando cupón:', cuponData.error);
            }

            await fetch('/api/pagos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({
                id_pedido: pedidoData.data.id,
                monto: totalFinal,
                metodo_pago: 'paypal',
                estado: 'pagado',
                referencia_externa: captureData.data.capture_id,
              }),
            });

            await refreshCart();
            router.push(`/pedidos/${pedidoData.data.id}?nuevo=true`);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al procesar el pago');
            setIsProcessing(false);
          }
        },
        onError: (err: unknown) => {
          console.error('PayPal error:', err);
          setError('Ocurrió un error con PayPal. Intenta de nuevo.');
        },
        onCancel: () => {
          setError('Pago cancelado. Puedes intentarlo de nuevo.');
        },
      });
      buttons.render(paypalContainerRef.current!);
      paypalButtonsRef.current = buttons;
      if (!cancelled) setPaypalReady(true);
    };

    const existingScript = document.getElementById('paypal-sdk');
    if (existingScript && window.paypal) {
      renderButtons();
    } else if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'paypal-sdk';
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&locale=es_HN`;
      script.onload = () => { if (!cancelled) renderButtons(); };
      document.body.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if (window.paypal) { clearInterval(interval); if (!cancelled) renderButtons(); }
      }, 100);
      return () => { cancelled = true; clearInterval(interval); };
    }

    return () => { cancelled = true; };
  }, [metodoPago, total]);

  const formatNumTarjeta = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiracion = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length <= 2 ? d : d.slice(0, 2) + '/' + d.slice(2); };
  const expiracionValida = (v: string) => {
    if (v.length < 5) return true;
    const [mm, aa] = v.split('/');
    const mes = parseInt(mm, 10); const anio = parseInt('20' + aa, 10);
    if (mes < 1 || mes > 12) return false;
    const ahora = new Date();
    return new Date(anio, mes - 1, 1) >= new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  };
  const direccionCompleta = direccionValida && ciudadValida && codigoPostalValido;

  const handleValidarCupon = async () => {
    if (!codigoCupon.trim()) return;
    setValidandoCupon(true); setCuponError(''); setCuponAplicado(null); cuponAplicadoRef.current = null;
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch('/api/cupones/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ codigo: codigoCupon.trim(), subtotal: total }),
      });
      const data = await res.json();
      if (data.success) { setCuponAplicado(data.data); cuponAplicadoRef.current = data.data; }
      else { setCuponError(data.error || 'Cupón inválido'); }
    } catch { setCuponError('Error al validar el cupón'); }
    finally { setValidandoCupon(false); }
  };

  const handleQuitarCupon = () => { setCuponAplicado(null); cuponAplicadoRef.current = null; setCodigoCupon(''); setCuponError(''); };

  const tarjetaCompleta = numTarjeta.replace(/\s/g, '').length === 16 && expiracion.length === 5 && expiracionValida(expiracion) && cvv.length >= 3 && nombreTarjeta.trim().length > 0;

  const getAuthHeaders = (): Record<string, string> => {
    const token = sessionStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handlePagarTarjeta = async () => {
    setEnviado(true);
    if (!usuario || items.length === 0) return;
    if (!direccionValida || !ciudadValida || !codigoPostalValido) return;
    setIsProcessing(true); setError('');
    try {
      const pedidoRes = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          id_usuario: usuario.id,
          items: items.map(i => ({ id_variante: i.id_variante, cantidad: i.cantidad })),
          envio_direccion: direccion,
          envio_ciudad: ciudad,
          envio_codigo_postal: codigoPostal,
        }),
      });
      const pedidoData: ApiResponse<Pedido> = await pedidoRes.json();
      if (!pedidoData.success || !pedidoData.data) throw new Error(pedidoData.error || 'Error al crear el pedido');

      // Aplicar cupón si hay uno
      if (cuponAplicado) {
        const cuponRes = await fetch('/api/cupones-pedido', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ id_pedido: pedidoData.data.id, codigo: cuponAplicado.codigo }),
        });
        const cuponData = await cuponRes.json();
        if (!cuponData.success) console.error('Error aplicando cupón:', cuponData.error);
      }

      await fetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ id_pedido: pedidoData.data.id, monto: totalFinal, metodo_pago: 'tarjeta', estado: 'pagado' }),
      });
      await refreshCart();
      router.push(`/pedidos/${pedidoData.data.id}?nuevo=true`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el pedido');
    } finally { setIsProcessing(false); }
  };

  if (!usuario) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Inicia sesión para continuar</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Necesitas una cuenta para realizar tu compra</p>
            <Link href="/auth/login" className="btn-primary mt-6 inline-flex px-8 py-3">Iniciar sesión</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Tu carrito está vacío</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Agrega productos para continuar</p>
            <Link href="/productos" className="btn-primary mt-6 inline-flex px-8 py-3">Ver productos</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        {/* Hero */}
        <div style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--blue-light)', border: '1px solid var(--blue-muted)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Checkout</h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Completa tu compra de forma segura</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-5">

            {/* Resumen */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <div className="sticky top-24 rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="h-0.5 w-full" style={{ backgroundColor: 'var(--blue)' }} />
                <div className="p-5">
                  <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>Resumen del pedido</h2>
                  <div className="space-y-3">
                    {items.map(item => {
                      const precio = item.precio_oferta ?? item.precio ?? 0;
                      return (
                        <div key={item.id} className="flex gap-3 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                            {item.imagen_url
                              ? <img src={item.imagen_url} alt={item.nombre_producto || ''} className="h-full w-full object-contain p-1" />
                              : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-6 w-6" style={{ color: 'var(--border)' }}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{item.nombre_producto}</p>
                            {item.nombre_variante && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{item.nombre_variante}</p>}
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>x{item.cantidad}</p>
                          </div>
                          <p className="text-sm font-bold shrink-0" style={{ color: 'var(--blue)' }}>{formatLempira(precio * item.cantidad)}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 space-y-2 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                      <span style={{ color: 'var(--text)' }}>{formatLempira(total)}</span>
                    </div>
                    {cuponAplicado && (
                      <div className="flex justify-between text-sm">
                        <span style={{ color: 'var(--success)' }}>Descuento ({cuponAplicado.codigo})</span>
                        <span style={{ color: 'var(--success)' }}>-{formatLempira(cuponAplicado.descuento)}</span>
                      </div>
                    )}
                    {metodoPago === 'paypal' && (
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'var(--text-muted)' }}>Equivalente en USD</span>
                        <span style={{ color: 'var(--text-muted)' }}>${totalUSD} USD</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 rounded-xl px-4 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--blue-light)', border: '1px solid var(--blue-muted)' }}>
                    <span className="font-semibold" style={{ color: 'var(--blue)' }}>Total</span>
                    <span className="text-xl font-bold" style={{ color: 'var(--blue)' }}>{formatLempira(totalFinal)}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                    Compra segura y protegida
                  </div>
                </div>
              </div>
            </div>

            {/* Formulario */}
            <div className="lg:col-span-3 order-1 lg:order-2">
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="h-0.5 w-full" style={{ backgroundColor: 'var(--blue)' }} />
                <div className="p-6 space-y-6">

                  {/* Selector método de pago */}
                  <div>
                    <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>Método de pago</h2>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setMetodoPago('tarjeta')}
                        className="flex items-center justify-center gap-2 rounded-xl p-4 text-sm font-semibold transition-all"
                        style={metodoPago === 'tarjeta'
                          ? { backgroundColor: 'var(--blue-light)', color: 'var(--blue)', border: '2px solid var(--blue)' }
                          : { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '2px solid var(--border)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                        </svg>
                        Tarjeta
                      </button>
                      <button onClick={() => setMetodoPago('paypal')}
                        className="flex items-center justify-center gap-2 rounded-xl p-4 text-sm font-semibold transition-all"
                        style={metodoPago === 'paypal'
                          ? { backgroundColor: '#e8f4fd', color: '#003087', border: '2px solid #0070ba' }
                          : { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '2px solid var(--border)' }}>
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill={metodoPago === 'paypal' ? '#0070ba' : 'currentColor'} xmlns="http://www.w3.org/2000/svg">
                          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
                        </svg>
                        PayPal
                      </button>
                    </div>
                  </div>

                  {/* Campos tarjeta */}
                  {metodoPago === 'tarjeta' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Número de tarjeta</label>
                        <input type="text" value={numTarjeta} onChange={e => setNumTarjeta(formatNumTarjeta(e.target.value))} placeholder="1234 5678 9012 3456" className="input font-mono" maxLength={19} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Expiración</label>
                          <input type="text" value={expiracion} onChange={e => setExpiracion(formatExpiracion(e.target.value))} placeholder="MM/AA" className="input" maxLength={5}
                            style={expiracion.length === 5 && !expiracionValida(expiracion) ? { borderColor: 'var(--danger)' } : {}} />
                          {expiracion.length === 5 && !expiracionValida(expiracion) && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>Tarjeta expirada</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>CVV</label>
                          <div className="relative">
                            <input type={cvvVisible ? 'text' : 'password'} value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="•••" className="input pr-9" maxLength={3} />
                            <button type="button" onClick={() => setCvvVisible(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                                {cvvVisible
                                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                  : <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                }
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Nombre en la tarjeta</label>
                        <input type="text" value={nombreTarjeta} onChange={e => setNombreTarjeta(e.target.value)} className="input" />
                      </div>
                    </div>
                  )}

                  {/* Info PayPal — solo el aviso, botones van abajo */}
                  {metodoPago === 'paypal' && (
                    <div className="rounded-xl p-4 text-sm flex items-start gap-3" style={{ backgroundColor: '#e8f4fd', border: '1px solid #b3d9f5', color: '#003087' }}>
                      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 mt-0.5" fill="#0070ba">
                        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
                      </svg>
                      <div>
                        <p className="font-semibold text-sm">Pago seguro con PayPal</p>
                        <p className="text-xs mt-0.5" style={{ color: '#0070ba' }}>
                          Se cobrarán <strong>${totalUSD} USD</strong> (equivalente a {formatLempira(total)}).
                          Serás redirigido a PayPal para autorizar el pago.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Cupón */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                    <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>¿Tienes un cupón?</h3>
                    {cuponAplicado ? (
                      <div className="flex items-center justify-between rounded-xl px-4 py-3"
                        style={{ backgroundColor: 'var(--success-bg)', border: '1px solid var(--success)' }}>
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="var(--success)" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--success)' }}>{cuponAplicado.codigo}</p>
                            <p className="text-xs" style={{ color: 'var(--success)' }}>
                              {cuponAplicado.tipo === 'porcentaje' ? `${cuponAplicado.valor}% de descuento` : `${formatLempira(cuponAplicado.valor)} de descuento`}
                              {' · '}Ahorras {formatLempira(cuponAplicado.descuento)}
                            </p>
                          </div>
                        </div>
                        <button onClick={handleQuitarCupon} className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>Quitar</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input type="text" placeholder="Código de cupón" className="input flex-1 uppercase"
                          value={codigoCupon} onChange={e => { setCodigoCupon(e.target.value.toUpperCase()); setCuponError(''); }}
                          onKeyDown={e => e.key === 'Enter' && handleValidarCupon()} />
                        <button onClick={handleValidarCupon} disabled={validandoCupon || !codigoCupon.trim()}
                          className="btn-secondary px-4 shrink-0 disabled:opacity-50">
                          {validandoCupon ? '...' : 'Aplicar'}
                        </button>
                      </div>
                    )}
                    {cuponError && <p className="text-xs mt-1.5" style={{ color: 'var(--danger)' }}>{cuponError}</p>}
                  </div>

                  {/* Dirección de envío */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                    <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>Dirección de envío</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Dirección *</label>
                        <input type="text" placeholder="Calle Principal 123" className="input"
                          value={direccion} onChange={e => handleSetDireccion(e.target.value)}
                          style={enviado && !direccionValida ? { borderColor: 'var(--danger)' } : {}} />
                        {enviado && !direccionValida && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>La dirección es requerida</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Ciudad *</label>
                          <input type="text" placeholder="Tegucigalpa" className="input"
                            value={ciudad} onChange={e => handleSetCiudad(e.target.value)}
                            style={enviado && !ciudadValida ? { borderColor: 'var(--danger)' } : {}} />
                          {enviado && !ciudadValida && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>La ciudad es requerida</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Código postal *</label>
                          <input type="text" placeholder="11101" className="input" maxLength={5}
                            value={codigoPostal}
                            onChange={e => handleSetCodigoPostal(e.target.value.replace(/\D/g, '').slice(0, 5))}
                            style={enviado && !codigoPostalValido ? { borderColor: 'var(--danger)' } : {}} />
                          {enviado && !codigoPostalValido && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>Debe tener 5 dígitos</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
                      {error}
                    </div>
                  )}

                  {/* Botón pagar tarjeta */}
                  {metodoPago === 'tarjeta' && (
                    <button onClick={handlePagarTarjeta} disabled={isProcessing || !tarjetaCompleta || !direccionCompleta} className="btn-primary w-full py-3 disabled:opacity-50">
                      {isProcessing ? 'Procesando...' : `Pagar ${formatLempira(total)}`}
                    </button>
                  )}

                  {/* Botones PayPal — después del formulario */}
                  {metodoPago === 'paypal' && (
                    <div>
                      {!direccionCompleta && enviado && (
                        <p className="text-xs text-center mb-2" style={{ color: 'var(--danger)' }}>Completa la dirección de envío para continuar</p>
                      )}
                      <div
                        ref={paypalContainerRef}
                        id="paypal-button-container"
                        className="min-h-[50px]"
                        onClick={() => { if (!direccionCompleta) setEnviado(true); }}
                        style={!direccionCompleta ? { pointerEvents: 'none', opacity: 0.5 } : {}}
                      >
                        {!paypalReady && (
                          <div className="flex items-center justify-center py-4 gap-2" style={{ color: 'var(--text-muted)' }}>
                            <div className="spinner" style={{ width: '1.25rem', height: '1.25rem' }} />
                            <span className="text-sm">Cargando PayPal...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    Al completar la compra aceptas nuestros términos y condiciones
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
