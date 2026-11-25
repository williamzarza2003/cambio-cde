import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'

export default function Layout() {
  const { session, perfil, cargando, salir } = useAuth()

  if (cargando) {
    return (
      <div className="centro" role="status">
        <span className="girando" aria-hidden="true" /> Cargando tu sesión…
      </div>
    )
  }
  // Sin sesión, la raíz muestra la presentación del proyecto (desde ahí se entra a la demo)
  if (!session) return <Navigate to="/acerca" replace />
  if (perfil && !perfil.activo) {
    return (
      <div className="centro">
        <p>Tu usuario está desactivado. Pedile a un administrador que lo vuelva a habilitar.</p>
        <button className="boton boton--secundario" onClick={salir}>Salir</button>
      </div>
    )
  }

  return (
    <div className="app">
      <a href="#contenido" className="saltar">Ir al contenido</a>
      <header className="barra">
        <Logo claro />
        <nav aria-label="Secciones">
          <NavLink to="/" end>Operaciones</NavLink>
          <NavLink to="/cotizaciones">Cotizaciones</NavLink>
          <a href="/pantalla" target="_blank" rel="noreferrer">
            Pantalla TV <span className="sr-only">(se abre en otra pestaña)</span>
          </a>
        </nav>
        <div className="usuario">
          <span>
            {perfil?.nombre}
            <small>{perfil?.rol === 'admin' ? 'Administrador' : 'Cajero'}</small>
          </span>
          <button className="boton boton--fantasma" onClick={salir}>Salir</button>
        </div>
      </header>
      <main id="contenido" className="contenido">
        <Outlet />
      </main>
    </div>
  )
}
