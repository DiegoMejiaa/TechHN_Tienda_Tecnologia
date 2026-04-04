import { NextRequest } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { requireAdmin, requireAuth } from '@/lib/auth';
import { successResponse, errorResponse, createdResponse, authError } from '@/lib/api-response';

const ESTADOS_VALIDOS = ['pendiente', 'pagado', 'enviado', 'entregado', 'cancelado'];

export async function GET(request: NextRequest) {
  try {
    requireAuth(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const id_usuario = searchParams.get('id_usuario');
    const estado = searchParams.get('estado');
    const pool = await getConnection();
    if (id) {
      const pedido = await pool.request().input('id', sql.BigInt, id).query('SELECT * FROM pedidos WHERE id = @id');
      if (pedido.recordset.length === 0) return errorResponse('Pedido no encontrado', 404);
      const items = await pool.request().input('id_pedido', sql.BigInt, id).query(`
        SELECT ip.*, v.sku, v.nombre_variante, p.nombre as nombre_producto, p.imagen_url
        FROM items_pedido ip
        JOIN variantes_producto v ON ip.id_variante = v.id
        JOIN productos p ON v.id_producto = p.id
        WHERE ip.id_pedido = @id_pedido`);
      // Traer cupón aplicado si existe
      const cuponRes = await pool.request().input('id_pedido_c', sql.BigInt, id).query(`
        SELECT cp.descuento, c.codigo, c.tipo, c.valor
        FROM cupones_pedido cp JOIN cupones c ON cp.id_cupon = c.id
        WHERE cp.id_pedido = @id_pedido_c`);
      const cupon = cuponRes.recordset[0] || null;
      return successResponse({ ...pedido.recordset[0], items: items.recordset, cupon });
    }
    const req = pool.request();
    let query = `SELECT p.*, 
      u.nombre as nombre_usuario, u.apellido as apellido_usuario, u.correo as correo_usuario, u.telefono as telefono_usuario, u.id_rol as rol_usuario,
      c.nombre as nombre_cliente, c.apellido as apellido_cliente, c.telefono as telefono_cliente, c.correo as correo_cliente,
      p.cliente_nombre as nombre_cliente_directo, p.cliente_telefono as telefono_cliente_directo, p.cliente_correo as correo_cliente_directo,
      COALESCE(t_turno.nombre, t_cajero.nombre, t_pedido.nombre) as nombre_tienda,
      COALESCE(tu.id_tienda, u.id_tienda) as id_tienda_pedido,
      pg.metodo_pago
      FROM pedidos p 
      LEFT JOIN usuarios u ON p.id_usuario = u.id
      LEFT JOIN usuarios c ON p.id_cliente = c.id
      LEFT JOIN turnos tu ON tu.id_usuario = p.id_usuario 
        AND tu.hora_inicio <= p.creado_en 
        AND (tu.hora_fin IS NULL OR tu.hora_fin >= p.creado_en)
      LEFT JOIN tiendas t_turno ON tu.id_tienda = t_turno.id
      LEFT JOIN tiendas t_cajero ON u.id_tienda = t_cajero.id
      LEFT JOIN tiendas t_pedido ON p.id_tienda = t_pedido.id
      LEFT JOIN (SELECT id_pedido, MIN(metodo_pago) as metodo_pago FROM pagos GROUP BY id_pedido) pg ON pg.id_pedido = p.id
      WHERE 1=1`;
    if (id_usuario) { req.input('id_usuario', sql.BigInt, id_usuario); query += ' AND p.id_usuario = @id_usuario'; }
    if (estado)     { req.input('estado', sql.NVarChar, estado);       query += ' AND p.estado = @estado'; }
    // Admin de sucursal solo ve pedidos de su tienda
    const payload = requireAuth(request);
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
        // Ventas de cajeros cuyo turno era en esta tienda al momento del pedido,
        // O pedidos online cuyo stock salió de esta tienda (p.id_tienda)
        query += ` AND (
          tu.id_tienda = @id_tienda_admin
          OR (p.id_tienda = @id_tienda_admin AND u.id_rol != 2)
        )`;
      } else {
        query += ' AND 1=0';
      }
    }
    query += ' ORDER BY p.creado_en DESC';
    const result = await req.query(query);
    return successResponse(result.recordset);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al obtener los pedidos'); }
}

export async function POST(request: NextRequest) {
  try {
    requireAuth(request);
    const { id_usuario, id_cliente, cliente_nombre, cliente_telefono, cliente_correo, estado_inicial, pendiente_entrega, items,
            envio_direccion, envio_ciudad, envio_codigo_postal } = await request.json();
    if (!id_usuario || !items?.length) return errorResponse('id_usuario e items son requeridos', 400);
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      let monto_total = 0;
      const itemsConPrecio: { id_variante: number; cantidad: number; precio_unitario: number }[] = [];
      for (const item of items) {
        const variante = await transaction.request().input('id', sql.BigInt, item.id_variante)
          .query('SELECT precio, precio_oferta FROM variantes_producto WHERE id = @id AND activo = 1');
        if (variante.recordset.length === 0) { await transaction.rollback(); return errorResponse(`Variante ${item.id_variante} no encontrada o inactiva`, 404); }
        const precio_unitario = variante.recordset[0].precio_oferta ?? variante.recordset[0].precio;
        monto_total += precio_unitario * item.cantidad;
        itemsConPrecio.push({ id_variante: item.id_variante, cantidad: item.cantidad, precio_unitario });
      }

      // Determinar la tienda principal del pedido:
      // - Si es cajero con turno activo → su tienda
      // - Si es cliente online → la tienda con más stock del primer item
      const turnoResult = await transaction.request()
        .input('id_usuario_t', sql.BigInt, id_usuario)
        .query('SELECT TOP 1 id_tienda FROM turnos WHERE id_usuario = @id_usuario_t AND hora_fin IS NULL ORDER BY hora_inicio DESC');
      const id_tienda_cajero = turnoResult.recordset[0]?.id_tienda ?? null;

      let id_tienda_pedido: number | null = id_tienda_cajero;
      if (!id_tienda_pedido && itemsConPrecio.length > 0) {
        const stockPrincipal = await transaction.request()
          .input('id_variante_p', sql.BigInt, itemsConPrecio[0].id_variante)
          .query('SELECT TOP 1 id_tienda FROM niveles_stock WHERE id_variante = @id_variante_p AND cantidad > 0 ORDER BY cantidad DESC');
        id_tienda_pedido = stockPrincipal.recordset[0]?.id_tienda ?? null;
      }

      // Verificar si columna id_tienda existe en pedidos
      const colCheck = await pool.request().query(
        `SELECT COUNT(*) as existe FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'pedidos' AND COLUMN_NAME = 'id_tienda'`
      );
      const tiendaColExists = colCheck.recordset[0]?.existe > 0;

      const pedReq = transaction.request()
        .input('id_usuario', sql.BigInt, id_usuario)
        .input('id_cliente', sql.BigInt, id_cliente ?? null)
        .input('cliente_nombre', sql.NVarChar, cliente_nombre ?? null)
        .input('cliente_telefono', sql.NVarChar, cliente_telefono ?? null)
        .input('cliente_correo', sql.NVarChar, cliente_correo ?? null)
        .input('estado', sql.NVarChar, 'pagado')
        .input('pendiente_entrega', sql.Bit, pendiente_entrega ? 1 : 0)
        .input('monto_total', sql.Decimal(10, 2), monto_total)
        .input('envio_direccion', sql.NVarChar, envio_direccion?.trim() || null)
        .input('envio_ciudad', sql.NVarChar, envio_ciudad?.trim() || null)
        .input('envio_codigo_postal', sql.NVarChar, envio_codigo_postal?.trim() || null);

      let insertPedidoQuery: string;
      if (tiendaColExists && id_tienda_pedido) {
        pedReq.input('id_tienda_p', sql.BigInt, id_tienda_pedido);
        insertPedidoQuery = `INSERT INTO pedidos (id_usuario, id_cliente, cliente_nombre, cliente_telefono, cliente_correo, estado, pendiente_entrega, monto_total, id_tienda, envio_direccion, envio_ciudad, envio_codigo_postal) 
                OUTPUT INSERTED.* 
                VALUES (@id_usuario, @id_cliente, @cliente_nombre, @cliente_telefono, @cliente_correo, @estado, @pendiente_entrega, @monto_total, @id_tienda_p, @envio_direccion, @envio_ciudad, @envio_codigo_postal)`;
      } else {
        insertPedidoQuery = `INSERT INTO pedidos (id_usuario, id_cliente, cliente_nombre, cliente_telefono, cliente_correo, estado, pendiente_entrega, monto_total, envio_direccion, envio_ciudad, envio_codigo_postal) 
                OUTPUT INSERTED.* 
                VALUES (@id_usuario, @id_cliente, @cliente_nombre, @cliente_telefono, @cliente_correo, @estado, @pendiente_entrega, @monto_total, @envio_direccion, @envio_ciudad, @envio_codigo_postal)`;
      }
      const pedidoResult = await pedReq.query(insertPedidoQuery);
      const pedido = pedidoResult.recordset[0];

      for (const item of itemsConPrecio) {
        await transaction.request()
          .input('id_pedido', sql.BigInt, pedido.id)
          .input('id_variante', sql.BigInt, item.id_variante)
          .input('cantidad', sql.Int, item.cantidad)
          .input('precio_unitario', sql.Decimal(10, 2), item.precio_unitario)
          .query('INSERT INTO items_pedido (id_pedido, id_variante, cantidad, precio_unitario) VALUES (@id_pedido, @id_variante, @cantidad, @precio_unitario)');

        const stockResult = await transaction.request()
          .input('id_variante_s', sql.BigInt, item.id_variante)
          .query('SELECT id_variante, id_tienda, cantidad FROM niveles_stock WHERE id_variante = @id_variante_s AND cantidad > 0 ORDER BY cantidad DESC');

        let restante = item.cantidad;
        // Primero descontar de la tienda del cajero (o tienda principal del pedido)
        if (id_tienda_cajero) {
          const stockTienda = stockResult.recordset.find((r: { id_tienda: number }) => r.id_tienda === id_tienda_cajero);
          if (stockTienda && stockTienda.cantidad > 0) {
            const descontar = Math.min(restante, stockTienda.cantidad);
            await transaction.request()
              .input('id_variante_d', sql.BigInt, item.id_variante)
              .input('id_tienda_d', sql.BigInt, id_tienda_cajero)
              .input('descontar', sql.Int, descontar)
              .query('UPDATE niveles_stock SET cantidad = cantidad - @descontar WHERE id_variante = @id_variante_d AND id_tienda = @id_tienda_d');
            restante -= descontar;
          }
        }
        // Si aún queda restante, descontar de otras tiendas (mayor stock primero)
        for (const stockRow of stockResult.recordset) {
          if (restante <= 0) break;
          if (id_tienda_cajero && stockRow.id_tienda === id_tienda_cajero) continue;
          const descontar = Math.min(restante, stockRow.cantidad);
          await transaction.request()
            .input('id_variante_d2', sql.BigInt, stockRow.id_variante)
            .input('id_tienda_d2', sql.BigInt, stockRow.id_tienda)
            .input('descontar2', sql.Int, descontar)
            .query('UPDATE niveles_stock SET cantidad = cantidad - @descontar2 WHERE id_variante = @id_variante_d2 AND id_tienda = @id_tienda_d2');
          restante -= descontar;
        }
      }
      await transaction.request().input('id_usuario', sql.BigInt, id_usuario)
        .query('DELETE ic FROM items_carrito ic JOIN carritos_compra cc ON ic.id_carrito = cc.id WHERE cc.id_usuario = @id_usuario');
      await transaction.commit();
      return createdResponse({ ...pedido, items: itemsConPrecio });
    } catch (err) { await transaction.rollback(); throw err; }
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al crear el pedido'); }
}

export async function PUT(request: NextRequest) {
  try {
    const payload = requireAuth(request);
    const { id, estado } = await request.json();
    if (!id || !estado) return errorResponse('id y estado son requeridos', 400);
    if (!ESTADOS_VALIDOS.includes(estado)) return errorResponse(`Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}`, 400);
    const pool = await getConnection();

    // Clientes solo pueden cancelar sus propios pedidos
    const isAdminOrCajero = Number(payload.id_rol) === 1 || Number(payload.id_rol) === 2 || Number(payload.id_rol) === 4;
    if (!isAdminOrCajero) {
      if (estado !== 'cancelado') return errorResponse('Solo puedes cancelar tus pedidos', 403);
      const check = await pool.request().input('id', sql.BigInt, id).input('id_usuario', sql.BigInt, payload.id)
        .query('SELECT id FROM pedidos WHERE id = @id AND id_usuario = @id_usuario');
      if (check.recordset.length === 0) return errorResponse('Pedido no encontrado o no autorizado', 403);
    }

    // Verificar estado anterior para no devolver stock dos veces
    const estadoAnterior = await pool.request().input('id_check', sql.BigInt, id)
      .query('SELECT estado FROM pedidos WHERE id = @id_check');
    if (estadoAnterior.recordset.length === 0) return errorResponse('Pedido no encontrado', 404);
    const yaEstabaCancelado = estadoAnterior.recordset[0].estado === 'cancelado';

    const result = await pool.request().input('id', sql.BigInt, id).input('estado', sql.NVarChar, estado)
      .query('UPDATE pedidos SET estado = @estado OUTPUT INSERTED.* WHERE id = @id');
    if (result.recordset.length === 0) return errorResponse('Pedido no encontrado', 404);

    // Si se cancela y no estaba ya cancelado, devolver stock
    if (estado === 'cancelado' && !yaEstabaCancelado) {
      const pedido = result.recordset[0];

      // Obtener items del pedido
      const items = await pool.request().input('id_pedido_c', sql.BigInt, id)
        .query('SELECT id_variante, cantidad FROM items_pedido WHERE id_pedido = @id_pedido_c');

      // Obtener la tienda del cajero que procesó el pedido via turno
      const turnoRes = await pool.request()
        .input('id_usuario_c', sql.BigInt, pedido.id_usuario)
        .input('creado_en_c', sql.DateTime2, pedido.creado_en)
        .query(`SELECT TOP 1 id_tienda FROM turnos 
                WHERE id_usuario = @id_usuario_c 
                AND hora_inicio <= @creado_en_c
                ORDER BY hora_inicio DESC`);
      const id_tienda = turnoRes.recordset[0]?.id_tienda ?? null;

      if (id_tienda && items.recordset.length > 0) {
        for (const item of items.recordset) {
          await pool.request()
            .input('iv_c', sql.BigInt, item.id_variante)
            .input('it_c', sql.BigInt, id_tienda)
            .input('qty_c', sql.Int, item.cantidad)
            .query(`MERGE niveles_stock AS target
              USING (SELECT @iv_c AS id_variante, @it_c AS id_tienda) AS source
              ON target.id_variante = source.id_variante AND target.id_tienda = source.id_tienda
              WHEN MATCHED THEN UPDATE SET cantidad = cantidad + @qty_c
              WHEN NOT MATCHED THEN INSERT (id_variante, id_tienda, cantidad) VALUES (@iv_c, @it_c, @qty_c);`);
        }
      }
    }

    return successResponse(result.recordset[0]);
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al actualizar el pedido'); }
}

export async function DELETE(request: NextRequest) {
  try {
    requireAdmin(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return errorResponse('id es requerido', 400);
    const pool = await getConnection();
    const found = await pool.request().input('id', sql.BigInt, id).query('SELECT estado FROM pedidos WHERE id = @id');
    if (found.recordset.length === 0) return errorResponse('Pedido no encontrado', 404);
    if (found.recordset[0].estado !== 'pendiente') return errorResponse('Solo se pueden eliminar pedidos en estado pendiente', 400);
    await pool.request().input('id', sql.BigInt, id).query('DELETE FROM pedidos WHERE id = @id');
    return successResponse({ message: 'Pedido eliminado' });
  } catch (e) { const a = authError(e); if (a) return errorResponse(a, 403); return errorResponse('Error al eliminar el pedido'); }
}
