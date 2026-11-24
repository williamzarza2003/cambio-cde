import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCotizaciones } from '../lib/cotizaciones'
import { Fichas, plantillaDe } from '../components/Pizarra'
import Bandera from '../components/Bandera'
import Logo from '../components/Logo'

const miles = (n: number) => Math.round(n).toLocaleString('es-PY')

const SQL = `-- Antes de guardar una operación, la base toma la
-- cotización vigente y calcula los guaraníes.
new.cotizacion := case when new.tipo = 'compra'
                       then v_compra else v_venta end;
new.monto_pyg  := round(new.monto_divisa * new.cotizacion);
new.cajero_id  := auth.uid();`

/** Presentación pública del proyecto, pensada para quien llega desde un portafolio. */
export default function Acerca() {
  const { cotizaciones } = useCotizaciones()
  const filas = cotizaciones.filter((c) => c.moneda !== 'PYG')
  const plantilla = plantillaDe(filas.flatMap((c) => [miles(c.compra), miles(c.venta)]))

  useEffect(() => {
    document.title = 'Cambio CDE · Sistema para casas de cambio'
  }, [])

  return (
    <div className="acerca">
      <header className="acerca__barra">
        <div className="acerca__ancho fila entre">
          <Logo />
          <nav className="fila" aria-label="Accesos">
            <a href="https://github.com/williamzarza2003/cambio-cde" className="enlace">Código en GitHub</a>
            <Link to="/login" className="boton boton--primario">Probar la demo</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="acerca__portada">
          <div className="acerca__ancho acerca__portada-grilla">
            <div>
              <h1>La caja de una casa de cambios, de la vereda al arqueo.</h1>
              <p className="acerca__bajada">
                Cotizaciones, compra y venta de divisas, apertura y cierre de caja con conteo de efectivo,
                y la pizarra para la TV del local. Hecho para el ritmo de las casas de cambio del
                centro de Ciudad del Este.
              </p>
              <div className="fila">
                <Link to="/login" className="boton boton--primario boton--grande">Probar la demo</Link>
                <a href="/pantalla" className="boton boton--secundario boton--grande">Ver la pantalla TV</a>
              </div>
              <p className="suave chico">
                Entrás con un botón, sin registrarte. La cuenta demo tiene rol cajero.
              </p>
            </div>

            <figure className="mini-tablero mini-tablero--grande" aria-label="Cotizaciones en vivo de la demo">
              <p className="mini-tablero__titulo">
                <span className="punto-vivo" aria-hidden="true" /> En vivo desde la base de la demo
              </p>
              <div className="mini-tablero__fila mini-tablero__fila--titulos" aria-hidden="true">
                <span />
                <span>Compra</span>
                <span>Venta</span>
              </div>
              {filas.map((c) => (
                <div key={c.moneda} className="mini-tablero__fila mini-tablero__fila--doble">
                  <span className="fila-moneda"><Bandera moneda={c.moneda} /> <b>{c.moneda}</b></span>
                  <Fichas texto={miles(c.compra)} plantilla={plantilla} etiqueta={`Compra de ${c.nombre}: ${miles(c.compra)} guaraníes`} />
                  <Fichas texto={miles(c.venta)} plantilla={plantilla} etiqueta={`Venta de ${c.nombre}: ${miles(c.venta)} guaraníes`} />
                </div>
              ))}
              {!filas.length && <p className="mini-tablero__vacio">Conectando con la base…</p>}
            </figure>
          </div>
        </section>

        <section className="acerca__seccion">
          <div className="acerca__ancho">
            <h2>Tres pantallas, un mostrador</h2>
            <div className="capturas">
              <figure>
                <img src="/capturas/operacion.webp" alt="Panel del cajero con una venta de dólares cargada y el total en guaraníes destacado" width={1200} height={750} loading="lazy" />
                <figcaption>
                  <strong>Operaciones.</strong> El cajero carga una compra o venta con el teclado y ve el total en
                  guaraníes antes de confirmar.
                </figcaption>
              </figure>
              <figure>
                <img src="/capturas/pantalla.webp" alt="Pizarra de cotizaciones para la TV con fichas tipo split-flap" width={1200} height={675} loading="lazy" />
                <figcaption>
                  <strong>Pizarra para la TV.</strong> Pública, sin login. Las fichas giran solo cuando cambia
                  una cotización.
                </figcaption>
              </figure>
              <figure>
                <img src="/capturas/arqueo.webp" alt="Ticket de arqueo de cierre con esperado, contado y diferencia por moneda" width={1100} height={726} loading="lazy" />
                <figcaption>
                  <strong>Arqueo.</strong> Al cerrar la caja se cuenta el efectivo y sale un ticket de 80 mm con las
                  diferencias.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="acerca__seccion acerca__seccion--oscura">
          <div className="acerca__ancho acerca__decisiones">
            <div>
              <h2>Decisiones técnicas</h2>
              <dl className="decisiones">
                <div>
                  <dt>La plata se calcula en PostgreSQL</dt>
                  <dd>
                    Triggers toman la cotización vigente, calculan el total en guaraníes y registran los
                    movimientos de caja. El navegador solo muestra un estimado: un cliente modificado no puede
                    inventar montos.
                  </dd>
                </div>
                <div>
                  <dt>Row Level Security en todas las tablas</dt>
                  <dd>
                    El cajero opera; solo el administrador carga cotizaciones y anula. La pantalla TV lee
                    cotizaciones sin sesión, y nada más.
                  </dd>
                </div>
                <div>
                  <dt>Nada se borra</dt>
                  <dd>
                    Una anulación genera movimientos inversos. La caja se abre y se cierra solo con funciones
                    que exigen el conteo de efectivo.
                  </dd>
                </div>
              </dl>
            </div>
            <figure className="codigo">
              <figcaption>supabase/schema.sql · preparar_operacion()</figcaption>
              <pre><code>{SQL}</code></pre>
            </figure>
          </div>
        </section>

        <section className="acerca__seccion">
          <div className="acerca__ancho acerca__cierre">
            <div>
              <h2>Stack</h2>
              <p>React 19, TypeScript, Vite, React Router, Supabase (PostgreSQL, Auth, RLS) y Vercel.</p>
            </div>
            <div>
              <h2>Quién lo hizo</h2>
              <p>
                William Zarza, estudiante de Ingeniería en Informática en la Universidad Privada del Este.{' '}
                <a className="enlace" href="https://github.com/williamzarza2003">GitHub</a> ·{' '}
                <a className="enlace" href="https://www.linkedin.com/in/william-zarza-293792451/">LinkedIn</a>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
