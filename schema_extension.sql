USE [TuBaseDeDatos];
GO

-- =========================
-- IMAGENES DE VARIANTES
-- =========================
CREATE TABLE imagenes_producto (
  id                    BIGINT IDENTITY PRIMARY KEY,
  id_variante           BIGINT NOT NULL,
  url                   NVARCHAR(500) NOT NULL,
  cloudinary_public_id  NVARCHAR(200) NULL,
  orden                 INT NOT NULL DEFAULT 0,

  FOREIGN KEY (id_variante) REFERENCES variantes_producto(id) ON DELETE CASCADE
);
GO

-- =========================
-- ESPECIFICACIONES DE VARIANTES
-- =========================
CREATE TABLE especificaciones_variante (
  id          BIGINT IDENTITY PRIMARY KEY,
  id_variante BIGINT NOT NULL,
  clave       NVARCHAR(100) NOT NULL,
  valor       NVARCHAR(255) NOT NULL,

  FOREIGN KEY (id_variante) REFERENCES variantes_producto(id) ON DELETE CASCADE
);
GO

-- =========================
-- TURNOS (CAJERO)
-- =========================
CREATE TABLE turnos (
  id               BIGINT IDENTITY PRIMARY KEY,
  id_tienda        BIGINT NOT NULL,
  id_usuario       BIGINT NOT NULL,
  hora_inicio      DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  hora_fin         DATETIME2 NULL,
  efectivo_inicial DECIMAL(10,2) NOT NULL DEFAULT 0,
  efectivo_final   DECIMAL(10,2) NULL,

  FOREIGN KEY (id_tienda)  REFERENCES tiendas(id),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);
GO

-- =========================
-- CUPONES
-- =========================
CREATE TABLE cupones (
  id               BIGINT IDENTITY PRIMARY KEY,
  codigo           NVARCHAR(50) NOT NULL UNIQUE,
  tipo             NVARCHAR(20) NOT NULL CHECK (tipo IN ('porcentaje', 'monto_fijo')),
  valor            DECIMAL(10,2) NOT NULL,
  minimo_compra    DECIMAL(10,2) NULL,
  usos_maximos     INT NULL,
  usos_actuales    INT NOT NULL DEFAULT 0,
  activo           BIT NOT NULL DEFAULT 1,
  fecha_expiracion DATETIME2 NULL,
  creado_en        DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- =========================
-- CUPONES APLICADOS A PEDIDOS
-- =========================
CREATE TABLE cupones_pedido (
  id         BIGINT IDENTITY PRIMARY KEY,
  id_pedido  BIGINT NOT NULL,
  id_cupon   BIGINT NOT NULL,
  descuento  DECIMAL(10,2) NOT NULL,

  UNIQUE (id_pedido, id_cupon),

  FOREIGN KEY (id_pedido) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (id_cupon)  REFERENCES cupones(id)
);
GO

-- =========================
-- DEVOLUCIONES
-- =========================
CREATE TABLE devoluciones (
  id         BIGINT IDENTITY PRIMARY KEY,
  id_pedido  BIGINT NOT NULL,
  motivo     NVARCHAR(500) NOT NULL,
  estado     NVARCHAR(20) NOT NULL DEFAULT 'solicitada'
             CHECK (estado IN ('solicitada', 'aprobada', 'rechazada', 'completada')),
  creado_en  DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

  FOREIGN KEY (id_pedido) REFERENCES pedidos(id)
);
GO

CREATE TABLE items_devolucion (
  id              BIGINT IDENTITY PRIMARY KEY,
  id_devolucion   BIGINT NOT NULL,
  id_item_pedido  BIGINT NOT NULL,
  cantidad        INT NOT NULL CHECK (cantidad > 0),

  FOREIGN KEY (id_devolucion)  REFERENCES devoluciones(id) ON DELETE CASCADE,
  FOREIGN KEY (id_item_pedido) REFERENCES items_pedido(id)
);
GO

-- =========================
-- TRANSACCIONES DE INVENTARIO
-- =========================
CREATE TABLE transacciones_inventario (
  id          BIGINT IDENTITY PRIMARY KEY,
  id_variante BIGINT NOT NULL,
  id_tienda   BIGINT NOT NULL,
  tipo        NVARCHAR(20) NOT NULL
              CHECK (tipo IN ('compra', 'ajuste', 'venta', 'devolucion')),
  cantidad    INT NOT NULL,
  nota        NVARCHAR(500) NULL,
  creado_en   DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

  FOREIGN KEY (id_variante) REFERENCES variantes_producto(id),
  FOREIGN KEY (id_tienda)   REFERENCES tiendas(id)
);
GO

-- =========================
-- METODOS DE ENVIO
-- =========================
CREATE TABLE metodos_envio (
  id          BIGINT IDENTITY PRIMARY KEY,
  nombre      NVARCHAR(100) NOT NULL,
  descripcion NVARCHAR(255) NULL,
  costo       DECIMAL(10,2) NOT NULL DEFAULT 0,
  activo      BIT NOT NULL DEFAULT 1
);
GO

-- =========================
-- IMAGEN POR VARIANTE
-- =========================
ALTER TABLE variantes_producto
  ADD imagen_url NVARCHAR(500) NULL,
      cloudinary_public_id NVARCHAR(200) NULL;
GO

-- =========================
-- VARIANTE BASE
-- =========================
ALTER TABLE variantes_producto
  ADD es_variante_base BIT NOT NULL DEFAULT 0;
GO

-- =========================
-- TIENDA ASIGNADA A USUARIOS (cajeros y admin sucursal)
-- =========================
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'id_tienda'
)
BEGIN
  ALTER TABLE usuarios ADD id_tienda BIGINT NULL;
  ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_tienda 
    FOREIGN KEY (id_tienda) REFERENCES tiendas(id);
END
GO
