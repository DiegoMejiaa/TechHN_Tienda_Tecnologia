import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { successResponse, errorResponse, createdResponse, authError } from '@/lib/api-response';

export async function GET() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM roles ORDER BY id');
    return successResponse(result.recordset);
  } catch (error) { console.error(error); return errorResponse('Error al obtener los roles'); }
}

export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);
    const { nombre } = await request.json();
    if (!nombre) return errorResponse('nombre es requerido', 400);
    const pool = await getConnection();
    const result = await pool.request().input('nombre', sql.NVarChar, nombre).query('INSERT INTO roles (nombre) OUTPUT INSERTED.* VALUES (@nombre)');
    return createdResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al crear el rol'); }
}

export async function PUT(request: NextRequest) {
  try {
    requireAdmin(request);
    const { id, nombre } = await request.json();
    if (!id || !nombre) return errorResponse('id y nombre son requeridos', 400);
    const pool = await getConnection();
    const result = await pool.request().input('id', sql.BigInt, id).input('nombre', sql.NVarChar, nombre).query('UPDATE roles SET nombre = @nombre OUTPUT INSERTED.* WHERE id = @id');
    if (result.recordset.length === 0) return errorResponse('Rol no encontrado', 404);
    return successResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al actualizar el rol'); }
}

export async function DELETE(request: NextRequest) {
  try {
    requireAdmin(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();
    const result = await pool.request().input('id', sql.BigInt, id).query('DELETE FROM roles OUTPUT DELETED.id WHERE id = @id');
    if (result.recordset.length === 0) return errorResponse('Rol no encontrado', 404);
    return successResponse({ message: 'Rol eliminado' });
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al eliminar el rol'); }
}
