// Animated symbiote background + logo, used on every page.
export function SymbioteBg() {
  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="b" />
            <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" />
          </filter>
        </defs>
      </svg>
      <div className="sym-bg" aria-hidden>
        <div className="sym-goo">
          {[0, 1, 2, 3, 4, 5, 6].map(i => <span key={i} className={'blob b' + i} />)}
        </div>
        <div className="sym-vignette" />
      </div>
    </>
  )
}

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span className="sym-logo" style={{ fontSize: size }}>
      <svg width={size * 1.2} height={size * 1.2} viewBox="0 0 32 32" aria-hidden>
        <path className="sym-mark" d="M16 2c5 4 12 6 12 14 0 7-5 14-12 14S4 23 4 16C4 8 11 6 16 2z" />
        <path className="sym-eye" d="M9 14c3-1 5 0 6 2-2 1-5 1-6-2zM23 14c-3-1-5 0-6 2 2 1 5 1 6-2z" />
      </svg>
      <b data-t="SYMBIOTES">SYMBIOTES</b>
    </span>
  )
}
