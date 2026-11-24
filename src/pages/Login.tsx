import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useCotizaciones } from '../lib/cotizaciones'
import { Fichas, plantillaDe } from '../components/Pizarra'
import Bandera from '../components/Bandera'
import Logo from '../components/Logo'

// Cuenta pública de la demo (rol cajero), la misma que figura en el README
const DEMO = { email: 'demo@cambiocde.com', password: 'demo1234' }

export default function Login() {
  const { session } = useAuth()
  const { cotizaciones } = useCotizaciones()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const divisas = cotizaciones.filter((c) => c.moneda !== 'PYG')
  const miles = (n: number) => Math.round(n).toLocaleString('es-PY')
  const plantilla = plantillaDe(divisas.flatMap((c) => [miles(c.compra), miles(c.venta)]))

  if (session) return <Navigate to="/" replace />

  const ingresar = async (credenciales: { email: string; password: string }) => {
    setEnviando(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword(credenciales)
    if (error) {
      setError(
        error.message.toLowerCase().includes('fetch')
          ? 'No hay conexión con el servidor. Revisá tu internet y probá de nuevo.'
          : 'El email o la contraseña no coinciden. Revisalos y probá de nuevo.',
      )
    }
    setEnviando(false)
  }

  const entrar = (e: FormEvent) => {
    e.preventDefault()
    ingresar({ email, password })
  }

  const entrarDemo = () => {
    setEmail(DEMO.email)
    setPassword(DEMO.password)
    ingresar(DEMO)
  }

  return (
    <div className="ingreso">
      <aside className="ingreso__vitrina" aria-label="Cotizaciones de hoy">
        <Logo claro />
        <div className="mini-tablero">
          <p className="mini-tablero__titulo">Hoy en la pizarra</p>
          <div className="mini-tablero__fila mini-tablero__fila--titulos" aria-hidden="true">
            <span />
            <span>Compramos</span>
            <span>Vendemos</span>
          </div>
          {divisas.map((c) => (
            <div key={c.moneda} className="mini-tablero__fila mini-tablero__fila--doble">
              <span className="fila-moneda"><Bandera moneda={c.moneda} /> <b>{c.moneda}</b></span>
              <Fichas texto={miles(c.compra)} plantilla={plantilla} etiqueta={`${c.nombre}: compramos a ${Math.round(c.compra)} guaraníes`} />
              <Fichas texto={miles(c.venta)} plantilla={plantilla} etiqueta={`${c.nombre}: vendemos a ${Math.round(c.venta)} guaraníes`} />
            </div>
          ))}
        </div>
        <p className="ingreso__pie">
          Sistema de caja para casas de cambio de Ciudad del Este.{' '}
          <Link to="/acerca">Conocé el proyecto</Link>
        </p>
      </aside>

      <main className="ingreso__formulario">
        <form onSubmit={entrar} className="formulario-ingreso" aria-labelledby="titulo-ingreso">
          <h1 id="titulo-ingreso">Entrar a la caja</h1>
          <p className="suave">Usá tu cuenta de cajero o administrador.</p>

          <label className="campo">
            <span>Email</span>
            <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="campo">
            <span>Contraseña</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="boton boton--primario boton--ancho" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>

          <div className="ingreso__demo">
            <p>¿Venís a ver la demo?</p>
            <button type="button" className="boton boton--secundario boton--ancho" onClick={entrarDemo} disabled={enviando}>
              Entrar con la cuenta demo
            </button>
            <p className="suave chico">
              Rol cajero. La base es compartida: lo que cargues lo ven otros visitantes.
            </p>
          </div>
        </form>
      </main>
    </div>
  )
}
