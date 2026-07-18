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

// Fixed (not random-per-render) so the twinkle field doesn't jump around on every re-render.
const sparkles = [
  { top: '12%', left: '18%', size: '5px', duration: '2.6s', delay: '0s' },
  { top: '22%', left: '78%', size: '3px', duration: '3.1s', delay: '0.4s' },
  { top: '68%', left: '12%', size: '4px', duration: '2.9s', delay: '1.1s' },
  { top: '80%', left: '70%', size: '3px', duration: '3.4s', delay: '0.7s' },
  { top: '38%', left: '90%', size: '3px', duration: '2.4s', delay: '1.6s' },
  { top: '52%', left: '6%', size: '3px', duration: '3.6s', delay: '0.2s' },
]

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
      <div
        className="absolute inset-0 transition-[background] duration-700 ease-pleasant"
        style={{
          background: `radial-gradient(circle at 28% 18%, ${character.color}45, transparent 55%), radial-gradient(circle at 82% 88%, ${character.accentColor}30, transparent 50%), linear-gradient(160deg, #362a55 0%, #201a35 55%, #14101f 100%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {sparkles.map((s, i) => (
          <span
            key={i}
            className="talkio-sparkle absolute rounded-full bg-white"
            style={{
              top: s.top, left: s.left, width: s.size, height: s.size,
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
