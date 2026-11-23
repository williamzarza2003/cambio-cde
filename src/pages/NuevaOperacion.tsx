import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useCotizaciones } from '../lib/cotizaciones'
import { useAuth } from '../context/AuthContext'
import { fechaHora, gs, importe, num } from '../lib/formato'
import Arqueo from '../components/Arqueo'
import type { CajaSesion, Conteo, Operacion, TipoOperacion } from '../types'

export default function NuevaOperacion() {
  const { perfil } = useAuth()
  const { cotizaciones } = useCotizaciones()
  const [caja, setCaja] = useState<CajaSesion | null>(null)
  const [operaciones, setOperaciones] = useState<Operacion[]>([])
  const [tipo, setTipo] = useState<TipoOperacion>('venta')
  const [moneda, setMoneda] = useState('USD')
  const [monto, setMonto] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteDoc, setClienteDoc] = useState('')
  const [error, setError] = useState('')
  const [comprobante, setComprobante] = useState<Operacion | null>(null)
  const [saldos, setSaldos] = useState<Record<string, number>>({})
  const [ultimoCierre, setUltimoCierre] = useState<Record<string, number>>()
  const [cerrando, setCerrando] = useState(false)
  const [resumen, setResumen] = useState<Conteo[] | null>(null)

  const cargar = useCallback(async () => {
    const { data: c } = await supabase
      .from('caja_sesiones').select('id, abierta_en, estado').eq('estado', 'abierta').maybeSingle()
    setCaja(c as CajaSesion | null)
    if (c) {
      const { data: ops } = await supabase
        .from('operaciones').select('*').eq('sesion_id', c.id).order('created_at', { ascending: false })
      setOperaciones((ops ?? []) as Operacion[])
      const { data: s } = await supabase.from('saldos_caja').select('moneda, saldo').eq('sesion_id', c.id)
      setSaldos(Object.fromEntries((s ?? []).map((x) => [x.moneda, Number(x.saldo)])))
    } else {
      setOperaciones([])
      const { data: ult } = await supabase
        .from('caja_sesiones').select('id').eq('estado', 'cerrada')
        .order('cerrada_en', { ascending: false }).limit(1).maybeSingle()
      if (ult) {
        const { data: cs } = await supabase
          .from('caja_conteos').select('moneda, contado').eq('sesion_id', ult.id).eq('momento', 'cierre')
        setUltimoCierre(Object.fromEntries((cs ?? []).map((x) => [x.moneda, Number(x.contado)])))
      }
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const cot = cotizaciones.find((c) => c.moneda === moneda)
  const tasa = cot ? (tipo === 'compra' ? cot.compra : cot.venta) : 0
  const estimado = Number(monto) * tasa

  const abrirCaja = async (montos: Record<string, number>) => {
    const { error } = await supabase.rpc('abrir_caja', { p_saldos: montos })
    if (error) throw error
    setResumen(null)
    cargar()
  }

  const cerrarCaja = async (contado: Record<string, number>) => {
    if (!caja || !confirmarCierre()) return
    const { data, error } = await supabase.rpc('cerrar_caja', { p_sesion: caja.id, p_contado: contado })
    if (error) throw error
    setResumen(data as Conteo[])
    setCerrando(false)
    cargar()
  }

  const buscarOCrearCliente = async (): Promise<number | null> => {
    if (!clienteNombre.trim()) return null
    if (clienteDoc.trim()) {
      const { data } = await supabase.from('clientes').select('id').eq('documento', clienteDoc.trim()).maybeSingle()
      if (data) return data.id
    }
    const { data, error } = await supabase
      .from('clientes')
      .insert({ nombre: clienteNombre.trim(), documento: clienteDoc.trim() || null })
      .select('id').single()
    if (error) throw error
    return data.id
  }

  const registrar = async (e: FormEvent) => {
    e.preventDefault()
    if (!caja) return
    setError('')
    try {
      const cliente_id = await buscarOCrearCliente()
      const { data, error } = await supabase
        .from('operaciones')
        .insert({ tipo, moneda, monto_divisa: Number(monto), cliente_id, sesion_id: caja.id })
        .select('*').single()
      if (error) throw error
      setComprobante(data as Operacion)
      setMonto('')
      setClienteNombre('')
      setClienteDoc('')
      cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la operación')
    }
  }

  const anular = async (id: number) => {
    const { error } = await supabase.from('operaciones').update({ anulada: true }).eq('id', id)
    if (error) setError(error.message)
    cargar()
  }

  if (!caja) {
    return (
      <section>
        <h2>La caja está cerrada</h2>
        {resumen && (
          <div className="tarjeta comprobante">
            <h3>Arqueo de cierre</h3>
            <table>
              <thead><tr><th>Moneda</th><th>Esperado</th><th>Contado</th><th>Diferencia</th></tr></thead>
              <tbody>
                {resumen.map((r) => (
                  <tr key={r.moneda}>
                    <td>{r.moneda}</td>
                    <td>{importe(r.moneda, r.esperado)}</td>
                    <td>{importe(r.moneda, r.contado)}</td>
                    <td className={Number(r.diferencia) ? 'error' : ''}>{importe(r.moneda, r.diferencia)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="no-imprimir">
              <button onClick={() => window.print()}>Imprimir</button>
              <button className="secundario" onClick={() => setResumen(null)}>Cerrar</button>
            </div>
          </div>
        )}
        <Arqueo titulo="Saldo inicial (efectivo contado)" boton="Abrir caja" iniciales={ultimoCierre} onConfirmar={abrirCaja} />
      </section>
    )
  }

  return (
    <section>
      <div className="fila entre">
        <h2>Nueva operación</h2>
        <span>Caja abierta desde {fechaHora(caja.abierta_en)} <button className="secundario" onClick={() => setCerrando(true)}>Cerrar caja</button></span>
      </div>

      <div className="tarjeta">
        <h3>Saldo en caja</h3>
        <div className="fila">
          {Object.entries(saldos).map(([m, s]) => <strong key={m}>{importe(m, s)}</strong>)}
          {!Object.keys(saldos).length && <span>Sin movimientos</span>}
        </div>
      </div>

      {cerrando && (
        <Arqueo
          titulo="Cierre de caja · contá el efectivo" boton="Confirmar cierre" esperados={saldos} requerido
          onConfirmar={cerrarCaja} onCancelar={() => setCerrando(false)}
        />
      )}

      <form className="tarjeta" onSubmit={registrar}>
        <div className="fila">
          <label>
            Tipo
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoOperacion)}>
              <option value="venta">Venta (el cliente compra divisa)</option>
              <option value="compra">Compra (el cliente vende divisa)</option>
            </select>
          </label>
          <label>
            Moneda
            <select value={moneda} onChange={(e) => setMoneda(e.target.value)}>
              {cotizaciones.map((c) => <option key={c.moneda} value={c.moneda}>{c.moneda} – {c.nombre}</option>)}
            </select>
          </label>
          <label>
            Monto en divisa
            <input type="number" min="0.01" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} required />
          </label>
        </div>
        <div className="fila">
          <label>
            Cliente (opcional)
            <input value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} />
          </label>
          <label>
            Documento
            <input value={clienteDoc} onChange={(e) => setClienteDoc(e.target.value)} />
          </label>
        </div>
        <p className="total">
          Cotización: {tasa ? gs(tasa) : 'sin cotización'} · Total estimado: <strong>{gs(estimado || 0)}</strong>
        </p>
        {error && <p className="error">{error}</p>}
        <button disabled={!tasa}>Registrar</button>
      </form>

      {comprobante && (
        <div className="tarjeta comprobante">
          <h3>Comprobante N° {comprobante.id}</h3>
          <p>{fechaHora(comprobante.created_at)} · {comprobante.tipo === 'venta' ? 'Venta' : 'Compra'} de {comprobante.moneda}</p>
          <p>{num(comprobante.monto_divisa)} {comprobante.moneda} × {gs(comprobante.cotizacion)}</p>
          <p className="total">Total: {gs(comprobante.monto_pyg)}</p>
          <div className="no-imprimir">
            <button onClick={() => window.print()}>Imprimir</button>
            <button className="secundario" onClick={() => setComprobante(null)}>Cerrar</button>
          </div>
        </div>
      )}

      <h3>Operaciones de esta caja</h3>
      <table>
        <thead>
          <tr><th>N°</th><th>Hora</th><th>Tipo</th><th>Divisa</th><th>Cotización</th><th>Total ₲</th><th></th></tr>
        </thead>
        <tbody>
          {operaciones.map((o) => (
            <tr key={o.id} className={o.anulada ? 'anulada' : ''}>
              <td>{o.id}</td>
              <td>{fechaHora(o.created_at)}</td>
              <td>{o.tipo}</td>
              <td>{num(o.monto_divisa)} {o.moneda}</td>
              <td>{gs(o.cotizacion)}</td>
              <td>{gs(o.monto_pyg)}</td>
              <td>
                {o.anulada ? 'Anulada' : perfil?.rol === 'admin' && (
                  <button className="secundario" onClick={() => anular(o.id)}>Anular</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

// Confirmación nativa del navegador antes de cerrar la caja
function confirmarCierre() {
  return window.confirm('¿Cerrar la caja? No se podrán registrar más operaciones en esta sesión.')
}
