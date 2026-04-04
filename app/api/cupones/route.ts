import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { successResponse, errorResponse, createdResponse, authError } from '@/lib/api-response';

// GET /api/cupones?id=1 | ?codigo=PROMO10
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const codigo = searchParams.get('codigo');
    const pool = await getConnection();
    if (id) {
      const result = await pool.request().input('id', sql.BigInt, id).query('SELECT * FROM cupones WHERE id = @id');
      if (result.recordset.length === 0) return errorResponse('Cupón no encontrado', 404);
      return successResponse(result.recordset[0]);
    }
    if (codigo) {
      const result = await pool.request().input('codigo', sql.NVarChar, codigo).query('SELECT * FROM cupones WHERE codigo = @codigo');
      if (result.recordset.length === 0) return errorResponse('Cupón no encontrado', 404);
      return successResponse(result.recordset[0]);
    }
    const result = await pool.request().query('SELECT * FROM cupones ORDER BY creado_en DESC');
    return successResponse(result.recordset);
  } catch (error) { console.error(error); return errorResponse('Error al obtener los cupones'); }
}

// POST /api/cupones — body: { codigo, tipo, valor, minimo_compra?, usos_maximos?, activo?, fecha_expiracion? }
export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);
    const { codigo, tipo, valor, minimo_compra, usos_maximos, activo, fecha_expiracion } = await request.json();
    if (!codigo || !tipo || valor === undefined) return errorResponse('codigo, tipo y valor son requeridos', 400);
    if (!['porcentaje', 'monto_fijo'].includes(tipo)) return errorResponse('tipo debe ser porcentaje o monto_fijo', 400);
    const pool = await getConnection();
    const result = await pool.request()
      .input('codigo', sql.NVarChar, codigo)
      .input('tipo', sql.NVarChar, tipo)
      .input('valor', sql.Decimal(10, 2), valor)
      .input('minimo_compra', sql.Decimal(10, 2), minimo_compra ?? null)
      .input('usos_maximos', sql.Int, usos_maximos ?? null)
      .input('activo', sql.Bit, activo !== undefined ? (activo ? 1 : 0) : 1)
      .input('fecha_expiracion', sql.DateTime2, fecha_expiracion ?? null)
      .query('INSERT INTO cupones (codigo, tipo, valor, minimo_compra, usos_maximos, activo, fecha_expiracion) OUTPUT INSERTED.* VALUES (@codigo, @tipo, @valor, @minimo_compra, @usos_maximos, @activo, @fecha_expiracion)');
    return createdResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al crear el cupón'); }
}

// PUT /api/cupones — body: { id, codigo?, tipo?, valor?, minimo_compra?, usos_maximos?, activo?, fecha_expiracion? }
export async function PUT(request: NextRequest) {
  try {
    requireAdmin(request);
    const body = await request.json();
    const { id } = body;
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();
    const req = pool.request().input('id', sql.BigInt, id);
    const sets: string[] = [];
    if (body.codigo !== undefined)           { req.input('codigo', sql.NVarChar, body.codigo);                          sets.push('codigo = @codigo'); }
    if (body.tipo !== undefined)             { req.input('tipo', sql.NVarChar, body.tipo);                              sets.push('tipo = @tipo'); }
    if (body.valor !== undefined)            { req.input('valor', sql.Decimal(10, 2), body.valor);                      sets.push('valor = @valor'); }
    if ('minimo_compra' in body)             { req.input('minimo_compra', sql.Decimal(10, 2), body.minimo_compra ?? null); sets.push('minimo_compra = @minimo_compra'); }
    if ('usos_maximos' in body)              { req.input('usos_maximos', sql.Int, body.usos_maximos ?? null);            sets.push('usos_maximos = @usos_maximos'); }
    if (body.activo !== undefined)           { req.input('activo', sql.Bit, body.activo ? 1 : 0);                       sets.push('activo = @activo'); }
    if ('fecha_expiracion' in body)          { req.input('fecha_expiracion', sql.DateTime2, body.fecha_expiracion ?? null); sets.push('fecha_expiracion = @fecha_expiracion'); }
    if (sets.length === 0) return errorResponse('Nada que actualizar', 400);
    const result = await req.query(`UPDATE cupones SET ${sets.join(', ')} OUTPUT INSERTED.* WHERE id = @id`);
    if (result.recordset.length === 0) return errorResponse('Cupón no encontrado', 404);
    return successResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al actualizar el cupón'); }
}

// DELETE /api/cupones?id=1
export async function DELETE(request: NextRequest) {
  try {
    requireAdmin(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();
    const result = await pool.request().input('id', sql.BigInt, id).query('DELETE FROM cupones OUTPUT DELETED.id WHERE id = @id');
    if (result.recordset.length === 0) return errorResponse('Cupón no encontrado', 404);
    return successResponse({ message: 'Cupón eliminado' });
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al eliminar el cupón'); }
}
