import { useEffect, useState, type FormEvent } from 'react'
import { useMonedas } from '../lib/monedas'
import { importe } from '../lib/formato'
import Bandera from './Bandera'

type Montos = Record<string, number>

interface Props {
  titulo: string
  descripcion?: string
  boton: string
  /** Valores con los que arranca el formulario (ej. lo contado en el último cierre) */
  iniciales?: Montos
  /** Si se pasa, muestra columnas Esperado y Diferencia */
  esperados?: Montos
  requerido?: boolean
  onConfirmar: (montos: Montos) => Promise<void>
  onCancelar?: () => void
}

/** Formulario de conteo de efectivo por moneda (apertura o cierre de caja). */
export default function Arqueo({ titulo, descripcion, boton, iniciales, esperados, requerido, onConfirmar, onCancelar }: Props) {
  const monedas = useMonedas()
  const [valores, setValores] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (iniciales) setValores(Object.fromEntries(Object.entries(iniciales).map(([k, v]) => [k, String(v)])))
  }, [iniciales])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await onConfirmar(Object.fromEntries(monedas.map((m) => [m.codigo, Number(valores[m.codigo] || 0)])))
    } catch (err) {
      const msg = (err as { message?: string })?.message
      setError(msg ? `No se pudo guardar: ${msg}` : 'No se pudo guardar. Revisá la conexión y probá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="panel arqueo" onSubmit={enviar}>
      <h2>{titulo}</h2>
      {descripcion && <p className="suave">{descripcion}</p>}
      <table className="tabla tabla--apilable">
        <thead>
          <tr>
            <th scope="col">Moneda</th>
            {esperados && <th scope="col" className="num">Esperado</th>}
            <th scope="col" className="num">Contado</th>
            {esperados && <th scope="col" className="num">Diferencia</th>}
          </tr>
        </thead>
        <tbody>
          {!monedas.length &&
            [0, 1, 2].map((i) => (
              <tr key={i} aria-hidden="true"><td colSpan={4}><span className="esqueleto esqueleto--linea" /></td></tr>
            ))}
          {monedas.map((m) => {
            const v = valores[m.codigo] ?? ''
            const esp = esperados?.[m.codigo] ?? 0
            const dif = v === '' ? null : Number(v) - esp
            return (
              <tr key={m.codigo}>
                <th scope="row"><span className="arqueo__moneda"><Bandera moneda={m.codigo} /> <b>{m.codigo}</b> <span className="suave">{m.nombre}</span></span></th>
                {esperados && <td data-etiqueta="Esperado" className="num">{importe(m.codigo, esp)}</td>}
                <td data-etiqueta="Contado" className="num">
                  <input
                    className="input-num" aria-label={`Contado en ${m.nombre}`}
                    type="number" inputMode="decimal" min="0" step={m.decimales ? '0.01' : '1'} value={v} required={requerido}
                    onChange={(e) => setValores({ ...valores, [m.codigo]: e.target.value })}
                  />
                </td>
                {esperados && (
                  <td data-etiqueta="Diferencia" className={`num${dif ? ' diferencia' : ''}`}>
                    {dif === null ? '—' : (
                      <>
                        {dif !== 0 && <span className="sr-only">Hay diferencia: </span>}
                        {dif > 0 ? '+' : ''}{importe(m.codigo, dif)}
                        {dif !== 0 && <span aria-hidden="true"> ⚠</span>}
                      </>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="fila">
        <button className="boton boton--primario" disabled={enviando || !monedas.length}>{enviando ? 'Guardando…' : boton}</button>
        {onCancelar && <button type="button" className="boton boton--secundario" onClick={onCancelar}>Cancelar</button>}
      </div>
    </form>
  )
}
