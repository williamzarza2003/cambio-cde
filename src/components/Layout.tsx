import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { session, perfil, cargando, salir } = useAuth()

  if (cargando) return <p className="centro">Cargando…</p>
  if (!session) return <Navigate to="/login" replace />
  if (perfil && !perfil.activo) return <p className="centro">Tu usuario está desactivado.</p>

  return (
    <div className="app">
      <header className="barra">
        <strong>Cambio CDE</strong>
        <nav>
          <NavLink to="/" end>Operación</NavLink>
          <NavLink to="/cotizaciones">Cotizaciones</NavLink>
          <a href="/pantalla" target="_blank" rel="noreferrer">Pantalla TV</a>
        </nav>
        <span className="usuario">
          {perfil?.nombre} ({perfil?.rol})
          <button className="secundario" onClick={salir}>Salir</button>
        </span>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
