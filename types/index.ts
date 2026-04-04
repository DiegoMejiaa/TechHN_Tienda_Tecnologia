export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface Rol {
  id: number;
  nombre: string;
  creado_en: string;
}

export interface Usuario {
  id: number;
  id_rol: number;
  id_tienda?: number;
  correo: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  creado_en: string;
  actualizado_en: string;
  rol_nombre?: string;
}

export interface Marca {
  id: number;
  nombre: string;
}

export interface Categoria {
  id: number;
  id_categoria_padre?: number | null;
  nombre: string;
  slug: string;
  nombre_categoria_padre?: string;
}

export interface Producto {
  id: number;
  id_marca: number;
  id_categoria: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  creado_en: string;
  nombre_marca?: string;
  nombre_categoria?: string;
  imagen_url?: string;
  cloudinary_public_id?: string;
  precio_minimo?: number | null;
  precio_oferta_minimo?: number | null;
}

export interface VarianteProducto {
  id: number;
  id_producto: number;
  sku: string;
  nombre_variante?: string;
  precio: number;
  precio_oferta?: number | null;
  activo: boolean;
  es_variante_base?: boolean;
  nombre_producto?: string;
  stock_total?: number;
  imagen_url?: string | null;
  cloudinary_public_id?: string | null;
}

export interface Tienda {
  id: number;
  nombre: string;
  ciudad?: string;
  telefono?: string;
  direccion?: string;
}

export interface NivelStock {
  id_variante: number;
  id_tienda: number;
  cantidad: number;
  sku?: string;
  nombre_variante?: string;
  nombre_producto?: string;
  nombre_tienda?: string;
}

export interface ItemCarrito {
  id: number;
  id_carrito: number;
  id_variante: number;
  cantidad: number;
  sku?: string;
  nombre_variante?: string;
  precio?: number;
  precio_oferta?: number | null;
  nombre_producto?: string;
  imagen_url?: string;
}

export interface Carrito {
  carrito: { id: number; id_usuario: number };
  items: ItemCarrito[];
  total: number;
}

export interface ItemPedido {
  id: number;
  id_pedido: number;
  id_variante: number;
  cantidad: number;
  precio_unitario: number;
  sku?: string;
  nombre_variante?: string;
  nombre_producto?: string;
  imagen_url?: string;
}

export interface Pedido {
  id: number;
  id_usuario: number;
  id_cliente?: number;
  estado: 'pendiente' | 'pagado' | 'enviado' | 'entregado' | 'cancelado';
  monto_total: number;
  creado_en: string;
  items?: ItemPedido[];
  nombre_usuario?: string;
  apellido_usuario?: string;
  correo_usuario?: string;
  telefono_usuario?: string;
  rol_usuario?: number;
  nombre_tienda?: string;
  // Cliente real (puede ser diferente al cajero que procesó)
  nombre_cliente?: string;
  apellido_cliente?: string;
  telefono_cliente?: string;
  correo_cliente?: string;
  metodo_pago?: string;
  // Datos directos del cliente en el pedido (sin FK)
  cliente_nombre?: string;
  cliente_telefono?: string;
  cliente_correo?: string;
  // Dirección de envío
  envio_direccion?: string;
  envio_ciudad?: string;
  envio_codigo_postal?: string;
  // Cupón aplicado
  cupon?: { descuento: number; codigo: string; tipo: string; valor: number } | null;
}
