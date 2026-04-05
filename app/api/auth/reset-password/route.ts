import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const { correo, codigo, nueva_contrasena } = await request.json();
    console.log('[reset-password] correo:', correo, '| codigo:', codigo, '| pass length:', nueva_contrasena?.length);
    if (!correo || !codigo || !nueva_contrasena) return errorResponse('Datos incompletos', 400);
    if (nueva_contrasena.length < 6) return errorResponse('La contraseña debe tener al menos 6 caracteres', 400);

    const pool = await getConnection();

    // Buscar usuario
    const userRes = await pool.request()
      .input('correo', sql.NVarChar, correo)
      .query('SELECT id FROM usuarios WHERE correo = @correo');
    console.log('[reset-password] usuario encontrado:', userRes.recordset.length > 0);
    if (userRes.recordset.length === 0) return errorResponse('Correo no encontrado', 404);

    const id_usuario = userRes.recordset[0].id;

    // Verificar código
    const codeRes = await pool.request()
      .input('id_usuario', sql.BigInt, id_usuario)
      .input('codigo', sql.NVarChar, codigo)
      .query(`
        SELECT codigo, usado FROM reset_codigos
        WHERE id_usuario = @id_usuario AND codigo = @codigo AND usado = 0
          AND expira > GETUTCDATE()
      `);
    console.log('[reset-password] codigo válido:', codeRes.recordset.length > 0);

    const { usado } = codeRes.recordset[0];
    if (usado) return errorResponse('El código ya fue usado', 400);

    // Actualizar contraseña
    const hash = await bcrypt.hash(nueva_contrasena, 10);
    await pool.request()
      .input('id', sql.BigInt, id_usuario)
      .input('hash', sql.NVarChar, hash)
      .query('UPDATE usuarios SET hash_contrasena = @hash WHERE id = @id');

    // Marcar código como usado
    await pool.request()
      .input('id_usuario', sql.BigInt, id_usuario)
      .query('UPDATE reset_codigos SET usado = 1 WHERE id_usuario = @id_usuario');

    return successResponse({ message: 'Contraseña actualizada' });
  } catch (e) {
    console.error(e);
    return errorResponse('Error al restablecer la contraseña');
  }
}
