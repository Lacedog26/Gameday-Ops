export function Brand({ size = 14 }: { size?: number }) {
  return (
    <div
      className="font-bold leading-tight flex flex-col"
      style={{ lineHeight: 1.15 }}
    >
      <span style={{ fontSize: size, letterSpacing: '0.03em' }}>One</span>
      <span style={{ fontSize: size }}>C🌻mpliment</span>
    </div>
  )
}
