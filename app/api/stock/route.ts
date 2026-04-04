import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { successResponse, errorResponse, authError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id_variante = searchParams.get('id_variante');
    const id_tienda = searchParams.get('id_tienda');
    const pool = await getConnection();
    const req = pool.request();
    let query = `SELECT ns.*, v.sku, v.nombre_variante, v.id_producto, p.nombre as nombre_producto, t.nombre as nombre_tienda
      FROM niveles_stock ns
      JOIN variantes_producto v ON ns.id_variante = v.id
      JOIN productos p ON v.id_producto = p.id
      JOIN tiendas t ON ns.id_tienda = t.id
      WHERE 1=1`;
    if (id_variante) { req.input('id_variante', sql.BigInt, id_variante); query += ' AND ns.id_variante = @id_variante'; }
    // Admin de sucursal solo ve su tienda — el param de URL tiene prioridad, luego el JWT
    const token = request.headers.get('authorization')?.slice(7);
    let tiendaFiltro = id_tienda; // param de URL tiene prioridad
    if (!tiendaFiltro && token) {
      try {
        const jwt = require('jsonwebtoken');
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
        if (Number(payload.id_rol) === 4 && payload.id_tienda) tiendaFiltro = String(payload.id_tienda);
      } catch { /* ignore */ }
    }
    if (tiendaFiltro) { req.input('id_tienda', sql.BigInt, tiendaFiltro); query += ' AND ns.id_tienda = @id_tienda'; }
    query += ' ORDER BY p.nombre, v.nombre_variante, t.nombre';
    const result = await req.query(query);
    return successResponse(result.recordset);
  } catch (error) { console.error(error); return errorResponse('Error al obtener el stock'); }
}

export async function PUT(request: NextRequest) {
  try {
    requireAdmin(request);
    const { id_variante, id_tienda, cantidad } = await request.json();
    if (!id_variante || !id_tienda || cantidad === undefined) return errorResponse('id_variante, id_tienda y cantidad son requeridos', 400);
    if (cantidad < 0) return errorResponse('cantidad no puede ser negativa', 400);
    const pool = await getConnection();
    const result = await pool.request()
      .input('id_variante', sql.BigInt, id_variante)
      .input('id_tienda', sql.BigInt, id_tienda)
      .input('cantidad', sql.Int, cantidad)
      .query(`MERGE niveles_stock AS target
        USING (SELECT @id_variante AS id_variante, @id_tienda AS id_tienda) AS source
        ON target.id_variante = source.id_variante AND target.id_tienda = source.id_tienda
        WHEN MATCHED THEN UPDATE SET cantidad = @cantidad
        WHEN NOT MATCHED THEN INSERT (id_variante, id_tienda, cantidad) VALUES (@id_variante, @id_tienda, @cantidad)
        OUTPUT INSERTED.*;`);
    return successResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al actualizar el stock'); }
}
