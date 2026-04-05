import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const { correo, contrasena } = await request.json();
    if (!correo || !contrasena) return errorResponse('correo y contrasena son requeridos', 400);

    const pool = await getConnection();
    const result = await pool
      .request()
      .input('correo', sql.NVarChar, correo)
      .query('SELECT u.*, r.nombre as rol_nombre FROM usuarios u JOIN roles r ON u.id_rol = r.id WHERE u.correo = @correo');

    if (result.recordset.length === 0) return errorResponse('Credenciales inválidas', 401);

    const usuario = result.recordset[0];
    if (usuario.activo === false || usuario.activo === 0) return errorResponse('Usuario inactivo. Contacta al administrador.', 403);

    const valid = await bcrypt.compare(contrasena, usuario.hash_contrasena);
    if (!valid) return errorResponse('Credenciales inválidas', 401);

    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo, id_rol: usuario.id_rol, rol: usuario.rol_nombre, id_tienda: usuario.id_tienda ?? null },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { hash_contrasena, ...usuarioSinHash } = usuario;
    return successResponse({ usuario: usuarioSinHash, token });
  } catch (error) {
    console.error('Error login:', error);
    return errorResponse('Error en el inicio de sesión');
  }
}
