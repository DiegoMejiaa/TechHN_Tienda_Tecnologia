'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Carrito, ApiResponse } from '@/types';
import { useAuth } from './auth-context';

interface CartContextType {
  carrito: Carrito | null;
  isLoading: boolean;
  addToCart: (id_variante: number, cantidad: number) => Promise<{ success: boolean; error?: string }>;
  updateQuantity: (id_item: number, cantidad: number) => Promise<void>;
  removeItem: (id_item: number) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const [carrito, setCarrito] = useState<Carrito | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const refreshCart = useCallback(async () => {
    if (!usuario) { setCarrito(null); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/carrito?id_usuario=${usuario.id}`, {
        headers: { ...getAuthHeaders() },
      });
      const data: ApiResponse<Carrito> = await res.json();
      if (data.success && data.data) setCarrito(data.data);
    } catch { /* silencioso */ }
    finally { setIsLoading(false); }
  }, [usuario]);

  useEffect(() => { refreshCart(); }, [refreshCart]);

  const addToCart = async (id_variante: number, cantidad: number) => {
    if (!usuario) return { success: false, error: 'No autenticado' };
    try {
      const res = await fetch('/api/carrito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ id_usuario: usuario.id, id_variante, cantidad }),
      });
      const data: ApiResponse<unknown> = await res.json();
      if (data.success) { await refreshCart(); return { success: true }; }
      return { success: false, error: data.message };
    } catch {
      return { success: false, error: 'Error de conexión' };
    }
  };

  const updateQuantity = async (id_item: number, cantidad: number) => {
    try {
      await fetch('/api/carrito', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ id_item, cantidad }),
      });
      await refreshCart();
    } catch { /* silencioso */ }
  };

  const removeItem = async (id_item: number) => {
    try {
      await fetch(`/api/carrito?id_item=${id_item}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() },
      });
      await refreshCart();
    } catch { /* silencioso */ }
  };

  return (
    <CartContext.Provider value={{ carrito, isLoading, addToCart, updateQuantity, removeItem, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
}
