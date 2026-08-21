import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RotateCw, 
  RotateCcw, 
  Eye, 
  AlertTriangle, 
  ShieldCheck, 
  Activity, 
  Layers, 
  Info, 
  Flame, 
  Zap, 
  Maximize2, 
  Minimize2, 
  Sparkles,
  Compass,
  Play,
  Pause
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface Spine3DModelProps {
  avgAngle?: number; // Live or session angle (e.g. 85° optimal, 60° slouch)
  slouchIncidents?: number;
  stabilityScore?: number;
  className?: string;
  showControls?: boolean;
}

export interface VertebraDefinition {
  id: string;
  name: string;
  region: 'cervical' | 'thoracic' | 'lumbar' | 'sacrum';
  level: number;
  baseY: number; // Base position along spinal axis (0 to 360)
  width: number;
  depth: number;
  height: number;
  spinousLength: number; // Length of posterior backward spine process
  spinousAngleDeg: number; // Angle tilt of spinous process
  isUpperBack: boolean; // Device focus area (C1-T8)
  description: string;
  innervations: string;
}

export const Spine3DModel: React.FC<Spine3DModelProps> = ({
  avgAngle = 82,
  slouchIncidents = 0,
  stabilityScore = 88,
  className = '',
  showControls = true,
}) => {
  // 3D rotation state (in degrees)
  // Default to a 3D isometric 3/4 side view that highlights the S-curve like the reference image
  const [rotY, setRotY] = useState<number>(75); // Yaw (horizontal rotation around spine)
  const [rotX, setRotX] = useState<number>(8);  // Pitch (tilt up/down)
  const [zoom, setZoom] = useState<number>(1.02); // Scale factor
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(false);
  const [selectedVertebraId, setSelectedVertebraId] = useState<string | null>(null);
  const [hoveredVertebraId, setHoveredVertebraId] = useState<string | null>(null);
  const [activeViewPreset, setActiveViewPreset] = useState<'side' | 'iso' | 'back' | 'front'>('iso');
  const [activeFilter, setActiveFilter] = useState<'all' | 'cervical' | 'thoracic' | 'lumbar'>('all');

  // Drag interaction refs
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Calculate slouch severity: 0 = perfect upright (90°+), 1 = severe slouch (<= 50°)
  const slouchSeverity = useMemo(() => {
    return Math.max(0, Math.min(1, (88 - avgAngle) / 38));
  }, [avgAngle]);

  // Upper back specific load multiplier (Hansraj model)
  const upperBackTorqueLbs = useMemo(() => {
    const deviation = Math.max(0, 88 - avgAngle);
    return Math.round(12 + Math.pow(deviation / 45, 1.4) * 48);
  }, [avgAngle]);

  // Continuous auto-rotation animation loop
  useEffect(() => {
    if (!isAutoRotating) return;
    const interval = setInterval(() => {
      setRotY(prev => (prev + 0.8) % 360);
    }, 25);
    return () => clearInterval(interval);
  }, [isAutoRotating]);

  // Vertebrae Anatomical Definition (24 Pre-sacral vertebrae + Sacrum/Pelvis)
  const vertebraeDefinitions: VertebraDefinition[] = useMemo(() => {
    const list: VertebraDefinition[] = [];
    let currentY = 18;

    // CERVICAL (C1 - C7): Neck & Upper Cervical Region
    const cervicalData = [
      { id: 'C1', name: 'Atlas (C1)', desc: 'Supports cranium globe; facilitates nodding.', innerv: 'Suboccipital nerve, cranial stability' },
      { id: 'C2', name: 'Axis (C2)', desc: 'Odontoid peg pivot for head rotational range.', innerv: 'Greater occipital nerve' },
      { id: 'C3', name: 'Cervical C3', desc: 'Upper neck lordosis arch.', innerv: 'Diaphragm & upper neck sensation' },
      { id: 'C4', name: 'Cervical C4', desc: 'Mid-cervical mobility anchor.', innerv: 'Phrenic nerve motor control' },
      { id: 'C5', name: 'Cervical C5', desc: 'Shoulder girdle suspension.', innerv: 'Deltoid, biceps, shoulder abduction' },
      { id: 'C6', name: 'Cervical C6', desc: 'Cervical-Thoracic transition junction.', innerv: 'Wrist extensors, biceps reflex' },
      { id: 'C7', name: 'Vertebra Prominens (C7)', desc: 'Large posterior spinous landmark bearing forward head load.', innerv: 'Triceps, finger extension' },
    ];

    cervicalData.forEach((c, idx) => {
      list.push({
        id: c.id,
        name: c.name,
        region: 'cervical',
        level: idx + 1,
        baseY: currentY,
        width: 14 + idx * 0.8,
        depth: 12 + idx * 0.6,
        height: 6.5,
        spinousLength: 10 + idx * 2.2,
        spinousAngleDeg: 15 + idx * 4,
        isUpperBack: true,
        description: c.desc,
        innervations: c.innerv,
      });
      currentY += 8.2;
    });

    // THORACIC (T1 - T12): Upper & Mid Back (Main PosturePal Wearable Focus Zone)
    const thoracicData = [
      { id: 'T1', name: 'Thoracic T1', desc: 'Cervico-thoracic junction bearing head torque.', innerv: 'Intrinsic hand muscles, upper chest' },
      { id: 'T2', name: 'Thoracic T2', desc: 'Upper rib cage stabilizer.', innerv: 'Upper chest, levator scapulae' },
      { id: 'T3', name: 'Thoracic T3', desc: 'Scapular rhomboid muscle anchor.', innerv: 'Lungs, bronchial pleura' },
      { id: 'T4', name: 'Thoracic T4', desc: 'Mid-scapula pivot, prone to kyphotic rounding.', innerv: 'Coronary plexus, cardiac sympathetic' },
      { id: 'T5', name: 'Thoracic T5', desc: 'Upper back flexural apex.', innerv: 'Esophagus, chest wall' },
      { id: 'T6', name: 'Thoracic T6', desc: 'Interscapular tension focal point.', innerv: 'Stomach, mid-back extensor muscles' },
      { id: 'T7', name: 'Thoracic T7', desc: 'Peak thoracic kyphotic curvature.', innerv: 'Pancreas, thoracic fascia' },
      { id: 'T8', name: 'Thoracic T8', desc: 'Mid-thoracic load transfer zone.', innerv: 'Spleen, lower rib expansion' },
      { id: 'T9', name: 'Thoracic T9', desc: 'Lower thoracic transition segment.', innerv: 'Adrenal glands, postural stabilizers' },
      { id: 'T10', name: 'Thoracic T10', desc: 'Lower rib attachment bridge.', innerv: 'Kidneys, lower back musculature' },
      { id: 'T11', name: 'Thoracic T11', desc: 'Floating rib junction.', innerv: 'Ureters, quadratus lumborum' },
      { id: 'T12', name: 'Thoracic T12', desc: 'Thoracolumbar hinge bearing upper body weight.', innerv: 'Lower bowel, iliohypogastric nerve' },
    ];

    thoracicData.forEach((t, idx) => {
      list.push({
        id: t.id,
        name: t.name,
        region: 'thoracic',
        level: idx + 1,
        baseY: currentY,
        width: 19 + idx * 0.9,
        depth: 16 + idx * 0.8,
        height: 8.5,
        spinousLength: 22 - Math.abs(idx - 6) * 0.8, // Thoracic spinous processes are long and angle steeply downward
        spinousAngleDeg: 42 + idx * 1.5,
        isUpperBack: idx < 8, // T1-T8 is upper back
        description: t.desc,
        innervations: t.innerv,
      });
      currentY += 10.2;
    });

    // LUMBAR (L1 - L5): Lower Back Lordosis
    const lumbarData = [
      { id: 'L1', name: 'Lumbar L1', desc: 'Upper lumbar axial weight receiver.', innerv: 'Groin, upper quadriceps' },
      { id: 'L2', name: 'Lumbar L2', desc: 'Psoas major and deep core anchor.', innerv: 'Anterior thigh, hip flexion' },
      { id: 'L3', name: 'Lumbar L3', desc: 'Apex of lumbar lordosis curve.', innerv: 'Knee extension, quadriceps reflex' },
      { id: 'L4', name: 'Lumbar L4', desc: 'Lower lumbar pivot, high disk herniation risk.', innerv: 'Tibialis anterior, foot dorsiflexion' },
      { id: 'L5', name: 'Lumbar L5', desc: 'Lumbosacral junction transferring loads to pelvis.', innerv: 'Extensor hallucis, sciatica pathway' },
    ];

    lumbarData.forEach((l, idx) => {
      list.push({
        id: l.id,
        name: l.name,
        region: 'lumbar',
        level: idx + 1,
        baseY: currentY,
        width: 28 + idx * 1.2,
        depth: 24 + idx * 1.1,
        height: 12.0,
        spinousLength: 18 - idx * 1.2, // Lumbar spinous processes are broad and horizontal
        spinousAngleDeg: 12 + idx * 2,
        isUpperBack: false,
        description: l.desc,
        innervations: l.innerv,
      });
      currentY += 14.5;
    });

    // SACRUM & PELVIS BASE (Fused wedge & pelvic cradle standing on luminous pedestal)
    list.push({
      id: 'Sacrum',
      name: 'Sacrum & Pelvic Cradle',
      region: 'sacrum',
      level: 1,
      baseY: currentY + 6,
      width: 48,
      depth: 36,
      height: 28,
      spinousLength: 10,
      spinousAngleDeg: 30,
      isUpperBack: false,
      description: 'Anatomical pelvic base resting on illuminated vibration mount.',
      innervations: 'Pudendal & sciatic plexus, sacral grounding'
    });

    return list;
  }, []);

  // Compute 3D Projected Coordinates & Anatomical Deformation (S-Curve Flexion)
  const projectedModel = useMemo(() => {
    const radY = (rotY * Math.PI) / 180;
    const radX = (rotX * Math.PI) / 180;

    const items = vertebraeDefinitions.map((v, index) => {
      const totalCount = vertebraeDefinitions.length;
      const progress = index / totalCount; // 0 at C1, 1 at Sacrum

      // S-CURVE BIOMECHANICS:
      // Natural Physiological Curvatures:
      // - Cervical: Anterior convex (Lordosis)
      // - Thoracic: Posterior convex (Kyphosis)
      // - Lumbar: Anterior convex (Lordosis)
      // - Sacrum: Posterior tilt
      let naturalZ = 0; // Anterior / Posterior axis (+Z = anterior/front, -Z = posterior/back)
      let naturalX = 0; // Lateral axis

      if (v.region === 'cervical') {
        // Cervical lordosis (+Z front curve)
        naturalZ = Math.sin((index / 7) * Math.PI) * 7 + 2;
        // Forward head posture displacement when slouching (Forward displacement in +Z / -Y)
        naturalZ += slouchSeverity * (7 - index) * 4.2;
      } else if (v.region === 'thoracic') {
        // Thoracic kyphosis (-Z backward curve)
        const tProgress = (index - 7) / 12;
        naturalZ = -Math.sin(tProgress * Math.PI) * 16 - 2;
        // Exaggerated thoracic kyphotic hunch under slouching
        naturalZ -= slouchSeverity * Math.sin(tProgress * Math.PI) * 18.0;
      } else if (v.region === 'lumbar') {
        // Lumbar lordosis (+Z forward curve)
        const lProgress = (index - 19) / 5;
        naturalZ = Math.sin(lProgress * Math.PI) * 12 + 1;
        // Lumbar flat-back deformation when slouched
        naturalZ -= slouchSeverity * (1 - lProgress) * 7.0;
      } else {
        // Sacrum
        naturalZ = -6;
      }

      // World 3D coordinates (Centered around spinal vertical axis)
      const worldX = naturalX;
      const worldY = v.baseY - 140; // Center Y around origin
      const worldZ = naturalZ;

      // 3D Rotation Matrix (Yaw around Y, Pitch around X)
      // Step 1: Rotate around Y axis (rotY)
      const x1 = worldX * Math.cos(radY) + worldZ * Math.sin(radY);
      const z1 = -worldX * Math.sin(radY) + worldZ * Math.cos(radY);

      // Step 2: Rotate around X axis (rotX)
      const y2 = worldY * Math.cos(radX) - z1 * Math.sin(radX);
      const z2 = worldY * Math.sin(radX) + z1 * Math.cos(radX);

      // Perspective Projection onto 2D Canvas (Origin at 140, 160)
      const cameraDistance = 380;
      const perspective = cameraDistance / (cameraDistance + z2);
      const projX = 140 + x1 * perspective * zoom;
      const projY = 160 + y2 * perspective * zoom;

      // Calculate Spinous Process 3D Projection (extending posterior -Z in local anatomical coordinates)
      const spinousRad = (v.spinousAngleDeg * Math.PI) / 180;
      const spinousLocalZ = worldZ - Math.cos(spinousRad) * v.spinousLength;
      const spinousLocalY = worldY + Math.sin(spinousRad) * v.spinousLength;

      // Spinous rotation
      const spX1 = worldX * Math.cos(radY) + spinousLocalZ * Math.sin(radY);
      const spZ1 = -worldX * Math.sin(radY) + spinousLocalZ * Math.cos(radY);
      const spY2 = spinousLocalY * Math.cos(radX) - spZ1 * Math.sin(radX);
      const spZ2 = spinousLocalY * Math.sin(radX) + spZ1 * Math.cos(radX);

      const spProjX = 140 + spX1 * (cameraDistance / (cameraDistance + spZ2)) * zoom;
      const spProjY = 160 + spY2 * (cameraDistance / (cameraDistance + spZ2)) * zoom;

      // Left and Right Transverse Process 3D Projections (extending lateral +/- X)
      const wingSpan = v.width * 0.95;
      const leftWingX1 = (worldX - wingSpan) * Math.cos(radY) + (worldZ - 4) * Math.sin(radY);
      const leftWingZ1 = -(worldX - wingSpan) * Math.sin(radY) + (worldZ - 4) * Math.cos(radY);
      const leftWingY2 = worldY * Math.cos(radX) - leftWingZ1 * Math.sin(radX);
      const leftWingZ2 = worldY * Math.sin(radX) + leftWingZ1 * Math.cos(radX);

      const lWingProjX = 140 + leftWingX1 * (cameraDistance / (cameraDistance + leftWingZ2)) * zoom;
      const lWingProjY = 160 + leftWingY2 * (cameraDistance / (cameraDistance + leftWingZ2)) * zoom;

      const rightWingX1 = (worldX + wingSpan) * Math.cos(radY) + (worldZ - 4) * Math.sin(radY);
      const rightWingZ1 = -(worldX + wingSpan) * Math.sin(radY) + (worldZ - 4) * Math.cos(radY);
      const rightWingY2 = worldY * Math.cos(radX) - rightWingZ1 * Math.sin(radX);
      const rightWingZ2 = worldY * Math.sin(radX) + rightWingZ1 * Math.cos(radX);

      const rWingProjX = 140 + rightWingX1 * (cameraDistance / (cameraDistance + rightWingZ2)) * zoom;
      const rWingProjY = 160 + rightWingY2 * (cameraDistance / (cameraDistance + rightWingZ2)) * zoom;

      // DYNAMIC SPINAL HEALTH & SEVERITY COLOR ENGINE:
      // Focus: Upper back (Cervical C5-C7 and Thoracic T1-T8)
      let healthSeverity: 'healthy' | 'warning' | 'critical' = 'healthy';
      let primaryColor = '#38bdf8'; // Radiant clinical cyan/blue (Healthy)
      let glowColor = 'rgba(56, 189, 248, 0.6)';
      let discColor = '#00f2fe';
      let stressPsi = Math.round(45 + index * 2.5); // Normal hydrostatic pressure in PSI

      if (v.isUpperBack) {
        if (slouchSeverity > 0.55) {
          // CRITICAL SLOUCH / SEVERE POSTURAL STRESS -> VIBRANT CRIMSON RED
          healthSeverity = 'critical';
          primaryColor = '#ff2d55';
          glowColor = 'rgba(255, 45, 85, 0.85)';
          discColor = '#ff3b30';
          stressPsi = Math.round(135 + (8 - Math.abs(index - 6)) * 12);
        } else if (slouchSeverity > 0.22) {
          // MILD SLOUCH / COMPENSATORY STRAIN -> GLOWING AMBER / YELLOW
          healthSeverity = 'warning';
          primaryColor = '#f59e0b';
          glowColor = 'rgba(245, 158, 11, 0.75)';
          discColor = '#fbbf24';
          stressPsi = Math.round(85 + (8 - Math.abs(index - 6)) * 6);
        } else {
          // OPTIMAL / HEALTHY ALIGNMENT -> LUMINOUS CRYSTAL CYAN BLUE
          healthSeverity = 'healthy';
          primaryColor = '#38bdf8';
          glowColor = 'rgba(56, 189, 248, 0.5)';
          discColor = '#38bdf8';
          stressPsi = Math.round(40 + index * 2);
        }
      } else if (v.region === 'lumbar' && slouchSeverity > 0.5) {
        healthSeverity = 'warning';
        primaryColor = '#f59e0b';
        glowColor = 'rgba(245, 158, 11, 0.6)';
        discColor = '#fbbf24';
        stressPsi = Math.round(95 + (index - 19) * 10);
      }

      return {
        ...v,
        projX,
        projY,
        scale: perspective * zoom,
        zDepth: z2,
        spProjX,
        spProjY,
        lWingProjX,
        lWingProjY,
        rWingProjX,
        rWingProjY,
        healthSeverity,
        primaryColor,
        glowColor,
        discColor,
        stressPsi,
      };
    });

    // Sort all projected elements by Z-depth (painter's algorithm) so back elements render first
    return items.sort((a, b) => b.zDepth - a.zDepth);
  }, [vertebraeDefinitions, rotX, rotY, zoom, slouchSeverity]);

  // Selected vertebra metadata
  const selectedVertebra = useMemo(() => {
    const activeId = selectedVertebraId || hoveredVertebraId;
    if (!activeId) return null;
    return projectedModel.find(v => v.id === activeId) || null;
  }, [projectedModel, selectedVertebraId, hoveredVertebraId]);

  // Mouse & Touch Drag Handlers for 360° Free Rotation
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    if (isAutoRotating) setIsAutoRotating(false);
    if (svgRef.current) {
      svgRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastMousePosRef.current.x;
    const deltaY = e.clientY - lastMousePosRef.current.y;

    setRotY(prev => (prev + deltaX * 0.7) % 360);
    setRotX(prev => Math.max(-45, Math.min(45, prev - deltaY * 0.5))); // Clamp pitch up/down

    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    isDraggingRef.current = false;
    if (svgRef.current && svgRef.current.hasPointerCapture(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
  };

  // View Preset Setters
  const applyViewPreset = (preset: 'side' | 'iso' | 'back' | 'front') => {
    setActiveViewPreset(preset);
    setIsAutoRotating(false);
    if (preset === 'side') {
      // Sagittal View (Pure lateral side profile to inspect S-curve and forward slouch)
      setRotY(90);
      setRotX(0);
    } else if (preset === 'iso') {
      // Isometric 3/4 View (Like the reference translucent image)
      setRotY(65);
      setRotX(12);
    } else if (preset === 'back') {
      // Posterior View (Spinous processes aligned)
      setRotY(180);
      setRotX(0);
    } else if (preset === 'front') {
      // Anterior Coronal View
      setRotY(0);
      setRotX(0);
    }
  };

  // Summary counts
  const criticalCount = projectedModel.filter(v => v.healthSeverity === 'critical').length;
  const warningCount = projectedModel.filter(v => v.healthSeverity === 'warning').length;

  return (
    <div className={`relative bg-white rounded-[32px] p-5 sm:p-7 text-slate-800 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.08),0_4px_12px_-2px_rgba(15,23,42,0.03)] border border-slate-100/90 overflow-hidden flex flex-col space-y-4 ${className}`}>
      
      {/* Background Subtle Gradient Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-50/40 via-white to-slate-50/60 pointer-events-none" />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-80 h-36 bg-cyan-400/10 blur-[50px] rounded-full pointer-events-none" />
      {criticalCount > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-72 h-44 bg-rose-400/15 blur-[60px] rounded-full pointer-events-none animate-pulse" />
      )}

      {/* Top Header: Title, Telemetry Status & Biofeedback Level */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-200/80 text-cyan-600 flex items-center justify-center font-black shadow-2xs">
            <Activity size={19} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-black tracking-tight text-slate-900">
                3D Anatomical Vertebral Column
              </h4>
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200/80">
                Crystal Model
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Interactive 360° spine twin reflecting upper-back posture load & slouch health.
            </p>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {criticalCount > 0 ? (
            <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-1.5 animate-pulse shadow-2xs">
              <Flame size={12} />
              <span>Upper Back Overload ({criticalCount} Vertebrae Red)</span>
            </div>
          ) : warningCount > 0 ? (
            <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1.5 shadow-2xs">
              <AlertTriangle size={12} />
              <span>Mild Slouch Strain (C5–T7 Yellow)</span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1.5 shadow-2xs">
              <ShieldCheck size={12} />
              <span>Optimal Spinal Alignment</span>
            </div>
          )}

          <div className="px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black text-slate-700 border border-slate-200/80 shadow-2xs">
            {Math.round(avgAngle)}° Angle ({upperBackTorqueLbs} lbs load)
          </div>
        </div>
      </div>

      {/* Region Selector Bar */}
      <div className="relative z-10 flex items-center justify-between gap-2 flex-wrap pt-0.5">
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 shadow-2xs">
          {(['all', 'cervical', 'thoracic', 'lumbar'] as const).map(region => (
            <button
              key={region}
              onClick={() => setActiveFilter(region)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                activeFilter === region
                  ? "bg-white text-slate-900 shadow-xs font-black"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              {region === 'all' ? 'Full Spine' : region}
            </button>
          ))}
        </div>

        {/* Camera Quick-View Preset Bar */}
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 shadow-2xs">
          <button
            onClick={() => applyViewPreset('iso')}
            className={cn(
              "px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
              activeViewPreset === 'iso' ? "bg-white text-cyan-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Sparkles size={11} />
            <span>Isometric</span>
          </button>
          <button
            onClick={() => applyViewPreset('side')}
            className={cn(
              "px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
              activeViewPreset === 'side' ? "bg-white text-cyan-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Compass size={11} />
            <span>Side S-Curve</span>
          </button>
          <button
            onClick={() => applyViewPreset('back')}
            className={cn(
              "px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
              activeViewPreset === 'back' ? "bg-white text-cyan-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Eye size={11} />
            <span>Posterior</span>
          </button>
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={cn(
              "px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
              isAutoRotating ? "bg-cyan-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
            )}
          >
            {isAutoRotating ? <Pause size={11} /> : <Play size={11} />}
            <span>{isAutoRotating ? "Pause" : "Spin"}</span>
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Stage */}
      <div className="relative w-full h-[440px] sm:h-[480px] bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0]/80 rounded-[28px] border border-slate-200/80 flex items-center justify-center overflow-hidden select-none shadow-[inset_0_2px_8px_rgba(0,0,0,0.03),0_4px_20px_rgba(15,23,42,0.03)]">
        
        {/* Zoom & Rotation Controls (Top-Right) */}
        {showControls && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 shadow-soft">
            <button
              onClick={() => setZoom(prev => Math.max(0.75, prev - 0.1))}
              className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-black transition-colors"
              title="Zoom Out"
            >
              -
            </button>
            <span className="text-[10px] font-black text-slate-600 px-1">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(prev => Math.min(1.4, prev + 0.1))}
              className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-black transition-colors"
              title="Zoom In"
            >
              +
            </button>
          </div>
        )}

        {/* Drag Instruction Cue (Bottom-Right) */}
        <div className="absolute bottom-3 right-3 z-20 pointer-events-none bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 text-[10px] font-semibold text-slate-500 flex items-center gap-1.5 shadow-2xs">
          <RotateCw size={12} className="text-cyan-600 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Click & Drag to Rotate (Yaw: {Math.round(rotY)}°, Pitch: {Math.round(rotX)}°)</span>
        </div>

        {/* Color Legend (Bottom-Left) */}
        <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 text-[10px] space-y-1 shadow-soft">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block border-b border-slate-100 pb-1">
            Vertebral Health Status
          </span>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_6px_#06b6d4]" />
            <span className="text-slate-700 font-bold">Optimal Alignment (&lt;12 lbs)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
            <span className="text-slate-700 font-bold">Mild Slouch / Strain (25–35 lbs)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_#ff2d55]" />
            <span className="text-slate-700 font-bold">Upper Back Overload (45–60 lbs)</span>
          </div>
        </div>

        {/* SVG 3D RENDER CANVAS */}
        <svg
          ref={svgRef}
          viewBox="0 0 280 340"
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <defs>
            {/* Shaders, Translucent Gradients & Light Reflections tailored for light background */}
            <radialGradient id="spineBaseGlowLight" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#bae6fd" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="crystalVertebraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.95" />
              <stop offset="35%" stopColor="#38bdf8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id="amberVertebraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id="roseVertebraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffe4e6" stopOpacity="0.95" />
              <stop offset="35%" stopColor="#ff2d55" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id="pedestalGradLight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#7dd3fc" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.9" />
            </linearGradient>

            {/* Glowing Discs Filter */}
            <filter id="luminousDiscGlowLight" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. ILLUMINATED PEDESTAL BASE (Matching reference image translucent stand) */}
          <g className="pedestal-mount">
            {/* Pedestal Under-glow Spotlight */}
            <ellipse cx="140" cy="305" rx="52" ry="12" fill="url(#spineBaseGlowLight)" />
            {/* Pedestal Top Surface */}
            <ellipse cx="140" cy="305" rx="64" ry="16" fill="url(#pedestalGradLight)" stroke="#0284c7" strokeWidth="1.5" />
            {/* Pedestal Front Lip Depth */}
            <path d="M 76 305 Q 140 324 204 305 L 204 316 Q 140 334 76 316 Z" fill="#0369a1" stroke="#0284c7" strokeWidth="1" />
          </g>

          {/* 2. CONTINUOUS INTERVERTEBRAL SPINAL CANAL / CENTRAL LIGHT CORE */}
          {projectedModel.map((v, i) => {
            if (i === 0) return null;
            const prev = projectedModel[i - 1];
            return (
              <g key={`core-segment-${v.id}`}>
                {/* Central Luminous Spinal Cord Line */}
                <line
                  x1={prev.projX}
                  y1={prev.projY}
                  x2={v.projX}
                  y2={v.projY}
                  stroke={v.primaryColor}
                  strokeWidth={4.2 * v.scale}
                  strokeOpacity={0.8}
                  strokeLinecap="round"
                  filter="url(#luminousDiscGlowLight)"
                />
                <line
                  x1={prev.projX}
                  y1={prev.projY}
                  x2={v.projX}
                  y2={v.projY}
                  stroke="#ffffff"
                  strokeWidth={1.8 * v.scale}
                  strokeOpacity={0.95}
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* 3. VERTEBRAE & TRANSLUCENT ANATOMICAL FACETS (Rendered back-to-front by Z-depth) */}
          {projectedModel.map((v) => {
            if (activeFilter !== 'all' && v.region !== activeFilter && v.region !== 'sacrum') {
              return null;
            }

            const isSelected = selectedVertebraId === v.id;
            const isHovered = hoveredVertebraId === v.id;
            const size = (v.width / 2) * v.scale;
            const height = v.height * v.scale;

            // Choose gradient based on health severity
            let gradFill = 'url(#crystalVertebraGrad)';
            if (v.healthSeverity === 'critical') gradFill = 'url(#roseVertebraGrad)';
            else if (v.healthSeverity === 'warning') gradFill = 'url(#amberVertebraGrad)';

            return (
              <g
                key={v.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedVertebraId(isSelected ? null : v.id);
                }}
                onPointerEnter={() => setHoveredVertebraId(v.id)}
                onPointerLeave={() => setHoveredVertebraId(null)}
                className="cursor-pointer transition-transform duration-150"
              >
                {/* A. POSTERIOR SPINOUS PROCESS (Bony tail projecting backward) */}
                <g className="spinous-process">
                  <path
                    d={`M ${v.projX - size * 0.25} ${v.projY} 
                        Q ${v.spProjX} ${v.spProjY} ${v.spProjX} ${v.spProjY + height * 0.4} 
                        L ${v.projX + size * 0.25} ${v.projY + height * 0.3} Z`}
                    fill={v.primaryColor}
                    fillOpacity={0.7}
                    stroke={v.primaryColor}
                    strokeWidth={1.2}
                  />
                  {/* Spinous highlight tip */}
                  <circle cx={v.spProjX} cy={v.spProjY} r={2.2 * v.scale} fill="#ffffff" fillOpacity={0.9} stroke={v.primaryColor} strokeWidth={0.6} />
                </g>

                {/* B. TRANSVERSE PROCESSES (Lateral horizontal wings) */}
                <g className="transverse-wings" opacity={0.75}>
                  <line
                    x1={v.lWingProjX}
                    y1={v.lWingProjY}
                    x2={v.projX}
                    y2={v.projY}
                    stroke={v.primaryColor}
                    strokeWidth={2.4 * v.scale}
                    strokeLinecap="round"
                  />
                  <line
                    x1={v.projX}
                    y1={v.projY}
                    x2={v.rWingProjX}
                    y2={v.rWingProjY}
                    stroke={v.primaryColor}
                    strokeWidth={2.4 * v.scale}
                    strokeLinecap="round"
                  />
                  <circle cx={v.lWingProjX} cy={v.lWingProjY} r={2.0 * v.scale} fill={v.primaryColor} />
                  <circle cx={v.rWingProjX} cy={v.rWingProjY} r={2.0 * v.scale} fill={v.primaryColor} />
                </g>

                {/* C. INTERVERTEBRAL DISC (Glowing luminous cushion between vertebrae) */}
                <ellipse
                  cx={v.projX}
                  cy={v.projY - height * 0.55}
                  rx={size * 1.08}
                  ry={size * 0.42}
                  fill={v.discColor}
                  fillOpacity={0.95}
                  filter="url(#luminousDiscGlowLight)"
                  stroke="#ffffff"
                  strokeWidth={0.8}
                />

                {/* D. MAIN VERTEBRA BODY (Translucent cylinder / oval block) */}
                <path
                  d={`M ${v.projX - size} ${v.projY - height * 0.4}
                      Q ${v.projX} ${v.projY - height * 0.15} ${v.projX + size} ${v.projY - height * 0.4}
                      L ${v.projX + size} ${v.projY + height * 0.4}
                      Q ${v.projX} ${v.projY + height * 0.65} ${v.projX - size} ${v.projY + height * 0.4} Z`}
                  fill={gradFill}
                  fillOpacity={isSelected ? 1.0 : 0.9}
                  stroke={isSelected ? '#0284c7' : v.primaryColor}
                  strokeWidth={isSelected ? 2.2 : 1.2}
                />

                {/* Top Vertebra Facet Surface */}
                <ellipse
                  cx={v.projX}
                  cy={v.projY - height * 0.4}
                  rx={size}
                  ry={size * 0.38}
                  fill={isSelected ? '#ffffff' : v.primaryColor}
                  fillOpacity={0.65}
                  stroke="#ffffff"
                  strokeWidth={1.2}
                />

                {/* Specular Highlight Streak (Glass crystalline shine) */}
                <path
                  d={`M ${v.projX - size * 0.5} ${v.projY - height * 0.3} Q ${v.projX} ${v.projY - height * 0.1} ${v.projX + size * 0.3} ${v.projY - height * 0.3}`}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  strokeOpacity={0.9}
                  strokeLinecap="round"
                />

                {/* E. SELECTION / HOVER PULSE HALO */}
                {(isSelected || isHovered) && (
                  <ellipse
                    cx={v.projX}
                    cy={v.projY}
                    rx={size * 1.5}
                    ry={size * 0.8}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    className="animate-spin"
                    style={{ transformOrigin: `${v.projX}px ${v.projY}px`, animationDuration: '4s' }}
                  />
                )}

                {/* F. ANATOMICAL IDENTIFIER LABEL */}
                {(['C1', 'C7', 'T1', 'T4', 'T8', 'T12', 'L1', 'L5', 'Sacrum'].includes(v.id) || isSelected || isHovered) && (
                  <g className="vertebra-tag">
                    <rect
                      x={v.projX + size + 8}
                      y={v.projY - 7}
                      width={v.id.length > 2 ? 38 : 24}
                      height={14}
                      rx={4}
                      fill="#ffffff"
                      fillOpacity={0.95}
                      stroke={v.primaryColor}
                      strokeWidth={1}
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))"
                    />
                    <text
                      x={v.projX + size + (v.id.length > 2 ? 27 : 20)}
                      y={v.projY + 3}
                      fill="#0f172a"
                      fontSize="9"
                      fontWeight="900"
                      textAnchor="middle"
                      className="select-none pointer-events-none"
                    >
                      {v.id}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Vertebra Clinical Detail Drawer */}
      <AnimatePresence>
        {selectedVertebra ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-md shrink-0 border border-white/40"
                style={{ backgroundColor: selectedVertebra.primaryColor }}
              >
                {selectedVertebra.id}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="font-black text-slate-900 text-sm">{selectedVertebra.name}</h5>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
                    {selectedVertebra.region} region
                  </span>
                  {selectedVertebra.isUpperBack && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                      PosturePal Tracked Zone
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  {selectedVertebra.description}
                </p>
                <div className="text-[11px] text-slate-700 mt-1 font-semibold">
                  <span className="text-slate-500 font-normal">Nerve Pathway: </span>
                  {selectedVertebra.innervations}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:border-l sm:border-slate-200 sm:pl-4 shrink-0">
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Compressive Stress
                </span>
                <div 
                  className="text-xl font-black"
                  style={{ color: selectedVertebra.primaryColor }}
                >
                  {selectedVertebra.stressPsi} PSI
                </div>
                <span className="text-[10px] font-bold text-slate-500">
                  {selectedVertebra.healthSeverity === 'critical' ? 'High Shear Strain' : selectedVertebra.healthSeverity === 'warning' ? 'Compensatory Tension' : 'Normal Hydrostatic Load'}
                </span>
              </div>

              <button
                onClick={() => setSelectedVertebraId(null)}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-2xs"
              >
                Close
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs text-slate-500 font-medium">
            💡 Click on any vertebra (C1–C7 neck, T1–T12 upper back, L1–L5 lumbar) to inspect real-time PSI disk pressure and neurological pathways.
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
