import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse, createdResponse, authError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    requireAuth(request);
    const id_usuario = new URL(request.url).searchParams.get('id_usuario');
    if (!id_usuario) return errorResponse('id_usuario es requerido', 400);
    const pool = await getConnection();
    let carrito = await pool.request().input('id_usuario', sql.BigInt, id_usuario).query('SELECT * FROM carritos_compra WHERE id_usuario = @id_usuario');
    if (carrito.recordset.length === 0) {
      carrito = await pool.request().input('id_usuario', sql.BigInt, id_usuario).query('INSERT INTO carritos_compra (id_usuario) OUTPUT INSERTED.* VALUES (@id_usuario)');
    }
    const carritoId = carrito.recordset[0].id;
    const items = await pool.request().input('id_carrito', sql.BigInt, carritoId).query(`
      SELECT ic.*, v.sku, v.nombre_variante, v.precio, v.precio_oferta, p.nombre as nombre_producto, p.imagen_url
      FROM items_carrito ic
      JOIN variantes_producto v ON ic.id_variante = v.id
      JOIN productos p ON v.id_producto = p.id
      WHERE ic.id_carrito = @id_carrito`);
    const total = items.recordset.reduce((acc: number, item: { cantidad: number; precio_oferta: number | null; precio: number }) =>
      acc + item.cantidad * (item.precio_oferta ?? item.precio), 0);
    return successResponse({ carrito: carrito.recordset[0], items: items.recordset, total });
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al obtener el carrito'); }
}

export async function POST(request: NextRequest) {
  try {
    requireAuth(request);
    const { id_usuario, id_variante, cantidad } = await request.json();
    if (!id_usuario || !id_variante || !cantidad) return errorResponse('id_usuario, id_variante y cantidad son requeridos', 400);
    if (cantidad <= 0) return errorResponse('cantidad debe ser mayor a 0', 400);
    const pool = await getConnection();
    let carrito = await pool.request().input('id_usuario', sql.BigInt, id_usuario).query('SELECT id FROM carritos_compra WHERE id_usuario = @id_usuario');
    if (carrito.recordset.length === 0) {
      carrito = await pool.request().input('id_usuario', sql.BigInt, id_usuario).query('INSERT INTO carritos_compra (id_usuario) OUTPUT INSERTED.* VALUES (@id_usuario)');
    }
    const carritoId = carrito.recordset[0].id;
    const existing = await pool.request().input('id_carrito', sql.BigInt, carritoId).input('id_variante', sql.BigInt, id_variante)
      .query('SELECT id, cantidad FROM items_carrito WHERE id_carrito = @id_carrito AND id_variante = @id_variante');
    let result;
    if (existing.recordset.length > 0) {
      result = await pool.request().input('id_carrito', sql.BigInt, carritoId).input('id_variante', sql.BigInt, id_variante)
        .input('cantidad', sql.Int, existing.recordset[0].cantidad + cantidad)
        .query('UPDATE items_carrito SET cantidad = @cantidad OUTPUT INSERTED.* WHERE id_carrito = @id_carrito AND id_variante = @id_variante');
    } else {
      result = await pool.request().input('id_carrito', sql.BigInt, carritoId).input('id_variante', sql.BigInt, id_variante)
        .input('cantidad', sql.Int, cantidad)
        .query('INSERT INTO items_carrito (id_carrito, id_variante, cantidad) OUTPUT INSERTED.* VALUES (@id_carrito, @id_variante, @cantidad)');
    }
    return createdResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al agregar al carrito'); }
}

export async function PUT(request: NextRequest) {
  try {
    requireAuth(request);
    const { id_item, cantidad } = await request.json();
    if (!id_item || cantidad === undefined) return errorResponse('id_item y cantidad son requeridos', 400);
    if (cantidad <= 0) return errorResponse('cantidad debe ser mayor a 0', 400);
    const pool = await getConnection();
    const result = await pool.request().input('id', sql.BigInt, id_item).input('cantidad', sql.Int, cantidad)
      .query('UPDATE items_carrito SET cantidad = @cantidad OUTPUT INSERTED.* WHERE id = @id');
    if (result.recordset.length === 0) return errorResponse('Item no encontrado', 404);
    return successResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al actualizar el item'); }
}

export async function DELETE(request: NextRequest) {
  try {
    requireAuth(request);
    const { searchParams } = new URL(request.url);
    const id_item = searchParams.get('id_item');
    const id_carrito = searchParams.get('id_carrito');
    const pool = await getConnection();
    if (id_item) {
      const result = await pool.request().input('id', sql.BigInt, id_item).query('DELETE FROM items_carrito OUTPUT DELETED.id WHERE id = @id');
      if (result.recordset.length === 0) return errorResponse('Item no encontrado', 404);
      return successResponse({ message: 'Item eliminado' });
    }
    if (id_carrito) {
      await pool.request().input('id_carrito', sql.BigInt, id_carrito).query('DELETE FROM items_carrito WHERE id_carrito = @id_carrito');
      return successResponse({ message: 'Carrito vaciado' });
    }
    return errorResponse('Se requiere id_item o id_carrito', 400);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al eliminar del carrito'); }
}
