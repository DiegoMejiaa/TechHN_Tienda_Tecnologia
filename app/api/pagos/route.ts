import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAdmin, requireAuth } from '@/lib/auth';
import { successResponse, errorResponse, createdResponse, authError } from '@/lib/api-response';

const ESTADOS_PAGO = ['pendiente', 'pagado', 'rechazado', 'reembolsado'];
const METODOS_PAGO = ['tarjeta', 'efectivo', 'transferencia', 'paypal', 'otro'];

export async function GET(request: NextRequest) {
  try {
    requireAuth(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const id_pedido = searchParams.get('id_pedido');
    const pool = await getConnection();
    if (id) {
      const result = await pool.request().input('id', sql.BigInt, id).query('SELECT * FROM pagos WHERE id = @id');
      if (result.recordset.length === 0) return errorResponse('Pago no encontrado', 404);
      return successResponse(result.recordset[0]);
    }
    if (id_pedido) {
      const result = await pool.request().input('id_pedido', sql.BigInt, id_pedido).query('SELECT * FROM pagos WHERE id_pedido = @id_pedido ORDER BY id');
      return successResponse(result.recordset);
    }
    const result = await pool.request().query('SELECT * FROM pagos ORDER BY id DESC');
    return successResponse(result.recordset);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al obtener los pagos'); }
}

export async function POST(request: NextRequest) {
  try {
    requireAuth(request);
    const { id_pedido, monto, metodo_pago, estado } = await request.json();
    if (!id_pedido || !monto || !metodo_pago) return errorResponse('id_pedido, monto y metodo_pago son requeridos', 400);
    if (!METODOS_PAGO.includes(metodo_pago)) return errorResponse(`metodo_pago inválido. Válidos: ${METODOS_PAGO.join(', ')}`, 400);
    const estadoPago = estado || 'pendiente';
    if (!ESTADOS_PAGO.includes(estadoPago)) return errorResponse(`estado inválido. Válidos: ${ESTADOS_PAGO.join(', ')}`, 400);
    const pool = await getConnection();
    const pedido = await pool.request().input('id', sql.BigInt, id_pedido).query('SELECT id FROM pedidos WHERE id = @id');
    if (pedido.recordset.length === 0) return errorResponse('Pedido no encontrado', 404);
    const result = await pool.request()
      .input('id_pedido', sql.BigInt, id_pedido)
      .input('monto', sql.Decimal(10, 2), monto)
      .input('metodo_pago', sql.NVarChar, metodo_pago)
      .input('estado', sql.NVarChar, estadoPago)
      .query('INSERT INTO pagos (id_pedido, monto, metodo_pago, estado) OUTPUT INSERTED.* VALUES (@id_pedido, @monto, @metodo_pago, @estado)');
    if (estadoPago === 'pagado') {
      // Solo cambiar a 'pagado' si el pedido está en 'pendiente' por flujo normal (no por entrega diferida)
      // Si ya fue creado como 'pagado' o como 'pendiente' de entrega diferida, no tocar
      const pedidoActual = await pool.request().input('id_check', sql.BigInt, id_pedido)
        .query('SELECT estado FROM pedidos WHERE id = @id_check');
      const estadoPedido = pedidoActual.recordset[0]?.estado;
      // Solo actualizar si está en pendiente Y el pago es inmediato (no entrega diferida)
      // La entrega diferida se maneja desde el cajero con estado_inicial='pendiente'
      // Para ventas online que pasan de pendiente a pagado, sí actualizar
      if (estadoPedido === 'pendiente') {
        // No actualizamos aquí — el cajero maneja el estado directamente
        // Para ventas online el admin puede cambiar el estado manualmente
      }
    }
    return createdResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al registrar el pago'); }
}
