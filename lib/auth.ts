import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export const ROL_ADMIN          = 1;
export const ROL_CAJERO         = 2;
export const ROL_CLIENTE        = 3;
export const ROL_ADMIN_SUCURSAL = 4;

export interface TokenPayload {
  id: number;
  correo: string;
  id_rol: number;
  rol: string;
  id_tienda?: number | null;
}

export function getToken(req: NextRequest): TokenPayload | null {
  const auth = req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/** Verifica que el token sea válido y tenga uno de los roles permitidos.
 *  Si no, lanza un Error con el mensaje apropiado. */
export function requireRole(req: NextRequest, ...roles: number[]): TokenPayload {
  const payload = getToken(req);
  if (!payload) throw new Error('No autorizado');
  if (roles.length && !roles.includes(Number(payload.id_rol))) throw new Error('Acceso denegado');
  return payload;
}

/** Solo admin o admin_sucursal */
export const requireAdmin   = (req: NextRequest) => requireRole(req, ROL_ADMIN, ROL_ADMIN_SUCURSAL);
/** Admin, admin_sucursal o cajero */
export const requireStaff   = (req: NextRequest) => requireRole(req, ROL_ADMIN, ROL_ADMIN_SUCURSAL, ROL_CAJERO);
/** Solo super admin */
export const requireSuperAdmin = (req: NextRequest) => requireRole(req, ROL_ADMIN);
/** Cualquier usuario autenticado */
export const requireAuth    = (req: NextRequest) => requireRole(req);
