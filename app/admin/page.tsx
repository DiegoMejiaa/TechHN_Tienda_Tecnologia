'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import type { ApiResponse, Producto, Pedido, Tienda } from '@/types';
import { formatLempira } from '@/lib/format';
import { apiFetch } from '@/lib/api-fetch';
import { useAuth } from '@/contexts/auth-context';

interface Stats {
  productos: number; pedidos: number; tiendas: number;
  pedidosPendientes: number; ingresoTotal: number;
  ventasOnline: number; ventasSucursal: number;
  ingresoOnline: number; ingresoSucursal: number;
}
interface SucursalStat { nombre: string; ventas: number; ingresos: number; cajero?: string }

const ESTADO_COLORS: Record<string, string> = {
  pendiente: '#f59e0b', pagado: '#3b82f6', enviado: '#8b5cf6', entregado: '#10b981', cancelado: '#ef4444',
};
const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'badge badge-warning', pagado: 'badge badge-blue',
  enviado: 'badge badge-blue', entregado: 'badge badge-success', cancelado: 'badge badge-danger',
};

function buildSalesData(pedidos: Pedido[]) {
  const days: { date: string; label: string; online: number; sucursal: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
    days.push({ date: key, label, online: 0, sucursal: 0 });
  }
  pedidos.filter(p => p.estado !== 'cancelado').forEach(p => {
    const key = new Date(p.creado_en).toISOString().slice(0, 10);
    const slot = days.find(d => d.date === key);
    if (slot) {
      if (Number(p.rol_usuario) === 2) slot.sucursal += Number(p.monto_total) || 0;
      else slot.online += Number(p.monto_total) || 0;
    }
  });
  return days;
}

function buildStatusData(pedidos: Pedido[]) {
  const counts: Record<string, number> = {};
  pedidos.forEach(p => { counts[p.estado] = (counts[p.estado] || 0) + 1; });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function SalesTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 6 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontWeight: 700, fontSize: 13 }}>{p.name}: {formatLempira(p.value)}</p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: 13 }}>{payload[0].name}</p>
      <p style={{ color: ESTADO_COLORS[payload[0].name] || 'var(--blue)', fontSize: 13 }}>{payload[0].value} pedidos</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { usuario, isLoading: authLoading } = useAuth();
  const isAdminSucursal = Number(usuario?.id_rol) === 4;
  const idTiendaAdmin   = usuario?.id_tienda ?? null;
  const [nombreSucursal, setNombreSucursal] = useState<string>('');

  const [stats, setStats] = useState<Stats>({
    productos: 0, pedidos: 0, tiendas: 0, pedidosPendientes: 0,
    ingresoTotal: 0, ventasOnline: 0, ventasSucursal: 0, ingresoOnline: 0, ingresoSucursal: 0,
  });
  const [recentPedidos, setRecentPedidos] = useState<Pedido[]>([]);
  const [salesData, setSalesData] = useState<ReturnType<typeof buildSalesData>>([]);
  const [statusData, setStatusData] = useState<ReturnType<typeof buildStatusData>>([]);
  const [sucursalStats, setSucursalStats] = useState<SucursalStat[]>([]);
  const [onlineStats, setOnlineStats] = useState<SucursalStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    async function fetchData() {
      try {
        const [pRes, oRes, tRes] = await Promise.all([
          apiFetch('/api/productos'),
          apiFetch('/api/pedidos'),   // la API ya filtra por sucursal si es admin_sucursal
          apiFetch('/api/tiendas'),
        ]);
        const pData: ApiResponse<Producto[]> = await pRes.json();
        const oData: ApiResponse<Pedido[]>   = await oRes.json();
        const tData: ApiResponse<Tienda[]>   = await tRes.json();

        const pedidos = oData.data || [];
        const tiendas = tData.data || [];

        // Nombre de la sucursal — buscar por id_tienda del usuario o del token
        if (isAdminSucursal) {
          const tiendaId = idTiendaAdmin;
          if (tiendaId) {
            const tienda = tiendas.find(t => Number(t.id) === Number(tiendaId));
            if (tienda) setNombreSucursal(tienda.nombre);
          } else if (usuario?.id) {
            // Token viejo sin id_tienda: buscar en DB
            const uRes = await apiFetch(`/api/usuarios?id=${usuario.id}`);
            // No tenemos endpoint por id que devuelva id_tienda, usamos tiendas y pedidos para inferir
            // Buscar en los pedidos recibidos el nombre_tienda más frecuente
            const tiendaNombre = pedidos.find(p => p.nombre_tienda)?.nombre_tienda;
            if (tiendaNombre) setNombreSucursal(tiendaNombre);
          }
        }

        const activos  = pedidos.filter(p => p.estado !== 'cancelado');
        const sucursal = activos.filter(p => Number(p.rol_usuario) === 2);
        const online   = activos.filter(p => Number(p.rol_usuario) !== 2);

        // Stats por sucursal (solo para super admin)
        const sucStats: SucursalStat[] = !isAdminSucursal ? (() => {
          const map: Record<string, { ventas: number; ingresos: number }> = {};
          sucursal.forEach(p => {
            const nombre = p.nombre_tienda || 'Sin sucursal';
            if (!map[nombre]) map[nombre] = { ventas: 0, ingresos: 0 };
            map[nombre].ventas++;
            map[nombre].ingresos += Number(p.monto_total);
          });
          return Object.entries(map)
            .map(([nombre, s]) => ({ nombre, ...s }))
            .sort((a, b) => b.ingresos - a.ingresos);
        })() : [];

        // Stats online por sucursal de origen (donde se tomó el stock)
        const onlineStats: SucursalStat[] = !isAdminSucursal ? (() => {
          const map: Record<string, { ventas: number; ingresos: number }> = {};
          online.forEach(p => {
            const nombre = p.nombre_tienda || 'Sin sucursal asignada';
            if (!map[nombre]) map[nombre] = { ventas: 0, ingresos: 0 };
            map[nombre].ventas++;
            map[nombre].ingresos += Number(p.monto_total);
          });
          return Object.entries(map)
            .map(([nombre, s]) => ({ nombre, ...s }))
            .sort((a, b) => b.ingresos - a.ingresos);
        })() : [];

        setStats({
          productos: pData.data?.length || 0,
          pedidos: pedidos.length,
          tiendas: tiendas.length,
          pedidosPendientes: pedidos.filter(p => p.estado === 'pendiente' || p.estado === 'pagado').length,
          ingresoTotal: activos.reduce((s, p) => s + Number(p.monto_total), 0),
          ventasOnline: online.length,
          ventasSucursal: sucursal.length,
          ingresoOnline: online.reduce((s, p) => s + Number(p.monto_total), 0),
          ingresoSucursal: sucursal.reduce((s, p) => s + Number(p.monto_total), 0),
        });
        setRecentPedidos(pedidos.slice(0, 6));
        setSalesData(buildSalesData(pedidos));
        setStatusData(buildStatusData(pedidos));
        setSucursalStats(sucStats);
        setOnlineStats(onlineStats);
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    }
    fetchData();
  }, [usuario]);

  const Sk = ({ w = 'w-16', h = 'h-6' }: { w?: string; h?: string }) => (
    <span className={`inline-block ${h} ${w} rounded animate-pulse`} style={{ backgroundColor: 'var(--border)' }} />
  );

  const STAT_CARDS = [
    { label: 'Ingresos totales', value: formatLempira(stats.ingresoTotal), href: '/admin/pedidos',   color: '#3b82f6', bg: 'var(--blue-light)', icon: 'M12 6v12m-3-2.818.879.659 1.171.196m0 0a3 3 0 0 0 5.656 0m-5.656 0H9m11 0h-.879m0 0a3 3 0 0 0-5.656 0M3 12h18' },
    { label: 'Pedidos totales',  value: stats.pedidos,                    href: '/admin/pedidos',   color: '#8b5cf6', bg: '#f5f3ff',           icon: 'M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z' },
    { label: 'Pendientes',       value: stats.pedidosPendientes,          href: '/admin/pedidos',   color: '#f59e0b', bg: '#fffbeb',           icon: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
    { label: 'Productos',        value: stats.productos,                  href: '/admin/productos', color: '#10b981', bg: '#f0fdf4',           icon: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {isAdminSucursal && nombreSucursal
            ? `Sucursal: ${nombreSucursal}`
            : 'Bienvenido a TechHN — resumen de tu tienda'}
        </p>
      </div>

      {/* Advertencia: admin sucursal sin tienda asignada */}
      {isAdminSucursal && !idTiendaAdmin && !isLoading && (
        <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
          style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fcd34d' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          Tu cuenta no tiene una sucursal asignada. Pide al Super Admin que te asigne una sucursal en la sección de Usuarios.
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARDS.map(stat => (
          <Link key={stat.label} href={stat.href} className="stat-card group block relative overflow-hidden">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: `linear-gradient(135deg, ${stat.color}08 0%, transparent 60%)` }} />
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl mb-3" style={{ backgroundColor: stat.bg }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={stat.color} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                </svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                {isLoading ? <Sk w="w-14" h="h-7" /> : stat.value}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Online vs Sucursal */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Ventas en línea */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: '#eff6ff' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#3b82f6" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Ventas en línea</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {isAdminSucursal ? 'Pedidos desde la tienda web' : `${stats.ventasOnline} pedidos · ${formatLempira(stats.ingresoOnline)}`}
              </p>
            </div>
          </div>
          {isAdminSucursal ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pedidos</p>
                <p className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{isLoading ? <Sk /> : stats.ventasOnline}</p>
              </div>
              <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ingresos</p>
                <p className="text-lg font-bold truncate" style={{ color: '#3b82f6' }}>{isLoading ? <Sk /> : formatLempira(stats.ingresoOnline)}</p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />)}</div>
          ) : onlineStats.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>Sin ventas en línea</p>
          ) : (
            <div className="space-y-2">
              {onlineStats.map(s => (
                <div key={s.nombre} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold" style={{ backgroundColor: '#3b82f6' }}>
                    {s.nombre.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{s.nombre}</span>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold" style={{ color: '#3b82f6' }}>{formatLempira(s.ingresos)}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.ventas} pedido{s.ventas !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ventas en sucursal — desglose por tienda para super admin */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: '#f0fdf4' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#10b981" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Ventas en sucursal</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {isAdminSucursal ? 'Ventas procesadas por cajeros' : `${stats.ventasSucursal} ventas · ${formatLempira(stats.ingresoSucursal)}`}
              </p>
            </div>
          </div>
          {isAdminSucursal ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ventas</p>
                <p className="text-2xl font-bold" style={{ color: '#10b981' }}>{isLoading ? <Sk /> : stats.ventasSucursal}</p>
              </div>
              <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ingresos</p>
                <p className="text-lg font-bold truncate" style={{ color: '#10b981' }}>{isLoading ? <Sk /> : formatLempira(stats.ingresoSucursal)}</p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />)}</div>
          ) : sucursalStats.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>Sin ventas en sucursal</p>
          ) : (
            <div className="space-y-2">
              {sucursalStats.map(s => (
                <div key={s.nombre} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold" style={{ backgroundColor: '#10b981' }}>
                    {s.nombre.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{s.nombre}</span>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold" style={{ color: '#10b981' }}>{formatLempira(s.ingresos)}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.ventas} venta{s.ventas !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Gráfica + Estado pedidos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 card p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Actividad — últimos 7 días</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Online vs sucursal</p>
          </div>
          {isLoading ? (
            <div className="h-52 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={salesData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gOnline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gSucursal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `L${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<SalesTooltip />} />
                <Area type="monotone" dataKey="online" name="Online" stroke="#3b82f6" strokeWidth={2} fill="url(#gOnline)" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="sucursal" name="Sucursal" stroke="#10b981" strokeWidth={2} fill="url(#gSucursal)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center gap-4 mt-2">
            {[{ color: '#3b82f6', label: '🌐 Online' }, { color: '#10b981', label: '🏪 Sucursal' }].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Estado de pedidos</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Distribución actual</p>
          </div>
          {isLoading ? (
            <div className="h-52 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />
          ) : statusData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>Sin datos</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                    {statusData.map((entry, i) => <Cell key={i} fill={ESTADO_COLORS[entry.name] || '#94a3b8'} />)}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {statusData.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: ESTADO_COLORS[entry.name] || '#94a3b8' }} />
                      <span className="capitalize" style={{ color: 'var(--text-muted)' }}>{entry.name}</span>
                    </div>
                    <span className="font-semibold" style={{ color: 'var(--text)' }}>{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pedidos recientes + Acciones rápidas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Pedidos recientes</h2>
            <Link href="/admin/pedidos" className="text-xs font-medium" style={{ color: 'var(--blue)' }}>Ver todos →</Link>
          </div>
          <div className="table-wrapper">
            {isLoading ? (
              <div className="p-5 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-9 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />)}</div>
            ) : recentPedidos.length === 0 ? (
              <div className="p-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No hay pedidos aún</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Cliente</th>
                    <th className="table-header hidden sm:table-cell">Canal</th>
                    <th className="table-header hidden sm:table-cell">Fecha</th>
                    <th className="table-header">Estado</th>
                    <th className="table-header text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPedidos.map(pedido => (
                    <tr key={pedido.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold"
                            style={{ backgroundColor: Number(pedido.rol_usuario) === 2 ? '#10b981' : 'var(--blue)' }}>
                            {(pedido.nombre_usuario || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>
                            {pedido.nombre_usuario ? `${pedido.nombre_usuario} ${pedido.apellido_usuario || ''}` : `#${pedido.id_usuario}`}
                          </span>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={Number(pedido.rol_usuario) === 2
                            ? { backgroundColor: '#f0fdf4', color: '#10b981' }
                            : { backgroundColor: '#eff6ff', color: '#3b82f6' }}>
                          {Number(pedido.rol_usuario) === 2
                            ? `🏪 ${pedido.nombre_tienda || 'Sucursal'}`
                            : '🌐 Online'}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(pedido.creado_en).toLocaleDateString('es-ES')}
                      </td>
                      <td className="table-cell">
                        <span className={ESTADO_BADGE[pedido.estado] || 'badge badge-muted'}>{pedido.estado}</span>
                      </td>
                      <td className="table-cell text-right text-xs font-semibold" style={{ color: 'var(--text)' }}>
                        {formatLempira(pedido.monto_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Acciones rápidas</h2>
          <div className="space-y-2">
            {[
              { href: '/admin/productos/nuevo', label: 'Nuevo producto', desc: 'Agregar al catálogo',   color: '#3b82f6', bg: 'var(--blue-light)', superAdmin: false, icon: 'M12 4.5v15m7.5-7.5h-15' },
              { href: '/admin/categorias',      label: 'Categorías',     desc: 'Organizar productos',   color: '#8b5cf6', bg: '#f5f3ff',           superAdmin: false, icon: 'M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z' },
              { href: '/admin/tiendas',         label: 'Tiendas',        desc: 'Gestionar sucursales',  color: '#10b981', bg: '#f0fdf4',           superAdmin: true,  icon: 'M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z' },
              { href: '/admin/cupones',         label: 'Cupones',        desc: 'Códigos de descuento',  color: '#ec4899', bg: '#fdf2f8',           superAdmin: true,  icon: 'M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185Z' },
            ].filter(a => !a.superAdmin || !isAdminSucursal).map(action => (
              <Link key={action.href} href={action.href}
                className="flex items-center gap-3 rounded-xl p-3 transition-all group"
                style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = action.color; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${action.color}20`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: action.bg }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={action.color} className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{action.label}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{action.desc}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: action.color }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
