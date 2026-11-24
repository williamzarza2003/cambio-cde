import { describe, expect, it } from 'vitest'
import { cotizacionVisible, gs, porUnidad, tasaTexto, unidadDe } from '../formato'

describe('cotización por lote', () => {
  it('el peso argentino se muestra por cada 100', () => {
    expect(unidadDe('ARS')).toBe(100)
    expect(cotizacionVisible('ARS', 4.4)).toBe(440)
    expect(porUnidad('ARS')).toBe('por 100')
  })

  it('las demás monedas se muestran por unidad', () => {
    expect(unidadDe('USD')).toBe(1)
    expect(cotizacionVisible('USD', 7400)).toBe(7400)
    expect(porUnidad('BRL')).toBe('')
  })

  it('redondea a guaraníes enteros sin errores de coma flotante', () => {
    expect(cotizacionVisible('ARS', 3.85)).toBe(385)
    expect(cotizacionVisible('ARS', '4.40' as unknown as number)).toBe(440)
  })

  it('arma el texto de la tasa para el ticket y las tablas', () => {
    expect(tasaTexto('USD', 7400)).toBe(gs(7400))
    expect(tasaTexto('ARS', 4.4)).toBe(`${gs(440)} por 100 ARS`)
  })
})
