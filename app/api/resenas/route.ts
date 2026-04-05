import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse, createdResponse, authError } from '@/lib/api-response';

// GET /api/resenas?id_producto=X  — público
export async function GET(request: NextRequest) {
  try {
    const id_producto = new URL(request.url).searchParams.get('id_producto');
    if (!id_producto) return errorResponse('id_producto requerido', 400);

    const pool = await getConnection();
    const result = await pool.request()
      .input('id_producto', sql.BigInt, id_producto)
      .query(`
        SELECT
          r.id, r.estrellas, r.comentario, r.creado_en,
          u.nombre + ' ' + LEFT(u.apellido, 1) + '.' AS nombre_usuario
        FROM resenas r
        JOIN usuarios u ON u.id = r.id_usuario
        WHERE r.id_producto = @id_producto
        ORDER BY r.creado_en DESC
      `);

    const resenas = result.recordset;
    const total = resenas.length;
    const promedio = total > 0
      ? Math.round((resenas.reduce((s: number, r: { estrellas: number }) => s + r.estrellas, 0) / total) * 10) / 10
      : 0;

    return successResponse({ resenas, promedio, total });
  } catch (e) {
    console.error(e);
    return errorResponse('Error al obtener reseñas');
  }
}

// POST /api/resenas — requiere auth + haber comprado el producto
export async function POST(request: NextRequest) {
  try {
    const usuario = requireAuth(request);
    const { id_producto, estrellas, comentario } = await request.json();

    if (!id_producto || !estrellas) return errorResponse('Datos incompletos', 400);
    if (estrellas < 1 || estrellas > 5) return errorResponse('Estrellas debe ser entre 1 y 5', 400);

    const pool = await getConnection();

    // Verificar que haya comprado y recibido el producto
    const compraRes = await pool.request()
      .input('id_usuario', sql.BigInt, usuario.id)
      .input('id_producto', sql.BigInt, id_producto)
      .query(`
        SELECT TOP 1 p.id FROM pedidos p
        JOIN items_pedido ip ON ip.id_pedido = p.id
        JOIN variantes_producto vp ON vp.id = ip.id_variante
        WHERE p.id_usuario = @id_usuario
          AND vp.id_producto = @id_producto
          AND p.estado IN ('entregado', 'completado')
      `);

    if (compraRes.recordset.length === 0)
      return errorResponse('Solo puedes reseñar productos que hayas comprado y recibido', 403);

    // Insertar o actualizar reseña
    await pool.request()
      .input('id_producto', sql.BigInt, id_producto)
      .input('id_usuario', sql.BigInt, usuario.id)
      .input('estrellas', sql.TinyInt, estrellas)
      .input('comentario', sql.NVarChar, comentario?.trim() || null)
      .query(`
        IF EXISTS (SELECT 1 FROM resenas WHERE id_producto = @id_producto AND id_usuario = @id_usuario)
          UPDATE resenas SET estrellas = @estrellas, comentario = @comentario WHERE id_producto = @id_producto AND id_usuario = @id_usuario
        ELSE
          INSERT INTO resenas (id_producto, id_usuario, estrellas, comentario) VALUES (@id_producto, @id_usuario, @estrellas, @comentario)
      `);

    return createdResponse({ message: 'Reseña guardada' });
  } catch (e: any) {
    const a = authError(e);
    if (a) return errorResponse(a, 401);
    console.error(e);
    return errorResponse('Error al guardar la reseña');
  }
}

// DELETE /api/resenas?id_producto=X — el usuario elimina su propia reseña
export async function DELETE(request: NextRequest) {
  try {
    const usuario = requireAuth(request);
    const id_producto = new URL(request.url).searchParams.get('id_producto');
    if (!id_producto) return errorResponse('id_producto requerido', 400);

    const pool = await getConnection();
    await pool.request()
      .input('id_producto', sql.BigInt, id_producto)
      .input('id_usuario', sql.BigInt, usuario.id)
      .query('DELETE FROM resenas WHERE id_producto = @id_producto AND id_usuario = @id_usuario');

    return successResponse({ message: 'Reseña eliminada' });
  } catch (e: any) {
    const a = authError(e);
    if (a) return errorResponse(a, 401);
    return errorResponse('Error al eliminar la reseña');
  }
}
