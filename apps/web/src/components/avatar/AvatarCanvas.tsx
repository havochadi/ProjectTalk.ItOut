import type { CSSProperties } from 'react'
import { lazy, Suspense } from 'react'
import { getCharacter, DEFAULT_CHARACTER_ID } from './characters'

interface AvatarCanvasProps {
  className?: string
  isSpeaking?: boolean
  characterId?: string
  style?: CSSProperties
}

const Avatar3DLazy = lazy(() => import('./Avatar3D'))

function detectWebGL(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    )
  } catch {
    return false
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Computed once: neither WebGL support nor a reduced-motion preference change during a session.
const supports3DAvatar = detectWebGL() && !prefersReducedMotion()

// Fixed (not random-per-render) so the firefly field doesn't jump around on every re-render.
const fireflies = [
  { top: '30%', left: '14%', size: '5px', duration: '3.2s', delay: '0s' },
  { top: '46%', left: '82%', size: '4px', duration: '3.8s', delay: '0.5s' },
  { top: '62%', left: '22%', size: '3px', duration: '2.9s', delay: '1.2s' },
  { top: '58%', left: '68%', size: '4px', duration: '3.4s', delay: '0.8s' },
  { top: '40%', left: '48%', size: '3px', duration: '4.1s', delay: '1.6s' },
]

// Back-row (further, smaller, darker) and front-row (closer, bigger, lighter) pine trees —
// pure-CSS triangles so the forest scene needs no image assets.
const backTrees = [
  { left: '4%', scale: 0.62, hue: '#1f5c3c' },
  { left: '20%', scale: 0.5, hue: '#1a4f34' },
  { left: '78%', scale: 0.56, hue: '#1f5c3c' },
  { left: '92%', scale: 0.46, hue: '#1a4f34' },
]
const frontTrees = [
  { left: '-2%', scale: 0.95, hue: '#2d7a48' },
  { left: '10%', scale: 0.78, hue: '#25683d' },
  { left: '86%', scale: 0.9, hue: '#2d7a48' },
  { left: '98%', scale: 0.7, hue: '#25683d' },
]

function PineTree({ left, scale, hue }: { left: string; scale: number; hue: string }) {
  return (
    <div className="absolute bottom-[16%]" style={{ left, transform: `scale(${scale})`, transformOrigin: 'bottom center' }}>
      <div style={{ width: 0, height: 0, borderLeft: '17px solid transparent', borderRight: '17px solid transparent', borderBottom: `30px solid ${hue}` }} />
      <div style={{ width: 0, height: 0, borderLeft: '13px solid transparent', borderRight: '13px solid transparent', borderBottom: `26px solid ${hue}`, marginTop: '-13px' }} />
      <div style={{ width: '6px', height: '12px', background: '#5b3a24', margin: '0 auto' }} />
    </div>
  )
}

function StaticAvatar({ isSpeaking }: { isSpeaking: boolean }) {
  return (
    <div className={isSpeaking ? 'talkio-avatar talkio-avatar-speaking' : 'talkio-avatar'}>
      <img
        src={`${import.meta.env.BASE_URL}TIO.png`}
        alt="TIO animated avatar"
        className="h-full w-full object-cover"
      />
    </div>
  )
}

export function AvatarCanvas({
  className = '',
  isSpeaking = false,
  characterId,
  style,
}: AvatarCanvasProps) {
  const character = getCharacter(characterId || DEFAULT_CHARACTER_ID)

  return (
    <div
      className={`relative flex h-full min-h-[420px] w-full items-center justify-center overflow-hidden rounded-[3rem] bg-panel-surface ${className}`.trim()}
      style={style}
      aria-label="Talk.IO companion avatar"
    >
      {/* Forest sky-to-grass gradient, tinted with the companion's own color for personalization */}
      <div
        className="absolute inset-0 transition-[background] duration-700 ease-pleasant"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${character.color}30, transparent 55%), linear-gradient(180deg, #bfe6cb 0%, #8fd0a3 20%, #5fb87e 42%, #3c8f5c 66%, #245c3c 100%)`,
        }}
      />
      {/* Soft sunlight glow */}
      <div
        className="pointer-events-none absolute rounded-full blur-2xl"
        style={{ top: '7%', right: '14%', width: '4.5rem', height: '4.5rem', background: 'radial-gradient(circle, rgba(255,250,220,0.85), transparent 70%)' }}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {backTrees.map((t, i) => <PineTree key={`back-${i}`} {...t} />)}
        {frontTrees.map((t, i) => <PineTree key={`front-${i}`} {...t} />)}
        <div
          className="absolute inset-x-0 bottom-0 h-[16%]"
          style={{ background: 'linear-gradient(180deg, #2d7a48 0%, #1c4a2f 100%)' }}
        />
        {fireflies.map((s, i) => (
          <span
            key={i}
            className="talkio-sparkle absolute rounded-full bg-amber-200"
            style={{
              top: s.top, left: s.left, width: s.size, height: s.size,
              boxShadow: '0 0 6px 2px rgba(253, 224, 71, 0.8)',
              animationDuration: s.duration, animationDelay: s.delay,
            }}
          />
        ))}
      </div>
      {supports3DAvatar ? (
        <Suspense fallback={<StaticAvatar isSpeaking={isSpeaking} />}>
          <div className="relative z-[1] h-full w-full">
            <Avatar3DLazy character={character} isSpeaking={isSpeaking} />
          </div>
        </Suspense>
      ) : (
        <StaticAvatar isSpeaking={isSpeaking} />
      )}
      <style>{`
        .talkio-avatar {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 28px 48px rgba(0, 0, 0, 0.32));
          animation: talkio-full-pulse 4.8s ease-in-out infinite;
          transform-origin: 50% 70%;
        }

        .talkio-avatar::before {
          content: none;
          position: absolute;
          inset: 12%;
          border-radius: 999px;
          background: rgba(124, 58, 237, 0.28);
          filter: blur(42px);
          animation: talkio-pulse 3.4s ease-in-out infinite;
        }

        .talkio-avatar img {
          position: relative;
          z-index: 1;
          animation: talkio-breathe 3.2s ease-in-out infinite;
        }

        .talkio-avatar-speaking img {
          animation: talkio-breathe 1.3s ease-in-out infinite, talkio-speak 0.42s ease-in-out infinite;
        }

        @keyframes talkio-float {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-18px) rotate(1deg); }
        }

        @keyframes talkio-full-pulse {
          0%, 100% { transform: scale(1.01); }
          50% { transform: scale(1.04); }
        }

        @keyframes talkio-breathe {
          0%, 100% { scale: 1; }
          50% { scale: 1.035; }
        }

        @keyframes talkio-pulse {
          0%, 100% { opacity: 0.58; scale: 0.94; }
          50% { opacity: 0.95; scale: 1.08; }
        }

        @keyframes talkio-speak {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-2px) rotate(-0.8deg); }
          75% { transform: translateX(2px) rotate(0.8deg); }
        }

        .talkio-sparkle {
          animation: talkio-twinkle 3s ease-in-out infinite;
        }

        @keyframes talkio-twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </div>
  )
}

export default AvatarCanvas
