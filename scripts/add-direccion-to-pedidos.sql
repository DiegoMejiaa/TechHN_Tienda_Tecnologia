-- Agregar columnas de dirección de envío a la tabla pedidos
ALTER TABLE pedidos ADD envio_direccion NVARCHAR(255) NULL;
ALTER TABLE pedidos ADD envio_ciudad NVARCHAR(100) NULL;
ALTER TABLE pedidos ADD envio_codigo_postal NVARCHAR(10) NULL;
