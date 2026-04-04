'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function RecuperarPage() {
  const [correo, setCorreo] = useState('');
  const [sent, setSent] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

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
        .img-kb { animation: kenburns 18s ease-in-out infinite; }
        .dot-a  { animation: float1 6s ease-in-out infinite; }
        .dot-b  { animation: float2 8s ease-in-out infinite 1s; }
        .dot-c  { animation: float3 7s ease-in-out infinite 2s; }
        .dot-d  { animation: float1 9s ease-in-out infinite 0.5s; }
        .dot-e  { animation: float2 5s ease-in-out infinite 3s; }
      `}</style>

      <div className="relative min-h-screen flex items-center justify-center">
        {/* Fondo */}
        <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80" alt=""
          className="img-kb fixed inset-0 h-full w-full object-cover" style={{ zIndex: 0 }} />
        <div className="fixed inset-0" style={{ zIndex: 1, background: 'linear-gradient(135deg, rgba(10,15,35,0.85) 0%, rgba(20,40,100,0.75) 100%)' }} />

        {/* Partículas */}
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 2 }}>
          <div className="dot-a absolute h-2 w-2 rounded-full"     style={{ top: '18%', left: '10%', backgroundColor: 'rgba(96,165,250,0.6)' }} />
          <div className="dot-b absolute h-3 w-3 rounded-full"     style={{ top: '60%', left: '8%',  backgroundColor: 'rgba(147,197,253,0.35)' }} />
          <div className="dot-c absolute h-1.5 w-1.5 rounded-full" style={{ top: '30%', left: '90%', backgroundColor: 'rgba(255,255,255,0.5)' }} />
          <div className="dot-d absolute h-2.5 w-2.5 rounded-full" style={{ top: '75%', left: '85%', backgroundColor: 'rgba(96,165,250,0.45)' }} />
          <div className="dot-e absolute h-1.5 w-1.5 rounded-full" style={{ top: '50%', left: '50%', backgroundColor: 'rgba(255,255,255,0.3)' }} />
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.05 }}>
            <line x1="0" y1="30%" x2="100%" y2="70%" stroke="white" strokeWidth="1" />
            <line x1="0" y1="70%" x2="100%" y2="30%" stroke="white" strokeWidth="0.5" />
            <circle cx="50%" cy="50%" r="250" stroke="white" strokeWidth="0.5" fill="none" />
          </svg>
        </div>

        <div className="fixed top-4 right-4 z-20"><ThemeToggle /></div>
        <div className="fixed top-6 left-6 z-20">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>TH</div>
            <span className="text-white font-bold text-lg">TechHN</span>
          </Link>
        </div>

        {/* Card */}
        <div className="relative z-10 w-full max-w-sm mx-4">
          <div className="rounded-2xl p-8 shadow-2xl" style={{
            backgroundColor: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}>
            <div style={slide('0.1s')} className="mb-7">
              <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>
              <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Ingresa tu correo y te enviaremos instrucciones
              </p>
            </div>

            {sent ? (
              <div style={slide('0.2s')} className="rounded-xl px-4 py-5 text-center"
                style={{ backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)' }}>
                <div className="flex h-12 w-12 items-center justify-center rounded-full mx-auto mb-3"
                  style={{ backgroundColor: 'rgba(34,197,94,0.2)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#4ade80" className="h-6 w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <p className="font-semibold text-white">Correo enviado</p>
                <p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Revisa tu bandeja de entrada y sigue las instrucciones.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div style={slide('0.2s')}>
                  <label htmlFor="correo" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Correo electrónico
                  </label>
                  <input
                    id="correo" type="email" required value={correo}
                    onChange={e => setCorreo(e.target.value)}
                    placeholder="tu@correo.com"
                    style={{
                      width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.75rem',
                      border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)',
                      color: 'white', fontSize: '0.875rem', outline: 'none',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(96,165,250,0.7)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
                    onBlur={e =>  { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                  />
                </div>
                <div style={slide('0.3s')}>
                  <button type="submit"
                    className="w-full py-2.5 rounded-xl font-semibold text-sm text-white"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', boxShadow: '0 4px 20px rgba(59,130,246,0.4)' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 28px rgba(59,130,246,0.6)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(59,130,246,0.4)')}>
                    Enviar instrucciones
                  </button>
                </div>
              </form>
            )}

            <div style={slide('0.4s')} className="mt-6 text-center">
              <Link href="/auth/login" className="text-sm font-semibold" style={{ color: 'rgba(147,197,253,0.9)' }}>
                ← Volver al login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
