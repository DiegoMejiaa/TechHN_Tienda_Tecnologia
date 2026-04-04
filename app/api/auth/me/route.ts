import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse, authError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const payload = requireAuth(request);
    const pool = await getConnection();

    // Verificar si id_tienda existe en la tabla
    const colCheck = await pool.request().query(
      `SELECT COUNT(*) as existe FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'id_tienda'`
    );
    const tiendaCol = colCheck.recordset[0]?.existe > 0 ? ', id_tienda' : '';

    const result = await pool.request()
      .input('id', sql.BigInt, payload.id)
      .query(`SELECT id, id_rol${tiendaCol}, correo, nombre, apellido, telefono, creado_en, actualizado_en FROM usuarios WHERE id = @id`);
    if (result.recordset.length === 0) return errorResponse('Usuario no encontrado', 404);
    return successResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error'); }
}
