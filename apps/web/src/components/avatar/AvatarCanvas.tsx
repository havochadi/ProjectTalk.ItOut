import type { CSSProperties } from 'react'

interface AvatarCanvasProps {
  className?: string
  isSpeaking?: boolean
  style?: CSSProperties
}

export function AvatarCanvas({
  className = '',
  isSpeaking = false,
  style,
}: AvatarCanvasProps) {
  return (
    <div
      className={`relative flex h-full min-h-[420px] w-full items-center justify-center overflow-hidden rounded-[3rem] bg-[#201b32] ${className}`.trim()}
      style={style}
      aria-label="Talk.IO companion avatar"
    >
      <div className="absolute inset-0 bg-black" />
      <div className={isSpeaking ? 'talkio-avatar talkio-avatar-speaking' : 'talkio-avatar'}>
        <img
          src={`${import.meta.env.BASE_URL}TIO.png`}
          alt="TIO animated avatar"
          className="h-full w-full object-cover"
        />
      </div>
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
          background: rgba(124, 103, 255, 0.28);
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
