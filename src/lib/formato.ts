export const gs = (n: number) =>
  '₲ ' + Math.round(n).toLocaleString('es-PY')

export const num = (n: number, dec = 2) =>
  n.toLocaleString('es-PY', { minimumFractionDigits: dec, maximumFractionDigits: dec })

/** Entero con separador de miles, sin símbolo (para las fichas de la pizarra) */
export const miles = (n: number) => Math.round(n).toLocaleString('es-PY')

export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'short' })

/** Formatea según la moneda: PYG como ₲, el resto con 2 decimales y su código */
export const importe = (moneda: string, n: number) =>
  moneda === 'PYG' ? gs(Number(n)) : `${num(Number(n))} ${moneda}`

/**
 * Cuántas unidades de la divisa se cotizan juntas. El peso argentino vale pocos
 * guaraníes, así que las pizarras lo muestran por cada 100 pesos (₲ 440 en vez de ₲ 4,40).
 * La base sigue guardando guaraníes por 1 unidad: esto es solo presentación.
 */
export const UNIDAD_COTIZACION: Record<string, number> = { ARS: 100 }

export const unidadDe = (moneda: string) => UNIDAD_COTIZACION[moneda] ?? 1

/** Guaraníes por la unidad de cotización de la moneda (ej. por 100 ARS), en entero */
export const cotizacionVisible = (moneda: string, valor: number) =>
  Math.round(Number(valor) * unidadDe(moneda))

/** "₲ 7.400" o, si la moneda se cotiza por lote, "₲ 440 por 100 ARS" */
export const tasaTexto = (moneda: string, valor: number) => {
  const u = unidadDe(moneda)
  return u === 1 ? gs(Number(valor)) : `${gs(cotizacionVisible(moneda, valor))} por ${u} ${moneda}`
}

/** Texto corto para la etiqueta de la moneda: "por 100" o vacío */
export const porUnidad = (moneda: string) => (unidadDe(moneda) === 1 ? '' : `por ${unidadDe(moneda)}`)
