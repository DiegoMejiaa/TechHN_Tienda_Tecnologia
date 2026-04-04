/**
 * Wrapper de fetch que agrega automáticamente el token JWT del sessionStorage.
 * Usar en componentes client-side del panel admin/cajero.
 */
export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
  return fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}
