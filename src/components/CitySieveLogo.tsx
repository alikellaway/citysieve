/**
 * CitySieveLogo
 *
 * The Sieve Grid mark: a 3×3 grid of dots fading top-left → bottom-right,
 * communicating data being filtered down to the best results.
 *
 * Colours are driven by CSS custom properties (--logo-primary, --logo-text)
 * defined in globals.css for both light and dark themes  -  single SVG, no JS,
 * no flicker.
 *
 * Variants:
 *   horizontal   -  icon + wordmark side by side (default; header)
 *   stacked      -  icon above wordmark (hero, auth pages)
 *   icon-only    -  mark alone (footer, loading screen)
 */

type Variant = 'horizontal' | 'stacked' | 'icon-only';

interface CitySieveLogoProps {
  /** Layout of icon and wordmark */
  variant?: Variant;
  /** Rendered size of the SVG icon in px */
  iconSize?: number;
  /** Additional className on the root element */
  className?: string;
  /**
   * When true, all dots animate with a sequential pulse  -  used on the
   * results loading screen to communicate active processing.
   */
  animateDots?: boolean;
}

// 3×3 grid in a 36×36 viewBox.
// Cells are 12px; dot centres at 6, 18, 30; radius 3px.
// Opacity sequence fades from top-left (most opaque) to bottom-right (ghost).
const DOTS = [
  { col: 0, row: 0, opacity: 1.00 },
  { col: 1, row: 0, opacity: 1.00 },
  { col: 2, row: 0, opacity: 0.75 },
  { col: 0, row: 1, opacity: 1.00 },
  { col: 1, row: 1, opacity: 0.60 },
  { col: 2, row: 1, opacity: 0.30 },
  { col: 0, row: 2, opacity: 0.75 },
  { col: 1, row: 2, opacity: 0.30 },
  { col: 2, row: 2, opacity: 0.10 },
] as const;

const CELL = 12; // px per grid cell in the viewBox

function SieveGridIcon({
  size,
  animateDots,
}: {
  size: number;
  animateDots: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {DOTS.map(({ col, row, opacity }, i) => (
        <circle
          key={i}
          cx={6 + col * CELL}
          cy={6 + row * CELL}
          r={3}
          fill="var(--logo-primary)"
          fillOpacity={animateDots ? undefined : opacity}
          style={
            animateDots
              ? {
                  animationName: 'logo-dot-pulse',
                  animationDuration: '1.4s',
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
                  animationDelay: `${i * 80}ms`,
                  animationFillMode: 'both',
                }
              : undefined
          }
        />
      ))}
    </svg>
  );
}

export function CitySieveLogo({
  variant = 'horizontal',
  iconSize = 32,
  className,
  animateDots = false,
}: CitySieveLogoProps) {
  const wordmarkSize = Math.round(iconSize * 0.625); // 20px at 32px, 40px at 64px

  const icon = (
    <SieveGridIcon size={iconSize} animateDots={animateDots} />
  );

  if (variant === 'icon-only') {
    return (
      <span className={className} style={{ display: 'inline-flex' }}>
        {icon}
      </span>
    );
  }

  const wordmark = (
    <span
      style={{
        fontSize: wordmarkSize,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: 'var(--logo-text)',
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      CitySieve
    </span>
  );

  if (variant === 'stacked') {
    return (
      <div
        className={className}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
      >
        {icon}
        {wordmark}
      </div>
    );
  }

  // horizontal (default)
  return (
    <div
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
    >
      {icon}
      {wordmark}
    </div>
  );
}
