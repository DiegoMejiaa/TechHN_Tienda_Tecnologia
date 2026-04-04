'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { useCart } from '@/contexts/cart-context';
import { useAuth } from '@/contexts/auth-context';
import type { Producto, VarianteProducto, ApiResponse } from '@/types';
import { formatLempira } from '@/lib/format';

export default function ProductoDetailPage() {
  const params = useParams();
  const { usuario } = useAuth();
  const { addToCart } = useCart();
  
  const [producto, setProducto] = useState<Producto | null>(null);
  const [variantes, setVariantes] = useState<VarianteProducto[]>([]);
  const [selectedVariante, setSelectedVariante] = useState<VarianteProducto | null>(null);
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function fetchProducto() {
      try {
        const [prodRes, varRes] = await Promise.all([
          fetch(`/api/productos?id=${params.id}`),
          fetch(`/api/variantes?id_producto=${params.id}`),
        ]);
        const prodData: ApiResponse<Producto> = await prodRes.json();
        const varData: ApiResponse<VarianteProducto[]> = await varRes.json();
        if (prodData.success && prodData.data) {
          setProducto(prodData.data);
          if (prodData.data.imagen_url) setImagenUrl(prodData.data.imagen_url);
        }
        if (varData.success && varData.data) {
          setVariantes(varData.data);
          if (varData.data.length > 0) {
            const first = varData.data[0];
            setSelectedVariante(first);
            if (first.imagen_url) setImagenUrl(first.imagen_url);
          }
        }
      } catch (error) {
        console.error('Error fetching producto:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducto();
  }, [params.id]);

  const handleSelectVariante = (variante: VarianteProducto) => {
    setSelectedVariante(variante);
    if (variante.imagen_url) setImagenUrl(variante.imagen_url);
    else if (producto?.imagen_url) setImagenUrl(producto.imagen_url);
    setCantidad(1);
  };

  const handleAddToCart = async () => {    if (!selectedVariante) return;
    
    if (!usuario) {
      setMessage({ type: 'error', text: 'Debes iniciar sesion para agregar al carrito' });
      return;
    }

    setAddingToCart(true);
    const result = await addToCart(selectedVariante.id, cantidad);
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Producto agregado al carrito' });
      setCantidad(1);
    } else {
      setMessage({ type: 'error', text: result.error || 'Error al agregar al carrito' });
    }
    setAddingToCart(false);

    setTimeout(() => setMessage(null), 3000);
  };

  const precioActual = selectedVariante?.precio_oferta ?? selectedVariante?.precio;
  const precioOriginal = selectedVariante?.precio_oferta ? selectedVariante.precio : null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-6 w-32 rounded bg-muted" />
              <div className="mt-8 grid gap-8 lg:grid-cols-2">
                <div className="aspect-square rounded-lg bg-muted" />
                <div className="space-y-4">
                  <div className="h-8 w-3/4 rounded bg-muted" />
                  <div className="h-4 w-1/4 rounded bg-muted" />
                  <div className="h-20 rounded bg-muted" />
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold">Producto no encontrado</h1>
            <p className="mt-2 text-muted-foreground">El producto que buscas no existe o fue eliminado.</p>
            <Link href="/productos" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
              Ver productos
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Inicio</Link>
            <span>/</span>
            <Link href="/productos" className="hover:text-foreground">Productos</Link>
            <span>/</span>
            <span className="text-foreground">{producto.nombre}</span>
          </nav>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            {/* Image */}
            <div>
              <div className="aspect-square overflow-hidden rounded-lg bg-secondary">
                <div className="flex h-full items-center justify-center bg-muted">
                  {imagenUrl ? (
                    <img
                      src={imagenUrl}
                      alt={producto.nombre}
                      className="h-full w-full object-contain p-6"
                    />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={0.5} stroke="currentColor" className="h-32 w-32 text-muted-foreground/30">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Thumbnails */}
              {variantes.some(v => v.imagen_url) && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {variantes.filter(v => v.imagen_url).map((variante) => (
                    <button
                      key={variante.id}
                      onClick={() => handleSelectVariante(variante)}
                      title={variante.nombre_variante || variante.sku}
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                        selectedVariante?.id === variante.id
                          ? 'border-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <img
                        src={variante.imagen_url!}
                        alt={variante.nombre_variante || variante.sku}
                        className="h-full w-full object-contain p-1 bg-white"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div>
              {producto.nombre_marca && (
                <p className="text-sm font-medium uppercase tracking-wider text-accent">
                  {producto.nombre_marca}
                </p>
              )}
              <h1 className="mt-2 font-serif text-3xl font-bold">{producto.nombre}</h1>
              
              {producto.nombre_categoria && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Categoria: {producto.nombre_categoria}
                </p>
              )}

              {selectedVariante && (
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="text-3xl font-bold">{formatLempira(precioActual ?? 0)}</span>
                  {precioOriginal && (
                    <span className="text-xl text-muted-foreground line-through">
                      {formatLempira(precioOriginal)}
                    </span>
                  )}
                </div>
              )}

              {producto.descripcion && (
                <p className="mt-6 text-muted-foreground">{producto.descripcion}</p>
              )}

              {/* Variantes */}
              {variantes.length > 1 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium">Variante</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {variantes.map((variante) => (
                      <button
                        key={variante.id}
                        onClick={() => handleSelectVariante(variante)}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                          selectedVariante?.id === variante.id
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border hover:border-primary'
                        }`}
                      >
                        {variante.nombre_variante || variante.sku}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Cantidad */}
              <div className="mt-6">
                <h3 className="text-sm font-medium">Cantidad</h3>
                {selectedVariante && (selectedVariante.stock_total ?? 0) > 0 ? (
                  <div className="mt-2 flex items-center gap-3">
                    <button onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-all duration-150 hover:bg-secondary active:scale-90 cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                      </svg>
                    </button>
                    <span className="w-12 text-center text-lg font-medium">{cantidad}</span>
                    <button onClick={() => setCantidad(Math.min(selectedVariante.stock_total ?? 1, cantidad + 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-all duration-150 hover:bg-secondary active:scale-90 cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </button>
                    <span className="text-xs text-muted-foreground">{selectedVariante.stock_total} disponibles</span>
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-medium text-destructive">Sin stock disponible</p>
                )}
              </div>

              {/* Message */}
              {message && (
                <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${
                  message.type === 'success' 
                    ? 'bg-success/10 text-success' 
                    : 'bg-destructive/10 text-destructive'
                }`}>
                  {message.text}
                </div>
              )}

              {/* Add to Cart */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedVariante || addingToCart || (selectedVariante?.stock_total ?? 0) === 0}
                  className="btn-primary flex-1 py-3"
                >
                  {addingToCart ? 'Agregando...' : (selectedVariante?.stock_total ?? 0) === 0 ? 'Sin stock' : 'Agregar al carrito'}
                </button>
                <Link
                  href="/carrito"
                  className="btn-secondary py-3 text-center transition-all duration-150 active:scale-95 sm:px-8"
                >
                  Ver carrito
                </Link>
              </div>

              {/* Info */}
              <div className="mt-8 space-y-3 border-t border-border pt-6">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                  Envio a todo Honduras
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                  Compra segura y protegida
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
