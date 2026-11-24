import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type Tono = 'ok' | 'error'
interface Aviso { id: number; texto: string; tono: Tono }

const AvisosContext = createContext<((texto: string, tono?: Tono) => void) | null>(null)

/** Avisos tipo toast: aparecen abajo a la derecha y se van solos a los 4 s. */
export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const siguiente = useRef(1)

  const avisar = useCallback((texto: string, tono: Tono = 'ok') => {
    const id = siguiente.current++
    setAvisos((a) => [...a, { id, texto, tono }])
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 4000)
  }, [])

  return (
    <AvisosContext.Provider value={avisar}>
      {children}
      <div className="avisos" role="status" aria-live="polite">
        {avisos.map((a) => (
          <p key={a.id} className={`aviso aviso--${a.tono}`}>
            <span className="aviso__icono" aria-hidden="true">{a.tono === 'ok' ? '✓' : '!'}</span>
            {a.texto}
          </p>
        ))}
      </div>
    </AvisosContext.Provider>
  )
}

export function useAvisos() {
  const ctx = useContext(AvisosContext)
  if (!ctx) throw new Error('useAvisos debe usarse dentro de AvisosProvider')
  return ctx
}
