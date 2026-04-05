import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { successResponse, errorResponse, createdResponse, authError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const id_producto = searchParams.get('id_producto');
    const sku = searchParams.get('sku');
    const pool = await getConnection();
    if (id) {
      const result = await pool.request().input('id', sql.BigInt, id)
        .query('SELECT v.*, p.nombre as nombre_producto, p.imagen_url as imagen_url FROM variantes_producto v JOIN productos p ON v.id_producto = p.id WHERE v.id = @id');
      if (result.recordset.length === 0) return errorResponse('Variante no encontrada', 404);
      return successResponse(result.recordset[0]);
    }
    if (sku) {
      const result = await pool.request().input('sku', sql.NVarChar, sku)
        .query('SELECT v.*, p.nombre as nombre_producto, p.imagen_url as imagen_url FROM variantes_producto v JOIN productos p ON v.id_producto = p.id WHERE v.sku = @sku');
      if (result.recordset.length === 0) return errorResponse('Variante no encontrada', 404);
      return successResponse(result.recordset[0]);
    }
    if (id_producto) {
      const result = await pool.request().input('id_producto', sql.BigInt, id_producto)
        .query(`SELECT v.id, v.id_producto, v.sku, v.nombre_variante, v.precio, v.precio_oferta, v.activo,
          v.cloudinary_public_id,
          COALESCE(v.imagen_url, p.imagen_url) as imagen_url,
          p.nombre as nombre_producto,
          ISNULL((SELECT SUM(ns.cantidad) FROM niveles_stock ns WHERE ns.id_variante = v.id), 0) as stock_total
          FROM variantes_producto v JOIN productos p ON v.id_producto = p.id
          WHERE v.id_producto = @id_producto AND v.activo = 1 ORDER BY v.nombre_variante`);
      return successResponse(result.recordset);
    }
    const result = await pool.request().query(`SELECT v.id, v.id_producto, v.sku, v.nombre_variante, v.precio, v.precio_oferta, v.activo,
      v.cloudinary_public_id,
      COALESCE(v.imagen_url, p.imagen_url) as imagen_url,
      p.nombre as nombre_producto,
      ISNULL((SELECT SUM(ns.cantidad) FROM niveles_stock ns WHERE ns.id_variante = v.id), 0) as stock_total
      FROM variantes_producto v JOIN productos p ON v.id_producto = p.id ORDER BY p.nombre, v.nombre_variante`);
    return successResponse(result.recordset);
  } catch (error) { console.error(error); return errorResponse('Error al obtener las variantes'); }
}

export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);
    const { id_producto, sku, nombre_variante, precio, precio_oferta, activo } = await request.json();
    console.log('[POST /api/variantes]', { id_producto, sku, precio });
    if (!id_producto || !sku || precio === undefined) return errorResponse('id_producto, sku y precio son requeridos', 400);
    if (precio_oferta !== undefined && precio_oferta !== null && precio_oferta > precio) return errorResponse('precio_oferta no puede ser mayor al precio', 400);
    const pool = await getConnection();
    const result = await pool.request()
      .input('id_producto', sql.BigInt, id_producto)
      .input('sku', sql.NVarChar, sku)
      .input('nombre_variante', sql.NVarChar, nombre_variante ?? null)
      .input('precio', sql.Decimal(10, 2), precio)
      .input('precio_oferta', sql.Decimal(10, 2), precio_oferta ?? null)
      .input('activo', sql.Bit, activo !== undefined ? (activo ? 1 : 0) : 1)
      .query('INSERT INTO variantes_producto (id_producto, sku, nombre_variante, precio, precio_oferta, activo) OUTPUT INSERTED.* VALUES (@id_producto, @sku, @nombre_variante, @precio, @precio_oferta, @activo)');
    return createdResponse(result.recordset[0]);
  } catch (e: any) { const a = authError(e); if (a) return errorResponse(a, 403); console.error('[POST /api/variantes error]', e); if (e?.number === 2627 || e?.number === 2601) return errorResponse('Ya existe una variante con ese SKU', 409); return errorResponse('Error al crear la variante'); }
}

export async function PUT(request: NextRequest) {
  try {
    requireAdmin(request);
    const body = await request.json();
    const { id } = body;
    if (!id) return errorResponse('id es requerido', 400);
    if (body.precio_oferta !== undefined && body.precio_oferta !== null && body.precio !== undefined && body.precio_oferta > body.precio) return errorResponse('precio_oferta no puede ser mayor al precio', 400);
    const pool = await getConnection();
    const req = pool.request().input('id', sql.BigInt, id);
    const sets: string[] = [];
    if (body.sku !== undefined)            { req.input('sku', sql.NVarChar, body.sku);                                   sets.push('sku = @sku'); }
    if (body.nombre_variante !== undefined) { req.input('nombre_variante', sql.NVarChar, body.nombre_variante);           sets.push('nombre_variante = @nombre_variante'); }
    if (body.precio !== undefined)          { req.input('precio', sql.Decimal(10, 2), body.precio);                       sets.push('precio = @precio'); }
    if ('precio_oferta' in body)            { req.input('precio_oferta', sql.Decimal(10, 2), body.precio_oferta ?? null); sets.push('precio_oferta = @precio_oferta'); }
    if (body.activo !== undefined)          { req.input('activo', sql.Bit, body.activo ? 1 : 0);                          sets.push('activo = @activo'); }
    if ('imagen_url' in body)               { req.input('imagen_url', sql.NVarChar, body.imagen_url ?? null);             sets.push('imagen_url = @imagen_url'); }
    if ('cloudinary_public_id' in body)     { req.input('cloudinary_public_id', sql.NVarChar, body.cloudinary_public_id ?? null); sets.push('cloudinary_public_id = @cloudinary_public_id'); }    if (sets.length === 0) return errorResponse('Nada que actualizar', 400);
    const result = await req.query(`UPDATE variantes_producto SET ${sets.join(', ')} OUTPUT INSERTED.* WHERE id = @id`);
    if (result.recordset.length === 0) return errorResponse('Variante no encontrada', 404);
    return successResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al actualizar la variante'); }
}

export async function DELETE(request: NextRequest) {
  try {
    requireAdmin(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();
    // Borrar stock asociado primero
    await pool.request().input('id', sql.BigInt, id).query('DELETE FROM niveles_stock WHERE id_variante = @id');
    const result = await pool.request().input('id', sql.BigInt, id).query('DELETE FROM variantes_producto OUTPUT DELETED.id WHERE id = @id');
    if (result.recordset.length === 0) return errorResponse('Variante no encontrada', 404);
    return successResponse({ message: 'Variante eliminada' });
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al eliminar la variante'); }
}
