'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

interface Resena {
  id: number;
  estrellas: number;
  comentario: string | null;
  creado_en: string;
  nombre_usuario: string;
}

function Stars({ value, interactive = false, onChange }: {
  value: number; interactive?: boolean; onChange?: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => interactive && setHover(n)}
          onMouseLeave={() => interactive && setHover(0)}
          className={interactive ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'}
        >
          <svg xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24" className="h-5 w-5"
            fill={(hover || value) >= n ? '#f59e0b' : 'none'}
            stroke={(hover || value) >= n ? '#f59e0b' : 'currentColor'}
            strokeWidth={1.5}
            style={{ color: 'var(--border)' }}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export function ResenasSection({ idProducto }: { idProducto: number }) {
  const { usuario } = useAuth();
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [promedio, setPromedio] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Form
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [miResena, setMiResena] = useState<Resena | null>(null);
  const [editando, setEditando] = useState(false);

  const cargar = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/resenas?id_producto=${idProducto}`);
      const data = await res.json();
      if (data.success) {
        setResenas(data.data.resenas);
        setPromedio(data.data.promedio);
        setTotal(data.data.total);
        if (usuario) {
          // Buscar si el usuario ya tiene reseña (por nombre no es ideal, pero el API no expone id_usuario)
          // Hacemos una segunda llamada con auth para verificar
        }
      }
    } finally { setIsLoading(false); }
  };

  useEffect(() => { cargar(); }, [idProducto]);

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (estrellas === 0) { setFormMsg({ type: 'error', text: 'Selecciona una calificación' }); return; }
    setEnviando(true); setFormMsg(null);
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch('/api/resenas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ id_producto: idProducto, estrellas, comentario }),
      });
      const data = await res.json();
      if (data.success) {
        setFormMsg({ type: 'success', text: 'Reseña publicada' });
        setEditando(false);
        cargar();
      } else {
        setFormMsg({ type: 'error', text: data.message || 'Error al publicar' });
      }
    } finally { setEnviando(false); }
  };

  const handleEliminar = async () => {
    const token = sessionStorage.getItem('token');
    await fetch(`/api/resenas?id_producto=${idProducto}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setEstrellas(0); setComentario(''); setMiResena(null);
    cargar();
  };

  // Distribución de estrellas
  const dist = [5, 4, 3, 2, 1].map(n => ({
    n, count: resenas.filter(r => r.estrellas === n).length,
  }));

  return (
    <section className="mt-12 border-t pt-10" style={{ borderColor: 'var(--border)' }}>
      <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text)' }}>Reseñas del producto</h2>

      {/* Resumen */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row gap-6 mb-8 p-5 rounded-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex flex-col items-center justify-center min-w-[100px]">
            <span className="text-5xl font-bold" style={{ color: 'var(--text)' }}>{promedio}</span>
            <Stars value={Math.round(promedio)} />
            <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{total} reseña{total !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex-1 space-y-1.5">
            {dist.map(({ n, count }) => (
              <div key={n} className="flex items-center gap-2">
                <span className="text-xs w-4 text-right" style={{ color: 'var(--text-muted)' }}>{n}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="#f59e0b" stroke="#f59e0b" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                </svg>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <div className="h-full rounded-full" style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%', backgroundColor: '#f59e0b' }} />
                </div>
                <span className="text-xs w-4" style={{ color: 'var(--text-muted)' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulario */}
      {usuario && !editando && (
        <div className="mb-6">
          <button onClick={() => setEditando(true)} className="btn-primary text-sm">
            {miResena ? 'Editar mi reseña' : 'Escribir una reseña'}
          </button>
        </div>
      )}

      {usuario && editando && (
        <form onSubmit={handleEnviar} className="mb-8 rounded-2xl p-5 space-y-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Tu reseña</h3>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Calificación</label>
            <Stars value={estrellas} interactive onChange={setEstrellas} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Comentario (opcional)</label>
            <textarea
              value={comentario} onChange={e => setComentario(e.target.value)}
              rows={3} maxLength={1000} placeholder="Cuéntanos tu experiencia con este producto..."
              className="input resize-none"
            />
            <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-muted)' }}>{comentario.length}/1000</p>
          </div>
          {formMsg && (
            <div className="rounded-xl px-4 py-2.5 text-sm"
              style={{ backgroundColor: formMsg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: formMsg.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
              {formMsg.text}
            </div>
          )}
          <div className="flex gap-3">
            <button type="submit" disabled={enviando} className="btn-primary text-sm disabled:opacity-50">
              {enviando ? 'Publicando...' : 'Publicar reseña'}
            </button>
            <button type="button" onClick={() => { setEditando(false); setFormMsg(null); }} className="btn-secondary text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {!usuario && (
        <p className="mb-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          <a href="/auth/login" style={{ color: 'var(--blue)' }}>Inicia sesión</a> para dejar una reseña.
        </p>
      )}

      {/* Lista de reseñas */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />)}
        </div>
      ) : resenas.length === 0 ? (
        <div className="py-10 text-center rounded-2xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aún no hay reseñas. ¡Sé el primero!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {resenas.map(r => (
            <div key={r.id} className="rounded-2xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: 'var(--blue)' }}>
                    {r.nombre_usuario.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{r.nombre_usuario}</p>
                    <Stars value={r.estrellas} />
                  </div>
                </div>
                <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {new Date(r.creado_en).toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
              {r.comentario && (
                <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{r.comentario}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
