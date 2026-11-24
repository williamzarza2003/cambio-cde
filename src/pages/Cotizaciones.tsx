import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useCotizaciones } from '../lib/cotizaciones'
import { useAuth } from '../context/AuthContext'
import { useAvisos } from '../context/AvisosContext'
import { fechaHora, gs } from '../lib/formato'
import Bandera from '../components/Bandera'

const MONEDAS = ['USD', 'BRL', 'ARS', 'EUR']

export default function Cotizaciones() {
  const { perfil } = useAuth()
  const avisar = useAvisos()
  const { cotizaciones, error, recargar } = useCotizaciones()
  const [cargado, setCargado] = useState(false)
  const [moneda, setMoneda] = useState('USD')
  const [compra, setCompra] = useState('')
  const [venta, setVenta] = useState('')
  const [msg, setMsg] = useState('')
  const [guardando, setGuardando] = useState(false)

  if (!cargado && (cotizaciones.length || error)) setCargado(true)

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    setMsg('')
    const c = Number(compra)
    const v = Number(venta)
    if (v < c) return setMsg('La venta no puede ser menor que la compra: revisá los dos valores.')
    setGuardando(true)
    const { error } = await supabase.from('cotizaciones').insert({ moneda, compra: c, venta: v })
    setGuardando(false)
    if (error) return setMsg(`No se pudo guardar: ${error.message}`)
    setCompra('')
    setVenta('')
    avisar(`Cotización de ${moneda} actualizada. La pantalla TV la muestra en menos de un minuto.`)
    recargar()
  }

  return (
    <div className="pagina">
      <header className="pagina__cabecera">
        <div>
          <h1>Cotizaciones</h1>
          <p className="suave">Guaraníes por unidad. Las operaciones usan siempre la última cotización cargada.</p>
        </div>
      </header>

      {error && (
        <div className="estado estado--error" role="alert">
          <p>No se pudieron leer las cotizaciones. {error}</p>
          <button className="boton boton--secundario" onClick={recargar}>Reintentar</button>
        </div>
      )}

      <section className="panel" aria-labelledby="titulo-vigentes">
        <h2 id="titulo-vigentes">Vigentes</h2>
        <table className="tabla tabla--apilable">
          <thead>
            <tr>
              <th scope="col">Moneda</th>
              <th scope="col" className="num">Compramos a</th>
              <th scope="col" className="num">Vendemos a</th>
              <th scope="col" className="num">Margen</th>
              <th scope="col">Actualizada</th>
            </tr>
          </thead>
          <tbody>
            {!cargado &&
              [0, 1, 2, 3].map((i) => (
                <tr key={i} aria-hidden="true"><td colSpan={5}><span className="esqueleto esqueleto--linea" /></td></tr>
              ))}
            {cotizaciones.map((c) => (
              <tr key={c.moneda}>
                <th scope="row"><span className="arqueo__moneda"><Bandera moneda={c.moneda} /> <b>{c.moneda}</b> <span className="suave">{c.nombre}</span></span></th>
                <td data-etiqueta="Compramos a" className="num">{gs(c.compra)}</td>
                <td data-etiqueta="Vendemos a" className="num">{gs(c.venta)}</td>
                <td data-etiqueta="Margen" className="num suave">{gs(c.venta - c.compra)}</td>
                <td data-etiqueta="Actualizada">{fechaHora(c.created_at)}</td>
              </tr>
            ))}
            {cargado && cotizaciones.length === 0 && !error && (
              <tr><td colSpan={5} className="vacio">Todavía no hay cotizaciones cargadas.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {perfil?.rol === 'admin' ? (
        <form className="panel" onSubmit={guardar} aria-labelledby="titulo-cargar">
          <h2 id="titulo-cargar">Cargar cotización</h2>
          <div className="tres-columnas">
            <label className="campo">
              <span>Moneda</span>
              <select value={moneda} onChange={(e) => setMoneda(e.target.value)}>
                {MONEDAS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <label className="campo">
              <span>Compramos a (₲)</span>
              <input className="input-num" type="number" inputMode="decimal" min="0" step="0.01" value={compra} onChange={(e) => setCompra(e.target.value)} required />
            </label>
            <label className="campo">
              <span>Vendemos a (₲)</span>
              <input className="input-num" type="number" inputMode="decimal" min="0" step="0.01" value={venta} onChange={(e) => setVenta(e.target.value)} required />
            </label>
          </div>
          {msg && <p className="error" role="alert">{msg}</p>}
          <button className="boton boton--primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cotización'}</button>
        </form>
      ) : (
        <p className="nota">Solo un administrador puede cargar cotizaciones. La cuenta demo es de cajero.</p>
      )}
    </div>
  )
}
