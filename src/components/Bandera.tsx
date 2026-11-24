// Banderas simplificadas en SVG (legibles en chico y a distancia, sin emojis).
// Proporción 3:2 para todas, así alinean en tablas y en la pantalla TV.

interface Props {
  moneda: string
  className?: string
}

const W = 30
const H = 20

function Paraguay() {
  return (
    <>
      <rect width={W} height={H / 3} fill="#d52b1e" />
      <rect y={H / 3} width={W} height={H / 3} fill="#fff" />
      <rect y={(H / 3) * 2} width={W} height={H / 3} fill="#0038a8" />
      <circle cx={W / 2} cy={H / 2} r={2.4} fill="none" stroke="#0a7d3b" strokeWidth={0.9} />
    </>
  )
}

function EstadosUnidos() {
  const franja = H / 13
  return (
    <>
      <rect width={W} height={H} fill="#fff" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} y={i * 2 * franja} width={W} height={franja} fill="#b22234" />
      ))}
      <rect width={W * 0.42} height={franja * 7} fill="#3c3b6e" />
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={i} cx={1.6 + (i % 4) * 2.9} cy={1.6 + Math.floor(i / 4) * 2.9} r={0.55} fill="#fff" />
      ))}
    </>
  )
}

function Brasil() {
  return (
    <>
      <rect width={W} height={H} fill="#009c3b" />
      <path d={`M${W / 2} 2.2 L${W - 2.6} ${H / 2} L${W / 2} ${H - 2.2} L2.6 ${H / 2}Z`} fill="#ffdf00" />
      <circle cx={W / 2} cy={H / 2} r={4.4} fill="#002776" />
      <path d="M10.9 9.4 Q15 8 19.1 10.6" stroke="#fff" strokeWidth={0.8} fill="none" />
    </>
  )
}

function Argentina() {
  return (
    <>
      <rect width={W} height={H} fill="#fff" />
      <rect width={W} height={H / 3} fill="#74acdf" />
      <rect y={(H / 3) * 2} width={W} height={H / 3} fill="#74acdf" />
      <circle cx={W / 2} cy={H / 2} r={1.9} fill="#f6b40e" />
    </>
  )
}

function UnionEuropea() {
  return (
    <>
      <rect width={W} height={H} fill="#003399" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        return <circle key={i} cx={W / 2 + Math.cos(a) * 6} cy={H / 2 + Math.sin(a) * 6} r={0.85} fill="#ffcc00" />
      })}
    </>
  )
}

const banderas: Record<string, () => React.JSX.Element> = {
  PYG: Paraguay,
  USD: EstadosUnidos,
  BRL: Brasil,
  ARS: Argentina,
  EUR: UnionEuropea,
}

export default function Bandera({ moneda, className = '' }: Props) {
  const Dibujo = banderas[moneda]
  return (
    <svg className={`bandera ${className}`} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
      {Dibujo ? <Dibujo /> : <rect width={W} height={H} fill="#8a8f98" />}
      <rect width={W} height={H} fill="none" stroke="rgba(0,0,0,.18)" strokeWidth={0.6} />
    </svg>
  )
}
