import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAdmin, requireStaff } from '@/lib/auth';
import { successResponse, errorResponse, createdResponse, authError } from '@/lib/api-response';

// GET /api/turnos?id=1 | ?id_tienda=1
export async function GET(request: NextRequest) {
  try {
    requireStaff(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const id_tienda = searchParams.get('id_tienda');
    const id_usuario = searchParams.get('id_usuario');
    const pool = await getConnection();
    if (id) {
      const result = await pool.request().input('id', sql.BigInt, id)
        .query('SELECT t.*, ti.nombre as nombre_tienda, u.nombre as nombre_cajero FROM turnos t JOIN tiendas ti ON t.id_tienda = ti.id JOIN usuarios u ON t.id_usuario = u.id WHERE t.id = @id');
      if (result.recordset.length === 0) return errorResponse('Turno no encontrado', 404);
      return successResponse(result.recordset[0]);
    }
    if (id_usuario) {
      const result = await pool.request().input('id_usuario', sql.BigInt, id_usuario)
        .query('SELECT t.*, ti.nombre as nombre_tienda, u.nombre as nombre_cajero FROM turnos t JOIN tiendas ti ON t.id_tienda = ti.id JOIN usuarios u ON t.id_usuario = u.id WHERE t.id_usuario = @id_usuario ORDER BY t.hora_inicio DESC');
      return successResponse(result.recordset);
    }
    if (id_tienda) {
      const result = await pool.request().input('id_tienda', sql.BigInt, id_tienda)
        .query('SELECT t.*, ti.nombre as nombre_tienda, u.nombre as nombre_cajero FROM turnos t JOIN tiendas ti ON t.id_tienda = ti.id JOIN usuarios u ON t.id_usuario = u.id WHERE t.id_tienda = @id_tienda ORDER BY t.hora_inicio DESC');
      return successResponse(result.recordset);
    }
    const result = await pool.request()
      .query('SELECT t.*, ti.nombre as nombre_tienda, u.nombre as nombre_cajero FROM turnos t JOIN tiendas ti ON t.id_tienda = ti.id JOIN usuarios u ON t.id_usuario = u.id ORDER BY t.hora_inicio DESC');
    return successResponse(result.recordset);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al obtener los turnos'); }
}

// POST /api/turnos — body: { id_tienda, id_usuario, efectivo_inicial? }
export async function POST(request: NextRequest) {
  try {
    requireStaff(request);
    const { id_tienda, id_usuario, efectivo_inicial } = await request.json();
    if (!id_tienda || !id_usuario) return errorResponse('id_tienda e id_usuario son requeridos', 400);
    const pool = await getConnection();
    const result = await pool.request()
      .input('id_tienda', sql.BigInt, id_tienda)
      .input('id_usuario', sql.BigInt, id_usuario)
      .input('efectivo_inicial', sql.Decimal(10, 2), efectivo_inicial ?? 0)
      .query('INSERT INTO turnos (id_tienda, id_usuario, hora_inicio, efectivo_inicial) OUTPUT INSERTED.* VALUES (@id_tienda, @id_usuario, SYSDATETIME(), @efectivo_inicial)');
    return createdResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al abrir el turno'); }
}

// PUT /api/turnos — body: { id, hora_fin?, efectivo_final? }
export async function PUT(request: NextRequest) {
  try {
    requireStaff(request);
    const body = await request.json();
    const { id } = body;
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();
    const req = pool.request().input('id', sql.BigInt, id);
    const sets: string[] = [];
    if (body.hora_fin !== undefined)      { req.input('hora_fin', sql.DateTime2, body.hora_fin ?? null);           sets.push('hora_fin = @hora_fin'); }
    if (body.efectivo_final !== undefined) { req.input('efectivo_final', sql.Decimal(10, 2), body.efectivo_final); sets.push('efectivo_final = @efectivo_final'); }
    // cerrar turno automáticamente si no se pasa hora_fin
    if (body.cerrar && !body.hora_fin) { sets.push('hora_fin = SYSDATETIME()'); }
    if (sets.length === 0) return errorResponse('Nada que actualizar', 400);
    const result = await req.query(`UPDATE turnos SET ${sets.join(', ')} OUTPUT INSERTED.* WHERE id = @id`);
    if (result.recordset.length === 0) return errorResponse('Turno no encontrado', 404);
    return successResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al actualizar el turno'); }
}
