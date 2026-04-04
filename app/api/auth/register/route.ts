import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { errorResponse, createdResponse } from '@/lib/api-response';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const { correo, contrasena, nombre, apellido, telefono, id_rol } = await request.json();

    if (!correo || !contrasena || !nombre || !apellido) return errorResponse('correo, contrasena, nombre y apellido son requeridos', 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return errorResponse('Formato de correo inválido', 400);
    if (contrasena.length < 6) return errorResponse('La contraseña debe tener al menos 6 caracteres', 400);

    const pool = await getConnection();

    const existing = await pool.request().input('correo', sql.NVarChar, correo).query('SELECT id FROM usuarios WHERE correo = @correo');
    if (existing.recordset.length > 0) return errorResponse('El correo ya está registrado', 409);

    const hash = await bcrypt.hash(contrasena, 10);
    const rolId = 3; // registro público siempre crea clientes

    const result = await pool
      .request()
      .input('id_rol', sql.BigInt, rolId)
      .input('correo', sql.NVarChar, correo)
      .input('hash_contrasena', sql.NVarChar, hash)
      .input('nombre', sql.NVarChar, nombre)
      .input('apellido', sql.NVarChar, apellido)
      .input('telefono', sql.NVarChar, telefono ?? null)
      .query('INSERT INTO usuarios (id_rol, correo, hash_contrasena, nombre, apellido, telefono) OUTPUT INSERTED.id, INSERTED.id_rol, INSERTED.correo, INSERTED.nombre, INSERTED.apellido, INSERTED.telefono, INSERTED.creado_en VALUES (@id_rol, @correo, @hash_contrasena, @nombre, @apellido, @telefono)');

    const nuevoUsuario = result.recordset[0];
    const rol = await pool.request().input('id_rol', sql.BigInt, rolId).query('SELECT nombre FROM roles WHERE id = @id_rol');
    const rolNombre = rol.recordset[0]?.nombre || 'cliente';

    const token = jwt.sign(
      { id: nuevoUsuario.id, correo: nuevoUsuario.correo, id_rol: rolId, rol: rolNombre },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return createdResponse({ usuario: { ...nuevoUsuario, rol_nombre: rolNombre }, token });
  } catch (error) {
    console.error('Error register:', error);
    return errorResponse('Error en el registro');
  }
}
