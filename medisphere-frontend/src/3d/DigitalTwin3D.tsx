import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Shield, Activity, Heart, Wind, Cpu } from 'lucide-react';

// ==========================================
// TYPES & INTERFACES
// ==========================================
export interface VitalsData {
  heartRate?: number;
  oxygenLevel?: number;
  bloodPressure?: string;
  temperature?: number;
}

export interface DigitalTwin3DProps {
  vitals?: VitalsData | null;
  completeness?: number;
}

interface CameraControllerProps {
  targetPosition: [number, number, number];
}

// Camera controller helper to smoothly animate camera to view presets
function CameraController({ targetPosition }: CameraControllerProps) {
  const { camera } = useThree();

  useFrame(() => {
    camera.position.lerp(new THREE.Vector3(...targetPosition), 0.08);
  });

  return null;
}

// ==========================================
// 3D HUMAN ANATOMICAL SUB-COMPONENTS
// ==========================================

// 1. Holographic Wireframe Human Body Shell
function HumanBodySilhouette({ visible = true }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <group position={[0, -0.2, 0]}>
      {/* Head & Cranium */}
      <mesh position={[0, 1.65, 0]}>
        <sphereGeometry args={[0.26, 24, 24]} />
        <meshStandardMaterial color="#00f2fe" wireframe transparent opacity={0.35} emissive="#00f2fe" emissiveIntensity={0.25} />
      </mesh>

      {/* Eyes indication */}
      <mesh position={[-0.09, 1.68, 0.2]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
      <mesh position={[0.09, 1.68, 0.2]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.11, 0.13, 0.25, 16]} />
        <meshStandardMaterial color="#00f2fe" wireframe transparent opacity={0.25} />
      </mesh>

      {/* Shoulders & Chest Torso */}
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.42, 0.32, 0.9, 16]} />
        <meshStandardMaterial color="#00f2fe" wireframe transparent opacity={0.3} emissive="#00f2fe" emissiveIntensity={0.2} />
      </mesh>

      {/* Pelvis & Lower Body */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.31, 0.28, 0.45, 16]} />
        <meshStandardMaterial color="#00f2fe" wireframe transparent opacity={0.25} />
      </mesh>

      {/* Upper Arms */}
      <mesh position={[-0.48, 0.75, 0]} rotation={[0, 0, 0.15]}>
        <cylinderGeometry args={[0.09, 0.08, 0.7, 12]} />
        <meshStandardMaterial color="#00f2fe" wireframe transparent opacity={0.25} />
      </mesh>
      <mesh position={[0.48, 0.75, 0]} rotation={[0, 0, -0.15]}>
        <cylinderGeometry args={[0.09, 0.08, 0.7, 12]} />
        <meshStandardMaterial color="#00f2fe" wireframe transparent opacity={0.25} />
      </mesh>

      {/* Forearms */}
      <mesh position={[-0.58, 0.15, 0]} rotation={[0, 0, 0.08]}>
        <cylinderGeometry args={[0.07, 0.06, 0.65, 12]} />
        <meshStandardMaterial color="#00f2fe" wireframe transparent opacity={0.2} />
      </mesh>
      <mesh position={[0.58, 0.15, 0]} rotation={[0, 0, -0.08]}>
        <cylinderGeometry args={[0.07, 0.06, 0.65, 12]} />
        <meshStandardMaterial color="#00f2fe" wireframe transparent opacity={0.2} />
      </mesh>

      {/* Thighs */}
      <mesh position={[-0.2, -0.45, 0]}>
        <cylinderGeometry args={[0.13, 0.1, 0.75, 16]} />
        <meshStandardMaterial color="#00f2fe" wireframe transparent opacity={0.25} />
      </mesh>
      <mesh position={[0.2, -0.45, 0]}>
        <cylinderGeometry args={[0.13, 0.1, 0.75, 16]} />
        <meshStandardMaterial color="#00f2fe" wireframe transparent opacity={0.25} />
      </mesh>

      {/* Calves & Legs */}
      <mesh position={[-0.2, -1.2, 0]}>
        <cylinderGeometry args={[0.09, 0.07, 0.8, 16]} />
        <meshStandardMaterial color="#00f2fe" wireframe transparent opacity={0.2} />
      </mesh>
      <mesh position={[0.2, -1.2, 0]}>
        <cylinderGeometry args={[0.09, 0.07, 0.8, 16]} />
        <meshStandardMaterial color="#00f2fe" wireframe transparent opacity={0.2} />
      </mesh>

      {/* Feet */}
      <mesh position={[-0.2, -1.65, 0.08]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.12, 0.1, 0.3]} />
        <meshStandardMaterial color="#00f2fe" wireframe transparent opacity={0.25} />
      </mesh>
      <mesh position={[0.2, -1.65, 0.08]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.12, 0.1, 0.3]} />
        <meshStandardMaterial color="#00f2fe" wireframe transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

// 2. Skeletal & Spine Grid Structure
function SkeletalSpine({ visible = true }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <group position={[0, -0.2, 0]}>
      {/* Spinal Vertebrae Column */}
      <mesh position={[0, 0.55, -0.08]}>
        <cylinderGeometry args={[0.035, 0.045, 1.9, 12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} emissive="#475569" emissiveIntensity={0.2} />
      </mesh>

      {/* Ribcage Segment Rings */}
      {[0.95, 0.82, 0.7, 0.58, 0.46].map((y, idx) => (
        <mesh key={idx} position={[0, y, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.26 - idx * 0.015, 0.018, 8, 24, Math.PI * 1.6]} />
          <meshStandardMaterial color="#64748b" emissive="#3b82f6" emissiveIntensity={0.3} />
        </mesh>
      ))}

      {/* Collarbones */}
      <mesh position={[0, 1.15, 0.06]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.65, 8]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>

      {/* Pelvis Bone Ring */}
      <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.24, 0.03, 12, 24]} />
        <meshStandardMaterial color="#64748b" emissive="#0284c7" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

// 3. Vascular & Circulatory System
function VascularCirculation({ visible = true }: { visible: boolean }) {
  const tubeRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (tubeRef.current) {
      const time = state.clock.getElapsedTime();
      tubeRef.current.children.forEach((child: any) => {
        if (child.material && child.material.emissiveIntensity !== undefined) {
          child.material.emissiveIntensity = 0.4 + Math.sin(time * 3 + child.position.y * 2) * 0.3;
        }
      });
    }
  });

  if (!visible) return null;

  return (
    <group ref={tubeRef} position={[0, -0.2, 0]}>
      {/* Carotid Artery to Brain */}
      <mesh position={[-0.06, 1.15, 0.05]}>
        <cylinderGeometry args={[0.012, 0.012, 0.7, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#f87171" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.06, 1.15, 0.05]}>
        <cylinderGeometry args={[0.012, 0.012, 0.7, 8]} />
        <meshStandardMaterial color="#3b82f6" emissive="#60a5fa" emissiveIntensity={0.5} />
      </mesh>

      {/* Femoral Arteries to Legs */}
      <mesh position={[-0.14, -0.55, 0]} rotation={[0, 0, -0.05]}>
        <cylinderGeometry args={[0.012, 0.01, 1.1, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0.14, -0.55, 0]} rotation={[0, 0, 0.05]}>
        <cylinderGeometry args={[0.012, 0.01, 1.1, 8]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.4} />
      </mesh>

      {/* Brachial Arteries to Arms */}
      <mesh position={[-0.38, 0.55, 0]} rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.01, 0.008, 0.8, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0.38, 0.55, 0]} rotation={[0, 0, -0.2]}>
        <cylinderGeometry args={[0.01, 0.008, 0.8, 8]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

// 4. Interactive Organ Node Component
interface OrganNodeProps {
  id: string;
  name: string;
  position: [number, number, number];
  color: string;
  selected: boolean;
  onSelect: (name: string) => void;
  pulseSpeed?: number;
  scaleFactor?: number;
  geometryType: 'brain' | 'heart' | 'lung' | 'liver' | 'kidney' | 'stomach';
}

function OrganNode({
  id,
  name,
  position,
  color,
  selected,
  onSelect,
  pulseSpeed = 0,
  scaleFactor = 1,
  geometryType
}: OrganNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      
      let pulse = 1;
      if (pulseSpeed > 0) {
        pulse = 1 + Math.sin(time * pulseSpeed) * 0.12;
      }
      
      const currentScale = scaleFactor * pulse * (selected ? 1.35 : hovered ? 1.2 : 1.0);
      groupRef.current.scale.set(currentScale, currentScale, currentScale);

      groupRef.current.rotation.y = Math.sin(time * 0.5 + position[1]) * 0.15;
    }
  });

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered(true);
  };

  const handlePointerOut = () => {
    setHovered(false);
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    onSelect(id);
  };

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {/* Organ Specific Geometry */}
      {geometryType === 'brain' && (
        <group>
          <mesh position={[-0.07, 0, 0]}>
            <sphereGeometry args={[0.13, 20, 20]} />
            <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} emissive={color} emissiveIntensity={selected || hovered ? 0.9 : 0.4} />
          </mesh>
          <mesh position={[0.07, 0, 0]}>
            <sphereGeometry args={[0.13, 20, 20]} />
            <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} emissive={color} emissiveIntensity={selected || hovered ? 0.9 : 0.4} />
          </mesh>
        </group>
      )}

      {geometryType === 'heart' && (
        <group>
          <mesh position={[0, -0.03, 0]} rotation={[0, 0, 0.2]}>
            <sphereGeometry args={[0.14, 24, 24]} />
            <meshStandardMaterial color={color} roughness={0.2} metalness={0.7} emissive={color} emissiveIntensity={selected || hovered ? 1.0 : 0.5} />
          </mesh>
          <mesh position={[0.04, 0.1, -0.02]} rotation={[0, 0, -0.3]}>
            <torusGeometry args={[0.07, 0.03, 12, 20, Math.PI]} />
            <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.6} />
          </mesh>
        </group>
      )}

      {geometryType === 'lung' && (
        <mesh rotation={[0, 0, 0.1]}>
          <cylinderGeometry args={[0.1, 0.14, 0.42, 16]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.5} emissive={color} emissiveIntensity={selected || hovered ? 0.8 : 0.3} />
        </mesh>
      )}

      {geometryType === 'liver' && (
        <mesh rotation={[0.2, 0.4, 0.2]}>
          <boxGeometry args={[0.26, 0.18, 0.22]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} emissive={color} emissiveIntensity={selected || hovered ? 0.8 : 0.3} />
        </mesh>
      )}

      {geometryType === 'kidney' && (
        <mesh rotation={[0, 0, 0.3]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.7} emissive={color} emissiveIntensity={selected || hovered ? 0.8 : 0.3} />
        </mesh>
      )}

      {geometryType === 'stomach' && (
        <mesh rotation={[0, 0, -0.4]}>
          <torusGeometry args={[0.12, 0.06, 12, 20, Math.PI * 1.2]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} emissive={color} emissiveIntensity={selected || hovered ? 0.8 : 0.3} />
        </mesh>
      )}

      {/* Selection Holographic Aura Ring */}
      {(selected || hovered) && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22, 0.26, 32]} />
          <meshBasicMaterial color={selected ? '#00f2fe' : '#38bdf8'} side={THREE.DoubleSide} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

// ==========================================
// FALLBACK HTML5 2D PROCEDURAL CANVAS
// ==========================================
function Canvas2DFallback({
  vitals,
  selectedOrgan,
  onSelectOrgan,
  layers
}: {
  vitals?: VitalsData | null;
  selectedOrgan: string | null;
  onSelectOrgan: (id: string) => void;
  layers: { silhouette: boolean; skeleton: boolean; organs: boolean; vascular: boolean };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const isDragging = useRef(false);
  const startX = useRef(0);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.03;
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2 + 20;

      ctx.clearRect(0, 0, width, height);

      // Background radial glow
      const bgGrad = ctx.createRadialGradient(cx, cy, 50, cx, cy, 300);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(1, '#030712');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(cx, cy);

      // Human Body Silhouette (2D Vector projection)
      if (layers.silhouette) {
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.5)';
        ctx.lineWidth = 2;

        // Head
        ctx.beginPath();
        ctx.arc(0, -180, 28, 0, Math.PI * 2);
        ctx.stroke();

        // Neck
        ctx.beginPath();
        ctx.moveTo(-10, -152); ctx.lineTo(-10, -135);
        ctx.moveTo(10, -152); ctx.lineTo(10, -135);
        ctx.stroke();

        // Torso & Ribcage outline
        ctx.beginPath();
        ctx.moveTo(-45, -135); ctx.lineTo(45, -135);
        ctx.lineTo(35, -30); ctx.lineTo(-35, -30);
        ctx.closePath();
        ctx.stroke();

        // Pelvis
        ctx.beginPath();
        ctx.moveTo(-35, -30); ctx.lineTo(35, -30);
        ctx.lineTo(28, 20); ctx.lineTo(-28, 20);
        ctx.closePath();
        ctx.stroke();

        // Arms
        ctx.beginPath();
        ctx.moveTo(-45, -135); ctx.lineTo(-70, -40); ctx.lineTo(-80, 40);
        ctx.moveTo(45, -135); ctx.lineTo(70, -40); ctx.lineTo(80, 40);
        ctx.stroke();

        // Legs
        ctx.beginPath();
        ctx.moveTo(-22, 20); ctx.lineTo(-24, 110); ctx.lineTo(-26, 190);
        ctx.moveTo(22, 20); ctx.lineTo(24, 110); ctx.lineTo(26, 190);
        ctx.stroke();
      }

      // Skeletal Spine
      if (layers.skeleton) {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, -150); ctx.lineTo(0, 20);
        ctx.stroke();

        // Ribs
        ctx.lineWidth = 1.5;
        for (let r = -120; r <= -50; r += 15) {
          ctx.beginPath();
          ctx.ellipse(0, r, 28, 8, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Vascular Pathways
      if (layers.vascular) {
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + Math.sin(time * 3) * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -90); ctx.lineTo(0, -155); // to brain
        ctx.moveTo(0, -90); ctx.lineTo(-65, 30); // left arm
        ctx.moveTo(0, -90); ctx.lineTo(65, 30);  // right arm
        ctx.moveTo(0, -90); ctx.lineTo(-20, 180); // left leg
        ctx.moveTo(0, -90); ctx.lineTo(20, 180);  // right leg
        ctx.stroke();
      }

      // Organs
      if (layers.organs) {
        const organsList = [
          { id: 'brain', name: 'Brain', x: 0, y: -180, r: 16, color: '#10b981' },
          { id: 'heart', name: 'Heart', x: -14, y: -90, r: 18 + Math.sin(time * 4) * 2, color: vitals?.heartRate && vitals.heartRate > 100 ? '#ef4444' : '#10b981' },
          { id: 'lungs', name: 'Lungs', x: 20, y: -95, r: 16, color: '#10b981' },
          { id: 'liver', name: 'Liver', x: 18, y: -45, r: 15, color: '#f59e0b' },
          { id: 'kidney', name: 'Kidney', x: -16, y: -15, r: 12, color: '#10b981' },
        ];

        organsList.forEach((org) => {
          const isSel = selectedOrgan === org.id;
          ctx.beginPath();
          ctx.arc(org.x, org.y, org.r, 0, Math.PI * 2);
          ctx.fillStyle = org.color;
          ctx.fill();

          if (isSel) {
            ctx.strokeStyle = '#00f2fe';
            ctx.lineWidth = 3;
            ctx.stroke();
          }

          // Label
          ctx.fillStyle = '#ffffff';
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(org.name, org.x, org.y + org.r + 14);
        });
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [vitals, selectedOrgan, layers]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      const deltaX = e.clientX - startX.current;
      setRotation((prev) => prev + deltaX * 0.01);
      startX.current = e.clientX;
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - canvas.width / 2;
    const y = e.clientY - rect.top - (canvas.height / 2 + 20);

    const nodes = [
      { id: 'brain', x: 0, y: -180, r: 25 },
      { id: 'heart', x: -14, y: -90, r: 25 },
      { id: 'lungs', x: 20, y: -95, r: 25 },
      { id: 'liver', x: 18, y: -45, r: 25 },
      { id: 'kidney', x: -16, y: -15, r: 25 },
    ];

    const clicked = nodes.find((n) => Math.hypot(x - n.x, y - n.y) < n.r);
    if (clicked) {
      onSelectOrgan(clicked.id);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={500}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleCanvasClick}
      style={{ width: '100%', height: '100%', cursor: 'grab' }}
    />
  );
}

// Error Boundary wrapper for WebGL
class WebGLErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn('WebGL Canvas fallback triggered:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// ==========================================
// MAIN DIGITAL TWIN 3D COMPONENT
// ==========================================
export default function DigitalTwin3D({ vitals, completeness = 75 }: DigitalTwin3DProps) {
  const [selectedOrgan, setSelectedOrgan] = useState<string | null>('heart');
  const [cameraPreset, setCameraPreset] = useState<'full' | 'head' | 'chest' | 'abdomen'>('full');
  const [useFallback2D, setUseFallback2D] = useState(false);

  // Layers control state
  const [layers, setLayers] = useState({
    silhouette: true,
    skeleton: true,
    organs: true,
    vascular: true
  });

  // Calculate vital-driven colors
  const getHeartColor = () => {
    const hr = vitals?.heartRate || 75;
    if (hr < 50 || hr > 120) return '#ef4444'; // Red alert
    if (hr < 60 || hr > 100) return '#f59e0b'; // Amber warning
    return '#10b981'; // Green normal
  };

  const getLungsColor = () => {
    const oxy = vitals?.oxygenLevel || 98;
    if (oxy < 90) return '#ef4444';
    if (oxy < 95) return '#f59e0b';
    return '#10b981';
  };

  const getBrainColor = () => {
    const hr = vitals?.heartRate || 75;
    const temp = vitals?.temperature || 36.6;
    if (hr > 110 || temp > 38.0) return '#ef4444';
    if (hr > 95 || temp > 37.5) return '#f59e0b';
    return '#10b981';
  };

  const getLiverColor = () => {
    return completeness > 80 ? '#10b981' : '#f59e0b';
  };

  const getKidneyColor = () => {
    return completeness > 60 ? '#10b981' : '#f59e0b';
  };

  const getHeartPulseSpeed = () => {
    const hr = vitals?.heartRate || 75;
    return (hr / 60) * Math.PI * 2;
  };

  // Camera preset positions
  const cameraConfigs = {
    full: { pos: [0, 0, 4.5] as [number, number, number] },
    head: { pos: [0, 1.4, 1.8] as [number, number, number] },
    chest: { pos: [0, 0.35, 2.2] as [number, number, number] },
    abdomen: { pos: [0, -0.25, 2.2] as [number, number, number] }
  };

  const organDetails: Record<string, { title: string; subtitle: string; metrics: string[]; status: 'NORMAL' | 'WARNING' | 'CRITICAL' }> = {
    brain: {
      title: 'Cerebral & Central Nervous System',
      subtitle: 'Neural cognitive status & intracranial temperature balance',
      status: vitals?.temperature && vitals.temperature > 37.5 ? 'WARNING' : 'NORMAL',
      metrics: [
        `Core Temp: ${vitals?.temperature || 36.8} °C`,
        `Synaptic Rate: Normal Telemetry`,
        `Cognitive Stress Index: Low`
      ]
    },
    heart: {
      title: 'Cardiovascular System (Heart Node)',
      subtitle: 'Real-time telemetry pulse & cardiac rhythm monitoring',
      status: vitals?.heartRate && (vitals.heartRate < 50 || vitals.heartRate > 120) ? 'CRITICAL' : vitals?.heartRate && (vitals.heartRate < 60 || vitals.heartRate > 100) ? 'WARNING' : 'NORMAL',
      metrics: [
        `Heart Rate: ${vitals?.heartRate || 75} BPM`,
        `Blood Pressure: ${vitals?.bloodPressure || '120/80'} mmHg`,
        `Rhythm: Sinus Synchronized`
      ]
    },
    lungs: {
      title: 'Pulmonary Respiratory System (Lungs)',
      subtitle: 'Oxygenation exchange & respiration volume flow',
      status: vitals?.oxygenLevel && vitals.oxygenLevel < 92 ? 'CRITICAL' : vitals?.oxygenLevel && vitals.oxygenLevel < 95 ? 'WARNING' : 'NORMAL',
      metrics: [
        `SpO2 Saturation: ${vitals?.oxygenLevel || 98} %`,
        `Respiration Rate: 16 bpm`,
        `Airway Permeability: Clear`
      ]
    },
    liver: {
      title: 'Hepatic Metabolic System (Liver)',
      subtitle: 'Enzyme processing & EHR profile status sync',
      status: completeness > 70 ? 'NORMAL' : 'WARNING',
      metrics: [
        `Filtration Rating: Normal`,
        `Metabolic Sync: Active`,
        `Digital Twin Score: ${completeness}%`
      ]
    },
    kidney: {
      title: 'Renal Filtration System (Kidneys)',
      subtitle: 'Fluid homeostasis & blood filtration integrity',
      status: completeness > 60 ? 'NORMAL' : 'WARNING',
      metrics: [
        `GFR Estimate: 95 mL/min`,
        `Electrolyte Balance: Optimal`,
        `Hydration Status: Balanced`
      ]
    }
  };

  const selectedDetails = selectedOrgan ? organDetails[selectedOrgan] : null;

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '560px', height: '100%', background: 'radial-gradient(circle at center, #0f172a 0%, #030712 100%)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* HUD Header Toolbar */}
      <div style={{ padding: '12px 18px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', zIndex: 10 }}>
        
        {/* Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00f2fe', boxShadow: '0 0 10px #00f2fe', animation: 'pulse-glow 1.5s infinite' }}></div>
          <div>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              3D Holographic Human Health Twin
            </h4>
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
              Real-Time Anatomical Telemetry • Sync Active
            </span>
          </div>
        </div>

        {/* View Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '6px', paddingRight: '4px' }}>Camera Focus:</span>
          {(['full', 'head', 'chest', 'abdomen'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => setCameraPreset(preset)}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                background: cameraPreset === preset ? 'var(--color-primary)' : 'transparent',
                color: cameraPreset === preset ? '#000' : 'var(--text-secondary)',
                fontWeight: cameraPreset === preset ? '600' : '400',
                transition: 'all 0.2s'
              }}
            >
              {preset.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Layer Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setLayers(l => ({ ...l, vascular: !l.vascular }))}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              background: layers.vascular ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
              color: layers.vascular ? '#f87171' : 'var(--text-muted)'
            }}
          >
            Vascular
          </button>
          <button
            onClick={() => setLayers(l => ({ ...l, skeleton: !l.skeleton }))}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              background: layers.skeleton ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              color: layers.skeleton ? '#38bdf8' : 'var(--text-muted)'
            }}
          >
            Skeleton
          </button>
          <button
            onClick={() => setUseFallback2D(!useFallback2D)}
            title="Toggle 2D/3D Renderer"
            style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            {useFallback2D ? 'Switch 3D' : '2D Mode'}
          </button>
        </div>

      </div>

      {/* Main Interactive Canvas Area */}
      <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: '440px' }}>
        
        {useFallback2D ? (
          <Canvas2DFallback vitals={vitals} selectedOrgan={selectedOrgan} onSelectOrgan={setSelectedOrgan} layers={layers} />
        ) : (
          <WebGLErrorBoundary fallback={<Canvas2DFallback vitals={vitals} selectedOrgan={selectedOrgan} onSelectOrgan={setSelectedOrgan} layers={layers} />}>
            <Canvas shadows camera={{ position: cameraConfigs[cameraPreset].pos, fov: 45 }} style={{ width: '100%', height: '100%' }}>
              
              <ambientLight intensity={0.6} />
              <pointLight position={[10, 10, 10]} intensity={1.8} castShadow />
              <pointLight position={[-10, -10, -10]} intensity={0.6} />
              <directionalLight position={[0, 5, 5]} intensity={1.0} color="#00f2fe" />

              <Stars radius={100} depth={50} count={1200} factor={4} saturation={0.5} fade speed={1} />

              {/* Camera Presets Controller */}
              <CameraController targetPosition={cameraConfigs[cameraPreset].pos} />

              {/* 3D Human Components */}
              <HumanBodySilhouette visible={layers.silhouette} />
              <SkeletalSpine visible={layers.skeleton} />
              <VascularCirculation visible={layers.vascular} />

              {/* 3D Organ Nodes */}
              {layers.organs && (
                <group position={[0, -0.2, 0]}>
                  {/* Brain */}
                  <OrganNode
                    id="brain"
                    name="Brain"
                    position={[0, 1.65, 0]}
                    color={getBrainColor()}
                    selected={selectedOrgan === 'brain'}
                    onSelect={setSelectedOrgan}
                    scaleFactor={0.8}
                    pulseSpeed={0.8}
                    geometryType="brain"
                  />

                  {/* Heart */}
                  <OrganNode
                    id="heart"
                    name="Heart"
                    position={[-0.14, 0.72, 0.1]}
                    color={getHeartColor()}
                    selected={selectedOrgan === 'heart'}
                    onSelect={setSelectedOrgan}
                    scaleFactor={0.9}
                    pulseSpeed={getHeartPulseSpeed()}
                    geometryType="heart"
                  />

                  {/* Lungs */}
                  <OrganNode
                    id="lungs"
                    name="Lungs"
                    position={[0.22, 0.72, 0.02]}
                    color={getLungsColor()}
                    selected={selectedOrgan === 'lungs'}
                    onSelect={setSelectedOrgan}
                    scaleFactor={0.75}
                    pulseSpeed={1.2}
                    geometryType="lung"
                  />
                  <OrganNode
                    id="lungs"
                    name="Lungs"
                    position={[-0.26, 0.72, 0.02]}
                    color={getLungsColor()}
                    selected={selectedOrgan === 'lungs'}
                    onSelect={setSelectedOrgan}
                    scaleFactor={0.75}
                    pulseSpeed={1.2}
                    geometryType="lung"
                  />

                  {/* Liver */}
                  <OrganNode
                    id="liver"
                    name="Liver"
                    position={[0.2, 0.28, 0.08]}
                    color={getLiverColor()}
                    selected={selectedOrgan === 'liver'}
                    onSelect={setSelectedOrgan}
                    scaleFactor={0.85}
                    geometryType="liver"
                  />

                  {/* Kidneys */}
                  <OrganNode
                    id="kidney"
                    name="Kidney"
                    position={[0.18, -0.1, -0.1]}
                    color={getKidneyColor()}
                    selected={selectedOrgan === 'kidney'}
                    onSelect={setSelectedOrgan}
                    scaleFactor={0.65}
                    geometryType="kidney"
                  />
                  <OrganNode
                    id="kidney"
                    name="Kidney"
                    position={[-0.18, -0.1, -0.1]}
                    color={getKidneyColor()}
                    selected={selectedOrgan === 'kidney'}
                    onSelect={setSelectedOrgan}
                    scaleFactor={0.65}
                    geometryType="kidney"
                  />
                </group>
              )}

              <OrbitControls enableZoom={true} maxPolarAngle={Math.PI / 1.6} minPolarAngle={Math.PI / 4} />
            </Canvas>
          </WebGLErrorBoundary>
        )}

        {/* Quick Organ Selector Side Panel */}
        <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Organ Nodes:</span>
          {[
            { id: 'brain', label: 'Brain', icon: Cpu, color: getBrainColor() },
            { id: 'heart', label: 'Heart', icon: Heart, color: getHeartColor() },
            { id: 'lungs', label: 'Lungs', icon: Wind, color: getLungsColor() },
            { id: 'liver', label: 'Liver', icon: Activity, color: getLiverColor() },
            { id: 'kidney', label: 'Kidneys', icon: Shield, color: getKidneyColor() }
          ].map((org) => {
            const Icon = org.icon;
            const isSel = selectedOrgan === org.id;
            return (
              <button
                key={org.id}
                onClick={() => setSelectedOrgan(org.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: isSel ? `1px solid ${org.color}` : '1px solid rgba(255,255,255,0.08)',
                  background: isSel ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.6)',
                  color: isSel ? '#fff' : 'var(--text-secondary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s',
                  boxShadow: isSel ? `0 0 12px ${org.color}40` : 'none'
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: org.color }}></span>
                <Icon size={14} />
                <span>{org.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom Organ Inspection Metric Card */}
        {selectedDetails && (
          <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: 'rgba(15, 23, 42, 0.95)', padding: '14px 22px', borderRadius: '8px', border: '1px solid var(--color-primary)', color: '#fff', textAlign: 'left', minWidth: '320px', maxWidth: '90%', boxShadow: '0 0 20px rgba(0, 242, 254, 0.25)', backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h5 style={{ color: 'var(--color-primary)', fontSize: '14px', fontWeight: '700', margin: 0 }}>
                {selectedDetails.title}
              </h5>
              <span className={`badge ${selectedDetails.status === 'CRITICAL' ? 'badge-danger' : selectedDetails.status === 'WARNING' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '10px' }}>
                {selectedDetails.status}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '10px' }}>
              {selectedDetails.subtitle}
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
              {selectedDetails.metrics.map((m, idx) => (
                <span key={idx} style={{ fontSize: '11px', color: '#e2e8f0', background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: '4px' }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
