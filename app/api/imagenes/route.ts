import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { successResponse, errorResponse, createdResponse, authError } from '@/lib/api-response';

// GET /api/imagenes?id_variante=1
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id_variante = searchParams.get('id_variante');
    const id = searchParams.get('id');
    const pool = await getConnection();
    if (id) {
      const result = await pool.request().input('id', sql.BigInt, id).query('SELECT * FROM imagenes_producto WHERE id = @id');
      if (result.recordset.length === 0) return errorResponse('Imagen no encontrada', 404);
      return successResponse(result.recordset[0]);
    }
    if (id_variante) {
      const result = await pool.request().input('id_variante', sql.BigInt, id_variante)
        .query('SELECT * FROM imagenes_producto WHERE id_variante = @id_variante ORDER BY orden');
      return successResponse(result.recordset);
    }
    const result = await pool.request().query('SELECT * FROM imagenes_producto ORDER BY id_variante, orden');
    return successResponse(result.recordset);
  } catch (error) { console.error(error); return errorResponse('Error al obtener las imágenes'); }
}

// POST /api/imagenes — body: { id_variante, url, cloudinary_public_id?, orden? }
export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);
    const { id_variante, url, cloudinary_public_id, orden } = await request.json();
    if (!id_variante || !url) return errorResponse('id_variante y url son requeridos', 400);
    const pool = await getConnection();

    // Upsert: si ya existe imagen para esta variante en orden 0, actualiza en vez de insertar
    const existing = await pool.request()
      .input('id_variante', sql.BigInt, id_variante)
      .input('orden', sql.Int, orden ?? 0)
      .query('SELECT id FROM imagenes_producto WHERE id_variante = @id_variante AND orden = @orden');

    if (existing.recordset.length > 0) {
      const result = await pool.request()
        .input('id', sql.BigInt, existing.recordset[0].id)
        .input('url', sql.NVarChar, url)
        .input('cloudinary_public_id', sql.NVarChar, cloudinary_public_id ?? null)
        .query('UPDATE imagenes_producto SET url = @url, cloudinary_public_id = @cloudinary_public_id OUTPUT INSERTED.* WHERE id = @id');
      return successResponse(result.recordset[0]);
    }

    const result = await pool.request()
      .input('id_variante', sql.BigInt, id_variante)
      .input('url', sql.NVarChar, url)
      .input('cloudinary_public_id', sql.NVarChar, cloudinary_public_id ?? null)
      .input('orden', sql.Int, orden ?? 0)
      .query('INSERT INTO imagenes_producto (id_variante, url, cloudinary_public_id, orden) OUTPUT INSERTED.* VALUES (@id_variante, @url, @cloudinary_public_id, @orden)');
    return createdResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al crear la imagen'); }
}

// DELETE /api/imagenes?id=1
export async function DELETE(request: NextRequest) {
  try {
    requireAdmin(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();
    const result = await pool.request().input('id', sql.BigInt, id).query('DELETE FROM imagenes_producto OUTPUT DELETED.* WHERE id = @id');
    if (result.recordset.length === 0) return errorResponse('Imagen no encontrada', 404);
    return successResponse({ message: 'Imagen eliminada', deleted: result.recordset[0] });
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al eliminar la imagen'); }
}
