// Marca: una ficha de pizarra split-flap con las dos flechas del cambio.
export function Marca({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="marca">
      <rect width="32" height="32" rx="6" fill="#16181d" />
      <rect x="0" y="15.4" width="32" height="1.2" fill="#000" opacity=".55" />
      <g fill="none" stroke="#ffb020" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 11h15m-4-4 4 4-4 4" />
        <path d="M24 21H9m4-4-4 4 4 4" />
      </g>
    </svg>
  )
}

export default function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <span className={claro ? 'logo logo--claro' : 'logo'}>
      <Marca />
      <span>
        Cambio <b>CDE</b>
      </span>
    </span>
  )
}
