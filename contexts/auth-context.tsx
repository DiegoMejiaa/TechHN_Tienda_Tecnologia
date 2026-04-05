'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Usuario, ApiResponse } from '@/types';

const ROL_ADMIN          = 1;
const ROL_CAJERO         = 2;
const ROL_CLIENTE        = 3;
const ROL_ADMIN_SUCURSAL = 4;

function redirectByRole(id_rol: number | string): string {
  const rol = Number(id_rol);
  if (rol === ROL_ADMIN)          return '/admin';
  if (rol === ROL_ADMIN_SUCURSAL) return '/admin';
  if (rol === ROL_CAJERO)         return '/cajero';
  return '/';
}

interface AuthContextType {
  usuario: Usuario | null;
  isLoading: boolean;
  isAdmin:          boolean;
  isSuperAdmin:     boolean;
  isAdminSucursal:  boolean;
  isCajero:         boolean;
  isCliente:        boolean;
  login: (data: { correo: string; contrasena: string }) => Promise<{ success: boolean; redirect?: string; error?: string }>;
  register: (data: { correo: string; contrasena: string; nombre: string; apellido: string; telefono?: string }) => Promise<{ success: boolean; redirect?: string; error?: string }>;
  logout: () => void;
  isLoggingOut: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('usuario');
    const token  = sessionStorage.getItem('token');
    if (stored && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          const u = JSON.parse(stored);
          setUsuario(u);
          // Refrescar datos del usuario desde DB para tener id_tienda actualizado
          fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => {
              if (data.success && data.data) {
                const fresh = { ...u, ...data.data };
                sessionStorage.setItem('usuario', JSON.stringify(fresh));
                setUsuario(fresh);
              }
            })
            .catch(() => {})
            .finally(() => setIsLoading(false));
          return; // setIsLoading se llama en el finally
        } else {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('usuario');
        }
      } catch {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('usuario');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (data: { correo: string; contrasena: string }) => {
    try {
      const res  = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const json: ApiResponse<{ usuario: Usuario; token: string }> = await res.json();
      if (json.success && json.data) {
        sessionStorage.setItem('token',   json.data.token);
        sessionStorage.setItem('usuario', JSON.stringify(json.data.usuario));
        setUsuario(json.data.usuario);
        return { success: true, redirect: redirectByRole(json.data.usuario.id_rol) };
      }
      return { success: false, error: json.message || 'Credenciales inválidas' };
    } catch {
      return { success: false, error: 'Error de conexión' };
    }
  };

  const register = async (data: { correo: string; contrasena: string; nombre: string; apellido: string; telefono?: string }) => {
    try {
      const res  = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const json: ApiResponse<{ usuario: Usuario; token: string }> = await res.json();
      if (json.success && json.data) {
        sessionStorage.setItem('token',   json.data.token);
        sessionStorage.setItem('usuario', JSON.stringify(json.data.usuario));
        setUsuario(json.data.usuario);
        return { success: true, redirect: redirectByRole(json.data.usuario.id_rol) };
      }
      return { success: false, error: json.message || 'Error al registrarse' };
    } catch {
      return { success: false, error: 'Error de conexión' };
    }
  };

  const logout = () => {
    setIsLoggingOut(true);
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('usuario');
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{
      usuario,
      isLoading,
      isAdmin:         Number(usuario?.id_rol) === ROL_ADMIN || Number(usuario?.id_rol) === ROL_ADMIN_SUCURSAL,
      isSuperAdmin:    Number(usuario?.id_rol) === ROL_ADMIN,
      isAdminSucursal: Number(usuario?.id_rol) === ROL_ADMIN_SUCURSAL,
      isCajero:        Number(usuario?.id_rol) === ROL_CAJERO,
      isCliente:       Number(usuario?.id_rol) === ROL_CLIENTE || (!usuario),
      login,
      register,
      logout,
      isLoggingOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
