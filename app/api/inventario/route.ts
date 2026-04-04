import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { successResponse, errorResponse, createdResponse, authError } from '@/lib/api-response';

const TIPOS_TRANSACCION = ['compra', 'ajuste', 'venta', 'devolucion'];

// GET /api/inventario?id_variante=1 | ?id_tienda=1 | ?tipo=ajuste
export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const id_variante = searchParams.get('id_variante');
    const id_tienda = searchParams.get('id_tienda');
    const tipo = searchParams.get('tipo');
    const pool = await getConnection();
    const req = pool.request();
    let query = `SELECT t.*, v.sku, v.nombre_variante, p.nombre as nombre_producto, ti.nombre as nombre_tienda
      FROM transacciones_inventario t
      JOIN variantes_producto v ON t.id_variante = v.id
      JOIN productos p ON v.id_producto = p.id
      JOIN tiendas ti ON t.id_tienda = ti.id
      WHERE 1=1`;
    if (id_variante) { req.input('id_variante', sql.BigInt, id_variante); query += ' AND t.id_variante = @id_variante'; }
    if (id_tienda)   { req.input('id_tienda', sql.BigInt, id_tienda);     query += ' AND t.id_tienda = @id_tienda'; }
    if (tipo)        { req.input('tipo', sql.NVarChar, tipo);             query += ' AND t.tipo = @tipo'; }
    query += ' ORDER BY t.creado_en DESC';
    const result = await req.query(query);
    return successResponse(result.recordset);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al obtener el inventario'); }
}

// POST /api/inventario — body: { id_variante, id_tienda, tipo, cantidad, nota? }
export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);
    const { id_variante, id_tienda, tipo, cantidad, nota } = await request.json();
    if (!id_variante || !id_tienda || !tipo || cantidad === undefined) return errorResponse('id_variante, id_tienda, tipo y cantidad son requeridos', 400);
    if (!TIPOS_TRANSACCION.includes(tipo)) return errorResponse(`tipo inválido. Válidos: ${TIPOS_TRANSACCION.join(', ')}`, 400);
    const pool = await getConnection();
    const result = await pool.request()
      .input('id_variante', sql.BigInt, id_variante)
      .input('id_tienda', sql.BigInt, id_tienda)
      .input('tipo', sql.NVarChar, tipo)
      .input('cantidad', sql.Int, cantidad)
      .input('nota', sql.NVarChar, nota ?? null)
      .query('INSERT INTO transacciones_inventario (id_variante, id_tienda, tipo, cantidad, nota) OUTPUT INSERTED.* VALUES (@id_variante, @id_tienda, @tipo, @cantidad, @nota)');
    return createdResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al registrar la transacción'); }
}
