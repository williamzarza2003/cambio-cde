import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useCotizaciones } from '../lib/cotizaciones'
import { useAuth } from '../context/AuthContext'
import { useAvisos } from '../context/AvisosContext'
import { gs, importe, num } from '../lib/formato'
import Arqueo from '../components/Arqueo'
import Bandera from '../components/Bandera'
import Ticket, { Renglon } from '../components/Ticket'
import type { CajaSesion, Conteo, Operacion, TipoOperacion } from '../types'

const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', hour12: false })

function TipoEtiqueta({ tipo }: { tipo: TipoOperacion }) {
  return (
    <span className={`tipo tipo--${tipo}`}>
      <span aria-hidden="true">{tipo === 'venta' ? '↑' : '↓'}</span>
      {tipo === 'venta' ? 'Venta' : 'Compra'}
    </span>
  )
}

export default function NuevaOperacion() {
  const { perfil } = useAuth()
  const avisar = useAvisos()
  const { cotizaciones, error: errorCotizaciones } = useCotizaciones()
  const [caja, setCaja] = useState<CajaSesion | null>(null)
  const [estadoCarga, setEstadoCarga] = useState<'cargando' | 'listo' | 'error'>('cargando')
  const [operaciones, setOperaciones] = useState<Operacion[]>([])
  const [tipo, setTipo] = useState<TipoOperacion>('venta')
  const [moneda, setMoneda] = useState('USD')
  const [monto, setMonto] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteDoc, setClienteDoc] = useState('')
  const [error, setError] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [comprobante, setComprobante] = useState<Operacion | null>(null)
  const [saldos, setSaldos] = useState<Record<string, number>>({})
  const [ultimoCierre, setUltimoCierre] = useState<Record<string, number>>()
  const [cerrando, setCerrando] = useState(false)
  const [resumen, setResumen] = useState<{ fecha: string; conteos: Conteo[] } | null>(null)
  const montoRef = useRef<HTMLInputElement>(null)

  const cargar = useCallback(async () => {
    const { data: c, error: e } = await supabase
      .from('caja_sesiones').select('id, abierta_en, estado').eq('estado', 'abierta').maybeSingle()
    if (e) {
      setEstadoCarga('error')
      return
    }
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
    setEstadoCarga('listo')
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const divisas = cotizaciones.filter((c) => c.moneda !== 'PYG')
  const cot = cotizaciones.find((c) => c.moneda === moneda)
  const tasa = cot ? (tipo === 'compra' ? cot.compra : cot.venta) : 0
  const estimado = Number(monto) * tasa

  // Atajos de teclado: Alt+V venta, Alt+C compra, Alt+1…4 moneda, Alt+M monto
  useEffect(() => {
    const teclas = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return
      const k = e.key.toLowerCase()
      if (k === 'v' || k === 'c') {
        setTipo(k === 'v' ? 'venta' : 'compra')
      } else if (k === 'm') {
        montoRef.current?.focus()
      } else if (/^[1-9]$/.test(k) && divisas[Number(k) - 1]) {
        setMoneda(divisas[Number(k) - 1].moneda)
      } else {
        return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', teclas)
    return () => window.removeEventListener('keydown', teclas)
  }, [divisas])

  const abrirCaja = async (montos: Record<string, number>) => {
    const { error } = await supabase.rpc('abrir_caja', { p_saldos: montos })
    if (error) throw error
    setResumen(null)
    avisar('Caja abierta. Ya podés registrar operaciones.')
    cargar()
  }

  const cerrarCaja = async (contado: Record<string, number>) => {
    if (!caja || !confirmarCierre()) return
    const { data, error } = await supabase.rpc('cerrar_caja', { p_sesion: caja.id, p_contado: contado })
    if (error) throw error
    setResumen({ fecha: new Date().toISOString(), conteos: data as Conteo[] })
    setCerrando(false)
    avisar('Caja cerrada. Revisá el arqueo e imprimilo.')
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
    setRegistrando(true)
    try {
      const cliente_id = await buscarOCrearCliente()
      const { data, error } = await supabase
        .from('operaciones')
        .insert({ tipo, moneda, monto_divisa: Number(monto), cliente_id, sesion_id: caja.id })
        .select('*').single()
      if (error) throw error
      const op = data as Operacion
      setComprobante(op)
      setMonto('')
      setClienteNombre('')
      setClienteDoc('')
      avisar(`Operación N° ${op.id} registrada: ${gs(op.monto_pyg)}`)
      cargar()
      montoRef.current?.focus()
    } catch (err) {
      const msg = (err as { message?: string })?.message
      setError(msg ? `No se pudo registrar: ${msg}` : 'No se pudo registrar la operación. Revisá la conexión y probá de nuevo.')
    } finally {
      setRegistrando(false)
    }
  }

  const anular = async (id: number) => {
    const { error } = await supabase.from('operaciones').update({ anulada: true }).eq('id', id)
    if (error) {
      setError(error.message)
      avisar('No se pudo anular la operación', 'error')
    } else {
      avisar(`Operación N° ${id} anulada`)
    }
    cargar()
  }

  if (estadoCarga === 'cargando') return <EsqueletoOperacion />

  if (estadoCarga === 'error') {
    return (
      <div className="estado estado--error" role="alert">
        <h1>No pudimos leer el estado de la caja</h1>
        <p>Puede ser la conexión a internet. Tus datos están guardados en el servidor.</p>
        <button className="boton boton--primario" onClick={() => { setEstadoCarga('cargando'); cargar() }}>
          Reintentar
        </button>
      </div>
    )
  }

  if (!caja) {
    return (
      <div className="pagina">
        <header className="pagina__cabecera">
          <div>
            <h1>La caja está cerrada</h1>
            <p className="suave">Contá el efectivo de cada moneda para abrir la caja del día.</p>
          </div>
        </header>
        <div className="caja-cerrada">
          <Arqueo
            titulo="Saldo inicial"
            descripcion={ultimoCierre ? 'Precargado con lo contado en el último cierre. Corregí lo que haga falta.' : undefined}
            boton="Abrir caja" iniciales={ultimoCierre} onConfirmar={abrirCaja}
          />
          {resumen && (
            <Ticket titulo="ARQUEO DE CIERRE" fecha={resumen.fecha} onCerrar={() => setResumen(null)}>
              {resumen.conteos.map((r) => (
                <div key={r.moneda} className="ticket__bloque">
                  <p className="ticket__moneda">{r.moneda}</p>
                  <Renglon concepto="Esperado" valor={importe(r.moneda, r.esperado)} />
                  <Renglon concepto="Contado" valor={importe(r.moneda, r.contado)} />
                  <Renglon
                    concepto={Number(r.diferencia) ? 'DIFERENCIA' : 'Diferencia'}
                    valor={importe(r.moneda, r.diferencia)}
                    fuerte={Boolean(Number(r.diferencia))}
                  />
                </div>
              ))}
            </Ticket>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="pagina">
      <header className="pagina__cabecera">
        <div>
          <h1>Operaciones</h1>
          <p className="suave">Caja abierta desde las {hora(caja.abierta_en)} · {operaciones.filter((o) => !o.anulada).length} operaciones</p>
        </div>
        <button className="boton boton--secundario" onClick={() => setCerrando(true)} disabled={cerrando}>
          Cerrar caja
        </button>
      </header>

      <section className="saldos" aria-label="Saldo en caja">
        {Object.entries(saldos).map(([m, s]) => (
          <div key={m} className="saldo">
            <span className="saldo__moneda"><Bandera moneda={m} /> {m}</span>
            <strong className={s < 0 ? 'negativo' : ''}>{importe(m, s)}</strong>
          </div>
        ))}
        {!Object.keys(saldos).length && <p className="suave">Todavía no hay movimientos en esta caja.</p>}
      </section>

      {cerrando && (
        <Arqueo
          titulo="Cierre de caja"
          descripcion="Contá el efectivo de cada moneda. La diferencia se calcula contra lo que debería haber."
          boton="Confirmar cierre" esperados={saldos} requerido
          onConfirmar={cerrarCaja} onCancelar={() => setCerrando(false)}
        />
      )}

      <div className="operar">
        <form className="panel operacion" onSubmit={registrar} aria-labelledby="titulo-operacion">
          <h2 id="titulo-operacion">Nueva operación</h2>

          <fieldset className="segmentado">
            <legend>Tipo de operación</legend>
            <label className={tipo === 'venta' ? 'activo' : ''}>
              <input type="radio" name="tipo" value="venta" checked={tipo === 'venta'} onChange={() => setTipo('venta')} />
              <span className="segmentado__titulo"><span aria-hidden="true">↑</span> Vendemos <kbd>Alt V</kbd></span>
              <span className="segmentado__ayuda">El cliente se lleva divisas</span>
            </label>
            <label className={tipo === 'compra' ? 'activo' : ''}>
              <input type="radio" name="tipo" value="compra" checked={tipo === 'compra'} onChange={() => setTipo('compra')} />
              <span className="segmentado__titulo"><span aria-hidden="true">↓</span> Compramos <kbd>Alt C</kbd></span>
              <span className="segmentado__ayuda">El cliente trae divisas</span>
            </label>
          </fieldset>

          <fieldset className="monedas">
            <legend>Moneda</legend>
            {divisas.map((c, i) => (
              <label key={c.moneda} className={moneda === c.moneda ? 'activo' : ''}>
                <input type="radio" name="moneda" value={c.moneda} checked={moneda === c.moneda} onChange={() => setMoneda(c.moneda)} />
                <Bandera moneda={c.moneda} />
                <b>{c.moneda}</b>
                <kbd aria-label={`Alt ${i + 1}`}>{i + 1}</kbd>
              </label>
            ))}
            {!divisas.length && !errorCotizaciones && <span className="esqueleto esqueleto--linea" />}
            {errorCotizaciones && <p className="error">No se pudieron leer las cotizaciones.</p>}
          </fieldset>

          <label className="campo campo--monto">
            <span>Monto en {cot?.nombre.toLowerCase() ?? 'divisa'} <kbd>Alt M</kbd></span>
            <span className="campo__con-sufijo">
              <input
                ref={montoRef} type="number" inputMode="decimal" min="0.01" step="0.01" value={monto}
                onChange={(e) => setMonto(e.target.value)} required autoFocus placeholder="0,00"
              />
              <span aria-hidden="true">{moneda}</span>
            </span>
          </label>

          <details className="cliente">
            <summary>Agregar cliente (opcional)</summary>
            <div className="dos-columnas">
              <label className="campo">
                <span>Nombre y apellido</span>
                <input value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} autoComplete="off" />
              </label>
              <label className="campo">
                <span>Documento</span>
                <input value={clienteDoc} onChange={(e) => setClienteDoc(e.target.value)} autoComplete="off" />
              </label>
            </div>
          </details>

          <div className="total-operacion" aria-live="polite">
            <span className="total-operacion__etiqueta">
              {tipo === 'venta' ? 'El cliente paga' : 'Le pagamos al cliente'}
            </span>
            <strong className="total-operacion__monto">{gs(estimado || 0)}</strong>
            <span className="total-operacion__detalle">
              {tasa ? `${num(Number(monto) || 0)} ${moneda} × ${gs(tasa)}` : 'Sin cotización para esta moneda'}
              {' · '}estimado; el total final lo calcula el sistema
            </span>
          </div>

          {error && <p className="error" role="alert">{error}</p>}
          <button className="boton boton--primario boton--grande boton--ancho" disabled={!tasa || registrando}>
            {registrando ? 'Registrando…' : `Registrar ${tipo}`} <kbd className="kbd--claro">Enter</kbd>
          </button>
        </form>

        {comprobante && (
          <Ticket
            titulo={comprobante.tipo === 'venta' ? 'VENTA DE DIVISAS' : 'COMPRA DE DIVISAS'}
            numero={comprobante.id} fecha={comprobante.created_at} onCerrar={() => setComprobante(null)}
          >
            <Renglon concepto={`${num(comprobante.monto_divisa)} ${comprobante.moneda}`} valor={`× ${gs(comprobante.cotizacion)}`} />
            <Renglon concepto="TOTAL" valor={gs(comprobante.monto_pyg)} fuerte />
          </Ticket>
        )}
      </div>

      <section className="panel" aria-labelledby="titulo-movimientos">
        <h2 id="titulo-movimientos">Operaciones de esta caja</h2>
        {operaciones.length === 0 ? (
          <p className="vacio">Todavía no registraste operaciones en esta caja. La primera aparece acá.</p>
        ) : (
          <table className="tabla tabla--apilable">
            <thead>
              <tr>
                <th scope="col">N°</th><th scope="col">Hora</th><th scope="col">Tipo</th>
                <th scope="col" className="num">Divisa</th><th scope="col" className="num">Cotización</th>
                <th scope="col" className="num">Total</th><th scope="col"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {operaciones.map((o) => (
                <tr key={o.id} className={o.anulada ? 'anulada' : ''}>
                  <td data-etiqueta="N°">{o.id}</td>
                  <td data-etiqueta="Hora">{hora(o.created_at)}</td>
                  <td data-etiqueta="Tipo"><TipoEtiqueta tipo={o.tipo} /></td>
                  <td data-etiqueta="Divisa" className="num">{num(o.monto_divisa)} {o.moneda}</td>
                  <td data-etiqueta="Cotización" className="num">{gs(o.cotizacion)}</td>
                  <td data-etiqueta="Total" className="num"><strong>{gs(o.monto_pyg)}</strong></td>
                  <td className="acciones">
                    {o.anulada ? <span className="insignia">Anulada</span> : perfil?.rol === 'admin' && (
                      <button className="boton boton--chico boton--peligro" onClick={() => anular(o.id)}>Anular</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

function EsqueletoOperacion() {
  return (
    <div className="pagina" aria-busy="true" aria-label="Cargando la caja">
      <span className="esqueleto esqueleto--titulo" />
      <div className="saldos">
        {[0, 1, 2].map((i) => <span key={i} className="esqueleto esqueleto--saldo" />)}
      </div>
      <div className="panel">
        <span className="esqueleto esqueleto--bloque" />
        <span className="esqueleto esqueleto--linea" />
        <span className="esqueleto esqueleto--bloque" />
      </div>
    </div>
  )
}

// Confirmación nativa del navegador antes de cerrar la caja
function confirmarCierre() {
  return window.confirm('¿Cerrar la caja? No se podrán registrar más operaciones en esta sesión.')
}
