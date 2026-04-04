'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { TurnoProvider, useTurno } from '@/contexts/turno-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { formatLempira } from '@/lib/format';
import Link from 'next/link';

const NAV = [
  { href: '/cajero',         label: 'Nueva venta', icon: 'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z' },
  { href: '/cajero/pedidos', label: 'Ventas',      icon: 'M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185Z' },
  { href: '/cajero/stock',   label: 'Stock',       icon: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z' },
];

// ── Pantalla de inicio de turno ──────────────────────────────────────────────
function IniciarTurnoScreen({ userId, tiendaAsignada }: { userId: number; tiendaAsignada?: number }) {
  const { iniciarTurno } = useTurno();
  const [tiendas, setTiendas] = useState<{ id: number; nombre: string; ciudad?: string }[]>([]);
  const [idTienda, setIdTienda] = useState(tiendaAsignada ? String(tiendaAsignada) : '');
  const [efectivo, setEfectivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    fetch('/api/tiendas', { headers })
      .then(r => r.json())
      .then(d => { if (d.success && d.data) setTiendas(d.data); });
  }, [tiendaAsignada]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idTienda) { setError('No hay sucursal asignada'); return; }
    setLoading(true);
    const ok = await iniciarTurno(Number(idTienda), userId, Number(efectivo) || 0);
    if (!ok) setError('No se pudo iniciar el turno');
    setLoading(false);
  };

  const nombreTienda = tiendas.find(t => String(t.id) === idTienda)?.nombre;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.75rem',
    border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)',
    color: 'white', fontSize: '0.875rem', outline: 'none',
  };

  return (
    <>
      <style>{`
        @keyframes kb-turno {
          0%   { transform: scale(1)    translateX(0)   translateY(0); }
          50%  { transform: scale(1.08) translateX(-1%) translateY(-1%); }
          100% { transform: scale(1)    translateX(0)   translateY(0); }
        }
        @keyframes ft1 { 0%,100%{transform:translateY(0) translateX(0);opacity:.4} 50%{transform:translateY(-18px) translateX(8px);opacity:.8} }
        @keyframes ft2 { 0%,100%{transform:translateY(0) translateX(0);opacity:.3} 50%{transform:translateY(14px) translateX(-10px);opacity:.7} }
        @keyframes ft3 { 0%,100%{transform:translateY(0) translateX(0);opacity:.5} 50%{transform:translateY(-10px) translateX(6px);opacity:.9} }
        .kb-turno { animation: kb-turno 18s ease-in-out infinite; }
        .ft1 { animation: ft1 6s ease-in-out infinite; }
        .ft2 { animation: ft2 8s ease-in-out infinite 1s; }
        .ft3 { animation: ft3 7s ease-in-out infinite 2s; }
        .ft4 { animation: ft1 9s ease-in-out infinite 0.5s; }
        .ft5 { animation: ft2 5s ease-in-out infinite 3s; }
        .turno-select option { background: #1e293b; color: white; }
      `}</style>

      <div className="relative min-h-screen flex items-center justify-center p-4">
        {/* Fondo */}
        <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80" alt=""
          className="kb-turno fixed inset-0 h-full w-full object-cover" style={{ zIndex: 0 }} />
        <div className="fixed inset-0" style={{ zIndex: 1, background: 'linear-gradient(135deg, rgba(10,15,35,0.85) 0%, rgba(20,40,100,0.75) 100%)' }} />

        {/* Partículas */}
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 2 }}>
          <div className="ft1 absolute h-2 w-2 rounded-full"     style={{ top: '18%', left: '10%', backgroundColor: 'rgba(96,165,250,0.6)' }} />
          <div className="ft2 absolute h-3 w-3 rounded-full"     style={{ top: '60%', left: '8%',  backgroundColor: 'rgba(147,197,253,0.35)' }} />
          <div className="ft3 absolute h-1.5 w-1.5 rounded-full" style={{ top: '30%', left: '90%', backgroundColor: 'rgba(255,255,255,0.5)' }} />
          <div className="ft4 absolute h-2.5 w-2.5 rounded-full" style={{ top: '75%', left: '85%', backgroundColor: 'rgba(96,165,250,0.45)' }} />
          <div className="ft5 absolute h-1.5 w-1.5 rounded-full" style={{ top: '50%', left: '50%', backgroundColor: 'rgba(255,255,255,0.3)' }} />
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.05 }}>
            <line x1="0" y1="30%" x2="100%" y2="70%" stroke="white" strokeWidth="1" />
            <line x1="0" y1="70%" x2="100%" y2="30%" stroke="white" strokeWidth="0.5" />
            <circle cx="50%" cy="50%" r="250" stroke="white" strokeWidth="0.5" fill="none" />
          </svg>
        </div>

        {/* Card */}
        <div className="relative z-10 w-full max-w-sm">
          <div className="rounded-2xl p-8 shadow-2xl" style={{
            backgroundColor: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-7">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white text-sm font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>TH</div>
              <div>
                <h1 className="text-lg font-bold text-white leading-tight">TechHN POS</h1>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Inicia tu turno para comenzar</p>
              </div>
            </div>

            {/* Sucursal asignada */}
            {tiendaAsignada && (
              <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)' }}>
                <p className="text-xs" style={{ color: 'rgba(147,197,253,0.8)' }}>Tu sucursal asignada</p>
                <p className="text-sm font-bold mt-0.5 text-white">
                  {tiendas.length > 0 ? nombreTienda : 'Cargando...'}
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-xl px-3 py-2 text-xs mb-4"
                style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!tiendaAsignada && (
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Sucursal <span style={{ color: '#fca5a5' }}>*</span>
                  </label>
                  <select value={idTienda} onChange={e => setIdTienda(e.target.value)} required
                    className="turno-select"
                    style={{ ...inputStyle, appearance: 'none' }}>
                    <option value="">Seleccionar sucursal...</option>
                    {tiendas.map(t => <option key={t.id} value={t.id}>{t.nombre}{t.ciudad ? ` — ${t.ciudad}` : ''}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Efectivo inicial en caja
                </label>
                <input type="number" min="0" step="0.01" value={efectivo}
                  onChange={e => setEfectivo(e.target.value)}
                  placeholder="0.00"
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(96,165,250,0.7)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
                  onBlur={e =>  { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                />
              </div>
              <button type="submit" disabled={loading || (!tiendaAsignada && !idTienda)}
                className="w-full py-2.5 rounded-xl font-semibold text-sm text-white mt-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', boxShadow: '0 4px 20px rgba(59,130,246,0.4)' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 28px rgba(59,130,246,0.6)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(59,130,246,0.4)')}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="spinner h-4 w-4 border-2" />Iniciando...
                  </span>
                ) : 'Iniciar turno'}
              </button>
            </form>

            <p className="mt-5 text-center">
              <Link href="/" className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                ← Volver al inicio
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Modal corte de caja ──────────────────────────────────────────────────────
function CorteCajaModal({ onClose }: { onClose: () => void }) {
  const { turno, cerrarTurno } = useTurno();
  const { logout } = useAuth();
  const [efectivoFinal, setEfectivoFinal] = useState('');
  const [ventasEfectivo, setVentasEfectivo] = useState(0);
  const [totalVentas, setTotalVentas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingVentas, setLoadingVentas] = useState(true);
  const [justificacion, setJustificacion] = useState('');

  useEffect(() => {
    if (!turno) return;
    const token = sessionStorage.getItem('token');
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    fetch('/api/pedidos', { headers })
      .then(r => r.json())
      .then(async (data) => {
        if (!data.success || !data.data) { setLoadingVentas(false); return; }
        const ventasTurno = data.data.filter((p: any) =>
          new Date(p.creado_en) >= new Date(turno.hora_inicio) && p.estado !== 'cancelado'
        );
        setTotalVentas(ventasTurno.reduce((s: number, p: any) => s + Number(p.monto_total), 0));

        // Sumar pagos en efectivo del turno
        let totalEfectivo = 0;
        for (const v of ventasTurno) {
          try {
            const pRes = await fetch(`/api/pagos?id_pedido=${v.id}`, { headers });
            const pData = await pRes.json();
            if (pData.success && pData.data) {
              totalEfectivo += pData.data
                .filter((p: any) => p.metodo_pago === 'efectivo')
                .reduce((s: number, p: any) => s + Number(p.monto), 0);
            }
          } catch { /* ignore */ }
        }
        setVentasEfectivo(totalEfectivo);
        setLoadingVentas(false);
      });
  }, [turno]);

  const efectivoEsperado = (turno?.efectivo_inicial || 0) + ventasEfectivo;
  const diferencia = efectivoFinal ? Number(efectivoFinal) - efectivoEsperado : null;
  const hayFaltante = diferencia !== null && diferencia < 0;
  const duracion = turno ? Math.round((Date.now() - new Date(turno.hora_inicio).getTime()) / 60000) : 0;

  const handleCerrar = async () => {
    if (hayFaltante && !justificacion.trim()) return;
    setLoading(true);
    const ok = await cerrarTurno(Number(efectivoFinal) || 0);
    if (ok) { onClose(); logout(); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>

        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Corte de caja</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {turno?.nombre_tienda} · Turno de {duracion} min
          </p>
        </div>

        <div className="p-5 space-y-3">
          {loadingVentas ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />)}</div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {[
                { label: 'Efectivo inicial',    value: turno?.efectivo_inicial || 0, color: 'var(--text)',    bold: false },
                { label: 'Ventas en efectivo',  value: ventasEfectivo,               color: 'var(--success)', bold: false },
                { label: 'Otras ventas',        value: totalVentas - ventasEfectivo, color: 'var(--text-muted)', bold: false },
                { label: 'Efectivo esperado',   value: efectivoEsperado,             color: 'var(--blue)',    bold: true  },
              ].map((row, i, arr) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5"
                  style={{
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                    backgroundColor: row.bold ? 'var(--blue-light)' : 'var(--bg-secondary)',
                  }}>
                  <span className="text-xs font-medium" style={{ color: row.bold ? 'var(--blue)' : 'var(--text-muted)' }}>{row.label}</span>
                  <span className="text-sm font-bold" style={{ color: row.color }}>{formatLempira(row.value)}</span>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Efectivo contado en caja
            </label>
            <input type="number" min="0" step="0.01" value={efectivoFinal}
              onChange={e => setEfectivoFinal(e.target.value)}
              className="input py-2" placeholder="0.00" autoFocus />
          </div>

          {diferencia !== null && (
            <div className="flex items-center justify-between rounded-xl px-4 py-2.5"
              style={{
                backgroundColor: diferencia === 0 ? 'var(--success-bg)' : diferencia > 0 ? 'var(--success-bg)' : 'var(--danger-bg)',
                border: `1px solid ${diferencia >= 0 ? 'var(--success)' : 'var(--danger)'}`,
              }}>
              <span className="text-xs font-semibold" style={{ color: diferencia >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {diferencia === 0 ? '✓ Cuadra exacto' : diferencia > 0 ? '↑ Sobrante' : '↓ Faltante'}
              </span>
              <span className="text-sm font-bold" style={{ color: diferencia >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {diferencia !== 0 && (diferencia > 0 ? '+' : '')}{formatLempira(Math.abs(diferencia))}
              </span>
            </div>
          )}

          {/* Justificación obligatoria si hay faltante */}
          {hayFaltante && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--danger)' }}>
                Justificación del faltante <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <textarea
                value={justificacion}
                onChange={e => setJustificacion(e.target.value)}
                className="input resize-none"
                rows={2}
                placeholder="Explica el motivo del faltante..."
              />
              {!justificacion.trim() && (
                <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>
                  Debes justificar el faltante para poder cerrar el turno.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button
              onClick={handleCerrar}
              disabled={loading || loadingVentas || (hayFaltante && !justificacion.trim())}
              className="btn-danger flex-1 disabled:opacity-50">
              {loading ? 'Cerrando...' : 'Cerrar turno'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shell principal ──────────────────────────────────────────────────────────
function CajeroShell({ children }: { children: React.ReactNode }) {
  const { usuario, logout, isLoading: authLoading } = useAuth();
  const { turno, isLoading: turnoLoading } = useTurno();
  const pathname = usePathname();
  const [showCorte, setShowCorte] = useState(false);

  if (authLoading || turnoLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!turno) return <IniciarTurnoScreen userId={usuario!.id} tiendaAsignada={usuario?.id_tienda} />;

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 h-14"
        style={{ backgroundColor: 'var(--sidebar-bg)', borderBottom: '1px solid var(--sidebar-border)' }}>
        <div className="flex items-center gap-3">
          <Link href="/cajero" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md text-white text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>TH</div>
          </Link>
          {/* Sucursal activa */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1"
            style={{ backgroundColor: 'var(--sidebar-hover-bg)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#3b82f6" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            <span className="text-xs font-semibold" style={{ color: '#3b82f6' }}>{turno.nombre_tienda}</span>
          </div>
          <nav className="flex gap-1">
            {NAV.map(item => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                  style={isActive ? { backgroundColor: 'var(--blue)', color: '#fff' } : { color: 'var(--sidebar-text)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5 hidden sm:block">
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <span className="text-xs hidden md:block" style={{ color: 'var(--sidebar-text)' }}>{usuario?.nombre}</span>
          <button onClick={() => logout()}
            className="rounded-md px-3 py-1.5 text-xs font-medium"
            style={{ color: 'var(--sidebar-text)', border: '1px solid var(--sidebar-border)' }}>
            Salir
          </button>
          <button onClick={() => setShowCorte(true)}
            className="rounded-md px-3 py-1.5 text-xs font-medium"
            style={{ color: 'var(--danger)', border: '1px solid var(--sidebar-border)' }}>
            Cerrar turno
          </button>
        </div>
      </header>
      <main className="flex-1 p-4 lg:p-6">{children}</main>
      {showCorte && <CorteCajaModal onClose={() => setShowCorte(false)} />}
    </div>
  );
}

// ── Layout raíz ──────────────────────────────────────────────────────────────
export default function CajeroLayout({ children }: { children: React.ReactNode }) {
  const { usuario, isCajero, isAdmin, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !usuario) router.push('/auth/login');
    if (!isLoading && usuario && !isCajero && !isAdmin) router.push('/');
  }, [usuario, isCajero, isAdmin, isLoading, router]);

  if (isLoading || !usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <TurnoProvider userId={usuario.id}>
      <CajeroShell>{children}</CajeroShell>
    </TurnoProvider>
  );
}
