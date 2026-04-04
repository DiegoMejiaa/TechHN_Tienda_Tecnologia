-- ======================================================
-- SEED DE PRUEBA - DATOS HONDURAS
-- Sin IDs hardcodeados, todo por subquery
-- ======================================================

-- Limpiar en orden inverso por FK
DELETE FROM pagos;
DELETE FROM items_pedido;
DELETE FROM pedidos;
DELETE FROM items_carrito;
DELETE FROM carritos_compra;
DELETE FROM niveles_stock;
DELETE FROM variantes_producto;
DELETE FROM productos;
DELETE FROM categorias;
DELETE FROM marcas;
DELETE FROM tiendas;
DELETE FROM direcciones_usuario;
DELETE FROM usuarios;
DELETE FROM roles;

-- Reiniciar identidades
DBCC CHECKIDENT ('roles',              RESEED, 0);
DBCC CHECKIDENT ('usuarios',           RESEED, 0);
DBCC CHECKIDENT ('direcciones_usuario',RESEED, 0);
DBCC CHECKIDENT ('marcas',             RESEED, 0);
DBCC CHECKIDENT ('categorias',         RESEED, 0);
DBCC CHECKIDENT ('productos',          RESEED, 0);
DBCC CHECKIDENT ('variantes_producto', RESEED, 0);
DBCC CHECKIDENT ('tiendas',            RESEED, 0);
DBCC CHECKIDENT ('carritos_compra',    RESEED, 0);
DBCC CHECKIDENT ('items_carrito',      RESEED, 0);
DBCC CHECKIDENT ('pedidos',            RESEED, 0);
DBCC CHECKIDENT ('items_pedido',       RESEED, 0);
DBCC CHECKIDENT ('pagos',              RESEED, 0);

-- ======================================================
-- roles
-- ======================================================
INSERT INTO roles (nombre) VALUES ('admin');
INSERT INTO roles (nombre) VALUES ('cajero');
INSERT INTO roles (nombre) VALUES ('cliente');

-- ======================================================
-- usuarios (contrasena de prueba: "password")
-- ======================================================
INSERT INTO usuarios (id_rol, correo, hash_contrasena, nombre, apellido, telefono)
VALUES ((SELECT id FROM roles WHERE nombre='admin'),
        'admin@techhn.com',
        '$2b$10$PTbG59tLcVxCgkip4IEelOV87VEowqAc7gJi99Cn.NPrvAtiEyNVW',
        'Jose', 'Reyes', '9988-1100');

INSERT INTO usuarios (id_rol, correo, hash_contrasena, nombre, apellido, telefono)
VALUES ((SELECT id FROM roles WHERE nombre='cajero'),
        'cajero@techhn.com',
        '$2b$10$PTbG59tLcVxCgkip4IEelOV87VEowqAc7gJi99Cn.NPrvAtiEyNVW',
        'Maria', 'Zelaya', '9988-2200');

INSERT INTO usuarios (id_rol, correo, hash_contrasena, nombre, apellido, telefono)
VALUES ((SELECT id FROM roles WHERE nombre='cliente'),
        'cliente@techhn.com',
        '$2b$10$PTbG59tLcVxCgkip4IEelOV87VEowqAc7gJi99Cn.NPrvAtiEyNVW',
        'Carlos', 'Mejia', '9988-3300');

-- ======================================================
-- direcciones_usuario
-- ======================================================
INSERT INTO direcciones_usuario (id_usuario, direccion_linea1, ciudad, estado, pais, codigo_postal, es_direccion_envio_predeterminada)
VALUES ((SELECT id FROM usuarios WHERE correo='admin@techhn.com'),
        'Barrio El Centro, Av. Cervantes 8', 'Tegucigalpa', 'Francisco Morazan', 'Honduras', '11001', 1);

INSERT INTO direcciones_usuario (id_usuario, direccion_linea1, ciudad, estado, pais, codigo_postal, es_direccion_envio_predeterminada)
VALUES ((SELECT id FROM usuarios WHERE correo='cajero@techhn.com'),
        'Col. Trejo, 3ra Calle 12', 'San Pedro Sula', 'Cortes', 'Honduras', '21102', 1);

INSERT INTO direcciones_usuario (id_usuario, direccion_linea1, ciudad, estado, pais, codigo_postal, es_direccion_envio_predeterminada)
VALUES ((SELECT id FROM usuarios WHERE correo='cliente@techhn.com'),
        'Col. Kennedy, Blvd. Morazan 45', 'Tegucigalpa', 'Francisco Morazan', 'Honduras', '11101', 1);

-- ======================================================
-- marcas
-- ======================================================
INSERT INTO marcas (nombre) VALUES ('Samsung');
INSERT INTO marcas (nombre) VALUES ('Apple');
INSERT INTO marcas (nombre) VALUES ('Xiaomi');
INSERT INTO marcas (nombre) VALUES ('Sony');

-- ======================================================
-- categorias
-- ======================================================
INSERT INTO categorias (nombre, slug, id_categoria_padre) VALUES ('Electronica', 'electronica', NULL);
INSERT INTO categorias (nombre, slug, id_categoria_padre) VALUES ('Accesorios',  'accesorios',  NULL);
INSERT INTO categorias (nombre, slug, id_categoria_padre) VALUES ('Smartphones', 'smartphones', (SELECT id FROM categorias WHERE slug='electronica'));
INSERT INTO categorias (nombre, slug, id_categoria_padre) VALUES ('Laptops',     'laptops',     (SELECT id FROM categorias WHERE slug='electronica'));
INSERT INTO categorias (nombre, slug, id_categoria_padre) VALUES ('Audio',       'audio',       (SELECT id FROM categorias WHERE slug='electronica'));

-- ======================================================
-- productos
-- ======================================================
INSERT INTO productos (id_marca, id_categoria, nombre, descripcion)
VALUES ((SELECT id FROM marcas WHERE nombre='Samsung'),
        (SELECT id FROM categorias WHERE slug='smartphones'),
        'Samsung Galaxy S24', 'Smartphone flagship de Samsung 2024');

INSERT INTO productos (id_marca, id_categoria, nombre, descripcion)
VALUES ((SELECT id FROM marcas WHERE nombre='Apple'),
        (SELECT id FROM categorias WHERE slug='smartphones'),
        'iPhone 15 Pro', 'Smartphone premium de Apple');

INSERT INTO productos (id_marca, id_categoria, nombre, descripcion)
VALUES ((SELECT id FROM marcas WHERE nombre='Xiaomi'),
        (SELECT id FROM categorias WHERE slug='smartphones'),
        'Xiaomi Redmi Note 13', 'Smartphone gama media de Xiaomi');

INSERT INTO productos (id_marca, id_categoria, nombre, descripcion)
VALUES ((SELECT id FROM marcas WHERE nombre='Sony'),
        (SELECT id FROM categorias WHERE slug='audio'),
        'Sony WH-1000XM5', 'Audifonos inalambricos con cancelacion de ruido');

INSERT INTO productos (id_marca, id_categoria, nombre, descripcion)
VALUES ((SELECT id FROM marcas WHERE nombre='Samsung'),
        (SELECT id FROM categorias WHERE slug='laptops'),
        'Samsung Galaxy Book 4', 'Laptop ultradelgada de Samsung');

-- ======================================================
-- variantes_producto
-- ======================================================
INSERT INTO variantes_producto (id_producto, sku, nombre_variante, precio, precio_oferta)
VALUES ((SELECT id FROM productos WHERE nombre='Samsung Galaxy S24'),
        'SAM-S24-NEG-256', 'Galaxy S24 Negro 256GB', 14999.00, 13499.00);

INSERT INTO variantes_producto (id_producto, sku, nombre_variante, precio, precio_oferta)
VALUES ((SELECT id FROM productos WHERE nombre='Samsung Galaxy S24'),
        'SAM-S24-BLA-256', 'Galaxy S24 Blanco 256GB', 14999.00, 13499.00);

INSERT INTO variantes_producto (id_producto, sku, nombre_variante, precio, precio_oferta)
VALUES ((SELECT id FROM productos WHERE nombre='iPhone 15 Pro'),
        'APL-IP15P-NEG-256', 'iPhone 15 Pro Negro 256GB', 22999.00, 21999.00);

INSERT INTO variantes_producto (id_producto, sku, nombre_variante, precio, precio_oferta)
VALUES ((SELECT id FROM productos WHERE nombre='iPhone 15 Pro'),
        'APL-IP15P-BLA-512', 'iPhone 15 Pro Blanco 512GB', 26999.00, 25999.00);

INSERT INTO variantes_producto (id_producto, sku, nombre_variante, precio, precio_oferta)
VALUES ((SELECT id FROM productos WHERE nombre='Xiaomi Redmi Note 13'),
        'XIA-RN13-AZU-128', 'Redmi Note 13 Azul 128GB', 4999.00, 4499.00);

INSERT INTO variantes_producto (id_producto, sku, nombre_variante, precio, precio_oferta)
VALUES ((SELECT id FROM productos WHERE nombre='Sony WH-1000XM5'),
        'SNY-WH1000-NEG', 'WH-1000XM5 Negro', 7499.00, 6999.00);

INSERT INTO variantes_producto (id_producto, sku, nombre_variante, precio, precio_oferta)
VALUES ((SELECT id FROM productos WHERE nombre='Samsung Galaxy Book 4'),
        'SAM-GB4-PLA-512', 'Galaxy Book 4 Plata 512GB', 19999.00, 18999.00);

-- ======================================================
-- tiendas
-- ======================================================
INSERT INTO tiendas (nombre, ciudad) VALUES ('TechHN Tegucigalpa', 'Tegucigalpa');
INSERT INTO tiendas (nombre, ciudad) VALUES ('TechHN San Pedro',   'San Pedro Sula');
INSERT INTO tiendas (nombre, ciudad) VALUES ('TechHN La Ceiba',    'La Ceiba');

-- ======================================================
-- niveles_stock (por subquery de sku y nombre tienda)
-- ======================================================
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='SAM-S24-NEG-256'),   (SELECT id FROM tiendas WHERE nombre='TechHN Tegucigalpa'), 25);
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='SAM-S24-NEG-256'),   (SELECT id FROM tiendas WHERE nombre='TechHN San Pedro'),   10);
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='SAM-S24-NEG-256'),   (SELECT id FROM tiendas WHERE nombre='TechHN La Ceiba'),     8);
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='SAM-S24-BLA-256'),   (SELECT id FROM tiendas WHERE nombre='TechHN Tegucigalpa'), 15);
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='SAM-S24-BLA-256'),   (SELECT id FROM tiendas WHERE nombre='TechHN San Pedro'),   12);
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='SAM-S24-BLA-256'),   (SELECT id FROM tiendas WHERE nombre='TechHN La Ceiba'),     6);
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='APL-IP15P-NEG-256'), (SELECT id FROM tiendas WHERE nombre='TechHN Tegucigalpa'),  8);
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='APL-IP15P-NEG-256'), (SELECT id FROM tiendas WHERE nombre='TechHN San Pedro'),    5);
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='APL-IP15P-NEG-256'), (SELECT id FROM tiendas WHERE nombre='TechHN La Ceiba'),     3);
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='APL-IP15P-BLA-512'), (SELECT id FROM tiendas WHERE nombre='TechHN Tegucigalpa'),  3);
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='APL-IP15P-BLA-512'), (SELECT id FROM tiendas WHERE nombre='TechHN San Pedro'),    4);
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='APL-IP15P-BLA-512'), (SELECT id FROM tiendas WHERE nombre='TechHN La Ceiba'),     2);
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='XIA-RN13-AZU-128'),  (SELECT id FROM tiendas WHERE nombre='TechHN Tegucigalpa'), 30);
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='XIA-RN13-AZU-128'),  (SELECT id FROM tiendas WHERE nombre='TechHN San Pedro'),   20);
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='XIA-RN13-AZU-128'),  (SELECT id FROM tiendas WHERE nombre='TechHN La Ceiba'),    15);
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='SNY-WH1000-NEG'),    (SELECT id FROM tiendas WHERE nombre='TechHN Tegucigalpa'), 12);
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='SNY-WH1000-NEG'),    (SELECT id FROM tiendas WHERE nombre='TechHN San Pedro'),    8);
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='SNY-WH1000-NEG'),    (SELECT id FROM tiendas WHERE nombre='TechHN La Ceiba'),     5);
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='SAM-GB4-PLA-512'),   (SELECT id FROM tiendas WHERE nombre='TechHN Tegucigalpa'),  6);
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='SAM-GB4-PLA-512'),   (SELECT id FROM tiendas WHERE nombre='TechHN San Pedro'),    4);
INSERT INTO niveles_stock (id_variante, id_tienda, cantidad) VALUES ((SELECT id FROM variantes_producto WHERE sku='SAM-GB4-PLA-512'),   (SELECT id FROM tiendas WHERE nombre='TechHN La Ceiba'),     2);

-- ======================================================
-- carritos_compra
-- ======================================================
INSERT INTO carritos_compra (id_usuario) VALUES ((SELECT id FROM usuarios WHERE correo='admin@techhn.com'));
INSERT INTO carritos_compra (id_usuario) VALUES ((SELECT id FROM usuarios WHERE correo='cajero@techhn.com'));
INSERT INTO carritos_compra (id_usuario) VALUES ((SELECT id FROM usuarios WHERE correo='cliente@techhn.com'));

-- ======================================================
-- items_carrito
-- ======================================================
INSERT INTO items_carrito (id_carrito, id_variante, cantidad)
VALUES ((SELECT id FROM carritos_compra WHERE id_usuario=(SELECT id FROM usuarios WHERE correo='cliente@techhn.com')),
        (SELECT id FROM variantes_producto WHERE sku='SAM-S24-NEG-256'), 1);

INSERT INTO items_carrito (id_carrito, id_variante, cantidad)
VALUES ((SELECT id FROM carritos_compra WHERE id_usuario=(SELECT id FROM usuarios WHERE correo='cliente@techhn.com')),
        (SELECT id FROM variantes_producto WHERE sku='SNY-WH1000-NEG'), 2);

INSERT INTO items_carrito (id_carrito, id_variante, cantidad)
VALUES ((SELECT id FROM carritos_compra WHERE id_usuario=(SELECT id FROM usuarios WHERE correo='admin@techhn.com')),
        (SELECT id FROM variantes_producto WHERE sku='SAM-GB4-PLA-512'), 1);

-- ======================================================
-- pedidos
-- ======================================================
INSERT INTO pedidos (id_usuario, estado, monto_total)
VALUES ((SELECT id FROM usuarios WHERE correo='cliente@techhn.com'), 'entregado', 14999.00);

INSERT INTO pedidos (id_usuario, estado, monto_total)
VALUES ((SELECT id FROM usuarios WHERE correo='cliente@techhn.com'), 'pagado', 22999.00);

INSERT INTO pedidos (id_usuario, estado, monto_total)
VALUES ((SELECT id FROM usuarios WHERE correo='cliente@techhn.com'), 'entregado', 4999.00);

INSERT INTO pedidos (id_usuario, estado, monto_total)
VALUES ((SELECT id FROM usuarios WHERE correo='admin@techhn.com'), 'pendiente', 19999.00);

-- ======================================================
-- items_pedido (por ORDER de creacion de pedidos)
-- ======================================================
INSERT INTO items_pedido (id_pedido, id_variante, cantidad, precio_unitario)
VALUES ((SELECT TOP 1 id FROM pedidos WHERE id_usuario=(SELECT id FROM usuarios WHERE correo='cliente@techhn.com') ORDER BY id ASC),
        (SELECT id FROM variantes_producto WHERE sku='SAM-S24-NEG-256'), 1, 14999.00);

INSERT INTO items_pedido (id_pedido, id_variante, cantidad, precio_unitario)
VALUES ((SELECT TOP 1 id FROM pedidos WHERE id_usuario=(SELECT id FROM usuarios WHERE correo='cliente@techhn.com') ORDER BY id DESC),
        (SELECT id FROM variantes_producto WHERE sku='APL-IP15P-NEG-256'), 1, 22999.00);

INSERT INTO items_pedido (id_pedido, id_variante, cantidad, precio_unitario)
VALUES ((SELECT TOP 1 id FROM pedidos WHERE estado='entregado' AND id_usuario=(SELECT id FROM usuarios WHERE correo='cliente@techhn.com') ORDER BY id DESC),
        (SELECT id FROM variantes_producto WHERE sku='XIA-RN13-AZU-128'), 1, 4999.00);

INSERT INTO items_pedido (id_pedido, id_variante, cantidad, precio_unitario)
VALUES ((SELECT id FROM pedidos WHERE id_usuario=(SELECT id FROM usuarios WHERE correo='admin@techhn.com')),
        (SELECT id FROM variantes_producto WHERE sku='SAM-GB4-PLA-512'), 1, 19999.00);

-- ======================================================
-- pagos
-- ======================================================
INSERT INTO pagos (id_pedido, monto, metodo_pago, estado)
VALUES ((SELECT TOP 1 id FROM pedidos WHERE id_usuario=(SELECT id FROM usuarios WHERE correo='cliente@techhn.com') ORDER BY id ASC),
        14999.00, 'tarjeta', 'completado');

INSERT INTO pagos (id_pedido, monto, metodo_pago, estado)
VALUES ((SELECT TOP 1 id FROM pedidos WHERE id_usuario=(SELECT id FROM usuarios WHERE correo='cliente@techhn.com') ORDER BY id DESC),
        22999.00, 'transferencia', 'completado');

INSERT INTO pagos (id_pedido, monto, metodo_pago, estado)
VALUES ((SELECT TOP 1 id FROM pedidos WHERE estado='entregado' AND id_usuario=(SELECT id FROM usuarios WHERE correo='cliente@techhn.com') ORDER BY id DESC),
        4999.00, 'efectivo', 'completado');

INSERT INTO pagos (id_pedido, monto, metodo_pago, estado)
VALUES ((SELECT id FROM pedidos WHERE id_usuario=(SELECT id FROM usuarios WHERE correo='admin@techhn.com')),
        19999.00, 'tarjeta', 'pendiente');

-- ======================================================
-- imagenes_producto
-- ======================================================
INSERT INTO imagenes_producto (id_variante, url, cloudinary_public_id, orden)
VALUES ((SELECT id FROM variantes_producto WHERE sku='SAM-S24-NEG-256'),
        'https://res.cloudinary.com/dxjydtwyi/image/upload/v1774926986/Samsung-Galaxy-S24-Ultra-flagship-smartphone-transparent-PNG-image_wwkkby.png',
        'Samsung-Galaxy-S24-Ultra-flagship-smartphone-transparent-PNG-image_wwkkby', 0);

INSERT INTO imagenes_producto (id_variante, url, cloudinary_public_id, orden)
VALUES ((SELECT id FROM variantes_producto WHERE sku='SAM-S24-BLA-256'),
        'https://res.cloudinary.com/dxjydtwyi/image/upload/v1774926986/Samsung-Galaxy-S24-Ultra-flagship-smartphone-transparent-PNG-image_wwkkby.png',
        'Samsung-Galaxy-S24-Ultra-flagship-smartphone-transparent-PNG-image_wwkkby', 0);

INSERT INTO imagenes_producto (id_variante, url, cloudinary_public_id, orden)
VALUES ((SELECT id FROM variantes_producto WHERE sku='APL-IP15P-NEG-256'),
        'https://res.cloudinary.com/dxjydtwyi/image/upload/v1774926971/CITYPNG.COM_iPhone_15_Pro_and_Pro_Max_Natural_Titanium_HD_PNG_-_5000x5000_mj8i2w.png',
        'CITYPNG.COM_iPhone_15_Pro_and_Pro_Max_Natural_Titanium_HD_PNG_-_5000x5000_mj8i2w', 0);

INSERT INTO imagenes_producto (id_variante, url, cloudinary_public_id, orden)
VALUES ((SELECT id FROM variantes_producto WHERE sku='APL-IP15P-BLA-512'),
        'https://res.cloudinary.com/dxjydtwyi/image/upload/v1774926971/CITYPNG.COM_iPhone_15_Pro_and_Pro_Max_Natural_Titanium_HD_PNG_-_5000x5000_mj8i2w.png',
        'CITYPNG.COM_iPhone_15_Pro_and_Pro_Max_Natural_Titanium_HD_PNG_-_5000x5000_mj8i2w', 0);

INSERT INTO imagenes_producto (id_variante, url, cloudinary_public_id, orden)
VALUES ((SELECT id FROM variantes_producto WHERE sku='XIA-RN13-AZU-128'),
        'https://res.cloudinary.com/dxjydtwyi/image/upload/v1774926886/72a71b312950178179eeb71425ef8def_jkzipn.png',
        '72a71b312950178179eeb71425ef8def_jkzipn', 0);

INSERT INTO imagenes_producto (id_variante, url, cloudinary_public_id, orden)
VALUES ((SELECT id FROM variantes_producto WHERE sku='SNY-WH1000-NEG'),
        'https://res.cloudinary.com/dxjydtwyi/image/upload/v1774927239/Untitled685023_umkofw.png',
        'Untitled685023_umkofw', 0);

INSERT INTO imagenes_producto (id_variante, url, cloudinary_public_id, orden)
VALUES ((SELECT id FROM variantes_producto WHERE sku='SAM-GB4-PLA-512'),
        'https://res.cloudinary.com/dxjydtwyi/image/upload/v1774926858/c_kkbfrn.png',
        'c_kkbfrn', 0);
