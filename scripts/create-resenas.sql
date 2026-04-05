CREATE TABLE resenas (
  id BIGINT IDENTITY PRIMARY KEY,
  id_producto BIGINT NOT NULL,
  id_usuario BIGINT NOT NULL,
  estrellas TINYINT NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
  comentario NVARCHAR(1000),
  creado_en DATETIME2 DEFAULT SYSDATETIME(),

  -- Solo una reseña por usuario por producto
  UNIQUE (id_producto, id_usuario),

  FOREIGN KEY (id_producto) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);
