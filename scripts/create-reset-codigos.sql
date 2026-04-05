CREATE TABLE reset_codigos (
  id_usuario BIGINT PRIMARY KEY,
  codigo NVARCHAR(6) NOT NULL,
  expira DATETIME NOT NULL,
  usado BIT NOT NULL DEFAULT 0,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE
);
