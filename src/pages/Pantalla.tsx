import { useEffect, useState, type CSSProperties } from 'react'
import { useCotizaciones } from '../lib/cotizaciones'
import { Fichas, plantillaDe } from '../components/Pizarra'
import Bandera from '../components/Bandera'
import { Marca } from '../components/Logo'
import { cotizacionVisible, miles, porUnidad, unidadDe } from '../lib/formato'

function useReloj() {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return ahora
}

/** Oculta el cursor si no se mueve el mouse por unos segundos (la TV queda limpia). */
function useCursorQuieto(ms = 3000) {
  const [quieto, setQuieto] = useState(false)
  useEffect(() => {
    let t = setTimeout(() => setQuieto(true), ms)
    const mover = () => {
      setQuieto(false)
      clearTimeout(t)
      t = setTimeout(() => setQuieto(true), ms)
    }
    window.addEventListener('pointermove', mover)
    return () => {
      clearTimeout(t)
      window.removeEventListener('pointermove', mover)
    }
  }, [ms])
  return quieto
}

/** Pantalla pública para la TV del local, pensada para 16:9. Se actualiza al instante con Supabase Realtime. */
export default function Pantalla() {
  const { cotizaciones, error } = useCotizaciones({ enVivo: true })
  const ahora = useReloj()
  const quieto = useCursorQuieto()
  const filas = cotizaciones.filter((c) => c.moneda !== 'PYG')
  const cargando = filas.length === 0 && !error

  useEffect(() => {
    const previo = document.title
    document.title = 'Cotizaciones · Cambio CDE'
    return () => { document.title = previo }
  }, [])

  // Una sola plantilla para las dos columnas: mismas fichas y separadores en todas las filas
  const valor = (moneda: string, n: number) => miles(cotizacionVisible(moneda, n))
  const plantilla = plantillaDe(filas.flatMap((c) => [valor(c.moneda, c.compra), valor(c.moneda, c.venta)]))
  const lotes = filas.filter((c) => unidadDe(c.moneda) > 1).map((c) => `${c.moneda} por ${unidadDe(c.moneda)}`)
  const ultima = filas.reduce<string | null>((m, c) => (!m || c.created_at > m ? c.created_at : m), null)

  const pantallaCompleta = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen?.()
  }

  return (
    <main className={`tablero${quieto ? ' tablero--quieto' : ''}`} style={{ '--filas': Math.max(filas.length, 2) } as CSSProperties}>
      <header className="tablero__cabecera">
        <div className="tablero__marca">
          <Marca size={56} />
          <div>
            <h1>Cambio CDE</h1>
            <p>Casa de cambios · Ciudad del Este</p>
          </div>
        </div>
        <div className="tablero__reloj">
          <time dateTime={ahora.toISOString()}>
            {ahora.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', hour12: false })}
            <span className="tablero__segundos">{String(ahora.getSeconds()).padStart(2, '0')}</span>
          </time>
          <p>{ahora.toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </header>

      <div className="tablero__tabla" role="table" aria-label="Cotizaciones del día en guaraníes">
        <div className="tablero__fila tablero__fila--titulos" role="row">
          <span role="columnheader">Moneda</span>
          <span role="columnheader">Compramos</span>
          <span role="columnheader">Vendemos</span>
        </div>

        {cargando &&
          Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="tablero__fila tablero__fila--cargando" role="row" aria-hidden="true">
              <span className="tablero__moneda"><span className="bandera bandera--vacia" /> <b>···</b></span>
              <Fichas texto="" plantilla="0.000" etiqueta="" />
              <Fichas texto="" plantilla="0.000" etiqueta="" />
            </div>
          ))}

        {filas.map((c) => {
          const lote = unidadDe(c.moneda)
          const por = lote > 1 ? ` por cada ${lote} ${c.moneda}` : ''
          return (
            <div key={c.moneda} className="tablero__fila" role="row">
              <span className="tablero__moneda" role="rowheader">
                <Bandera moneda={c.moneda} />
                <b>{c.moneda}</b>
                <small>
                  {c.nombre}
                  {lote > 1 && <span className="tablero__lote"> · {porUnidad(c.moneda)}</span>}
                </small>
              </span>
              <span role="cell">
                <Fichas texto={valor(c.moneda, c.compra)} plantilla={plantilla} etiqueta={`Compramos ${c.nombre} a ${valor(c.moneda, c.compra)} guaraníes${por}`} />
              </span>
              <span role="cell">
                <Fichas texto={valor(c.moneda, c.venta)} plantilla={plantilla} etiqueta={`Vendemos ${c.nombre} a ${valor(c.moneda, c.venta)} guaraníes${por}`} />
              </span>
            </div>
          )
        })}
      </div>

      <footer className="tablero__pie">
        <span>Guaraníes por unidad{lotes.length > 0 && ` (${lotes.join(', ')})`} · Precios para efectivo</span>
        {error ? (
          <span className="tablero__aviso" role="status">Sin conexión: se muestran las últimas cotizaciones recibidas</span>

        ) : (
          ultima && (
            <span>
              Actualizado
              {new Date(ultima).toDateString() !== ahora.toDateString() &&
                ` el ${new Date(ultima).toLocaleDateString('es-PY', { day: 'numeric', month: 'long' })}`}
              {' '}a las{' '}
              {new Date(ultima).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          )
        )}
        <button type="button" className="tablero__completa" onClick={pantallaCompleta}>
          Pantalla completa
        </button>
      </footer>
    </main>
  )
}
