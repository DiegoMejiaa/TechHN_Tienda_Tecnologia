import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse, authError } from '@/lib/api-response';

// POST /api/cupones/validar — body: { codigo, subtotal }
// Valida el cupón y devuelve el descuento calculado sin crear nada en DB
export async function POST(request: NextRequest) {
  try {
    requireAuth(request);
    const { codigo, subtotal } = await request.json();
    if (!codigo || subtotal === undefined) return errorResponse('codigo y subtotal son requeridos', 400);

    const pool = await getConnection();
    const result = await pool.request().input('codigo', sql.NVarChar, codigo.trim().toUpperCase())
      .query(`SELECT * FROM cupones WHERE UPPER(codigo) = @codigo AND activo = 1
        AND (fecha_expiracion IS NULL OR fecha_expiracion > SYSDATETIME())
        AND (usos_maximos IS NULL OR usos_actuales < usos_maximos)`);

    if (result.recordset.length === 0) return errorResponse('Cupón inválido, expirado o sin usos disponibles', 400);

    const cupon = result.recordset[0];

    if (cupon.minimo_compra && Number(subtotal) < Number(cupon.minimo_compra)) {
      return errorResponse(`El monto mínimo para este cupón es ${cupon.minimo_compra}`, 400);
    }

    const descuento = cupon.tipo === 'porcentaje'
      ? Number(subtotal) * Number(cupon.valor) / 100
      : Math.min(Number(cupon.valor), Number(subtotal));

    const total_con_descuento = Math.max(0, Number(subtotal) - descuento);

    return successResponse({
      id: cupon.id,
      codigo: cupon.codigo,
      tipo: cupon.tipo,
      valor: cupon.valor,
      descuento: Math.round(descuento * 100) / 100,
      total_con_descuento: Math.round(total_con_descuento * 100) / 100,
    });
  } catch (e) {
    const a = authError(e);
    if (a) return errorResponse(a, 403);
    return errorResponse('Error al validar el cupón');
  }
}
