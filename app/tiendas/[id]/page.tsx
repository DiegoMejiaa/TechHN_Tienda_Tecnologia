'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import type { Tienda, ApiResponse } from '@/types';

export default function TiendaDetailPage() {
  const params = useParams();
  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tiendas?id=${params.id}`)
      .then(r => r.json())
      .then((data: ApiResponse<Tienda>) => {
        if (data.success && data.data) setTienda(data.data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [params.id]);


  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-32 rounded bg-muted" />
              <div className="h-48 rounded-2xl bg-muted" />
              <div className="h-64 rounded-2xl bg-muted" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!tienda) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold">Tienda no encontrada</h1>
            <p className="mt-2 text-muted-foreground">La tienda que buscas no existe.</p>
            <Link href="/tiendas" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
              Ver tiendas
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const mapQuery = encodeURIComponent(`${tienda.nombre}, ${tienda.ciudad ?? ''}, Honduras`);
  const mapSrc = `https://maps.google.com/maps?q=${mapQuery}&output=embed`;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>

        <div style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <nav className="mb-4 flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              <Link href="/" className="hover:underline">Inicio</Link>
              <span>/</span>
              <Link href="/tiendas" className="hover:underline">Tiendas</Link>
              <span>/</span>
              <span style={{ color: 'var(--text)' }}>{tienda.nombre}</span>
            </nav>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: 'var(--blue-light)', border: '1px solid var(--blue-muted)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{tienda.nombre}</h1>
                {tienda.ciudad && (
                  <p className="mt-0.5 flex items-center gap-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                    {tienda.ciudad}, Honduras
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">

            <div className="rounded-2xl p-6 space-y-4"
              style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
              <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>Información de contacto</h2>
              <div className="space-y-3">

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--blue-light)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Horario</p>
                    <p className="text-sm" style={{ color: 'var(--text)' }}>Lun – Sab: 8:00 AM – 6:00 PM</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--blue-light)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Teléfono</p>
                    <p className="text-sm" style={{ color: 'var(--text)' }}>{tienda.telefono ?? 'No disponible'}</p>
                  </div>
                </div>

                {tienda.direccion && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--blue-light)' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--blue)" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Dirección</p>
                      <p className="text-sm" style={{ color: 'var(--text)' }}>{tienda.direccion}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Link href="/productos" className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--blue)' }}>
                  Ver productos disponibles
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--border)' }}>
              <iframe
                title={`Mapa ${tienda.nombre}`}
                src={mapSrc}
                width="100%"
                height="360"
                style={{ border: 0, display: 'block' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
