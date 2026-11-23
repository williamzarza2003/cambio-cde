import { useEffect, useState, type FormEvent } from 'react'
import { useMonedas } from '../lib/monedas'
import { importe } from '../lib/formato'

type Montos = Record<string, number>

interface Props {
  titulo: string
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
export default function Arqueo({ titulo, boton, iniciales, esperados, requerido, onConfirmar, onCancelar }: Props) {
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
      setError((err as { message?: string })?.message ?? 'No se pudo guardar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="tarjeta" onSubmit={enviar}>
      <h3>{titulo}</h3>
      <table>
        <thead>
          <tr>
            <th>Moneda</th>
            {esperados && <th>Esperado</th>}
            <th>Contado</th>
            {esperados && <th>Diferencia</th>}
          </tr>
        </thead>
        <tbody>
          {monedas.map((m) => {
            const v = valores[m.codigo] ?? ''
            const esp = esperados?.[m.codigo] ?? 0
            const dif = v === '' ? null : Number(v) - esp
            return (
              <tr key={m.codigo}>
                <td>{m.codigo} – {m.nombre}</td>
                {esperados && <td>{importe(m.codigo, esp)}</td>}
                <td>
                  <input
                    type="number" min="0" step={m.decimales ? '0.01' : '1'} value={v} required={requerido}
                    onChange={(e) => setValores({ ...valores, [m.codigo]: e.target.value })}
                  />
                </td>
                {esperados && (
                  <td className={dif ? 'error' : ''}>{dif === null ? '—' : importe(m.codigo, dif)}</td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
      {error && <p className="error">{error}</p>}
      <div className="fila">
        <button disabled={enviando || !monedas.length}>{enviando ? 'Guardando…' : boton}</button>
        {onCancelar && <button type="button" className="secundario" onClick={onCancelar}>Cancelar</button>}
      </div>
    </form>
  )
}
