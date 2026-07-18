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
      <div className="absolute inset-0 bg-black" />
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
      `}</style>
    </div>
  )
}

export default AvatarCanvas
