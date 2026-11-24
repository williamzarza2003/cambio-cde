import type { ReactNode } from 'react'
import { fechaHora } from '../lib/formato'

interface Props {
  titulo: string
  numero?: number
  fecha: string
  children: ReactNode
  onCerrar: () => void
}

/**
 * Comprobante con formato de ticket térmico de 80 mm.
 * En pantalla se ve como un ticket; al imprimir, es lo único que sale.
 */
export default function Ticket({ titulo, numero, fecha, children, onCerrar }: Props) {
  return (
    <div className="ticket-envoltura">
      <article className="ticket imprimible" aria-label={titulo}>
        <header className="ticket__cabecera">
          <strong>CAMBIO CDE</strong>
          <span>Av. Ficticia 1234 · Ciudad del Este</span>
          <span>RUC 80000000-0 (demo)</span>
        </header>
        <hr />
        <p className="ticket__titulo">
          {titulo}
          {numero !== undefined && <span>N° {String(numero).padStart(6, '0')}</span>}
        </p>
        <p className="ticket__fecha">{fechaHora(fecha)}</p>
        <hr />
        {children}
        <hr />
        <p className="ticket__pie">Documento sin valor fiscal · Demo de portafolio</p>
      </article>
      <div className="ticket__acciones no-imprimir">
        <button className="boton boton--primario" onClick={() => window.print()}>Imprimir ticket</button>
        <button className="boton boton--secundario" onClick={onCerrar}>Cerrar</button>
      </div>
    </div>
  )
}

/** Renglón del ticket: concepto a la izquierda, importe a la derecha. */
export function Renglon({ concepto, valor, fuerte }: { concepto: ReactNode; valor: ReactNode; fuerte?: boolean }) {
  return (
    <p className={fuerte ? 'ticket__renglon ticket__renglon--fuerte' : 'ticket__renglon'}>
      <span>{concepto}</span>
      <span>{valor}</span>
    </p>
  )
}
