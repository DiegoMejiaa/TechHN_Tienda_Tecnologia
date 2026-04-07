'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Step = 'correo' | 'codigo' | 'nueva';

export default function RecuperarPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('correo');
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSolicitarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo }),
      });
      const data = await res.json();
      if (data.success) {
        setStep('codigo');
        setSuccess(`Código enviado a ${correo}`);
      } else {
        setError(data.message || 'Error al enviar el código');
      }
    } catch {
      setError('Error de conexión');
    } finally { setIsLoading(false); }
  };

  const handleVerificarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codigo.length !== 6) { setError('El código debe tener 6 dígitos'); return; }
    setError(''); setIsLoading(true);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, codigo }),
      });
      const data = await res.json();
      if (data.success) {
        setStep('nueva');
        setSuccess('');
      } else {
        setError(data.message || 'Código incorrecto o expirado');
      }
    } catch {
      setError('Error de conexión');
    } finally { setIsLoading(false); }
  };

  const handleCambiarContrasena = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (nuevaContrasena.length < 6) { setError('Mínimo 6 caracteres'); return; }
    if (nuevaContrasena !== confirmar) { setError('Las contraseñas no coinciden'); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, codigo, nueva_contrasena: nuevaContrasena }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('¡Contraseña actualizada! Redirigiendo...');
        setTimeout(() => router.push('/auth/login'), 2000);
      } else {
        setError(data.message || 'Código incorrecto o expirado');
        setStep('codigo');
      }
    } catch {
      setError('Error de conexión');
    } finally { setIsLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white font-bold text-lg shadow-lg"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
            TW
          </div>
        </div>

        <div className="card p-8 space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
              {step === 'correo' && 'Recuperar contraseña'}
              {step === 'codigo' && 'Ingresa el código'}
              {step === 'nueva' && 'Nueva contraseña'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {step === 'correo' && 'Te enviaremos un código de 6 dígitos'}
              {step === 'codigo' && `Revisa tu correo ${correo}`}
              {step === 'nueva' && 'Elige una contraseña segura'}
            </p>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-2">
            {(['correo', 'codigo', 'nueva'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className="h-2 flex-1 rounded-full transition-colors"
                  style={{ backgroundColor: ['correo', 'codigo', 'nueva'].indexOf(step) >= i ? 'var(--blue)' : 'var(--border)' }} />
              </div>
            ))}
          </div>

          {/* Error / Success */}
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)' }}>
              {success}
            </div>
          )}

          {/* Step 1: Correo */}
          {step === 'correo' && (
            <form onSubmit={handleSolicitarCodigo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Correo electrónico
                </label>
                <input
                  type="email" required value={correo} onChange={e => setCorreo(e.target.value)}
                  placeholder="tu@correo.com" className="input"
                  autoFocus
                />
              </div>
              <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5 disabled:opacity-50">
                {isLoading ? 'Enviando...' : 'Enviar código'}
              </button>
            </form>
          )}

          {/* Step 2: Código */}
          {step === 'codigo' && (
            <form onSubmit={handleVerificarCodigo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Código de 6 dígitos
                </label>
                <input
                  type="text" required value={codigo}
                  onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" className="input text-center text-2xl tracking-widest font-bold"
                  maxLength={6} autoFocus
                />
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  El código expira en 15 minutos
                </p>
              </div>
              <button type="submit" disabled={codigo.length !== 6 || isLoading} className="btn-primary w-full py-2.5 disabled:opacity-50">
                {isLoading ? 'Verificando...' : 'Verificar código'}
              </button>
              <button type="button" onClick={() => { setStep('correo'); setError(''); setSuccess(''); setCodigo(''); }}
                className="w-full text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                Cambiar correo
              </button>
            </form>
          )}

          {/* Step 3: Nueva contraseña */}
          {step === 'nueva' && (
            <form onSubmit={handleCambiarContrasena} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} required value={nuevaContrasena}
                    onChange={e => setNuevaContrasena(e.target.value)}
                    placeholder="Mínimo 6 caracteres" className="input pr-10" autoFocus
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                    {showPass
                      ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                    }
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'} required value={confirmar}
                    onChange={e => setConfirmar(e.target.value)}
                    placeholder="Repite la contraseña" className="input pr-10"
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowConfirm(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                    {showConfirm
                      ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                    }
                  </button>
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5 disabled:opacity-50">
                {isLoading ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </form>
          )}

          <div className="text-center">
            <Link href="/auth/login" className="text-sm" style={{ color: 'var(--text-muted)' }}>
              ← Volver al login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
