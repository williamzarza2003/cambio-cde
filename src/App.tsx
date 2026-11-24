import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'

// Cada pantalla se descarga recién cuando se visita: la TV y la presentación cargan livianas
const Login = lazy(() => import('./pages/Login'))
const NuevaOperacion = lazy(() => import('./pages/NuevaOperacion'))
const Cotizaciones = lazy(() => import('./pages/Cotizaciones'))
const Pantalla = lazy(() => import('./pages/Pantalla'))
const Acerca = lazy(() => import('./pages/Acerca'))

export default function App() {
  return (
    <Suspense fallback={<div className="centro" role="status"><span className="girando" aria-hidden="true" /> Cargando…</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/pantalla" element={<Pantalla />} />
        <Route path="/acerca" element={<Acerca />} />
        <Route element={<Layout />}>
          <Route path="/" element={<NuevaOperacion />} />
          <Route path="/cotizaciones" element={<Cotizaciones />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
