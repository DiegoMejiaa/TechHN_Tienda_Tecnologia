import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { successResponse, errorResponse, createdResponse, authError } from '@/lib/api-response';

// GET /api/metodos-envio?id=1
export async function GET(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    const pool = await getConnection();
    if (id) {
      const result = await pool.request().input('id', sql.BigInt, id).query('SELECT * FROM metodos_envio WHERE id = @id');
      if (result.recordset.length === 0) return errorResponse('Método de envío no encontrado', 404);
      return successResponse(result.recordset[0]);
    }
    const result = await pool.request().query('SELECT * FROM metodos_envio ORDER BY nombre');
    return successResponse(result.recordset);
  } catch (error) { console.error(error); return errorResponse('Error al obtener los métodos de envío'); }
}

// POST /api/metodos-envio — body: { nombre, descripcion?, costo, activo? }
export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);
    const { nombre, descripcion, costo, activo } = await request.json();
    if (!nombre || costo === undefined) return errorResponse('nombre y costo son requeridos', 400);
    const pool = await getConnection();
    const result = await pool.request()
      .input('nombre', sql.NVarChar, nombre)
      .input('descripcion', sql.NVarChar, descripcion ?? null)
      .input('costo', sql.Decimal(10, 2), costo)
      .input('activo', sql.Bit, activo !== undefined ? (activo ? 1 : 0) : 1)
      .query('INSERT INTO metodos_envio (nombre, descripcion, costo, activo) OUTPUT INSERTED.* VALUES (@nombre, @descripcion, @costo, @activo)');
    return createdResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al crear el método de envío'); }
}

// PUT /api/metodos-envio — body: { id, nombre?, descripcion?, costo?, activo? }
export async function PUT(request: NextRequest) {
  try {
    requireAdmin(request);
    const body = await request.json();
    const { id } = body;
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();
    const req = pool.request().input('id', sql.BigInt, id);
    const sets: string[] = [];
    if (body.nombre !== undefined)       { req.input('nombre', sql.NVarChar, body.nombre);                    sets.push('nombre = @nombre'); }
    if ('descripcion' in body)           { req.input('descripcion', sql.NVarChar, body.descripcion ?? null);  sets.push('descripcion = @descripcion'); }
    if (body.costo !== undefined)        { req.input('costo', sql.Decimal(10, 2), body.costo);                sets.push('costo = @costo'); }
    if (body.activo !== undefined)       { req.input('activo', sql.Bit, body.activo ? 1 : 0);                 sets.push('activo = @activo'); }
    if (sets.length === 0) return errorResponse('Nada que actualizar', 400);
    const result = await req.query(`UPDATE metodos_envio SET ${sets.join(', ')} OUTPUT INSERTED.* WHERE id = @id`);
    if (result.recordset.length === 0) return errorResponse('Método de envío no encontrado', 404);
    return successResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al actualizar el método de envío'); }
}

// DELETE /api/metodos-envio?id=1
export async function DELETE(request: NextRequest) {
  try {
    requireAdmin(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();
    const result = await pool.request().input('id', sql.BigInt, id).query('DELETE FROM metodos_envio OUTPUT DELETED.id WHERE id = @id');
    if (result.recordset.length === 0) return errorResponse('Método de envío no encontrado', 404);
    return successResponse({ message: 'Método de envío eliminado' });
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al eliminar el método de envío'); }
}
