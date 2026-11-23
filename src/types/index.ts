export type Rol = 'admin' | 'cajero'

export interface Perfil {
  id: string
  nombre: string
  rol: Rol
  activo: boolean
}

export interface CotizacionActual {
  moneda: string
  nombre: string
  simbolo: string
  compra: number
  venta: number
  created_at: string
}

export type TipoOperacion = 'compra' | 'venta'

export interface Operacion {
  id: number
  tipo: TipoOperacion
  moneda: string
  monto_divisa: number
  cotizacion: number
  monto_pyg: number
  cliente_id: number | null
  anulada: boolean
  created_at: string
}

export interface CajaSesion {
  id: number
  abierta_en: string
  estado: 'abierta' | 'cerrada'
}

export interface Moneda {
  codigo: string
  nombre: string
  simbolo: string
  decimales: number
}

/** Conteo de efectivo de una moneda en la apertura o el cierre de caja */
export interface Conteo {
  moneda: string
  esperado: number
  contado: number
  diferencia: number
}
