'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({ correo: '', contrasena: '' });

  useEffect(() => {
    // pequeño delay para que la animación se note al entrar
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const result = await login(formData);
    if (result.success && result.redirect) {
      router.push(result.redirect);
    } else {
      setError(result.error || 'Error al iniciar sesión');
    }
    setIsLoading(false);
  };

  return (
    <>
      <style>{`
        @keyframes kenburns {
          0%   { transform: scale(1)    translateX(0)    translateY(0); }
          50%  { transform: scale(1.08) translateX(-1%)  translateY(-1%); }
          100% { transform: scale(1)    translateX(0)    translateY(0); }
        }
        @keyframes float1 {
          0%, 100% { transform: translateY(0px)   translateX(0px); opacity: 0.4; }
          50%       { transform: translateY(-18px) translateX(8px);  opacity: 0.8; }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0px)  translateX(0px);  opacity: 0.3; }
          50%       { transform: translateY(14px) translateX(-10px); opacity: 0.7; }
        }
        @keyframes float3 {
          0%, 100% { transform: translateY(0px)   translateX(0px); opacity: 0.5; }
          50%       { transform: translateY(-10px) translateX(6px); opacity: 0.9; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .img-kenburns {
          animation: kenburns 18s ease-in-out infinite;
        }
        .dot-1 { animation: float1 6s ease-in-out infinite; }
        .dot-2 { animation: float2 8s ease-in-out infinite 1s; }
        .dot-3 { animation: float3 7s ease-in-out infinite 2s; }
        .dot-4 { animation: float1 9s ease-in-out infinite 0.5s; }
        .dot-5 { animation: float2 5s ease-in-out infinite 3s; }
        .slide-up {
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .slide-up-delay-1 { transition-delay: 0.1s; }
        .slide-up-delay-2 { transition-delay: 0.2s; }
        .slide-up-delay-3 { transition-delay: 0.3s; }
        .slide-up-delay-4 { transition-delay: 0.4s; }
        .slide-up-delay-5 { transition-delay: 0.5s; }
      `}</style>

      {/* ── Fondo full: imagen cubre toda la pantalla ── */}
      <div className="relative min-h-screen flex items-center justify-center">

        {/* Imagen de fondo full */}
        <img
          src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80"
          alt=""
          className="img-kenburns fixed inset-0 h-full w-full object-cover"
          style={{ zIndex: 0 }}
        />
        {/* Overlay oscuro sobre toda la pantalla */}
        <div className="fixed inset-0" style={{ zIndex: 1, background: 'linear-gradient(135deg, rgba(10,15,35,0.85) 0%, rgba(20,40,100,0.75) 100%)' }} />

        {/* Partículas flotantes */}
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 2 }}>
          <div className="dot-1 absolute h-2 w-2 rounded-full" style={{ top: '18%', left: '10%', backgroundColor: 'rgba(96,165,250,0.6)' }} />
          <div className="dot-2 absolute h-3 w-3 rounded-full" style={{ top: '60%', left: '8%',  backgroundColor: 'rgba(147,197,253,0.35)' }} />
          <div className="dot-3 absolute h-1.5 w-1.5 rounded-full" style={{ top: '30%', left: '90%', backgroundColor: 'rgba(255,255,255,0.5)' }} />
          <div className="dot-4 absolute h-2.5 w-2.5 rounded-full" style={{ top: '75%', left: '85%', backgroundColor: 'rgba(96,165,250,0.45)' }} />
          <div className="dot-5 absolute h-1.5 w-1.5 rounded-full" style={{ top: '50%', left: '50%', backgroundColor: 'rgba(255,255,255,0.3)' }} />
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.05 }}>
            <line x1="0" y1="30%" x2="100%" y2="70%" stroke="white" strokeWidth="1" />
            <line x1="0" y1="70%" x2="100%" y2="30%" stroke="white" strokeWidth="0.5" />
            <circle cx="50%" cy="50%" r="200" stroke="white" strokeWidth="0.5" fill="none" />
            <circle cx="50%" cy="50%" r="350" stroke="white" strokeWidth="0.5" fill="none" />
          </svg>
        </div>

        <div className="fixed top-4 right-4 z-20">
          <ThemeToggle />
        </div>

        {/* Logo arriba izquierda */}
        <div className="fixed top-6 left-6 z-20">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>TH</div>
            <span className="text-white font-bold text-lg">TechHN</span>
          </Link>
        </div>

        {/* ── Card del formulario flotante ── */}
        <div className="relative z-10 w-full max-w-sm mx-4">
          <div
            className="rounded-2xl p-8 shadow-2xl"
            style={{
              backgroundColor: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            {/* Título */}
            <div
              className="slide-up slide-up-delay-1 mb-7"
              style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)' }}
            >
              <h1 className="text-2xl font-bold text-white">Iniciar sesión</h1>
              <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Accede a tu cuenta TechHN</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-xl px-4 py-3 text-sm"
                  style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }}>
                  {error}
                </div>
              )}

              {/* Correo */}
              <div
                className="slide-up slide-up-delay-2"
                style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)' }}
              >
                <label htmlFor="correo" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Correo electrónico
                </label>
                <input
                  id="correo"
                  type="email"
                  required
                  value={formData.correo}
                  onChange={e => setFormData({ ...formData, correo: e.target.value })}
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    color: 'white',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(96,165,250,0.7)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
                  onBlur={e =>  { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                />
              </div>

              {/* Contraseña */}
              <div
                className="slide-up slide-up-delay-3"
                style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="contrasena" className="block text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Contraseña
                  </label>
                  <Link href="/auth/recuperar" className="text-xs font-medium" style={{ color: 'rgba(147,197,253,0.9)' }}>
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="contrasena"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.contrasena}
                    onChange={e => setFormData({ ...formData, contrasena: e.target.value })}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{
                      width: '100%',
                      padding: '0.625rem 2.5rem 0.625rem 0.875rem',
                      borderRadius: '0.75rem',
                      border: '1px solid rgba(255,255,255,0.2)',
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      color: 'white',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(96,165,250,0.7)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
                    onBlur={e =>  { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Botón */}
              <div
                className="slide-up slide-up-delay-4"
                style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)' }}
              >
                <button type="submit" disabled={isLoading}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', boxShadow: '0 4px 20px rgba(59,130,246,0.4)' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 28px rgba(59,130,246,0.6)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(59,130,246,0.4)')}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Iniciando sesión...
                    </span>
                  ) : 'Iniciar sesión'}
                </button>
              </div>
            </form>

            {/* Footer */}
            <div
              className="slide-up slide-up-delay-5"
              style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)' }}
            >
              <p className="mt-6 text-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                ¿No tienes cuenta?{' '}
                <Link href="/auth/registro" className="font-semibold" style={{ color: 'rgba(147,197,253,0.95)' }}>
                  Regístrate gratis
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
