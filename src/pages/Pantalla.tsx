import { useCotizaciones } from '../lib/cotizaciones'
import { gs } from '../lib/formato'

/** Pantalla pública para la TV del local. Se actualiza sola cada 60 s. */
export default function Pantalla() {
  const { cotizaciones } = useCotizaciones(60_000)

  return (
    <div className="pantalla">
      <h1>Cotizaciones del día</h1>
      <table>
        <thead>
          <tr><th>Moneda</th><th>Compramos</th><th>Vendemos</th></tr>
        </thead>
        <tbody>
          {cotizaciones.map((c) => (
            <tr key={c.moneda}>
              <td>{c.simbolo} {c.nombre}</td>
              <td>{gs(c.compra)}</td>
              <td>{gs(c.venta)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hora">{new Date().toLocaleDateString('es-PY', { dateStyle: 'full' })}</p>
    </div>
  )
}
