/**
 * Confete de vitória.
 *
 * CSS puro, com partículas geradas uma vez no módulo (determinístico — evita
 * re-render aleatório a cada StrictMode). É puramente decorativo, então some
 * completamente sob `prefers-reduced-motion`.
 */
const PARTICLES = Array.from({ length: 28 }, (_, index) => {
  // Sequência pseudoaleatória estável: mesma composição em toda renderização.
  const seed = (index * 9301 + 49297) % 233280;
  const ratio = seed / 233280;
  return {
    left: Math.round(ratio * 100),
    delay: Math.round(ratio * 900),
    duration: 1600 + Math.round(ratio * 1400),
    rotate: Math.round(ratio * 720),
    color: ['var(--theme-primary)', 'var(--theme-accent)', '#ffd166', '#2f8f5b'][index % 4],
  };
});

export function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {PARTICLES.map((particle, index) => (
        <span
          key={index}
          className="confetti__bit"
          style={
            {
              left: `${particle.left}%`,
              background: particle.color,
              animationDelay: `${particle.delay}ms`,
              animationDuration: `${particle.duration}ms`,
              '--spin': `${particle.rotate}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
