import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Perfil } from '../types'

const cliente = () => import('../lib/supabase').then((m) => m.supabase)

interface AuthState {
  session: Session | null
  perfil: Perfil | null
  cargando: boolean
  salir: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [cargando, setCargando] = useState(true)

  // El cliente de Supabase se importa en diferido: así no bloquea el primer
  // render de las pantallas públicas (TV, presentación, login).
  useEffect(() => {
    let cancelar = () => {}
    let activo = true
    cliente().then((supabase) => {
      if (!activo) return
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session)
        if (!data.session) setCargando(false)
      })
      const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s))
      cancelar = () => data.subscription.unsubscribe()
    })
    return () => {
      activo = false
      cancelar()
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setPerfil(null)
      return
    }
    setCargando(true)
    cliente().then((supabase) =>
      supabase
        .from('perfiles')
        .select('id, nombre, rol, activo')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          setPerfil(data as Perfil | null)
          setCargando(false)
        }),
    )
  }, [session])

  const salir = async () => {
    const supabase = await cliente()
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, perfil, cargando, salir }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
