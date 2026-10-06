// La "monedita": geometría del logo (anillo + cara menta). Con brote cuando el
// balance del período es positivo (dato verdadero: tu plata creció). Es la firma
// de la app: solo aparece junto al Disponible. Decorativa (aria-hidden).
export function Coin({ size = 20, sprout = false }: { size?: number; sprout?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: "0 0 auto", display: "block" }}>
      <circle cx="12" cy="14" r="8" fill="var(--coin-face)" stroke="var(--accent-ink)" strokeWidth="2.5" />
      {sprout && (
        <g fill="var(--accent-ink)" stroke="var(--accent-ink)" strokeLinejoin="round" strokeLinecap="round">
          <path d="M12 6V3.6" strokeWidth="1.6" fill="none" />
          <path d="M12 4.6C10.2 4.6 8.9 3.5 8.7 1.8C10.6 1.7 12 2.8 12 4.6Z" strokeWidth="0.6" />
          <path d="M12 4C12 2.3 13.2 1.1 15.2 1.2C15.2 3 14 4.2 12 4Z" strokeWidth="0.6" />
        </g>
      )}
    </svg>
  );
}
