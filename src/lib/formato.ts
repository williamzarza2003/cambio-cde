export const gs = (n: number) =>
  '₲ ' + Math.round(n).toLocaleString('es-PY')

export const num = (n: number, dec = 2) =>
  n.toLocaleString('es-PY', { minimumFractionDigits: dec, maximumFractionDigits: dec })

export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'short' })

/** Formatea según la moneda: PYG como ₲, el resto con 2 decimales y su código */
export const importe = (moneda: string, n: number) =>
  moneda === 'PYG' ? gs(Number(n)) : `${num(Number(n))} ${moneda}`
