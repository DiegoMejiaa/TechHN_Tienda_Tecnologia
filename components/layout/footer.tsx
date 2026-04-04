import Link from 'next/link';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ backgroundColor: 'var(--sidebar-bg)', borderTop: '1px solid var(--sidebar-border)' }}>
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white text-xs font-bold shadow-lg"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                TW
              </div>
              <span className="font-bold text-lg text-white">TechHN</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--sidebar-text)' }}>
              Tu tienda de tecnología en Honduras. Productos de calidad con envío a todo el país.
            </p>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
              <span className="text-xs font-medium" style={{ color: '#10b981' }}>Tienda en línea activa</span>
            </div>
          </div>

          {/* Navegación */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">Navegación</h3>
            <ul className="space-y-2.5">
              {[
                { href: '/productos', label: 'Productos' },
                { href: '/categorias', label: 'Categorías' },
                { href: '/tiendas', label: 'Nuestras tiendas' },
                { href: '/pedidos', label: 'Mis pedidos' },
                { href: '/carrito', label: 'Carrito' },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm transition-colors hover:text-white"
                    style={{ color: 'var(--sidebar-text)' }}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Sucursales */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">Sucursales</h3>
            <ul className="space-y-3">
              {[
                { nombre: 'TechHN Tegucigalpa', ciudad: 'Tegucigalpa' },
                { nombre: 'TechHN San Pedro', ciudad: 'San Pedro Sula' },
                { nombre: 'TechHN La Ceiba', ciudad: 'La Ceiba' },
              ].map(t => (
                <li key={t.nombre} className="flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                    className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#3b82f6' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-white">{t.nombre}</p>
                    <p className="text-xs" style={{ color: 'var(--sidebar-text)' }}>{t.ciudad}, Honduras</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Soporte */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">Soporte</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                  className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#3b82f6' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--sidebar-text)' }}>Correo</p>
                  <a href="mailto:soporte@techn.hn" className="text-sm text-white hover:text-blue-400 transition-colors">
                    soporte@techn.hn
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                  className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#3b82f6' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--sidebar-text)' }}>Tegucigalpa</p>
                  <a href="tel:+50422358841" className="text-sm text-white hover:text-blue-400 transition-colors">
                    +504 2235-8841
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                  className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#3b82f6' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--sidebar-text)' }}>San Pedro Sula</p>
                  <a href="tel:+50425583270" className="text-sm text-white hover:text-blue-400 transition-colors">
                    +504 2558-3270
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                  className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#3b82f6' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--sidebar-text)' }}>La Ceiba</p>
                  <a href="tel:+50424431965" className="text-sm text-white hover:text-blue-400 transition-colors">
                    +504 2443-1965
                  </a>
                </div>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 sm:flex-row"
          style={{ borderColor: 'var(--sidebar-border)' }}>
          <p className="text-xs" style={{ color: 'var(--sidebar-text)' }}>
            © {year} TechHN Honduras. Todos los derechos reservados.
          </p>
          <p className="text-xs" style={{ color: 'var(--sidebar-text)' }}>
            Lun – Sáb: 8:00 AM – 6:00 PM
          </p>
        </div>
      </div>
    </footer>
  );
}
