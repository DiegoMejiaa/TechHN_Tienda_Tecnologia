import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { successResponse, errorResponse, createdResponse, authError } from '@/lib/api-response';

// GET /api/especificaciones?id_variante=1 | ?id=1
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const id_variante = searchParams.get('id_variante');
    const pool = await getConnection();
    if (id) {
      const result = await pool.request().input('id', sql.BigInt, id).query('SELECT * FROM especificaciones_variante WHERE id = @id');
      if (result.recordset.length === 0) return errorResponse('Especificación no encontrada', 404);
      return successResponse(result.recordset[0]);
    }
    if (id_variante) {
      const result = await pool.request().input('id_variante', sql.BigInt, id_variante)
        .query('SELECT * FROM especificaciones_variante WHERE id_variante = @id_variante ORDER BY clave');
      return successResponse(result.recordset);
    }
    const result = await pool.request().query('SELECT * FROM especificaciones_variante ORDER BY id_variante, clave');
    return successResponse(result.recordset);
  } catch (error) { console.error(error); return errorResponse('Error al obtener las especificaciones'); }
}

// POST /api/especificaciones — body: { id_variante, clave, valor }
export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);
    const { id_variante, clave, valor } = await request.json();
    if (!id_variante || !clave || !valor) return errorResponse('id_variante, clave y valor son requeridos', 400);
    const pool = await getConnection();
    const result = await pool.request()
      .input('id_variante', sql.BigInt, id_variante)
      .input('clave', sql.NVarChar, clave)
      .input('valor', sql.NVarChar, valor)
      .query('INSERT INTO especificaciones_variante (id_variante, clave, valor) OUTPUT INSERTED.* VALUES (@id_variante, @clave, @valor)');
    return createdResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al crear la especificación'); }
}

// PUT /api/especificaciones — body: { id, clave?, valor? }
export async function PUT(request: NextRequest) {
  try {
    requireAdmin(request);
    const body = await request.json();
    const { id } = body;
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();
    const req = pool.request().input('id', sql.BigInt, id);
    const sets: string[] = [];
    if (body.clave !== undefined) { req.input('clave', sql.NVarChar, body.clave); sets.push('clave = @clave'); }
    if (body.valor !== undefined) { req.input('valor', sql.NVarChar, body.valor); sets.push('valor = @valor'); }
    if (sets.length === 0) return errorResponse('Nada que actualizar', 400);
    const result = await req.query(`UPDATE especificaciones_variante SET ${sets.join(', ')} OUTPUT INSERTED.* WHERE id = @id`);
    if (result.recordset.length === 0) return errorResponse('Especificación no encontrada', 404);
    return successResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al actualizar la especificación'); }
}

// DELETE /api/especificaciones?id=1
export async function DELETE(request: NextRequest) {
  try {
    requireAdmin(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();
    const result = await pool.request().input('id', sql.BigInt, id).query('DELETE FROM especificaciones_variante OUTPUT DELETED.id WHERE id = @id');
    if (result.recordset.length === 0) return errorResponse('Especificación no encontrada', 404);
    return successResponse({ message: 'Especificación eliminada' });
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al eliminar la especificación'); }
}
