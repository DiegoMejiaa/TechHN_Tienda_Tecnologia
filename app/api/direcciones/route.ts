import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { successResponse, errorResponse, createdResponse, authError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const id_usuario = searchParams.get('id_usuario');
    const pool = await getConnection();
    if (id) {
      const result = await pool.request().input('id', sql.BigInt, id).query('SELECT * FROM direcciones_usuario WHERE id = @id');
      if (result.recordset.length === 0) return errorResponse('Dirección no encontrada', 404);
      return successResponse(result.recordset[0]);
    }
    if (id_usuario) {
      const result = await pool.request().input('id_usuario', sql.BigInt, id_usuario).query('SELECT * FROM direcciones_usuario WHERE id_usuario = @id_usuario ORDER BY es_direccion_envio_predeterminada DESC');
      return successResponse(result.recordset);
    }
    const result = await pool.request().query('SELECT * FROM direcciones_usuario ORDER BY id');
    return successResponse(result.recordset);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al obtener las direcciones'); }
}

export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);
    const { id_usuario, direccion_linea1, ciudad, estado, pais, codigo_postal, es_direccion_envio_predeterminada } = await request.json();
    if (!id_usuario || !direccion_linea1 || !ciudad || !estado || !pais || !codigo_postal) return errorResponse('Faltan campos requeridos', 400);
    const pool = await getConnection();
    const esPredeterminada = es_direccion_envio_predeterminada ? 1 : 0;
    if (esPredeterminada) {
      await pool.request().input('id_usuario', sql.BigInt, id_usuario).query('UPDATE direcciones_usuario SET es_direccion_envio_predeterminada = 0 WHERE id_usuario = @id_usuario');
    }
    const result = await pool.request()
      .input('id_usuario', sql.BigInt, id_usuario)
      .input('direccion_linea1', sql.NVarChar, direccion_linea1)
      .input('ciudad', sql.NVarChar, ciudad)
      .input('estado', sql.NVarChar, estado)
      .input('pais', sql.NVarChar, pais)
      .input('codigo_postal', sql.NVarChar, codigo_postal)
      .input('es_predeterminada', sql.Bit, esPredeterminada)
      .query('INSERT INTO direcciones_usuario (id_usuario, direccion_linea1, ciudad, estado, pais, codigo_postal, es_direccion_envio_predeterminada) OUTPUT INSERTED.* VALUES (@id_usuario, @direccion_linea1, @ciudad, @estado, @pais, @codigo_postal, @es_predeterminada)');
    return createdResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al crear la dirección'); }
}

export async function PUT(request: NextRequest) {
  try {
    requireAdmin(request);
    const body = await request.json();
    const { id } = body;
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();
    if (body.es_direccion_envio_predeterminada) {
      const dir = await pool.request().input('id', sql.BigInt, id).query('SELECT id_usuario FROM direcciones_usuario WHERE id = @id');
      if (dir.recordset.length > 0) {
        await pool.request().input('id_usuario', sql.BigInt, dir.recordset[0].id_usuario).input('id', sql.BigInt, id)
          .query('UPDATE direcciones_usuario SET es_direccion_envio_predeterminada = 0 WHERE id_usuario = @id_usuario AND id != @id');
      }
    }
    const req = pool.request().input('id', sql.BigInt, id);
    const sets: string[] = [];
    if (body.direccion_linea1 !== undefined) { req.input('direccion_linea1', sql.NVarChar, body.direccion_linea1); sets.push('direccion_linea1 = @direccion_linea1'); }
    if (body.ciudad !== undefined)           { req.input('ciudad', sql.NVarChar, body.ciudad);                     sets.push('ciudad = @ciudad'); }
    if (body.estado !== undefined)           { req.input('estado', sql.NVarChar, body.estado);                     sets.push('estado = @estado'); }
    if (body.pais !== undefined)             { req.input('pais', sql.NVarChar, body.pais);                         sets.push('pais = @pais'); }
    if (body.codigo_postal !== undefined)    { req.input('codigo_postal', sql.NVarChar, body.codigo_postal);       sets.push('codigo_postal = @codigo_postal'); }
    if (body.es_direccion_envio_predeterminada !== undefined) {
      req.input('es_predeterminada', sql.Bit, body.es_direccion_envio_predeterminada ? 1 : 0);
      sets.push('es_direccion_envio_predeterminada = @es_predeterminada');
    }
    sets.push('actualizado_en = SYSDATETIME()');
    if (sets.length === 1) return errorResponse('Nada que actualizar', 400);
    const result = await req.query(`UPDATE direcciones_usuario SET ${sets.join(', ')} OUTPUT INSERTED.* WHERE id = @id`);
    if (result.recordset.length === 0) return errorResponse('Dirección no encontrada', 404);
    return successResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al actualizar la dirección'); }
}

export async function DELETE(request: NextRequest) {
  try {
    requireAdmin(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();
    const result = await pool.request().input('id', sql.BigInt, id).query('DELETE FROM direcciones_usuario OUTPUT DELETED.id WHERE id = @id');
    if (result.recordset.length === 0) return errorResponse('Dirección no encontrada', 404);
    return successResponse({ message: 'Dirección eliminada' });
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al eliminar la dirección'); }
}
