'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Compass, Train, Clock, ArrowRight, ArrowRightLeft, Info, HelpCircle, Navigation } from 'lucide-react';
import { Route, RouteLeg } from '../../types';

interface VisualMapProps {
  route: Route;
}

// Helper to calculate layover time in minutes between two legs
function calculateLayoverMinutes(arrTime: string, depTime: string): number {
  if (!arrTime || !depTime || arrTime.includes('--') || depTime.includes('--')) return 0;
  
  const parseTime = (t: string) => {
    // Extract HH:MM, ignore seconds if present
    const parts = t.split(':').map(Number);
    return parts[0] * 60 + parts[1];
  };
  
  let diff = parseTime(depTime) - parseTime(arrTime);
  if (diff < 0) diff += 24 * 60; // Handle midnight wrap
  return diff;
}

export default function VisualMap({ route }: VisualMapProps) {
  const width = 600;
  const height = 110;
  const startX = 50;
  const endX = width - startX;
  const trackWidth = endX - startX;
  const trackY = 55;

  const legs = route.legs || [];
  const isConnecting = legs.length > 1;

  // Process nodes along the linear line
  // We want to map each critical point: Origin, Transfer Station(s), Destination
  interface VisualNode {
    name: string;
    code: string;
    x: number;
    time: string;
    type: 'origin' | 'transfer' | 'destination';
    layoverMins?: number;
    nextTrainNo?: string;
    nextTrainName?: string;
  }

  const nodes: VisualNode[] = [];

  // 1. Origin Node
  nodes.push({
    name: route.source.name,
    code: route.source.code,
    x: startX,
    time: route.departureTime,
    type: 'origin',
  });

  // 2. Transfer Nodes
  let currentDist = 0;
  for (let i = 0; i < legs.length - 1; i++) {
    const leg = legs[i];
    const nextLeg = legs[i + 1];
    currentDist += leg.distanceKm;
    
    // Proportional positioning on the line
    const ratio = route.totalDistanceKm > 0 ? currentDist / route.totalDistanceKm : 0.5;
    const x = startX + ratio * trackWidth;

    const layover = calculateLayoverMinutes(leg.arrivalTime, nextLeg.departureTime);

    nodes.push({
      name: leg.toStation.name,
      code: leg.toStation.code,
      x,
      time: `${leg.arrivalTime} → ${nextLeg.departureTime}`,
      type: 'transfer',
      layoverMins: layover,
      nextTrainNo: nextLeg.train.number,
      nextTrainName: nextLeg.train.name,
    });
  }

  // 3. Destination Node
  nodes.push({
    name: route.destination.name,
    code: route.destination.code,
    x: endX,
    time: route.arrivalTime,
    type: 'destination',
  });

  const getTrackColor = (type: string) => {
    return type === 'Bullet' ? 'from-cyan-500 to-blue-500' : 'from-orange-500 to-red-500';
  };

  const getTrackBorderColor = (type: string) => {
    return type === 'Bullet' ? '#06b6d4' : '#f97316';
  };

  const trackBorderColor = getTrackBorderColor(route.train.type);

  return (
    <div className="bg-rail-900/40 border border-rail-800 p-6 rounded-2xl backdrop-blur-md shadow-xl flex flex-col h-full min-h-[460px] relative overflow-hidden">
      {/* HUD grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b10_1px,transparent_1px),linear-gradient(to_bottom,#1e293b10_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-rail-800 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-rail-800/80 pb-4 mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="bg-transit-cyan/15 p-2 rounded-xl text-transit-cyan border border-transit-cyan/20">
            <Compass className="h-4 w-4 animate-spin-slow" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Journey Track Vector</h3>
            <p className="text-[10px] text-rail-400 font-bold uppercase tracking-widest font-mono">
              Status: {isConnecting ? 'Transfer Required' : 'Direct Service'}
            </p>
          </div>
        </div>
        <div className="text-right font-mono text-[9px] text-rail-500 font-bold">
          <div>TOTAL DIST: {route.totalDistanceKm} KM</div>
          <div>TYPE: {isConnecting ? 'CONNECTING' : 'DIRECT'}</div>
        </div>
      </div>

      {/* SVG Linear Track Visualization */}
      <div className="flex-1 flex items-center justify-center relative z-10 w-full min-h-[140px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full max-h-[120px]">
          {/* Base inactive track line */}
          <line x1={startX} y1={trackY} x2={endX} y2={trackY} stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
          <line x1={startX} y1={trackY} x2={endX} y2={trackY} stroke="#334155" strokeWidth="2" strokeLinecap="round" />

          {/* Active track flow */}
          <line
            x1={startX}
            y1={trackY}
            x2={endX}
            y2={trackY}
            stroke={trackBorderColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            className="animate-rail-flow opacity-60"
            strokeDasharray="10 15"
          />

          {/* Render Nodes along track */}
          {nodes.map((node, idx) => {
            const isOrigin = node.type === 'origin';
            const isDest = node.type === 'destination';
            const isTransfer = node.type === 'transfer';

            // Define node colors
            let nodeColor = '#14b8a6'; // Cyan/Teal
            if (isOrigin) nodeColor = '#ff6b00'; // Orange
            if (isDest) nodeColor = '#06b6d4'; // Cyan
            if (isTransfer) nodeColor = '#eab308'; // Yellow/Warning

            return (
              <g key={`${node.code}-${idx}`}>
                {/* Outer animated halo for origin/destination/transfer */}
                {(isOrigin || isDest || isTransfer) && (
                  <circle
                    cx={node.x}
                    cy={trackY}
                    r={isTransfer ? 10 : 8}
                    fill="none"
                    stroke={nodeColor}
                    strokeWidth="1.5"
                    className="opacity-30 animate-pulse-slow"
                  />
                )}

                {/* Outer ring */}
                <circle
                  cx={node.x}
                  cy={trackY}
                  r={isTransfer ? 7 : 5}
                  fill="#0f172a"
                  stroke={nodeColor}
                  strokeWidth="2"
                />

                {/* Inner core dot */}
                {isTransfer ? (
                  <circle cx={node.x} cy={trackY} r="2.5" fill={nodeColor} />
                ) : (
                  <circle cx={node.x} cy={trackY} r="1.5" fill="#ffffff" />
                )}

                {/* Code Label */}
                <text
                  x={node.x}
                  y={trackY - 14}
                  textAnchor="middle"
                  fill="#ffffff"
                  className="text-[10px] font-black tracking-wide filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                >
                  {node.code}
                </text>

                {/* Station Name Hint */}
                <text
                  x={node.x}
                  y={trackY + 18}
                  textAnchor="middle"
                  fill="#94a3b8"
                  className={`text-[8px] font-bold uppercase tracking-wider font-mono opacity-80`}
                >
                  {node.name.split(' ')[0]}
                </text>

                {/* Time Display */}
                <text
                  x={node.x}
                  y={trackY + 28}
                  textAnchor="middle"
                  fill={isTransfer ? '#eab308' : '#cbd5e1'}
                  className="text-[7.5px] font-extrabold font-mono"
                >
                  {node.time}
                </text>
              </g>
            );
          })}

          {/* Animated Train Dot */}
          <g>
            <circle cx={startX} cy={trackY} r="4" fill={trackBorderColor}>
              <animate
                attributeName="cx"
                from={startX}
                to={endX}
                dur="7s"
                repeatCount="indefinite"
              />
            </circle>
            <circle cx={startX} cy={trackY} r="7" fill="none" stroke={trackBorderColor} strokeWidth="1" className="opacity-60">
              <animate
                attributeName="cx"
                from={startX}
                to={endX}
                dur="7s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="r"
                values="4;8;4"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        </svg>
      </div>

      {/* Connection & Leg Details below line */}
      <div className="mt-4 flex flex-col gap-3">
        {legs.map((leg, idx) => {
          const isLast = idx === legs.length - 1;
          const legTrainColor = leg.train.type === 'Bullet' ? 'text-transit-cyan' : 'text-transit-orange';
          const legTrainBg = leg.train.type === 'Bullet' ? 'bg-transit-cyan/10 border-transit-cyan/20' : 'bg-transit-orange/10 border-transit-orange/20';

          return (
            <React.Fragment key={`${leg.train.number}-${idx}`}>
              {/* Train Segment card */}
              <div className="bg-rail-950/50 border border-rail-850 p-3.5 rounded-xl flex flex-col gap-2.5 relative">
                {/* Header detail */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg border ${legTrainBg} ${legTrainColor}`}>
                      <Train className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-rail-400 font-extrabold uppercase tracking-widest font-mono">
                        Segment {idx + 1}
                      </div>
                      <div className="text-xs font-black text-white mt-0.5">
                        {leg.train.name} <span className="font-mono text-rail-400 text-[10px]">({leg.train.number})</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-extrabold uppercase bg-rail-800 text-rail-300 px-2 py-0.5 rounded border border-rail-750 font-mono">
                      {leg.distanceKm} KM
                    </span>
                  </div>
                </div>

                {/* Segment track info */}
                <div className="flex items-center justify-between text-xs border-t border-rail-850/40 pt-2 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-extrabold">{leg.fromStation.code}</span>
                    <span className="text-[10px] text-rail-400">({leg.departureTime})</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-rail-500" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-extrabold">{leg.toStation.code}</span>
                    <span className="text-[10px] text-rail-400">({leg.arrivalTime})</span>
                  </div>
                </div>
              </div>

              {/* Transfer Alert banner (if this is not the last leg) */}
              {!isLast && (
                <div className="bg-amber-950/40 border border-amber-900/50 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-300">
                  <div className="p-1 rounded-lg bg-amber-950 text-amber-400 border border-amber-900/40 shrink-0 mt-0.5">
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold uppercase tracking-wider text-[9px] text-amber-400 font-mono">
                      Change Train Connection
                    </div>
                    <div className="font-bold text-white mt-1">
                      Change trains at <span className="text-amber-300">{leg.toStation.name} ({leg.toStation.code})</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-rail-300 font-medium">
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                      Layover: <span className="font-black text-white font-mono">{calculateLayoverMinutes(leg.arrivalTime, legs[idx + 1].departureTime)} min</span>
                    </div>
                    <div className="mt-1 text-[10px] text-rail-400 font-semibold">
                      Board next train: <span className="text-amber-400 font-extrabold">{legs[idx + 1].train.name} ({legs[idx + 1].train.number})</span>
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
