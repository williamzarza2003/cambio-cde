import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { CotizacionActual } from '../types'

/** Cotizaciones vigentes. Con `autoRefrescoMs` se recargan solas (pantalla TV). */
export function useCotizaciones(autoRefrescoMs?: number) {
  const [cotizaciones, setCotizaciones] = useState<CotizacionActual[]>([])
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from('cotizaciones_actuales').select('*').order('moneda')
    if (error) setError(error.message)
    else setCotizaciones(data as CotizacionActual[])
  }, [])

  useEffect(() => {
    cargar()
    if (!autoRefrescoMs) return
    const t = setInterval(cargar, autoRefrescoMs)
    return () => clearInterval(t)
  }, [cargar, autoRefrescoMs])

  return { cotizaciones, error, recargar: cargar }
}
