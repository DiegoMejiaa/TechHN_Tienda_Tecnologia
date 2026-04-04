import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAdmin, requireAuth } from '@/lib/auth';
import { successResponse, errorResponse, createdResponse, authError } from '@/lib/api-response';

const ESTADOS_DEVOLUCION = ['solicitada', 'aprobada', 'rechazada', 'completada'];

// GET /api/devoluciones?id=1 | ?id_pedido=1
export async function GET(request: NextRequest) {
  try {
    requireAuth(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const id_pedido = searchParams.get('id_pedido');
    const pool = await getConnection();
    if (id) {
      const result = await pool.request().input('id', sql.BigInt, id).query('SELECT * FROM devoluciones WHERE id = @id');
      if (result.recordset.length === 0) return errorResponse('Devolución no encontrada', 404);
      return successResponse(result.recordset[0]);
    }
    if (id_pedido) {
      const result = await pool.request().input('id_pedido', sql.BigInt, id_pedido)
        .query('SELECT * FROM devoluciones WHERE id_pedido = @id_pedido ORDER BY creado_en DESC');
      return successResponse(result.recordset);
    }
    const result = await pool.request().query('SELECT * FROM devoluciones ORDER BY creado_en DESC');
    return successResponse(result.recordset);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al obtener las devoluciones'); }
}

// POST /api/devoluciones — body: { id_pedido, motivo, items: [{ id_item_pedido, cantidad }] }
export async function POST(request: NextRequest) {
  try {
    requireAuth(request);
    const { id_pedido, motivo, items } = await request.json();
    if (!id_pedido || !motivo) return errorResponse('id_pedido y motivo son requeridos', 400);
    const pool = await getConnection();
    const pedido = await pool.request().input('id', sql.BigInt, id_pedido).query('SELECT id FROM pedidos WHERE id = @id');
    if (pedido.recordset.length === 0) return errorResponse('Pedido no encontrado', 404);
    const result = await pool.request()
      .input('id_pedido', sql.BigInt, id_pedido)
      .input('motivo', sql.NVarChar, motivo)
      .input('estado', sql.NVarChar, 'solicitada')
      .query('INSERT INTO devoluciones (id_pedido, motivo, estado) OUTPUT INSERTED.* VALUES (@id_pedido, @motivo, @estado)');
    const devolucion = result.recordset[0];
    if (items?.length) {
      for (const item of items) {
        await pool.request()
          .input('id_devolucion', sql.BigInt, devolucion.id)
          .input('id_item_pedido', sql.BigInt, item.id_item_pedido)
          .input('cantidad', sql.Int, item.cantidad)
          .query('INSERT INTO items_devolucion (id_devolucion, id_item_pedido, cantidad) VALUES (@id_devolucion, @id_item_pedido, @cantidad)');
      }
    }
    return createdResponse(devolucion);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al crear la devolución'); }
}

// PUT /api/devoluciones — body: { id, estado }
export async function PUT(request: NextRequest) {
  try {
    requireAdmin(request);
    const { id, estado } = await request.json();
    if (!id || !estado) return errorResponse('id y estado son requeridos', 400);
    if (!ESTADOS_DEVOLUCION.includes(estado)) return errorResponse(`Estado inválido. Válidos: ${ESTADOS_DEVOLUCION.join(', ')}`, 400);
    const pool = await getConnection();
    const result = await pool.request().input('id', sql.BigInt, id).input('estado', sql.NVarChar, estado)
      .query('UPDATE devoluciones SET estado = @estado OUTPUT INSERTED.* WHERE id = @id');
    if (result.recordset.length === 0) return errorResponse('Devolución no encontrada', 404);
    return successResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al actualizar la devolución'); }
}
