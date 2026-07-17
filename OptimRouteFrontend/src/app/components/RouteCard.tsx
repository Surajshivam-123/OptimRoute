'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Navigation, CircleDollarSign, ChevronRight, Train, Info } from 'lucide-react';
import { Route } from '../../types';

interface RouteCardProps {
  route: Route;
  isSelected: boolean;
  onSelect: () => void;
  isFastest?: boolean;
  isShortest?: boolean;
  isCheapest?: boolean;
}

export default function RouteCard({
  route,
  isSelected,
  onSelect,
  isFastest = false,
  isShortest = false,
  isCheapest = false,
}: RouteCardProps) {
  const formatDuration = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const getTrainTypeBadge = (type: string) => {
    switch (type) {
      case 'Bullet':
        return (
          <span className="bg-cyan-950/60 text-cyan-400 border border-cyan-800/60 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            High-Speed Bullet
          </span>
        );
      case 'Express':
        return (
          <span className="bg-amber-950/60 text-amber-400 border border-amber-800/60 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Express Rail
          </span>
        );
      default:
        return (
          <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Passenger Link
          </span>
        );
    }
  };

  const stopsCount = route.stops.length - 2;
  const stopsText = stopsCount === 0 ? 'Non-stop' : `${stopsCount} stop${stopsCount > 1 ? 's' : ''}`;

  return (
    <motion.div
      onClick={onSelect}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`relative overflow-hidden rounded-2xl p-5 cursor-pointer transition-all duration-250 ${
        isSelected
          ? 'bg-rail-900 border-2 border-transit-orange shadow-lg shadow-transit-orange/10'
          : 'bg-rail-900/40 border border-rail-800/80 hover:bg-rail-900/60 hover:border-rail-700/80'
      }`}
    >
      {/* Smart sorting highlight badges */}
      <div className="absolute top-4 right-4 flex gap-1.5 z-10">
        {isFastest && (
          <span className="bg-cyan-500 text-rail-950 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider shadow-sm">
            ⚡ Fastest
          </span>
        )}
        {isShortest && (
          <span className="bg-emerald-500 text-rail-950 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider shadow-sm">
            🛤️ Shortest
          </span>
        )}
        {isCheapest && (
          <span className="bg-amber-500 text-rail-950 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider shadow-sm">
            💵 Best Value
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {/* Train Details */}
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-rail-800/80 text-rail-300">
            <Train className="h-4 w-4 text-transit-orange" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-white">{route.train.name}</h4>
              <span className="text-xs text-rail-400 font-mono">({route.train.number})</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {getTrainTypeBadge(route.train.type)}
            </div>
          </div>
        </div>

        {/* Time and Journey Path */}
        <div className="flex items-center justify-between py-1 bg-rail-950/20 rounded-xl px-2">
          {/* Source Time */}
          <div className="text-left">
            <div className="text-xl font-extrabold text-white tracking-tight">{route.departureTime}</div>
            <div className="text-xs text-rail-400 font-semibold mt-0.5">{route.source.code}</div>
            <div className="text-[10px] text-rail-500 font-medium truncate max-w-[80px]">{route.source.city}</div>
          </div>

          {/* Stepper Visualization */}
          <div className="flex-1 px-4 flex flex-col items-center justify-center relative">
            <div className="text-[10px] font-semibold text-transit-orange mb-1 font-mono">{formatDuration(route.totalDurationMins)}</div>
            
            {/* Horizontal line with dots */}
            <div className="w-full h-[2px] bg-rail-800 relative flex items-center justify-between">
              <div className="w-2 h-2 rounded-full bg-transit-orange -ml-1" />
              {stopsCount > 0 && (
                <div className="flex justify-evenly w-full absolute">
                  {Array.from({ length: stopsCount }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-rail-500 hover:bg-transit-orange transition-colors"
                      title="Intermediate Stop"
                    />
                  ))}
                </div>
              )}
              <div className="w-2 h-2 rounded-full bg-transit-cyan -mr-1" />
            </div>

            <div className="text-[10px] font-bold text-rail-400 mt-1">{stopsText}</div>
          </div>

          {/* Destination Time */}
          <div className="text-right">
            <div className="text-xl font-extrabold text-white tracking-tight">{route.arrivalTime}</div>
            <div className="text-xs text-rail-400 font-semibold mt-0.5">{route.destination.code}</div>
            <div className="text-[10px] text-rail-500 font-medium truncate max-w-[80px]">{route.destination.city}</div>
          </div>
        </div>

        {/* Price & Distance Row */}
        <div className="flex items-center justify-between border-t border-rail-850 pt-3 mt-1 text-xs text-rail-300">
          <div className="flex items-center gap-1.5">
            <Navigation className="h-3.5 w-3.5 text-rail-500" />
            <span className="font-semibold">{route.totalDistanceKm} km</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CircleDollarSign className="h-4 w-4" />
              <span className="text-sm font-black">${route.basePrice}</span>
            </div>
            
            {/* Chevron Right indicator */}
            <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${
              isSelected ? 'text-transit-orange translate-x-0.5' : 'text-rail-500'
            }`} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
