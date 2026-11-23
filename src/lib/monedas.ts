import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Moneda } from '../types'

/** Monedas activas (incluye PYG), PYG primero. */
export function useMonedas() {
  const [monedas, setMonedas] = useState<Moneda[]>([])

  useEffect(() => {
    supabase
      .from('monedas').select('codigo, nombre, simbolo, decimales').eq('activa', true)
      .then(({ data }) => {
        const lista = (data ?? []) as Moneda[]
        lista.sort((a, b) => (a.codigo === 'PYG' ? -1 : b.codigo === 'PYG' ? 1 : a.codigo.localeCompare(b.codigo)))
        setMonedas(lista)
      })
  }, [])

  return monedas
}
