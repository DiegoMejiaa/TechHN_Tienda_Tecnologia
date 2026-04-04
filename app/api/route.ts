import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "E-Commerce API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        login: "POST /api/auth/login",
        register: "POST /api/auth/register"
      },
      roles: "GET, POST, PUT, DELETE /api/roles",
      usuarios: "GET, POST, PUT, DELETE /api/usuarios",
      direcciones: "GET, POST, PUT, DELETE /api/direcciones",
      marcas: "GET, POST, PUT, DELETE /api/marcas",
      categorias: "GET, POST, PUT, DELETE /api/categorias",
      productos: "GET, POST, PUT, DELETE /api/productos",
      variantes: "GET, POST, PUT, DELETE /api/variantes",
      tiendas: "GET, POST, PUT, DELETE /api/tiendas",
      stock: "GET, PUT /api/stock",
      carrito: "GET, POST, PUT, DELETE /api/carrito",
      pedidos: "GET, POST, PUT, DELETE /api/pedidos",
      pagos: "GET, POST /api/pagos",
      upload: "POST, DELETE /api/upload"
    }
  })
}
