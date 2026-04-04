import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse, createdResponse, authError } from '@/lib/api-response';

// POST /api/cupones-pedido — body: { id_pedido, codigo }
export async function POST(request: NextRequest) {
  try {
    requireAuth(request);
    const { id_pedido, codigo } = await request.json();
    if (!id_pedido || !codigo) return errorResponse('id_pedido y codigo son requeridos', 400);
    const pool = await getConnection();

    // Validar cupón
    const cupon = await pool.request().input('codigo', sql.NVarChar, codigo)
      .query(`SELECT * FROM cupones WHERE codigo = @codigo AND activo = 1
        AND (fecha_expiracion IS NULL OR fecha_expiracion > SYSDATETIME())
        AND (usos_maximos IS NULL OR usos_actuales < usos_maximos)`);
    if (cupon.recordset.length === 0) return errorResponse('Cupón inválido o expirado', 400);

    const c = cupon.recordset[0];
    const pedido = await pool.request().input('id', sql.BigInt, id_pedido).query('SELECT * FROM pedidos WHERE id = @id');
    if (pedido.recordset.length === 0) return errorResponse('Pedido no encontrado', 404);

    if (c.minimo_compra && pedido.recordset[0].monto_total < c.minimo_compra) {
      return errorResponse(`Monto mínimo requerido: ${c.minimo_compra}`, 400);
    }

    // Calcular descuento
    const monto = pedido.recordset[0].monto_total;
    const descuento = c.tipo === 'porcentaje' ? (monto * c.valor / 100) : c.valor;
    const nuevo_total = Math.max(0, monto - descuento);

    const result = await pool.request()
      .input('id_pedido', sql.BigInt, id_pedido)
      .input('id_cupon', sql.BigInt, c.id)
      .input('descuento', sql.Decimal(10, 2), descuento)
      .query('INSERT INTO cupones_pedido (id_pedido, id_cupon, descuento) OUTPUT INSERTED.* VALUES (@id_pedido, @id_cupon, @descuento)');

    // Actualizar total del pedido y usos del cupón
    await pool.request()
      .input('nuevo_total', sql.Decimal(10, 2), nuevo_total)
      .input('pedido_id', sql.BigInt, id_pedido)
      .query('UPDATE pedidos SET monto_total = @nuevo_total WHERE id = @pedido_id');

    await pool.request()
      .input('cupon_id', sql.BigInt, c.id)
      .query('UPDATE cupones SET usos_actuales = ISNULL(usos_actuales, 0) + 1 WHERE id = @cupon_id');

    return createdResponse({ ...result.recordset[0], nuevo_total });
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al aplicar el cupón'); }
}

// DELETE /api/cupones-pedido?id=1
export async function DELETE(request: NextRequest) {
  try {
    requireAuth(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();
    const result = await pool.request().input('id', sql.BigInt, id).query('DELETE FROM cupones_pedido OUTPUT DELETED.* WHERE id = @id');
    if (result.recordset.length === 0) return errorResponse('Cupón de pedido no encontrado', 404);
    return successResponse({ message: 'Cupón removido del pedido' });
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al remover el cupón'); }
}
