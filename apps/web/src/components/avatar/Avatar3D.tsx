import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CharacterDef } from './characters';
import { subscribeToSpeechAmplitude } from '../../lib/voiceClient';

interface Avatar3DProps {
  character: CharacterDef;
  isSpeaking: boolean;
}

/**
 * Tracks the live 0–1 speech amplitude while `isSpeaking` is true. When no real amplitude
 * is flowing (e.g. the browser-TTS playback path, which can't be tapped by Web Audio),
 * callers should blend in a generic idle-talk loop instead — see `talkAmplitude` below.
 */
function useAmplitudeRef(isSpeaking: boolean) {
  const amplitudeRef = useRef(0);
  useEffect(() => {
    if (!isSpeaking) {
      amplitudeRef.current = 0;
      return;
    }
    const unsubscribe = subscribeToSpeechAmplitude((level) => {
      amplitudeRef.current = level;
    });
    return unsubscribe;
  }, [isSpeaking]);
  return amplitudeRef;
}

/** Real amplitude when present, otherwise a gentle synthetic talk pulse as a fallback. */
function talkAmplitude(isSpeaking: boolean, liveLevel: number, elapsed: number): number {
  if (!isSpeaking) return 0;
  if (liveLevel > 0.02) return liveLevel;
  return (Math.sin(elapsed * 9) * 0.5 + 0.5) * 0.5;
}

/** Big kawaii-style eyes: a dark iris plus a small white sparkle highlight, mirrored left/right. */
function ChibiEyes({ blinkRef }: { blinkRef: RefObject<THREE.Group> }) {
  return (
    <group ref={blinkRef}>
      {[-1, 1].map((side) => (
        <group key={side} position={[0.2 * side, 0.12, 0.62]}>
          <mesh>
            <sphereGeometry args={[0.1, 20, 20]} />
            <meshStandardMaterial color="#241c2b" roughness={0.3} />
          </mesh>
          <mesh position={[-0.035 * side, 0.035, 0.07]}>
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Two soft blush marks — the signature "cute" cue on a chibi face. Uses small flattened
 * spheres (not flat discs) so they read correctly from any angle regardless of face normal.
 */
function BlushCheeks({ color = '#ff9ec2' }: { color?: string }) {
  return (
    <>
      <mesh position={[-0.42, -0.1, 0.5]} scale={[1, 1, 0.4]}>
        <sphereGeometry args={[0.11, 20, 20]} />
        <meshStandardMaterial color={color} roughness={0.8} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0.42, -0.1, 0.5]} scale={[1, 1, 0.4]}>
        <sphereGeometry args={[0.11, 20, 20]} />
        <meshStandardMaterial color={color} roughness={0.8} transparent opacity={0.8} />
      </mesh>
    </>
  );
}

function SpeciesEars({ species, color, accentColor }: { species?: string; color: string; accentColor: string }) {
  if (species === 'bunny') {
    return (
      <>
        <mesh position={[-0.36, 0.5, 0.42]} scale={[0.7, 1.3, 0.7]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[-0.36, 0.5, 0.52]} scale={[0.4, 1.1, 0.4]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color={accentColor} roughness={0.7} />
        </mesh>
        <mesh position={[0.36, 0.5, 0.42]} scale={[0.7, 1.3, 0.7]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[0.36, 0.5, 0.52]} scale={[0.4, 1.1, 0.4]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color={accentColor} roughness={0.7} />
        </mesh>
      </>
    );
  }
  if (species === 'panda') {
    return (
      <>
        <mesh position={[-0.36, 0.42, 0.5]}>
          <sphereGeometry args={[0.22, 20, 20]} />
          <meshStandardMaterial color="#2b2b2b" roughness={0.7} />
        </mesh>
        <mesh position={[0.36, 0.42, 0.5]}>
          <sphereGeometry args={[0.22, 20, 20]} />
          <meshStandardMaterial color="#2b2b2b" roughness={0.7} />
        </mesh>
      </>
    );
  }
  if (species === 'cat') {
    return (
      <>
        <mesh position={[-0.34, 0.58, 0.05]} rotation={[0, 0, -0.32]}>
          <coneGeometry args={[0.17, 0.3, 4]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[0.34, 0.58, 0.05]} rotation={[0, 0, 0.32]}>
          <coneGeometry args={[0.17, 0.3, 4]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
      </>
    );
  }
  // fox (default): tall pointed ears with a cream inner tuft
  return (
    <>
      <mesh position={[-0.32, 0.6, 0.04]} rotation={[0, 0, -0.24]}>
        <coneGeometry args={[0.18, 0.36, 4]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[-0.32, 0.54, 0.16]} rotation={[0, 0, -0.24]}>
        <coneGeometry args={[0.1, 0.2, 4]} />
        <meshStandardMaterial color={accentColor} roughness={0.7} />
      </mesh>
      <mesh position={[0.32, 0.6, 0.04]} rotation={[0, 0, 0.24]}>
        <coneGeometry args={[0.18, 0.36, 4]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0.32, 0.54, 0.16]} rotation={[0, 0, 0.24]}>
        <coneGeometry args={[0.1, 0.2, 4]} />
        <meshStandardMaterial color={accentColor} roughness={0.7} />
      </mesh>
    </>
  );
}

/**
 * Chibi-proportioned companion critter: an oversized head (bigger than the body — the
 * opposite of realistic animal proportions) with big sparkly eyes and blush cheeks, built
 * from primitives so it stays bright, friendly, and fully under our control for a kids'
 * audience rather than depending on realistic third-party animal models.
 */
function ProceduralCritter({ character, isSpeaking }: { character: CharacterDef; isSpeaking: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const blinkRef = useRef<THREE.Group>(null);
  const amplitudeRef = useAmplitudeRef(isSpeaking);
  const elapsed = useRef(0);
  const nextBlinkAt = useRef(2 + Math.random() * 2);

  useFrame((_, delta) => {
    elapsed.current += delta;
    const idleBob = Math.sin(elapsed.current * 1.6) * 0.07;
    const breathe = 1 + Math.sin(elapsed.current * 1.8) * 0.02;
    const amp = talkAmplitude(isSpeaking, amplitudeRef.current, elapsed.current);

    if (groupRef.current) {
      groupRef.current.position.y = idleBob;
      groupRef.current.scale.setScalar(breathe * (character.scale || 1));
    }
    if (headRef.current) {
      headRef.current.rotation.x = -amp * 0.16;
      headRef.current.rotation.z = Math.sin(elapsed.current * 0.7) * 0.03;
      headRef.current.position.y = 0.55 + amp * 0.04;
    }
    if (mouthRef.current) {
      mouthRef.current.scale.y = 1 + amp * 2.4;
      mouthRef.current.position.y = -0.26 - amp * 0.03;
    }
    if (blinkRef.current) {
      const sinceBlink = elapsed.current - (nextBlinkAt.current - 0.16);
      if (sinceBlink >= 0 && sinceBlink < 0.16) {
        const t = sinceBlink / 0.16;
        blinkRef.current.scale.y = Math.abs(Math.cos(t * Math.PI));
      } else {
        blinkRef.current.scale.y = 1;
      }
      if (elapsed.current > nextBlinkAt.current) {
        nextBlinkAt.current = elapsed.current + 2.2 + Math.random() * 2.5;
      }
    }
  });

  const color = character.color || '#e8823a';
  const accentColor = character.accentColor || '#fff4e8';

  return (
    <group ref={groupRef}>
      {/* Small pudgy body */}
      <mesh position={[0, -0.32, 0]} castShadow>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.42, 0.3]}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial color={accentColor} roughness={0.7} />
      </mesh>

      {/* Oversized head */}
      <group ref={headRef} position={[0, 0.55, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.62, 32, 32]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <SpeciesEars species={character.species} color={color} accentColor={accentColor} />
        <ChibiEyes blinkRef={blinkRef} />
        <BlushCheeks />
        <mesh position={[0, -0.15, 0.68]}>
          <sphereGeometry args={[0.22, 24, 24]} />
          <meshStandardMaterial color={accentColor} roughness={0.75} />
        </mesh>
        <mesh position={[0, -0.1, 0.9]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color="#3a2430" roughness={0.4} />
        </mesh>
        <mesh ref={mouthRef} position={[0, -0.3, 0.86]}>
          <boxGeometry args={[0.16, 0.05, 0.05]} />
          <meshStandardMaterial color="#3a2430" />
        </mesh>
      </group>
    </group>
  );
}

export function Avatar3D({ character, isSpeaking }: Avatar3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.2, 5.6], fov: 32 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.95} />
      <directionalLight position={[2, 3, 4]} intensity={1.1} />
      <directionalLight position={[-3, 1, 2]} intensity={0.55} />
      <directionalLight position={[0, -2, -3]} intensity={0.3} />
      {/* Different species swap in structurally different geometry (ear counts/types) at
          the same JSX positions; keying on id forces a clean remount instead of an in-place
          reconciliation that left stale geometry behind when switching species. */}
      <ProceduralCritter key={character.id} character={character} isSpeaking={isSpeaking} />
    </Canvas>
  );
}

export default Avatar3D;
