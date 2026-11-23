import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import NuevaOperacion from './pages/NuevaOperacion'
import Cotizaciones from './pages/Cotizaciones'
import Pantalla from './pages/Pantalla'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/pantalla" element={<Pantalla />} />
      <Route element={<Layout />}>
        <Route path="/" element={<NuevaOperacion />} />
        <Route path="/cotizaciones" element={<Cotizaciones />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
