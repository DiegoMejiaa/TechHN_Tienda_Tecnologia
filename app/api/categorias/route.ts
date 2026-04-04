import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { successResponse, errorResponse, createdResponse, authError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const soloRaiz = searchParams.get('solo_raiz');
    const pool = await getConnection();
    if (id) {
      const result = await pool.request().input('id', sql.BigInt, id).query('SELECT c.*, cp.nombre as nombre_categoria_padre FROM categorias c LEFT JOIN categorias cp ON c.id_categoria_padre = cp.id WHERE c.id = @id');
      if (result.recordset.length === 0) return errorResponse('Categoría no encontrada', 404);
      return successResponse(result.recordset[0]);
    }
    let query = 'SELECT c.*, cp.nombre as nombre_categoria_padre FROM categorias c LEFT JOIN categorias cp ON c.id_categoria_padre = cp.id';
    if (soloRaiz === 'true') query += ' WHERE c.id_categoria_padre IS NULL';
    query += ' ORDER BY c.nombre';
    const result = await pool.request().query(query);
    return successResponse(result.recordset);
  } catch (error) { console.error(error); return errorResponse('Error al obtener las categorías'); }
}

export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);
    const { nombre, slug, id_categoria_padre } = await request.json();
    if (!nombre || !slug) return errorResponse('nombre y slug son requeridos', 400);
    const pool = await getConnection();
    const result = await pool.request().input('nombre', sql.NVarChar, nombre).input('slug', sql.NVarChar, slug).input('id_categoria_padre', sql.BigInt, id_categoria_padre ?? null).query('INSERT INTO categorias (nombre, slug, id_categoria_padre) OUTPUT INSERTED.* VALUES (@nombre, @slug, @id_categoria_padre)');
    return createdResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al crear la categoría'); }
}

export async function PUT(request: NextRequest) {
  try {
    requireAdmin(request);
    const body = await request.json();
    const { id, nombre, slug } = body;
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();
    const req = pool.request().input('id', sql.BigInt, id);
    const sets: string[] = [];
    if (nombre !== undefined) { req.input('nombre', sql.NVarChar, nombre); sets.push('nombre = @nombre'); }
    if (slug !== undefined)   { req.input('slug', sql.NVarChar, slug);     sets.push('slug = @slug'); }
    if ('id_categoria_padre' in body) { req.input('id_categoria_padre', sql.BigInt, body.id_categoria_padre ?? null); sets.push('id_categoria_padre = @id_categoria_padre'); }
    if (sets.length === 0) return errorResponse('Nada que actualizar', 400);
    const result = await req.query(`UPDATE categorias SET ${sets.join(', ')} OUTPUT INSERTED.* WHERE id = @id`);
    if (result.recordset.length === 0) return errorResponse('Categoría no encontrada', 404);
    return successResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al actualizar la categoría'); }
}

export async function DELETE(request: NextRequest) {
  try {
    requireAdmin(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();
    const result = await pool.request().input('id', sql.BigInt, id).query('DELETE FROM categorias OUTPUT DELETED.id WHERE id = @id');
    if (result.recordset.length === 0) return errorResponse('Categoría no encontrada', 404);
    return successResponse({ message: 'Categoría eliminada' });
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al eliminar la categoría'); }
}
