import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const { correo, codigo } = await request.json();
    if (!correo || !codigo) return errorResponse('Datos incompletos', 400);

    const pool = await getConnection();
    const userRes = await pool.request()
      .input('correo', sql.NVarChar, correo)
      .query('SELECT id FROM usuarios WHERE correo = @correo');
    if (userRes.recordset.length === 0) return errorResponse('Correo no encontrado', 404);

    const id_usuario = userRes.recordset[0].id;
    const codeRes = await pool.request()
      .input('id_usuario', sql.BigInt, id_usuario)
      .input('codigo', sql.NVarChar, codigo)
      .query(`
        SELECT 1 FROM reset_codigos
        WHERE id_usuario = @id_usuario AND codigo = @codigo AND usado = 0
          AND expira > GETUTCDATE()
      `);

    if (codeRes.recordset.length === 0) return errorResponse('Código incorrecto o expirado', 400);
    return successResponse({ message: 'Código válido' });
  } catch (e) {
    console.error(e);
    return errorResponse('Error al verificar el código');
  }
}
