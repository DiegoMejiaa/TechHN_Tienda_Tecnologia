USE [TuBaseDeDatos];
GO

-- =========================
-- ROLES
-- =========================
CREATE TABLE roles (
  id BIGINT IDENTITY PRIMARY KEY,
  nombre NVARCHAR(100) NOT NULL UNIQUE,
  creado_en DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

-- =========================
-- USUARIOS
-- =========================
CREATE TABLE usuarios (
  id BIGINT IDENTITY PRIMARY KEY,
  id_rol BIGINT NOT NULL,
  correo NVARCHAR(255) NOT NULL UNIQUE,
  hash_contrasena NVARCHAR(255) NOT NULL,
  nombre NVARCHAR(100) NOT NULL,
  apellido NVARCHAR(100) NOT NULL,
  telefono NVARCHAR(20),
  creado_en DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  actualizado_en DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

  FOREIGN KEY (id_rol) REFERENCES roles(id)
);
CREATE INDEX idx_usuario_rol ON usuarios(id_rol);

-- =========================
-- DIRECCIONES
-- =========================
CREATE TABLE direcciones_usuario (
  id BIGINT IDENTITY PRIMARY KEY,
  id_usuario BIGINT NOT NULL,
  direccion_linea1 NVARCHAR(255) NOT NULL,
  ciudad NVARCHAR(100) NOT NULL,
  estado NVARCHAR(100) NOT NULL,
  pais NVARCHAR(100) NOT NULL,
  codigo_postal NVARCHAR(20) NOT NULL,
  es_direccion_envio_predeterminada BIT NOT NULL DEFAULT 0,
  creado_en DATETIME2 DEFAULT SYSDATETIME(),
  actualizado_en DATETIME2 DEFAULT SYSDATETIME(),

  FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- 🔥 SOLO UNA DIRECCIÓN PREDETERMINADA POR USUARIO
CREATE UNIQUE INDEX ux_direccion_predeterminada
ON direcciones_usuario(id_usuario)
WHERE es_direccion_envio_predeterminada = 1;

-- =========================
-- MARCAS Y CATEGORIAS
-- =========================
CREATE TABLE marcas (
  id BIGINT IDENTITY PRIMARY KEY,
  nombre NVARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE categorias (
  id BIGINT IDENTITY PRIMARY KEY,
  id_categoria_padre BIGINT NULL,
  nombre NVARCHAR(100) NOT NULL,
  slug NVARCHAR(100) UNIQUE NOT NULL,

  FOREIGN KEY (id_categoria_padre) REFERENCES categorias(id)
);

-- =========================
-- PRODUCTOS
-- =========================
CREATE TABLE productos (
  id BIGINT IDENTITY PRIMARY KEY,
  id_marca BIGINT NOT NULL,
  id_categoria BIGINT NOT NULL,
  nombre NVARCHAR(200) NOT NULL,
  descripcion NVARCHAR(MAX),
  activo BIT DEFAULT 1,
  creado_en DATETIME2 DEFAULT SYSDATETIME(),

  FOREIGN KEY (id_marca) REFERENCES marcas(id),
  FOREIGN KEY (id_categoria) REFERENCES categorias(id)
);

-- =========================
-- VARIANTES
-- =========================
CREATE TABLE variantes_producto (
  id BIGINT IDENTITY PRIMARY KEY,
  id_producto BIGINT NOT NULL,
  sku NVARCHAR(100) UNIQUE NOT NULL,
  nombre_variante NVARCHAR(100),
  precio DECIMAL(10,2) NOT NULL,
  precio_oferta DECIMAL(10,2),
  activo BIT DEFAULT 1,

  CHECK (precio_oferta IS NULL OR precio_oferta <= precio),

  FOREIGN KEY (id_producto) REFERENCES productos(id) ON DELETE CASCADE
);

-- =========================
-- TIENDAS
-- =========================
CREATE TABLE tiendas (
  id BIGINT IDENTITY PRIMARY KEY,
  nombre NVARCHAR(100),
  ciudad NVARCHAR(100)
);

-- =========================
-- STOCK
-- =========================
CREATE TABLE niveles_stock (
  id_variante BIGINT,
  id_tienda BIGINT,
  cantidad INT DEFAULT 0,

  PRIMARY KEY (id_variante, id_tienda),

  FOREIGN KEY (id_variante) REFERENCES variantes_producto(id),
  FOREIGN KEY (id_tienda) REFERENCES tiendas(id)
);

-- =========================
-- CARRITO
-- =========================
CREATE TABLE carritos_compra (
  id BIGINT IDENTITY PRIMARY KEY,
  id_usuario BIGINT NOT NULL,

  FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);

CREATE TABLE items_carrito (
  id BIGINT IDENTITY PRIMARY KEY,
  id_carrito BIGINT NOT NULL,
  id_variante BIGINT NOT NULL,
  cantidad INT NOT NULL CHECK (cantidad > 0),

  FOREIGN KEY (id_carrito) REFERENCES carritos_compra(id) ON DELETE CASCADE,
  FOREIGN KEY (id_variante) REFERENCES variantes_producto(id),

  UNIQUE (id_carrito, id_variante) -- 🔥 evita duplicados
);

-- =========================
-- PEDIDOS
-- =========================
CREATE TABLE pedidos (
  id BIGINT IDENTITY PRIMARY KEY,
  id_usuario BIGINT NOT NULL,
  estado NVARCHAR(20) NOT NULL,
  monto_total DECIMAL(10,2) NOT NULL,
  creado_en DATETIME2 DEFAULT SYSDATETIME(),

  FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);

-- =========================
-- ITEMS PEDIDO
-- =========================
CREATE TABLE items_pedido (
  id BIGINT IDENTITY PRIMARY KEY,
  id_pedido BIGINT NOT NULL,
  id_variante BIGINT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2),

  FOREIGN KEY (id_pedido) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (id_variante) REFERENCES variantes_producto(id)
);

-- =========================
-- PAGOS
-- =========================
CREATE TABLE pagos (
  id BIGINT IDENTITY PRIMARY KEY,
  id_pedido BIGINT NOT NULL,
  monto DECIMAL(10,2),
  metodo_pago NVARCHAR(50),
  estado NVARCHAR(20),

  FOREIGN KEY (id_pedido) REFERENCES pedidos(id)
);

-- =========================
-- TRIGGER PARA UPDATED_AT
-- =========================
GO
CREATE TRIGGER trg_update_usuario
ON usuarios
AFTER UPDATE
AS
BEGIN
  UPDATE usuarios
  SET actualizado_en = SYSDATETIME()
  FROM usuarios u
  INNER JOIN inserted i ON u.id = i.id;
END;
GO