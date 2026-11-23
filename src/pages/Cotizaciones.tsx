import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useCotizaciones } from '../lib/cotizaciones'
import { useAuth } from '../context/AuthContext'
import { fechaHora, gs } from '../lib/formato'

const MONEDAS = ['USD', 'BRL', 'ARS', 'EUR']

export default function Cotizaciones() {
  const { perfil } = useAuth()
  const { cotizaciones, error, recargar } = useCotizaciones()
  const [moneda, setMoneda] = useState('USD')
  const [compra, setCompra] = useState('')
  const [venta, setVenta] = useState('')
  const [msg, setMsg] = useState('')

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    setMsg('')
    const c = Number(compra)
    const v = Number(venta)
    if (v < c) return setMsg('La venta no puede ser menor que la compra')
    const { error } = await supabase.from('cotizaciones').insert({ moneda, compra: c, venta: v })
    if (error) return setMsg(error.message)
    setCompra('')
    setVenta('')
    setMsg('Cotización actualizada')
    recargar()
  }

  return (
    <section>
      <h2>Cotizaciones vigentes</h2>
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr><th>Moneda</th><th>Compra</th><th>Venta</th><th>Actualizada</th></tr>
        </thead>
        <tbody>
          {cotizaciones.map((c) => (
            <tr key={c.moneda}>
              <td>{c.simbolo} {c.nombre}</td>
              <td>{gs(c.compra)}</td>
              <td>{gs(c.venta)}</td>
              <td>{fechaHora(c.created_at)}</td>
            </tr>
          ))}
          {cotizaciones.length === 0 && (
            <tr><td colSpan={4}>Todavía no hay cotizaciones cargadas.</td></tr>
          )}
        </tbody>
      </table>

      {perfil?.rol === 'admin' && (
        <form className="tarjeta fila" onSubmit={guardar}>
          <label>
            Moneda
            <select value={moneda} onChange={(e) => setMoneda(e.target.value)}>
              {MONEDAS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label>
            Compra (₲)
            <input type="number" min="0" step="0.01" value={compra} onChange={(e) => setCompra(e.target.value)} required />
          </label>
          <label>
            Venta (₲)
            <input type="number" min="0" step="0.01" value={venta} onChange={(e) => setVenta(e.target.value)} required />
          </label>
          <button>Actualizar</button>
          {msg && <p>{msg}</p>}
        </form>
      )}
    </section>
  )
}
