'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { useCart } from '@/contexts/cart-context';
import { useAuth } from '@/contexts/auth-context';
import { formatLempira } from '@/lib/format';

export default function CarritoPage() {
  const { usuario } = useAuth();
  const { carrito, isLoading, updateQuantity, removeItem } = useCart();
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());

  const handleUpdateQuantity = async (id_item: number, cantidad: number) => {
    setUpdatingItems(prev => new Set(prev).add(id_item));
    await updateQuantity(id_item, cantidad);
    setUpdatingItems(prev => { const n = new Set(prev); n.delete(id_item); return n; });
  };

  const handleRemove = async (id_item: number) => {
    setUpdatingItems(prev => new Set(prev).add(id_item));
    await removeItem(id_item);
    setUpdatingItems(prev => { const n = new Set(prev); n.delete(id_item); return n; });
  };

  if (!usuario) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl mx-auto mb-6"
              style={{ backgroundColor: 'var(--blue-light)', border: '1px solid var(--blue-muted)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-10 w-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Inicia sesión para ver tu carrito</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Necesitas una cuenta para agregar productos al carrito</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/auth/login" className="btn-primary px-8 py-3">Iniciar sesión</Link>
              <Link href="/auth/registro" className="btn-secondary px-8 py-3">Crear cuenta</Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="h-8 w-40 rounded-xl animate-pulse mb-8" style={{ backgroundColor: 'var(--card)' }} />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                {[1,2].map(i => (
                  <div key={i} className="animate-pulse rounded-2xl p-5 flex gap-4"
                    style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                    <div className="h-24 w-24 rounded-xl shrink-0" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 w-1/2 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                      <div className="h-3 w-1/3 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                      <div className="h-8 w-28 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="animate-pulse rounded-2xl p-6 h-64"
                style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const items = carrito?.items || [];
  const total = carrito?.total || 0;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: 'var(--blue-light)', border: '1px solid var(--blue-muted)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Tu carrito</h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {items.length === 0 ? 'Vacío' : `${items.reduce((s, i) => s + i.cantidad, 0)} producto${items.reduce((s, i) => s + i.cantidad, 0) !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {items.length === 0 ? (
            <div className="rounded-2xl p-16 text-center"
              style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl mx-auto mb-4"
                style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-8 w-8" style={{ color: 'var(--text-muted)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Tu carrito está vacío</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Agrega productos para comenzar a comprar</p>
              <Link href="/productos" className="btn-primary mt-6 inline-flex px-8 py-3">Ver productos</Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Items */}
              <div className="lg:col-span-2 space-y-3">
                {items.map(item => {
                  const precioUnitario = item.precio_oferta ?? item.precio ?? 0;
                  const isUpdating = updatingItems.has(item.id);
                  return (
                    <div key={item.id}
                      className="group rounded-2xl overflow-hidden transition-all duration-200"
                      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', opacity: isUpdating ? 0.6 : 1 }}>
                      <div className="h-0.5 w-full" style={{ backgroundColor: 'var(--blue)' }} />
                      <div className="flex gap-4 p-4">
                        {/* Imagen */}
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl overflow-hidden"
                          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                          {item.imagen_url
                            ? <img src={item.imagen_url} alt={item.nombre_producto || ''} className="h-full w-full object-contain p-2" />
                            : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-8 w-8" style={{ color: 'var(--border)' }}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                          }
                        </div>

                        <div className="flex flex-1 flex-col min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-semibold truncate" style={{ color: 'var(--text)' }}>{item.nombre_producto}</h3>
                              {item.nombre_variante && (
                                <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>{item.nombre_variante}</p>
                              )}
                              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>SKU: {item.sku}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold" style={{ color: 'var(--blue)' }}>{formatLempira(precioUnitario * item.cantidad)}</p>
                              {item.precio_oferta && (
                                <p className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>{formatLempira((item.precio ?? 0) * item.cantidad)}</p>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                              <button onClick={() => handleUpdateQuantity(item.id, item.cantidad - 1)}
                                disabled={item.cantidad <= 1 || isUpdating}
                                className="flex h-7 w-7 items-center justify-center rounded-md transition-all hover:bg-card disabled:opacity-40 cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
                              </button>
                              <span className="w-8 text-center text-sm font-semibold" style={{ color: 'var(--text)' }}>{item.cantidad}</span>
                              <button onClick={() => handleUpdateQuantity(item.id, item.cantidad + 1)}
                                disabled={isUpdating}
                                className="flex h-7 w-7 items-center justify-center rounded-md transition-all hover:bg-card disabled:opacity-40 cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                              </button>
                            </div>
                            <button onClick={() => handleRemove(item.id)} disabled={isUpdating}
                              className="flex items-center gap-1 text-xs font-medium transition-all disabled:opacity-50"
                              style={{ color: 'var(--danger)' }}>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resumen */}
              <div>
                <div className="sticky top-24 rounded-2xl overflow-hidden"
                  style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="h-0.5 w-full" style={{ backgroundColor: 'var(--blue)' }} />
                  <div className="p-6 space-y-4">
                    <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>Resumen del pedido</h2>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                        <span style={{ color: 'var(--text)' }}>{formatLempira(total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>Envío</span>
                        <span style={{ color: 'var(--text-muted)' }}>Calculado al checkout</span>
                      </div>
                    </div>

                    <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                      style={{ backgroundColor: 'var(--blue-light)', border: '1px solid var(--blue-muted)' }}>
                      <span className="font-semibold" style={{ color: 'var(--blue)' }}>Total</span>
                      <span className="text-xl font-bold" style={{ color: 'var(--blue)' }}>{formatLempira(total)}</span>
                    </div>

                    <Link href="/checkout" className="btn-primary block w-full py-3 text-center">
                      Proceder al checkout
                    </Link>
                    <Link href="/productos"
                      className="block w-full text-center text-sm transition-all"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                      Continuar comprando
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
