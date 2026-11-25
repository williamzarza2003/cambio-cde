import { useState, type CSSProperties } from 'react'

interface Props {
  /** Texto a mostrar; se alinea a la derecha rellenando con fichas vacías */
  texto: string
  /**
   * Valor más largo de la columna (ej. "8.150"). Define cuántas fichas hay y
   * dónde caen los separadores de miles, para que todas las filas alineen.
   */
  plantilla: string
  etiqueta: string
}

/**
 * Valor en fichas tipo split-flap. Solo las fichas cuyo carácter cambió
 * se vuelven a montar con la clase de giro, así la animación ocurre
 * únicamente cuando cambia una cotización (nunca al cargar).
 */
export function Fichas({ texto, plantilla, etiqueta }: Props) {
  const ancho = Math.max(plantilla.length, texto.length)
  const molde = plantilla.padStart(ancho, '0')
  const relleno = texto.padStart(ancho, ' ')
  // Patrón de React para recordar el valor del render anterior sin refs
  const [actual, setActual] = useState(relleno)
  const [previo, setPrevio] = useState<string | null>(null)
  if (relleno !== actual) {
    setPrevio(actual)
    setActual(relleno)
  }

  return (
    <span className="fichas" role="text" aria-label={etiqueta}>
      {Array.from(relleno).map((ch, i) => {
        const cambio = previo !== null && previo[i] !== ch
        const angosta = molde[i] === '.' || ch === '.'
        return (
          <span
            key={`${i}-${ch}`}
            aria-hidden="true"
            className={`ficha${ch === ' ' ? ' ficha--vacia' : ''}${angosta ? ' ficha--punto' : ''}${cambio ? ' ficha--gira' : ''}`}
            style={{ '--i': i } as CSSProperties}
          >
            {ch}
          </span>
        )
      })}
    </span>
  )
}

/** El valor más largo de una lista, para usar como plantilla de una columna. */
export function plantillaDe(valores: string[], minimo = '0.000') {
  return valores.reduce((m, v) => (v.length > m.length ? v : m), minimo)
}
