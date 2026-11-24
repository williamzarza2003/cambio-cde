import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import type { CotizacionActual } from '../types'

/** Sondeo de respaldo mientras Realtime no esté conectado y confirmado. */
const RESPALDO_MS = 60_000
/** Con Realtime funcionando, una recarga de seguridad cada tanto (por si se pierde un evento). */
const SEGURIDAD_MS = 5 * 60_000
/** Si el canal falla tantas veces seguidas (ej. la tabla no está publicada), se deja el sondeo solo. */
const MAX_FALLOS = 3

export type EstadoConexion = 'conectando' | 'en-vivo' | 'respaldo'

/**
 * Cotizaciones vigentes.
 *
 * Con `enVivo`, se suscribe a Supabase Realtime: cada vez que el administrador carga una
 * cotización, se vuelve a leer la vista y la pizarra se actualiza en el momento. Mientras
 * el canal no esté conectado, o hasta recibir el primer evento (prueba de que la tabla está
 * publicada para Realtime), se sigue sondeando cada 60 s como antes. Si la conexión se
 * corta, vuelve al sondeo; al reconectar, se pone al día con una lectura. Si el canal falla
 * varias veces seguidas (Realtime no habilitado para la tabla), se cierra y queda el sondeo.
 */
export function useCotizaciones({ enVivo = false }: { enVivo?: boolean } = {}) {
  const [cotizaciones, setCotizaciones] = useState<CotizacionActual[]>([])
  const [error, setError] = useState('')
  const [conexion, setConexion] = useState<EstadoConexion>('conectando')
  // Si dos lecturas se cruzan, gana la última que se pidió (no la última que llegó)
  const pedido = useRef(0)

  const cargar = useCallback(async () => {
    const n = ++pedido.current
    const { data, error } = await supabase.from('cotizaciones_actuales').select('*').order('moneda')
    if (n !== pedido.current) return
    if (error) setError(error.message)
    else {
      setError('')
      setCotizaciones(data as CotizacionActual[])
    }
  }, [])

  useEffect(() => {
    cargar()
    if (!enVivo) return

    let suscripto = false
    let eventoRecibido = false
    let primeraConexion = true
    let fallos = 0
    let reloj: ReturnType<typeof setInterval> | undefined

    const programarSondeo = () => {
      clearInterval(reloj)
      reloj = setInterval(cargar, suscripto && eventoRecibido ? SEGURIDAD_MS : RESPALDO_MS)
    }

    const canal = supabase
      .channel('cotizaciones-pizarra')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cotizaciones' }, () => {
        eventoRecibido = true
        programarSondeo()
        cargar()
      })
      .subscribe((estado) => {
        suscripto = estado === 'SUBSCRIBED'
        if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') fallos++
        if (suscripto) fallos = 0
        if (fallos >= MAX_FALLOS) {
          suscripto = false
          supabase.removeChannel(canal)
        }
        setConexion(suscripto ? 'en-vivo' : 'respaldo')
        // Al reconectar, recuperar lo que se cargó mientras el canal estuvo caído
        if (suscripto && !primeraConexion) cargar()
        if (suscripto) primeraConexion = false
        programarSondeo()
      })

    programarSondeo()

    const alVolver = () => {
      if (document.visibilityState === 'visible') cargar()
    }
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('online', cargar)

    return () => {
      clearInterval(reloj)
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('online', cargar)
      supabase.removeChannel(canal)
    }
  }, [cargar, enVivo])

  return { cotizaciones, error, conexion, recargar: cargar }
}
