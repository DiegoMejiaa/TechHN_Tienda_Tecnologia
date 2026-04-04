import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { successResponse, errorResponse, createdResponse, authError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    const pool = await getConnection();
    if (id) {
      const result = await pool.request().input('id', sql.BigInt, id).query('SELECT * FROM tiendas WHERE id = @id');
      if (result.recordset.length === 0) return errorResponse('Tienda no encontrada', 404);
      return successResponse(result.recordset[0]);
    }
    const result = await pool.request().query('SELECT * FROM tiendas ORDER BY nombre');
    return successResponse(result.recordset);
  } catch (error) { console.error(error); return errorResponse('Error al obtener las tiendas'); }
}

export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);
    const { nombre, ciudad, telefono, direccion } = await request.json();
    if (!nombre) return errorResponse('nombre es requerido', 400);
    const pool = await getConnection();
    const result = await pool.request()
      .input('nombre', sql.NVarChar, nombre)
      .input('ciudad', sql.NVarChar, ciudad ?? null)
      .input('telefono', sql.NVarChar, telefono ?? null)
      .input('direccion', sql.NVarChar, direccion ?? null)
      .query('INSERT INTO tiendas (nombre, ciudad, telefono, direccion) OUTPUT INSERTED.* VALUES (@nombre, @ciudad, @telefono, @direccion)');
    return createdResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al crear la tienda'); }
}

export async function PUT(request: NextRequest) {
  try {
    requireAdmin(request);
    const body = await request.json();
    const { id } = body;
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();
    const req = pool.request().input('id', sql.BigInt, id);
    const sets: string[] = [];
    if (body.nombre !== undefined)    { req.input('nombre', sql.NVarChar, body.nombre);             sets.push('nombre = @nombre'); }
    if (body.ciudad !== undefined)    { req.input('ciudad', sql.NVarChar, body.ciudad ?? null);     sets.push('ciudad = @ciudad'); }
    if (body.telefono !== undefined)  { req.input('telefono', sql.NVarChar, body.telefono ?? null); sets.push('telefono = @telefono'); }
    if (body.direccion !== undefined) { req.input('direccion', sql.NVarChar, body.direccion ?? null); sets.push('direccion = @direccion'); }
    if (sets.length === 0) return errorResponse('Nada que actualizar', 400);
    const result = await req.query(`UPDATE tiendas SET ${sets.join(', ')} OUTPUT INSERTED.* WHERE id = @id`);
    if (result.recordset.length === 0) return errorResponse('Tienda no encontrada', 404);
    return successResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al actualizar la tienda'); }
}

export async function DELETE(request: NextRequest) {
  try {
    requireAdmin(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();
    const result = await pool.request().input('id', sql.BigInt, id).query('DELETE FROM tiendas OUTPUT DELETED.id WHERE id = @id');
    if (result.recordset.length === 0) return errorResponse('Tienda no encontrada', 404);
    return successResponse({ message: 'Tienda eliminada' });
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al eliminar la tienda'); }
}
