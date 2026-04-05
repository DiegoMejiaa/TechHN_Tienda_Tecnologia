'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const inputStyle = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  borderRadius: '0.75rem',
  border: '1px solid rgba(255,255,255,0.2)',
  backgroundColor: 'rgba(255,255,255,0.08)',
  color: 'white',
  fontSize: '0.875rem',
  outline: 'none',
};

function GlassInput({ id, type = 'text', value, onChange, placeholder, required, autoComplete }: {
  id: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; autoComplete?: string;
}) {
  return (
    <input
      id={id} type={type} value={value} required={required} autoComplete={autoComplete}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputStyle}
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(96,165,250,0.7)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
      onBlur={e =>  { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
    />
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', correo: '', telefono: '', contrasena: '', confirmarContrasena: '',
  });

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const set = (k: keyof typeof formData) => (v: string) => setFormData(p => ({ ...p, [k]: v }));

  const handleTelefono = (raw: string) => {
    // Solo dígitos, máx 8
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    // Formato: 9999-9999
    const formatted = digits.length > 4 ? digits.slice(0, 4) + '-' + digits.slice(4) : digits;
    setFormData(p => ({ ...p, telefono: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.contrasena !== formData.confirmarContrasena) { setError('Las contraseñas no coinciden'); return; }
    if (formData.contrasena.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    if (formData.telefono && formData.telefono.replace('-', '').length < 8) { setError('El teléfono debe tener 8 dígitos'); return; }
    setIsLoading(true);
    const result = await register({
      nombre: formData.nombre, apellido: formData.apellido, correo: formData.correo,
      telefono: formData.telefono || undefined, contrasena: formData.contrasena,
    });
    if (result.success) router.push('/');
    else setError(result.error || 'Error al registrarse');
    setIsLoading(false);
  };

  const eyeOff = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
  const eyeOn = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );

  const slide = (delay: string) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(20px)',
    transition: `opacity 0.6s ease ${delay}, transform 0.6s ease ${delay}`,
  });

  return (
    <>
      <style>{`
        @keyframes kenburns {
          0%   { transform: scale(1)    translateX(0)   translateY(0); }
          50%  { transform: scale(1.08) translateX(-1%) translateY(-1%); }
          100% { transform: scale(1)    translateX(0)   translateY(0); }
        }
        @keyframes float1 { 0%,100%{transform:translateY(0) translateX(0);opacity:.4} 50%{transform:translateY(-18px) translateX(8px);opacity:.8} }
        @keyframes float2 { 0%,100%{transform:translateY(0) translateX(0);opacity:.3} 50%{transform:translateY(14px) translateX(-10px);opacity:.7} }
        @keyframes float3 { 0%,100%{transform:translateY(0) translateX(0);opacity:.5} 50%{transform:translateY(-10px) translateX(6px);opacity:.9} }
        .img-kb  { animation: kenburns 18s ease-in-out infinite; }
        .dot-a   { animation: float1 6s ease-in-out infinite; }
        .dot-b   { animation: float2 8s ease-in-out infinite 1s; }
        .dot-c   { animation: float3 7s ease-in-out infinite 2s; }
        .dot-d   { animation: float1 9s ease-in-out infinite 0.5s; }
        .dot-e   { animation: float2 5s ease-in-out infinite 3s; }
      `}</style>

      <div className="relative min-h-screen flex items-center justify-center py-8">
        {/* Fondo */}
        <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80" alt=""
          className="img-kb fixed inset-0 h-full w-full object-cover" style={{ zIndex: 0 }} />
        <div className="fixed inset-0" style={{ zIndex: 1, background: 'linear-gradient(135deg, rgba(10,15,35,0.85) 0%, rgba(20,40,100,0.75) 100%)' }} />

        {/* Partículas */}
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 2 }}>
          <div className="dot-a absolute h-2 w-2 rounded-full"   style={{ top: '15%', left: '8%',  backgroundColor: 'rgba(96,165,250,0.6)' }} />
          <div className="dot-b absolute h-3 w-3 rounded-full"   style={{ top: '65%', left: '6%',  backgroundColor: 'rgba(147,197,253,0.35)' }} />
          <div className="dot-c absolute h-1.5 w-1.5 rounded-full" style={{ top: '25%', left: '92%', backgroundColor: 'rgba(255,255,255,0.5)' }} />
          <div className="dot-d absolute h-2.5 w-2.5 rounded-full" style={{ top: '80%', left: '88%', backgroundColor: 'rgba(96,165,250,0.45)' }} />
          <div className="dot-e absolute h-1.5 w-1.5 rounded-full" style={{ top: '45%', left: '95%', backgroundColor: 'rgba(255,255,255,0.3)' }} />
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.05 }}>
            <line x1="0" y1="30%" x2="100%" y2="70%" stroke="white" strokeWidth="1" />
            <line x1="0" y1="70%" x2="100%" y2="30%" stroke="white" strokeWidth="0.5" />
            <circle cx="50%" cy="50%" r="250" stroke="white" strokeWidth="0.5" fill="none" />
          </svg>
        </div>

        {/* Controles */}
        <div className="fixed top-4 right-4 z-20"><ThemeToggle /></div>
        <div className="fixed top-6 left-6 z-20">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>TH</div>
            <span className="text-white font-bold text-lg">TechHN</span>
          </Link>
        </div>

        {/* Card */}
        <div className="relative z-10 w-full max-w-md mx-4">
          <div className="rounded-2xl p-8 shadow-2xl" style={{
            backgroundColor: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}>
            {/* Título */}
            <div style={slide('0.1s')} className="mb-6">
              <h1 className="text-2xl font-bold text-white">Crea tu cuenta</h1>
              <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Únete a nuestra comunidad de compradores</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl px-4 py-3 text-sm"
                  style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }}>
                  {error}
                </div>
              )}

              {/* Nombre / Apellido */}
              <div style={slide('0.15s')} className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>Nombre</label>
                  <GlassInput id="nombre" value={formData.nombre} onChange={set('nombre')} placeholder="Juan" required />
                </div>
                <div>
                  <label htmlFor="apellido" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>Apellido</label>
                  <GlassInput id="apellido" value={formData.apellido} onChange={set('apellido')} placeholder="Pérez" required />
                </div>
              </div>

              {/* Correo */}
              <div style={slide('0.2s')}>
                <label htmlFor="correo" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>Correo electrónico</label>
                <GlassInput id="correo" type="email" value={formData.correo} onChange={set('correo')} placeholder="tu@correo.com" required autoComplete="email" />
              </div>

              {/* Teléfono */}
              <div style={slide('0.25s')}>
                <label htmlFor="telefono" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Teléfono <span style={{ color: 'rgba(255,255,255,0.4)' }}>(opcional)</span>
                </label>
                <input
                  id="telefono" type="tel" value={formData.telefono}
                  onChange={e => handleTelefono(e.target.value)}
                  placeholder="9999-9999"
                  maxLength={9}
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(96,165,250,0.7)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
                  onBlur={e =>  { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                />
                {formData.telefono && formData.telefono.replace('-', '').length < 8 && (
                  <p className="text-xs mt-1" style={{ color: 'rgba(252,165,165,0.8)' }}>Debe tener 8 dígitos (ej: 9999-9999)</p>
                )}
              </div>

              {/* Contraseña */}
              <div style={slide('0.3s')}>
                <label htmlFor="contrasena" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>Contraseña</label>
                <div className="relative">
                  <input id="contrasena" type={showPass ? 'text' : 'password'} required value={formData.contrasena}
                    onChange={e => set('contrasena')(e.target.value)} placeholder="Mínimo 6 caracteres"
                    style={{ ...inputStyle, paddingRight: '2.5rem' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(96,165,250,0.7)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
                    onBlur={e =>  { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {showPass ? eyeOff : eyeOn}
                  </button>
                </div>
              </div>

              {/* Confirmar contraseña */}
              <div style={slide('0.35s')}>
                <label htmlFor="confirmar" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>Confirmar contraseña</label>
                <div className="relative">
                  <input id="confirmar" type={showConfirm ? 'text' : 'password'} required value={formData.confirmarContrasena}
                    onChange={e => set('confirmarContrasena')(e.target.value)} placeholder="Repite tu contraseña"
                    style={{ ...inputStyle, paddingRight: '2.5rem' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(96,165,250,0.7)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
                    onBlur={e =>  { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowConfirm(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {showConfirm ? eyeOff : eyeOn}
                  </button>
                </div>
              </div>

              {/* Botón */}
              <div style={slide('0.4s')}>
                <button type="submit" disabled={isLoading}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all mt-1"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', boxShadow: '0 4px 20px rgba(59,130,246,0.4)' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 28px rgba(59,130,246,0.6)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(59,130,246,0.4)')}>
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creando cuenta...
                    </span>
                  ) : 'Crear cuenta'}
                </button>
              </div>
            </form>

            <div style={slide('0.45s')}>
              <p className="mt-5 text-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                ¿Ya tienes cuenta?{' '}
                <Link href="/auth/login" className="font-semibold" style={{ color: 'rgba(147,197,253,0.95)' }}>
                  Inicia sesión
                </Link>
              </p>
              <p className="mt-3 text-center">
                <Link href="/" className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  ← Volver al inicio
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
