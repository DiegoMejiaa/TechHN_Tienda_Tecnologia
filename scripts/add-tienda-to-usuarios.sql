-- Agregar columna id_tienda a usuarios si no existe
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'id_tienda'
)
BEGIN
  ALTER TABLE usuarios ADD id_tienda BIGINT NULL;
  ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_tienda 
    FOREIGN KEY (id_tienda) REFERENCES tiendas(id);
  PRINT 'Columna id_tienda agregada a usuarios';
END
ELSE
BEGIN
  PRINT 'Columna id_tienda ya existe en usuarios';
END
GO
