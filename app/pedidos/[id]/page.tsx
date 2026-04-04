'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/contexts/auth-context';
import type { Pedido, ApiResponse } from '@/types';
import { formatLempira } from '@/lib/format';

const ESTADO_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  pendiente:  { color: '#f59e0b', bg: '#fffbeb', label: 'Pendiente'  },
  pagado:     { color: '#3b82f6', bg: '#eff6ff', label: 'Pagado'     },
  enviado:    { color: '#8b5cf6', bg: '#f5f3ff', label: 'Enviado'    },
  entregado:  { color: '#10b981', bg: '#f0fdf4', label: 'Entregado'  },
  cancelado:  { color: '#ef4444', bg: '#fef2f2', label: 'Cancelado'  },
};

function Factura({ pedido, usuario }: { pedido: Pedido; usuario: any }) {
  return (
    <div id="factura-cliente" style={{ fontFamily: 'monospace', fontSize: 13, color: '#000', maxWidth: 360, margin: '0 auto', padding: 20 }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 10 }}>
        <p style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>TechHN</p>
        <p style={{ margin: '4px 0', fontSize: 11 }}>Compra en línea</p>
      </div>
      <div style={{ borderBottom: '1px dashed #000', paddingBottom: 8, marginBottom: 8 }}>
        <p style={{ margin: '2px 0' }}><strong>Pedido #:</strong> {pedido.id}</p>
        <p style={{ margin: '2px 0' }}><strong>Fecha:</strong> {new Date(pedido.creado_en).toLocaleString('es-HN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        <p style={{ margin: '2px 0' }}><strong>Estado:</strong> {ESTADO_STYLE[pedido.estado]?.label || pedido.estado}</p>
      </div>
      <div style={{ borderBottom: '1px dashed #000', paddingBottom: 8, marginBottom: 8 }}>
        <p style={{ margin: '2px 0' }}><strong>Cliente:</strong> {usuario?.nombre} {usuario?.apellido}</p>
        {usuario?.correo && <p style={{ margin: '2px 0', fontSize: 11 }}>{usuario.correo}</p>}
      </div>
      {(pedido.envio_direccion || pedido.envio_ciudad) && (
        <div style={{ borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
          <p style={{ margin: '2px 0' }}><strong>Dirección de envío:</strong></p>
          {pedido.envio_direccion && <p style={{ margin: '2px 0', fontSize: 12 }}>{pedido.envio_direccion}</p>}
          {(pedido.envio_ciudad || pedido.envio_codigo_postal) && (
            <p style={{ margin: '2px 0', fontSize: 12 }}>{[pedido.envio_ciudad, pedido.envio_codigo_postal].filter(Boolean).join(', ')}</p>
          )}
        </div>
      )}
      <div style={{ borderBottom: '1px dashed #000', paddingBottom: 8, marginBottom: 8 }}>
        <p style={{ fontWeight: 'bold', marginBottom: 6 }}>PRODUCTOS</p>
        {pedido.items?.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12 }}>{item.nombre_producto}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#555' }}>{item.nombre_variante} x{item.cantidad}</p>
            </div>
            <p style={{ margin: 0, fontWeight: 'bold' }}>{formatLempira(item.precio_unitario * item.cantidad)}</p>
          </div>
        ))}
      </div>
      <div style={{ borderBottom: '2px solid #000', paddingBottom: 8, marginBottom: 8 }}>
        {pedido.cupon && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Subtotal</span>
            <span>{formatLempira(pedido.monto_total + pedido.cupon.descuento)}</span>
          </div>
        )}
        {pedido.cupon && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#16a34a' }}>
            <span>Cupón ({pedido.cupon.codigo})</span>
            <span>-{formatLempira(pedido.cupon.descuento)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 16 }}>
          <span>TOTAL</span><span>{formatLempira(pedido.monto_total)}</span>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 10 }}>
        <p style={{ margin: '2px 0' }}>¡Gracias por tu compra!</p>
        <p style={{ margin: '2px 0', fontSize: 11 }}>Pedido #{pedido.id}</p>
      </div>
    </div>
  );
}

export default function PedidoDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { usuario } = useAuth();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFactura, setShowFactura] = useState(false);
  const isNuevo = searchParams.get('nuevo') === 'true';

  useEffect(() => {
    async function fetchPedido() {
      try {
        const token = sessionStorage.getItem('token');
        const res = await fetch(`/api/pedidos?id=${params.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data: ApiResponse<Pedido> = await res.json();
        if (data.success && data.data) setPedido(data.data);
      } catch { /* ignore */ }
      finally { setIsLoading(false); }
    }
    fetchPedido();
  }, [params.id]);

  const handlePrint = () => {
    const contenido = document.getElementById('factura-cliente');
    if (!contenido) return;
    const w = window.open('', '_blank', 'width=440,height=700');
    if (!w) return;
    w.document.write(`<html><head><title>Factura #${pedido?.id}</title>
      <style>
        body{margin:0;padding:20px;font-family:monospace;font-size:13px}
        @media print{body{margin:0}@page{size:A4;margin:20mm}}
      </style>
      </head><body>${contenido.innerHTML}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  const handleDescargarPDF = async () => {
    const contenido = document.getElementById('factura-cliente');
    if (!contenido) return;
    // Carga dinámica para evitar SSR issues
    const html2pdf = (await import('html2pdf.js')).default;
    html2pdf()
      .set({
        margin: 10,
        filename: `factura-techhn-${pedido?.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' },
      })
      .from(contenido)
      .save();
  };

  if (!usuario) return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Inicia sesión para ver tu pedido</h1>
          <Link href="/auth/login" className="btn-primary mt-6 inline-flex px-8 py-3">Iniciar sesión</Link>
        </div>
      </main>
      <Footer />
    </div>
  );

  if (isLoading) return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded-xl" style={{ backgroundColor: 'var(--border)' }} />
            <div className="h-64 rounded-2xl" style={{ backgroundColor: 'var(--border)' }} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );

  if (!pedido) return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Pedido no encontrado</h1>
          <Link href="/pedidos" className="btn-primary mt-6 inline-flex px-8 py-3">Ver mis pedidos</Link>
        </div>
      </main>
      <Footer />
    </div>
  );

  const estado = ESTADO_STYLE[pedido.estado] || { color: 'var(--text-muted)', bg: 'var(--bg-secondary)', label: pedido.estado };

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <Header />
      <main className="flex-1">

        {/* Banner éxito */}
        {isNuevo && (
          <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '2.5rem 1rem', textAlign: 'center' }}>
            <div className="mx-auto max-w-lg">
              <div className="flex h-16 w-16 items-center justify-center rounded-full mx-auto mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="white" className="h-8 w-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">¡Pedido realizado con éxito!</h2>
              <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Gracias por tu compra. Te enviaremos un correo con los detalles.
              </p>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            <Link href="/" className="hover:underline">Inicio</Link>
            <span>/</span>
            <Link href="/pedidos" className="hover:underline">Mis pedidos</Link>
            <span>/</span>
            <span style={{ color: 'var(--text)' }}>Detalle</span>
          </nav>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Detalle pedido */}
            <div className="lg:col-span-2 space-y-4">

              {/* Header pedido */}
              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Pedido</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                      {new Date(pedido.creado_en).toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold px-3 py-1.5 rounded-full"
                      style={{ backgroundColor: estado.bg, color: estado.color }}>
                      {estado.label}
                    </span>
                  </div>
                </div>

                {/* Progreso visual */}
                {pedido.estado !== 'cancelado' && (
                  <div className="mt-6">
                    {(() => {
                      const pasos = ['pendiente', 'pagado', 'enviado', 'entregado'];
                      const idx = pasos.indexOf(pedido.estado);
                      return (
                        <div className="flex items-center gap-0">
                          {pasos.map((p, i) => {
                            const done = i <= idx;
                            const s = ESTADO_STYLE[p];
                            return (
                              <div key={p} className="flex flex-1 items-center">
                                <div className="flex flex-col items-center">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white transition-all"
                                    style={{ backgroundColor: done ? '#10b981' : 'var(--border)' }}>
                                    {done ? '✓' : i + 1}
                                  </div>
                                  <span className="mt-1 text-xs font-medium" style={{ color: done ? '#10b981' : 'var(--text-muted)' }}>
                                    {s.label}
                                  </span>
                                </div>
                                {i < pasos.length - 1 && (
                                  <div className="flex-1 h-0.5 mx-1 mb-4 transition-all"
                                    style={{ backgroundColor: i < idx ? '#10b981' : 'var(--border)' }} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Productos */}
              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Productos</h2>
                <div className="space-y-3">
                  {pedido.items?.map((item) => (
                    <div key={item.id} className="flex gap-4 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                        {item.imagen_url
                          ? <img src={item.imagen_url} alt={item.nombre_producto || ''} className="h-full w-full object-contain p-1" />
                          : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-6 w-6" style={{ color: 'var(--border)' }}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate" style={{ color: 'var(--text)' }}>{item.nombre_producto}</p>
                        {item.nombre_variante && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.nombre_variante}</p>}
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.cantidad} × {formatLempira(item.precio_unitario)}</p>
                      </div>
                      <p className="font-bold shrink-0" style={{ color: 'var(--text)' }}>{formatLempira(item.cantidad * item.precio_unitario)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Factura expandible */}
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <button onClick={() => setShowFactura(v => !v)}
                  className="flex w-full items-center justify-between px-6 py-4 text-sm font-semibold transition-colors"
                  style={{ color: 'var(--text)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    Ver factura
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                    className="h-4 w-4 transition-transform" style={{ transform: showFactura ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {showFactura && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="p-4 flex justify-end gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
                      <button onClick={handleDescargarPDF}
                        className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all"
                        style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Descargar PDF
                      </button>
                      <button onClick={handlePrint}
                        className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all"
                        style={{ backgroundColor: 'var(--blue-light)', color: 'var(--blue)', border: '1px solid var(--blue-muted)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                        </svg>
                        Imprimir
                      </button>
                    </div>
                    <div className="p-6 flex justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <div className="rounded-xl overflow-hidden shadow-lg" style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}>
                        <Factura pedido={pedido} usuario={usuario} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Resumen */}
              <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Resumen</h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                    <span style={{ color: 'var(--text)' }}>
                      {formatLempira(pedido.cupon ? pedido.monto_total + pedido.cupon.descuento : pedido.monto_total)}
                    </span>
                  </div>
                  {pedido.cupon && (
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--success)' }}>
                        Cupón ({pedido.cupon.codigo})
                      </span>
                      <span style={{ color: 'var(--success)' }}>-{formatLempira(pedido.cupon.descuento)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 font-bold text-lg" style={{ borderTop: '1px solid var(--border)', color: 'var(--text)' }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--blue)' }}>{formatLempira(pedido.monto_total)}</span>
                  </div>
                </div>
              </div>

              {/* Ayuda */}
              <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>¿Necesitas ayuda?</h2>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Contacta a nuestro equipo de soporte para cualquier pregunta.</p>
                <a href="mailto:soporte@techhn.hn" className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--blue)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                  soporte@techhn.hn
                </a>
              </div>

              <Link href="/pedidos" className="block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all"
                style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-secondary)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--card)')}>
                Ver todos mis pedidos
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
