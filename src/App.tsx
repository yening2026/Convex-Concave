/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings2, 
  Eye, 
  MoveHorizontal, 
  Maximize2, 
  Minimize2,
  Info,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

// Types
type LensType = 'convex' | 'concave';

interface Point {
  x: number;
  y: number;
}

export default function App() {
  // State
  const [lensType, setLensType] = useState<LensType>('convex');
  const [objectDistance, setObjectDistance] = useState(250); // u (positive distance from lens)
  const [screenDistance, setScreenDistance] = useState(150); // Observed screen position
  const [showRays, setShowRays] = useState(true);
  const [showInfo, setShowInfo] = useState(true);

  // Constants
  const FOCAL_LENGTH = 100;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 400;
  const CENTER_X = CANVAS_WIDTH / 2;
  const CENTER_Y = CANVAS_HEIGHT / 2;
  const OBJECT_HEIGHT = 60;

  // Derived Physics
  const f = lensType === 'convex' ? FOCAL_LENGTH : -FOCAL_LENGTH;
  
  // Lens Formula: 1/v - 1/u = 1/f
  // Here u is negative (object on left), so u = -objectDistance
  // 1/v + 1/objectDistance = 1/f => 1/v = 1/f - 1/objectDistance
  const v = useMemo(() => {
    if (objectDistance === FOCAL_LENGTH && lensType === 'convex') return Infinity;
    return (f * objectDistance) / (objectDistance - f);
  }, [f, objectDistance, lensType]);

  const magnification = useMemo(() => {
    if (v === Infinity) return 0;
    return v / (-objectDistance);
  }, [v, objectDistance]);

  const imageHeight = OBJECT_HEIGHT * magnification;

  // Ray calculations
  const rays = useMemo(() => {
    const objX = CENTER_X - objectDistance;
    const objY = CENTER_Y - OBJECT_HEIGHT;

    // Ray 1: Parallel to axis
    const r1_start = { x: objX, y: objY };
    const r1_lens = { x: CENTER_X, y: objY };
    let r1_end: Point;
    let r1_virtual: Point | null = null;

    if (lensType === 'convex') {
      // Passes through focal point on the right (CENTER_X + FOCAL_LENGTH, CENTER_Y)
      const slope = (CENTER_Y - objY) / (FOCAL_LENGTH);
      r1_end = { x: CANVAS_WIDTH, y: objY + slope * (CANVAS_WIDTH - CENTER_X) };
    } else {
      // Appears to come from focal point on the left (CENTER_X - FOCAL_LENGTH, CENTER_Y)
      const slope = (objY - CENTER_Y) / (FOCAL_LENGTH);
      r1_end = { x: CANVAS_WIDTH, y: objY + slope * (CANVAS_WIDTH - CENTER_X) };
      r1_virtual = { x: CENTER_X - FOCAL_LENGTH, y: CENTER_Y };
    }

    // Ray 2: Through optical center
    const r2_start = { x: objX, y: objY };
    const r2_lens = { x: CENTER_X, y: CENTER_Y };
    const slope2 = (CENTER_Y - objY) / (CENTER_X - objX);
    const r2_end = { x: CANVAS_WIDTH, y: CENTER_Y + slope2 * (CANVAS_WIDTH - CENTER_X) };

    return {
      r1: { start: r1_start, lens: r1_lens, end: r1_end, virtual: r1_virtual },
      r2: { start: r2_start, lens: r2_lens, end: r2_end }
    };
  }, [objectDistance, lensType, CENTER_X, CENTER_Y]);

  // Helper to determine image type
  const isReal = v > 0;
  const isUpright = magnification > 0;
  const isMagnified = Math.abs(magnification) > 1;

  // Preset distances
  const setPreset = (type: '>2f' | 'f-2f' | '<f') => {
    if (type === '>2f') setObjectDistance(250);
    else if (type === 'f-2f') setObjectDistance(150);
    else setObjectDistance(60);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="h-[72px] md:h-20 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 flex justify-between items-center px-4 md:px-6">
        <div>
          <h1 className="text-lg md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span className="bg-indigo-600 text-white p-1.5 rounded-lg">
              <Maximize2 size={18} className="md:w-5 md:h-5" />
            </span>
            光学实验室
          </h1>
          <p className="text-slate-500 text-[10px] md:text-sm mt-0.5">透镜成像交互实验</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-full transition-colors ${showInfo ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-100 text-slate-400'}`}
          >
            <Info size={18} className="md:w-5 md:h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 1. Simulation Canvas - Persistent Sticky on mobile */}
        <div className="lg:col-span-3 order-1 lg:order-2 sticky top-[88px] lg:static z-20 self-start">
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl border border-slate-200 overflow-hidden relative group">
            <div className="absolute top-3 left-3 z-10 flex gap-2">
              <span className="px-2 py-0.5 bg-slate-900/80 text-white text-[8px] md:text-[10px] font-bold rounded-full backdrop-blur-sm uppercase tracking-widest">
                Simulation
              </span>
              {Math.abs(screenDistance - v) < 5 && isReal && (
                <motion.span 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-2 py-0.5 bg-emerald-500 text-white text-[8px] md:text-[10px] font-bold rounded-full shadow-lg shadow-emerald-200"
                >
                  成像清晰
                </motion.span>
              )}
            </div>

            <svg 
              viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} 
              className="w-full h-auto bg-[#fafafa]"
              style={{ cursor: 'crosshair' }}
            >
              {/* Grid Lines */}
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Principal Axis */}
              <line 
                x1="0" y1={CENTER_Y} x2={CANVAS_WIDTH} y2={CENTER_Y} 
                stroke="#94a3b8" strokeWidth="1" strokeDasharray="5,5" 
              />

              {/* Focal Points */}
              <circle cx={CENTER_X - FOCAL_LENGTH} cy={CENTER_Y} r="3" fill="#f43f5e" />
              <text x={CENTER_X - FOCAL_LENGTH} y={CENTER_Y + 20} textAnchor="middle" className="text-[10px] fill-slate-400 font-mono">F</text>
              <circle cx={CENTER_X - 2 * FOCAL_LENGTH} cy={CENTER_Y} r="3" fill="#f43f5e" />
              <text x={CENTER_X - 2 * FOCAL_LENGTH} y={CENTER_Y + 20} textAnchor="middle" className="text-[10px] fill-slate-400 font-mono">2F</text>
              
              <circle cx={CENTER_X + FOCAL_LENGTH} cy={CENTER_Y} r="3" fill="#f43f5e" />
              <text x={CENTER_X + FOCAL_LENGTH} y={CENTER_Y + 20} textAnchor="middle" className="text-[10px] fill-slate-400 font-mono">F'</text>
              <circle cx={CENTER_X + 2 * FOCAL_LENGTH} cy={CENTER_Y} r="3" fill="#f43f5e" />
              <text x={CENTER_X + 2 * FOCAL_LENGTH} y={CENTER_Y + 20} textAnchor="middle" className="text-[10px] fill-slate-400 font-mono">2F'</text>

              {/* Lens */}
              {lensType === 'convex' ? (
                <path 
                  d={`M ${CENTER_X} 50 Q ${CENTER_X + 30} ${CENTER_Y} ${CENTER_X} 350 Q ${CENTER_X - 30} ${CENTER_Y} ${CENTER_X} 50`} 
                  fill="rgba(99, 102, 241, 0.15)" 
                  stroke="#6366f1" 
                  strokeWidth="2"
                />
              ) : (
                <path 
                  d={`M ${CENTER_X - 20} 50 L ${CENTER_X + 20} 50 Q ${CENTER_X + 5} ${CENTER_Y} ${CENTER_X + 20} 350 L ${CENTER_X - 20} 350 Q ${CENTER_X - 5} ${CENTER_Y} ${CENTER_X - 20} 50`} 
                  fill="rgba(99, 102, 241, 0.15)" 
                  stroke="#6366f1" 
                  strokeWidth="2"
                />
              )}

              {/* Rays */}
              {showRays && (
                <g className="opacity-60">
                  {/* Ray 1 */}
                  <line x1={rays.r1.start.x} y1={rays.r1.start.y} x2={rays.r1.lens.x} y2={rays.r1.lens.y} stroke="#f59e0b" strokeWidth="1.5" />
                  <line x1={rays.r1.lens.x} y1={rays.r1.lens.y} x2={rays.r1.end.x} y2={rays.r1.end.y} stroke="#f59e0b" strokeWidth="1.5" />
                  {rays.r1.virtual && (
                    <line x1={rays.r1.lens.x} y1={rays.r1.lens.y} x2={rays.r1.virtual.x} y2={rays.r1.virtual.y} stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,3" />
                  )}
                  {/* Ray 2 */}
                  <line x1={rays.r2.start.x} y1={rays.r2.start.y} x2={rays.r2.end.x} y2={rays.r2.end.y} stroke="#3b82f6" strokeWidth="1.5" />
                  
                  {/* Virtual Extension for Ray 2 if needed */}
                  {!isReal && (
                    <line 
                      x1={rays.r2.lens.x} y1={rays.r2.lens.y} 
                      x2={CENTER_X + v} y2={CENTER_Y + imageHeight} 
                      stroke="#3b82f6" strokeWidth="1" strokeDasharray="3,3" 
                    />
                  )}
                  {!isReal && lensType === 'convex' && (
                    <line 
                      x1={rays.r1.lens.x} y1={rays.r1.lens.y} 
                      x2={CENTER_X + v} y2={CENTER_Y + imageHeight} 
                      stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,3" 
                    />
                  )}
                </g>
              )}

              {/* Object */}
              <g transform={`translate(${CENTER_X - objectDistance}, ${CENTER_Y})`}>
                <line x1="0" y1="0" x2="0" y2={-OBJECT_HEIGHT} stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
                <path d="M -5 -50 L 0 -60 L 5 -50" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinejoin="round" />
                <text x="0" y="20" textAnchor="middle" className="text-[10px] font-bold fill-slate-600">物体</text>
              </g>

              {/* Screen */}
              <g transform={`translate(${CENTER_X + screenDistance}, 0)`}>
                <rect x="-2" y="40" width="4" height="320" fill="#10b981" fillOpacity="0.3" />
                <line x1="0" y1="40" x2="0" y2="360" stroke="#10b981" strokeWidth="2" strokeDasharray="4,2" />
                <text x="0" y="380" textAnchor="middle" className="text-[10px] font-bold fill-emerald-600">观测屏</text>
                
                {/* Image on Screen (if clear) */}
                {Math.abs(screenDistance - v) < 10 && isReal && (
                  <g transform={`translate(0, ${CENTER_Y})`}>
                    <line x1="0" y1="0" x2="0" y2={imageHeight} stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
                    <path 
                      d={isUpright ? "M -5 -10 L 0 0 L 5 -10" : "M -5 10 L 0 0 L 5 10"} 
                      transform={`translate(0, ${imageHeight})`}
                      fill="none" stroke="#10b981" strokeWidth="3" strokeLinejoin="round" 
                    />
                  </g>
                )}
              </g>

              {/* Virtual Image (Always visible but faded) */}
              {!isReal && (
                <g transform={`translate(${CENTER_X + v}, ${CENTER_Y})`} className="opacity-30">
                  <line x1="0" y1="0" x2="0" y2={imageHeight} stroke="#6366f1" strokeWidth="2" strokeDasharray="4,4" />
                  <path 
                    d={isUpright ? "M -5 -10 L 0 0 L 5 -10" : "M -5 10 L 0 0 L 5 10"} 
                    transform={`translate(0, ${imageHeight})`}
                    fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="4,4" 
                  />
                  <text x="0" y={imageHeight > 0 ? imageHeight + 15 : imageHeight - 5} textAnchor="middle" className="text-[9px] fill-indigo-400 italic">虚像</text>
                </g>
              )}
            </svg>

            {/* Canvas Overlay Info - Moved to Top Right and Shrunk */}
            <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-white/80 backdrop-blur-md p-1.5 md:p-3 rounded-lg md:rounded-xl border border-white/50 shadow-lg text-[9px] md:text-xs space-y-1 min-w-[100px] md:min-w-[140px] pointer-events-none">
              <div className="flex justify-between border-b border-slate-100/50 pb-0.5">
                <span className="text-slate-500">物距 (u)</span>
                <span className="font-mono font-bold text-indigo-600">{objectDistance}px</span>
              </div>
              <div className="flex justify-between border-b border-slate-100/50 pb-0.5">
                <span className="text-slate-500">像距 (v)</span>
                <span className="font-mono font-bold text-indigo-600">
                  {v === Infinity ? '∞' : `${Math.abs(Math.round(v))}px`}
                  <span className="text-[7px] md:text-[9px] ml-0.5 font-normal">({isReal ? '实' : '虚'})</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">放大率 (M)</span>
                <span className="font-mono font-bold text-indigo-600">
                  {Math.abs(magnification).toFixed(2)}x
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Sidebar Controls - Scrollable below simulation on mobile */}
        <aside className="lg:col-span-1 space-y-4 md:space-y-6 order-2 lg:order-1">
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Settings2 size={16} /> 透镜设置
            </h2>
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setLensType('convex')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${lensType === 'convex' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                凸透镜
              </button>
              <button
                onClick={() => setLensType('concave')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${lensType === 'concave' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                凹透镜
              </button>
            </div>
          </section>

          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <MoveHorizontal size={16} /> 物距调节 (u)
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-mono text-slate-500">
                <span>远</span>
                <span>{objectDistance}px</span>
                <span>近</span>
              </div>
              <input
                type="range"
                min="20"
                max="380"
                value={400 - objectDistance}
                onChange={(e) => setObjectDistance(400 - Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setPreset('>2f')} className="text-[10px] py-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-md transition-colors">u &gt; 2f</button>
                <button onClick={() => setPreset('f-2f')} className="text-[10px] py-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-md transition-colors">f &lt; u &lt; 2f</button>
                <button onClick={() => setPreset('<f')} className="text-[10px] py-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-md transition-colors">u &lt; f</button>
              </div>
            </div>
          </section>

          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Eye size={16} /> 观测屏位置 (v)
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-mono text-slate-500">
                <span>透镜</span>
                <span>{screenDistance}px</span>
                <span>远</span>
              </div>
              <input
                type="range"
                min="0"
                max="380"
                value={screenDistance}
                onChange={(e) => setScreenDistance(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 leading-relaxed">
                  移动观测屏来寻找清晰的实像。虚像无法在屏上呈现，但可以通过眼睛观察。
                </p>
              </div>
            </div>
          </section>

          <div className="flex items-center gap-2 px-2">
            <input 
              type="checkbox" 
              id="rays" 
              checked={showRays} 
              onChange={() => setShowRays(!showRays)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="rays" className="text-sm text-slate-600 cursor-pointer">显示辅助光线</label>
          </div>
        </aside>

        {/* 3. Analysis Section - Below controls on mobile */}
        <div className="lg:col-span-3 space-y-4 md:space-y-6 order-3 lg:order-3">
          {/* Analysis Section */}
          <AnimatePresence>
            {showInfo && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-indigo-600 rounded-2xl md:rounded-3xl p-4 md:p-8 text-white shadow-xl shadow-indigo-200"
              >
                <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center">
                  <div className="flex-1 w-full space-y-4">
                    <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
                      成像规律分析
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                      <div className="bg-white/10 p-3 md:p-4 rounded-xl md:rounded-2xl backdrop-blur-sm">
                        <p className="text-indigo-100 text-[10px] md:text-xs uppercase tracking-wider font-bold mb-1">成像性质</p>
                        <p className="text-sm md:text-lg font-medium">
                          {v === Infinity ? '不成像 (平行光)' : (
                            `${isReal ? '实像' : '虚像'} · ${isUpright ? '正立' : '倒立'} · ${isMagnified ? '放大' : (Math.abs(magnification) === 1 ? '等大' : '缩小')}`
                          )}
                        </p>
                      </div>
                      <div className="bg-white/10 p-3 md:p-4 rounded-xl md:rounded-2xl backdrop-blur-sm">
                        <p className="text-indigo-100 text-[10px] md:text-xs uppercase tracking-wider font-bold mb-1">应用场景</p>
                        <p className="text-sm md:text-lg font-medium">
                          {lensType === 'convex' ? (
                            objectDistance > 2 * FOCAL_LENGTH ? '照相机' :
                            objectDistance === 2 * FOCAL_LENGTH ? '测焦距' :
                            objectDistance > FOCAL_LENGTH ? '投影仪/幻灯机' :
                            '放大镜'
                          ) : '近视眼镜'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full md:w-64 aspect-auto md:aspect-square bg-white/5 rounded-xl md:rounded-2xl flex flex-col items-center justify-center p-4 md:p-6 border border-white/10">
                    <div className="text-center">
                      <p className="text-indigo-200 text-[10px] md:text-xs mb-1 md:mb-2">透镜公式</p>
                      <p className="text-lg md:text-2xl font-serif italic">1/v - 1/u = 1/f</p>
                      <div className="mt-4 md:mt-6 flex md:block gap-4 md:space-y-2 text-[9px] md:text-[11px] text-indigo-100/80">
                        <p>• 凸透镜 f &gt; 0</p>
                        <p>• 凹透镜 f &lt; 0</p>
                        <p>• v &gt; 0 为实像</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 p-8 border-t border-slate-200 text-center text-slate-400 text-sm">
        <p>© 2026 物理光学实验室 · 交互式教学演示</p>
      </footer>
    </div>
  );
}
