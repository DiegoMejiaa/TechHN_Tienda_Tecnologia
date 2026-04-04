import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { successResponse, errorResponse, createdResponse, authError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    const pool = await getConnection();
    if (id) {
      const result = await pool.request().input('id', sql.BigInt, id).query('SELECT * FROM marcas WHERE id = @id');
      if (result.recordset.length === 0) return errorResponse('Marca no encontrada', 404);
      return successResponse(result.recordset[0]);
    }
    const result = await pool.request().query('SELECT * FROM marcas ORDER BY nombre');
    return successResponse(result.recordset);
  } catch (error) { console.error(error); return errorResponse('Error al obtener las marcas'); }
}

export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);
    const { nombre } = await request.json();
    if (!nombre) return errorResponse('nombre es requerido', 400);
    const pool = await getConnection();
    const result = await pool.request().input('nombre', sql.NVarChar, nombre).query('INSERT INTO marcas (nombre) OUTPUT INSERTED.* VALUES (@nombre)');
    return createdResponse(result.recordset[0]);
  } catch (e: any) {
    const a = authError(e);
    if (a) return errorResponse(a, 403);
    if (e?.number === 2627 || e?.number === 2601) return errorResponse('Ya existe una marca con ese nombre', 409);
    console.error('[POST /api/marcas error]', e);
    return errorResponse('Error al crear la marca');
  }
}

export async function PUT(request: NextRequest) {
  try {
    requireAdmin(request);
    const { id, nombre } = await request.json();
    if (!id || !nombre) return errorResponse('id y nombre son requeridos', 400);
    const pool = await getConnection();
    const result = await pool.request().input('id', sql.BigInt, id).input('nombre', sql.NVarChar, nombre).query('UPDATE marcas SET nombre = @nombre OUTPUT INSERTED.* WHERE id = @id');
    if (result.recordset.length === 0) return errorResponse('Marca no encontrada', 404);
    return successResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al actualizar la marca'); }
}

export async function DELETE(request: NextRequest) {
  try {
    requireAdmin(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();
    const result = await pool.request().input('id', sql.BigInt, id).query('DELETE FROM marcas OUTPUT DELETED.id WHERE id = @id');
    if (result.recordset.length === 0) return errorResponse('Marca no encontrada', 404);
    return successResponse({ message: 'Marca eliminada' });
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al eliminar la marca'); }
}
