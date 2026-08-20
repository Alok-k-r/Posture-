import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { RotateCw, Eye, AlertTriangle, ShieldCheck, Activity, Layers, Info } from 'lucide-react';

interface Spine3DModelProps {
  avgAngle?: number; // e.g. 75 degrees (normal 88-90)
  slouchIncidents?: number;
  stabilityScore?: number;
  className?: string;
  showControls?: boolean;
}

interface Vertebra {
  id: string;
  label: string;
  region: 'cervical' | 'thoracic' | 'lumbar' | 'sacrum';
  baseY: number;
  baseX: number;
  baseZ: number;
  radius: number;
  height: number;
}

export const Spine3DModel: React.FC<Spine3DModelProps> = ({
  avgAngle = 78,
  slouchIncidents = 4,
  stabilityScore = 82,
  className = '',
  showControls = true,
}) => {
  // 3D rotation angles in degrees
  const [rotX, setRotX] = useState<number>(12);
  const [rotY, setRotY] = useState<number>(35);
  const [selectedVertebra, setSelectedVertebra] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<'all' | 'cervical' | 'thoracic' | 'lumbar'>('all');

  // Slouch deformation factor (0 = straight, 1 = heavy slouch)
  const slouchSeverity = Math.max(0, Math.min(1, (90 - avgAngle) / 35));

  // Build Vertebrae data (C1-C7, T1-T12, L1-L5, Sacrum)
  const vertebrae: Vertebra[] = useMemo(() => {
    const list: Vertebra[] = [];
    let yPos = 30;

    // Cervical C1-C7
    for (let i = 1; i <= 7; i++) {
      list.push({
        id: `C${i}`,
        label: `Cervical C${i}`,
        region: 'cervical',
        baseY: yPos,
        baseX: 0,
        baseZ: 0,
        radius: 8,
        height: 6,
      });
      yPos += 8;
    }

    // Thoracic T1-T12
    for (let i = 1; i <= 12; i++) {
      list.push({
        id: `T${i}`,
        label: `Thoracic T${i}`,
        region: 'thoracic',
        baseY: yPos,
        baseX: 0,
        baseZ: 0,
        radius: 11,
        height: 7,
      });
      yPos += 9.5;
    }

    // Lumbar L1-L5
    for (let i = 1; i <= 5; i++) {
      list.push({
        id: `L${i}`,
        label: `Lumbar L${i}`,
        region: 'lumbar',
        baseY: yPos,
        baseX: 0,
        baseZ: 0,
        radius: 14,
        height: 9,
      });
      yPos += 12;
    }

    // Sacrum
    list.push({
      id: 'Sacrum',
      label: 'Sacrum & Pelvic Base',
      region: 'sacrum',
      baseY: yPos + 4,
      baseX: 0,
      baseZ: 0,
      radius: 18,
      height: 16,
    });

    return list;
  }, []);

  // Compute 3D projected coordinates based on rotX, rotY, and slouch deformation
  const projectedVertebrae = useMemo(() => {
    const radX = (rotX * Math.PI) / 180;
    const radY = (rotY * Math.PI) / 180;

    return vertebrae.map((v, index) => {
      // Calculate Spine Anatomical Curvature (S-curve) + Slouch Distortion
      const normProgress = index / (vertebrae.length - 1); // 0 (top) to 1 (bottom)

      // Natural Cervical Lordosis, Thoracic Kyphosis, Lumbar Lordosis offsets
      let naturalZOffset = 0;
      let naturalXOffset = 0;

      if (v.region === 'cervical') {
        naturalZOffset = Math.sin(normProgress * Math.PI * 2) * 6;
        naturalXOffset = -slouchSeverity * (7 - parseInt(v.id.replace('C', '') || '0')) * 2.8; // Forward head protraction
      } else if (v.region === 'thoracic') {
        naturalZOffset = -Math.sin(normProgress * Math.PI * 1.5) * 12;
        naturalXOffset = -slouchSeverity * Math.sin((normProgress - 0.2) * Math.PI) * 22; // Kyphotic thoracic slouch bend
      } else if (v.region === 'lumbar') {
        naturalZOffset = Math.sin(normProgress * Math.PI * 2) * 10;
        naturalXOffset = -slouchSeverity * (1 - normProgress) * 8;
      }

      const worldX = v.baseX + naturalXOffset;
      const worldY = v.baseY;
      const worldZ = v.baseZ + naturalZOffset;

      // 3D Matrix Rotation around Y then X
      // Rotate around Y
      const xRotY = worldX * Math.cos(radY) + worldZ * Math.sin(radY);
      const zRotY = -worldX * Math.sin(radY) + worldZ * Math.cos(radY);

      // Rotate around X
      const yRotX = worldY * Math.cos(radX) - zRotY * Math.sin(radX);
      const zRotX = worldY * Math.sin(radX) + zRotY * Math.cos(radX);

      // Perspective projection
      const scale = 300 / (300 + zRotX);
      const projX = 130 + xRotY * scale;
      const projY = 20 + yRotX * scale * 0.9;

      // Stress Color Calculation
      let stressColor = '#22c55e'; // Normal (Green)
      let stressSeverityLabel = 'Healthy Curvature';

      if (v.region === 'cervical' && slouchSeverity > 0.25) {
        stressColor = slouchSeverity > 0.55 ? '#ef4444' : '#f59e0b'; // Red / Orange for Forward Neck
        stressSeverityLabel = slouchSeverity > 0.55 ? 'High Cervical Torque' : 'Moderate Cervical Strain';
      } else if (v.region === 'thoracic' && slouchSeverity > 0.35) {
        stressColor = slouchSeverity > 0.6 ? '#ef4444' : '#f59e0b';
        stressSeverityLabel = slouchSeverity > 0.6 ? 'Thoracic Flexion Compression' : 'Mild Thoracic Kyphosis';
      } else if (v.region === 'lumbar' && slouchSeverity > 0.5) {
        stressColor = '#f59e0b';
        stressSeverityLabel = 'Lumbar Disc Pressure';
      }

      return {
        ...v,
        projX,
        projY,
        scale,
        zDepth: zRotX,
        stressColor,
        stressSeverityLabel,
      };
    }).sort((a, b) => b.zDepth - a.zDepth); // Sort by Z-depth for proper back-to-front render
  }, [vertebrae, rotX, rotY, slouchSeverity]);

  const selectedInfo = useMemo(() => {
    return projectedVertebrae.find(v => v.id === selectedVertebra);
  }, [projectedVertebrae, selectedVertebra]);

  return (
    <div className={`relative bg-slate-900 rounded-[32px] p-5 text-white overflow-hidden shadow-2xl border border-slate-800 ${className}`}>
      {/* Background Tech Grid Lines */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      {/* Header & Status Bar */}
      <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center font-black">
            <Activity size={16} />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-200">Biomechanical 3D Spine Model</h4>
            <p className="text-[10px] text-slate-400 font-medium">Real-time Anatomic Flexion & Load Projection</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border flex items-center gap-1 ${
            slouchSeverity > 0.5 ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            {slouchSeverity > 0.5 ? <AlertTriangle size={10} /> : <ShieldCheck size={10} />}
            {slouchSeverity > 0.5 ? 'Postural Deviation' : 'Normal Alignment'}
          </div>
        </div>
      </div>

      {/* Main 3D Canvas Area */}
      <div className="relative w-full h-[320px] bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden">
        {/* Interactive Controls Overlay */}
        {showControls && (
          <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
            <button
              onClick={() => { setRotY(prev => (prev + 45) % 360); }}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl backdrop-blur-md border border-slate-700 text-xs font-bold flex items-center gap-1 transition-all"
              title="Rotate 3D Spine"
            >
              <RotateCw size={13} />
              <span className="text-[9px] uppercase tracking-wider font-black">Rotate</span>
            </button>
            <button
              onClick={() => { setRotX(0); setRotY(35); }}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl backdrop-blur-md border border-slate-700 text-xs font-bold flex items-center gap-1 transition-all"
              title="Reset View"
            >
              <Eye size={13} />
              <span className="text-[9px] uppercase tracking-wider font-black">Reset</span>
            </button>
          </div>
        )}

        {/* Region Filter Buttons */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 backdrop-blur-md">
          {(['all', 'cervical', 'thoracic', 'lumbar'] as const).map(layer => (
            <button
              key={layer}
              onClick={() => setActiveLayer(layer)}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                activeLayer === layer 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {layer}
            </button>
          ))}
        </div>

        {/* SVG 3D Spine Canvas */}
        <svg viewBox="0 0 260 300" className="w-full h-full cursor-grab active:cursor-grabbing">
          <defs>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Connective Intervertebral Spinal Cord / Line */}
          {projectedVertebrae.map((v, i) => {
            if (i === 0) return null;
            const prev = projectedVertebrae[i - 1];
            return (
              <line
                key={`disc-${v.id}`}
                x1={prev.projX}
                y1={prev.projY}
                x2={v.projX}
                y2={v.projY}
                stroke={v.stressColor}
                strokeWidth={3 * v.scale}
                strokeOpacity={0.6}
              />
            );
          })}

          {/* Render Vertebrae Nodes */}
          {projectedVertebrae.map((v) => {
            if (activeLayer !== 'all' && v.region !== activeLayer && v.region !== 'sacrum') {
              return null;
            }

            const isSelected = selectedVertebra === v.id;
            const size = v.radius * v.scale;

            return (
              <g
                key={v.id}
                onClick={() => setSelectedVertebra(isSelected ? null : v.id)}
                className="cursor-pointer transition-transform hover:scale-110"
              >
                {/* Outer Stress Aura Ring */}
                <ellipse
                  cx={v.projX}
                  cy={v.projY}
                  rx={size * 1.3}
                  ry={size * 0.7}
                  fill={v.stressColor}
                  fillOpacity={isSelected ? 0.35 : 0.15}
                  stroke={v.stressColor}
                  strokeWidth={isSelected ? 2 : 1}
                />

                {/* Main Vertebra Body Cylinder projection */}
                <ellipse
                  cx={v.projX}
                  cy={v.projY}
                  rx={size}
                  ry={size * 0.5}
                  fill={isSelected ? '#ffffff' : v.stressColor}
                  stroke="#1e293b"
                  strokeWidth="1.5"
                />

                {/* ID Label for Key Vertebrae */}
                {(['C1', 'C7', 'T1', 'T6', 'T12', 'L1', 'L5', 'Sacrum'].includes(v.id) || isSelected) && (
                  <text
                    x={v.projX + size + 6}
                    y={v.projY + 3}
                    fill={isSelected ? '#38bdf8' : '#94a3b8'}
                    fontSize={isSelected ? "10" : "8"}
                    fontWeight="bold"
                    className="select-none pointer-events-none"
                  >
                    {v.id}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Metrics Overlay */}
        <div className="absolute bottom-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 text-[10px] space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Cervico-Thoracic Angle:</span>
            <span className="font-extrabold text-indigo-400">{avgAngle}°</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">C7 Vertebra Load:</span>
            <span className="font-extrabold text-amber-400">{Math.round((90 - avgAngle) * 0.6 + 10)} lbs torque</span>
          </div>
        </div>
      </div>

      {/* Selected Vertebra Details Banner */}
      {selectedInfo ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 p-3 bg-slate-800/90 rounded-2xl border border-slate-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black">
              {selectedInfo.id}
            </div>
            <div>
              <h5 className="font-extrabold text-slate-100">{selectedInfo.label}</h5>
              <p className="text-[10px] text-slate-400 font-medium">{selectedInfo.stressSeverityLabel}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black uppercase text-indigo-400 block">Region: {selectedInfo.region}</span>
            <button onClick={() => setSelectedVertebra(null)} className="text-[9px] text-slate-400 underline hover:text-white">Deselect</button>
          </div>
        </motion.div>
      ) : (
        <div className="mt-3 text-[10px] text-slate-400 text-center font-medium">
          💡 Click on any vertebra node (C1-C7, T1-T12, L1-L5) to inspect localized biomechanical load.
        </div>
      )}
    </div>
  );
};
