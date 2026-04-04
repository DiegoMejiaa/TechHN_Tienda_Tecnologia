'use client';
// Redirige /cajero/ventas → /cajero (la venta está en la página principal)
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function VentasRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/cajero'); }, []);
  return null;
}
