import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
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

function SpeciesEars({ species, color, accentColor }: { species?: string; color: string; accentColor: string }) {
  if (species === 'cat') {
    return (
      <>
        <mesh position={[-0.28, 0.42, 0]} rotation={[0, 0, -0.3]}>
          <coneGeometry args={[0.14, 0.26, 4]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0.28, 0.42, 0]} rotation={[0, 0, 0.3]}>
          <coneGeometry args={[0.14, 0.26, 4]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </>
    );
  }
  if (species === 'owl') {
    return (
      <>
        <mesh position={[-0.2, 0.46, 0.05]} rotation={[0.2, 0, -0.15]}>
          <coneGeometry args={[0.08, 0.18, 4]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0.2, 0.46, 0.05]} rotation={[0.2, 0, 0.15]}>
          <coneGeometry args={[0.08, 0.18, 4]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </>
    );
  }
  // fox (default): tall pointed ears
  return (
    <>
      <mesh position={[-0.26, 0.44, -0.02]} rotation={[0, 0, -0.2]}>
        <coneGeometry args={[0.16, 0.32, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.26, 0.4, 0.1]} rotation={[0, 0, -0.2]}>
        <coneGeometry args={[0.09, 0.18, 4]} />
        <meshStandardMaterial color={accentColor} />
      </mesh>
      <mesh position={[0.26, 0.44, -0.02]} rotation={[0, 0, 0.2]}>
        <coneGeometry args={[0.16, 0.32, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.26, 0.4, 0.1]} rotation={[0, 0, 0.2]}>
        <coneGeometry args={[0.09, 0.18, 4]} />
        <meshStandardMaterial color={accentColor} />
      </mesh>
    </>
  );
}

function ProceduralCritter({ character, isSpeaking }: { character: CharacterDef; isSpeaking: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const amplitudeRef = useAmplitudeRef(isSpeaking);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    elapsed.current += delta;
    const idleBob = Math.sin(elapsed.current * 1.6) * 0.06;
    const breathe = 1 + Math.sin(elapsed.current * 1.8) * 0.018;
    const amp = talkAmplitude(isSpeaking, amplitudeRef.current, elapsed.current);

    if (groupRef.current) {
      groupRef.current.position.y = idleBob;
      groupRef.current.scale.setScalar(breathe * (character.scale || 1));
    }
    if (headRef.current) {
      headRef.current.rotation.x = -amp * 0.14;
      headRef.current.position.y = 0.35 + amp * 0.03;
    }
    if (mouthRef.current) {
      mouthRef.current.scale.y = 1 + amp * 2.2;
      mouthRef.current.position.y = -0.2 - amp * 0.03;
    }
  });

  const color = character.color || '#e8823a';
  const accentColor = character.accentColor || '#fff4e8';

  return (
    <group ref={groupRef}>
      <mesh position={[0, -0.55, 0]} castShadow>
        <sphereGeometry args={[0.62, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      <group ref={headRef} position={[0, 0.35, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color={color} roughness={0.65} />
        </mesh>
        <SpeciesEars species={character.species} color={color} accentColor={accentColor} />
        <mesh position={[-0.18, 0.06, 0.42]}>
          <sphereGeometry args={[0.055, 16, 16]} />
          <meshStandardMaterial color="#1c1c22" />
        </mesh>
        <mesh position={[0.18, 0.06, 0.42]}>
          <sphereGeometry args={[0.055, 16, 16]} />
          <meshStandardMaterial color="#1c1c22" />
        </mesh>
        <mesh position={[0, -0.08, 0.46]}>
          <sphereGeometry args={[0.22, 24, 24]} />
          <meshStandardMaterial color={accentColor} roughness={0.75} />
        </mesh>
        <mesh ref={mouthRef} position={[0, -0.2, 0.58]}>
          <boxGeometry args={[0.18, 0.055, 0.05]} />
          <meshStandardMaterial color="#3a2430" />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Loads a real rigged glTF/GLB character (see `characters.ts`). Plays its first animation
 * clip as an idle loop and layers the same talk-amplitude motion used by procedural
 * characters on top — full viseme lip-sync would additionally need the model to expose
 * mouth blendshapes, which isn't assumed here.
 */
function ModelCritter({ character, isSpeaking }: { character: CharacterDef; isSpeaking: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(character.modelPath as string);
  const { actions } = useAnimations(animations, groupRef);
  const amplitudeRef = useAmplitudeRef(isSpeaking);
  const elapsed = useRef(0);

  useEffect(() => {
    const firstAction = Object.values(actions)[0];
    firstAction?.reset().fadeIn(0.3).play();
    return () => { firstAction?.fadeOut(0.2); };
  }, [actions]);

  useFrame((_, delta) => {
    elapsed.current += delta;
    const idleBob = Math.sin(elapsed.current * 1.6) * 0.04;
    const amp = talkAmplitude(isSpeaking, amplitudeRef.current, elapsed.current);
    if (groupRef.current) {
      groupRef.current.position.y = idleBob + amp * 0.04;
      groupRef.current.scale.setScalar((character.scale || 1) * (1 + amp * 0.04));
    }
  });

  return <primitive ref={groupRef} object={scene} />;
}

export function Avatar3D({ character, isSpeaking }: Avatar3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.1, 5.4], fov: 32 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.95} />
      <directionalLight position={[2, 3, 4]} intensity={1.1} />
      <directionalLight position={[-3, 1, 2]} intensity={0.55} />
      <directionalLight position={[0, -2, -3]} intensity={0.3} />
      <Suspense fallback={null}>
        {character.kind === 'model' && character.modelPath
          ? <ModelCritter character={character} isSpeaking={isSpeaking} />
          : <ProceduralCritter character={character} isSpeaking={isSpeaking} />}
      </Suspense>
    </Canvas>
  );
}

export default Avatar3D;
