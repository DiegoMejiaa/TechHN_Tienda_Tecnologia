import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAdmin, requireStaff } from '@/lib/auth';
import { successResponse, errorResponse, createdResponse, authError } from '@/lib/api-response';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const payload = requireStaff(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const rol = searchParams.get('rol');
    const pool = await getConnection();
    if (id) {
      const result = await pool.request().input('id', sql.BigInt, id).query('SELECT id, id_rol, correo, nombre, apellido, telefono, creado_en, actualizado_en FROM usuarios WHERE id = @id');
      if (result.recordset.length === 0) return errorResponse('Usuario no encontrado', 404);
      return successResponse(result.recordset[0]);
    }
    const req = pool.request();
    let query = 'SELECT id, id_rol, id_tienda, correo, nombre, apellido, telefono, identidad, fecha_nacimiento, creado_en, actualizado_en FROM usuarios WHERE 1=1';
    if (rol) { req.input('id_rol', sql.BigInt, rol); query += ' AND id_rol = @id_rol'; }
    // Admin de sucursal: cajeros → solo los de su tienda; clientes → los que tienen pedidos en su tienda
    if (Number(payload.id_rol) === 4) {
      let idTienda = payload.id_tienda ? Number(payload.id_tienda) : null;
      if (!idTienda) {
        try {
          const colCheck = await pool.request().query(
            `SELECT COUNT(*) as existe FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'id_tienda'`
          );
          if (colCheck.recordset[0]?.existe > 0) {
            const uRes = await pool.request().input('uid', sql.BigInt, payload.id)
              .query('SELECT id_tienda FROM usuarios WHERE id = @uid');
            idTienda = uRes.recordset[0]?.id_tienda ?? null;
          }
        } catch { /* columna no existe */ }
      }
      if (idTienda) {
        req.input('id_tienda_admin', sql.BigInt, idTienda);
        const rolNum = rol ? Number(rol) : null;
        if (rolNum === 3) {
          // Clientes que tienen al menos un pedido en esta sucursal
          // (pedido de cajero de esta tienda via turno, O pedido online con id_tienda de esta sucursal)
          query += ` AND id_rol = 3 AND id IN (
            SELECT DISTINCT p.id_usuario FROM pedidos p
            LEFT JOIN usuarios u2 ON p.id_usuario = u2.id
            LEFT JOIN turnos tu ON tu.id_usuario = p.id_usuario
              AND tu.hora_inicio <= p.creado_en
              AND (tu.hora_fin IS NULL OR tu.hora_fin >= p.creado_en)
            WHERE tu.id_tienda = @id_tienda_admin
              OR p.id_tienda = @id_tienda_admin
            UNION
            SELECT DISTINCT p2.id_cliente FROM pedidos p2
            LEFT JOIN turnos tu2 ON tu2.id_usuario = p2.id_usuario
              AND tu2.hora_inicio <= p2.creado_en
              AND (tu2.hora_fin IS NULL OR tu2.hora_fin >= p2.creado_en)
            WHERE (tu2.id_tienda = @id_tienda_admin OR p2.id_tienda = @id_tienda_admin)
              AND p2.id_cliente IS NOT NULL
          )`;
        } else {
          // Cajeros y otros roles: solo los de esta tienda
          query += ' AND id_tienda = @id_tienda_admin AND id_rol = 2';
        }
      } else {
        query += ' AND 1=0';
      }
    }
    query += ' ORDER BY id';
    const result = await req.query(query);
    return successResponse(result.recordset);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al obtener los usuarios'); }
}

export async function POST(request: NextRequest) {
  try {
    requireStaff(request);
    const { id_rol, correo, contrasena, nombre, apellido, telefono, id_tienda, identidad, fecha_nacimiento } = await request.json();
    if (!id_rol || !correo || !contrasena || !nombre || !apellido) return errorResponse('Faltan campos requeridos', 400);
    const hash = await bcrypt.hash(contrasena, 10);
    const pool = await getConnection();

    // Verificar columnas opcionales
    const colsCheck = await pool.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'usuarios' AND COLUMN_NAME IN ('id_tienda','identidad','fecha_nacimiento')
    `);
    const cols = new Set(colsCheck.recordset.map((r: any) => r.COLUMN_NAME));

    const req = pool.request()
      .input('id_rol', sql.BigInt, id_rol)
      .input('correo', sql.NVarChar, correo)
      .input('hash_contrasena', sql.NVarChar, hash)
      .input('nombre', sql.NVarChar, nombre)
      .input('apellido', sql.NVarChar, apellido)
      .input('telefono', sql.NVarChar, telefono ?? null);

    const extraCols: string[] = [];
    const extraVals: string[] = [];

    if (cols.has('id_tienda') && id_tienda) {
      req.input('id_tienda', sql.BigInt, id_tienda);
      extraCols.push('id_tienda'); extraVals.push('@id_tienda');
    }
    if (cols.has('identidad') && identidad) {
      req.input('identidad', sql.NVarChar, identidad);
      extraCols.push('identidad'); extraVals.push('@identidad');
    }
    if (cols.has('fecha_nacimiento') && fecha_nacimiento) {
      req.input('fecha_nacimiento', sql.Date, fecha_nacimiento);
      extraCols.push('fecha_nacimiento'); extraVals.push('@fecha_nacimiento');
    }

    const colList = ['id_rol','correo','hash_contrasena','nombre','apellido','telefono',...extraCols].join(', ');
    const valList = ['@id_rol','@correo','@hash_contrasena','@nombre','@apellido','@telefono',...extraVals].join(', ');
    const baseOutput = ['id','id_rol','correo','nombre','apellido','telefono','creado_en',...extraCols];
    const outputStr = baseOutput.map(c => `INSERTED.${c}`).join(', ');

    const result = await req.query(
      `INSERT INTO usuarios (${colList}) OUTPUT ${outputStr} VALUES (${valList})`
    );
    return createdResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al crear el usuario'); }
}

export async function PUT(request: NextRequest) {
  try {
    requireAdmin(request);
    const body = await request.json();
    const { id } = body;
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();

    // Verificar si la columna id_tienda existe en la tabla
    const colCheck = await pool.request().query(
      `SELECT COUNT(*) as existe FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'id_tienda'`
    );
    const tiendaColumnExists = colCheck.recordset[0]?.existe > 0;

    const req = pool.request().input('id', sql.BigInt, id);
    const sets: string[] = [];
    if (body.id_rol !== undefined)   { req.input('id_rol', sql.BigInt, body.id_rol);                sets.push('id_rol = @id_rol'); }
    if ('id_tienda' in body && tiendaColumnExists) {
      req.input('id_tienda', sql.BigInt, body.id_tienda ?? null);
      sets.push('id_tienda = @id_tienda');
    }
    if (body.nombre !== undefined)   { req.input('nombre', sql.NVarChar, body.nombre);              sets.push('nombre = @nombre'); }
    if (body.apellido !== undefined) { req.input('apellido', sql.NVarChar, body.apellido);          sets.push('apellido = @apellido'); }
    if (body.telefono !== undefined) { req.input('telefono', sql.NVarChar, body.telefono ?? null);  sets.push('telefono = @telefono'); }
    if (body.contrasena) {
      const hash = await bcrypt.hash(body.contrasena, 10);
      req.input('hash_contrasena', sql.NVarChar, hash);
      sets.push('hash_contrasena = @hash_contrasena');
    }
    // Identidad y fecha de nacimiento (si las columnas existen)
    const identColCheck = await pool.request().query(
      `SELECT COUNT(*) as existe FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'identidad'`
    );
    if (identColCheck.recordset[0]?.existe > 0) {
      if ('identidad' in body) { req.input('identidad', sql.NVarChar, body.identidad ?? null); sets.push('identidad = @identidad'); }
      if ('fecha_nacimiento' in body) { req.input('fecha_nacimiento', sql.Date, body.fecha_nacimiento ?? null); sets.push('fecha_nacimiento = @fecha_nacimiento'); }
    }
    if (sets.length === 0) return errorResponse('Nada que actualizar', 400);
    const outputIdTienda = tiendaColumnExists ? ', id_tienda' : '';
    await req.query(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = @id`);
    const updated = await pool.request().input('id2', sql.BigInt, id)
      .query(`SELECT id, id_rol${outputIdTienda}, correo, nombre, apellido, telefono, identidad, fecha_nacimiento, actualizado_en FROM usuarios WHERE id = @id2`);
    if (updated.recordset.length === 0) return errorResponse('Usuario no encontrado', 404);
    return successResponse(updated.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); console.error('Error PUT usuario:', e); return errorResponse('Error al actualizar el usuario'); }
}

export async function DELETE(request: NextRequest) {
  try {
    requireAdmin(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();

    // Verificar que existe
    const check = await pool.request().input('id', sql.BigInt, id)
      .query('SELECT id FROM usuarios WHERE id = @id');
    if (check.recordset.length === 0) return errorResponse('Usuario no encontrado', 404);

    // Eliminar datos relacionados en orden para respetar FK
    const req = () => pool.request().input('id', sql.BigInt, id);

    // 1. Items de devolución → devoluciones (via pedidos del usuario)
    await req().query(`
      DELETE id FROM items_devolucion id
      INNER JOIN devoluciones d ON id.id_devolucion = d.id
      INNER JOIN pedidos p ON d.id_pedido = p.id
      WHERE p.id_usuario = @id
    `);
    await req().query(`
      DELETE d FROM devoluciones d
      INNER JOIN pedidos p ON d.id_pedido = p.id
      WHERE p.id_usuario = @id
    `);

    // 2. Cupones aplicados a pedidos del usuario
    await req().query(`
      DELETE cp FROM cupones_pedido cp
      INNER JOIN pedidos p ON cp.id_pedido = p.id
      WHERE p.id_usuario = @id
    `);

    // 3. Pagos de pedidos del usuario
    await req().query(`
      DELETE pg FROM pagos pg
      INNER JOIN pedidos p ON pg.id_pedido = p.id
      WHERE p.id_usuario = @id
    `);

    // 4. Items de pedido → pedidos
    await req().query(`
      DELETE ip FROM items_pedido ip
      INNER JOIN pedidos p ON ip.id_pedido = p.id
      WHERE p.id_usuario = @id
    `);
    await req().query('DELETE FROM pedidos WHERE id_usuario = @id');

    // 5. Items de carrito → carritos
    await req().query(`
      DELETE ic FROM items_carrito ic
      INNER JOIN carritos_compra cc ON ic.id_carrito = cc.id
      WHERE cc.id_usuario = @id
    `);
    await req().query('DELETE FROM carritos_compra WHERE id_usuario = @id');

    // 6. Direcciones (ON DELETE CASCADE pero por si acaso)
    await req().query('DELETE FROM direcciones_usuario WHERE id_usuario = @id');

    // 7. Turnos del usuario
    await req().query('DELETE FROM turnos WHERE id_usuario = @id');

    // 8. Finalmente el usuario
    await req().query('DELETE FROM usuarios WHERE id = @id');

    return successResponse({ message: 'Usuario eliminado' });
  } catch (e) {
    const a = authError(e);
    if (a) return errorResponse(a, 403);
    console.error('Error al eliminar usuario:', e);
    return errorResponse('Error al eliminar el usuario');
  }
}
