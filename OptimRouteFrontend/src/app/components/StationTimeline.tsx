'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, MapPinOff, ArrowDown, ChevronDown, ChevronUp, Train, Navigation } from 'lucide-react';
import { Route } from '../../types';

interface StationTimelineProps {
  route: Route;
}

export default function StationTimeline({ route }: StationTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const stops = route.stops;
  const sourceStop = stops[0];
  const destStop = stops[stops.length - 1];
  const intermediateStops = stops.slice(1, -1);
  const totalIntermediates = intermediateStops.length;

  return (
    <div className="bg-rail-900/40 border border-rail-800 p-6 rounded-2xl backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between border-b border-rail-800 pb-4 mb-6">
        <div>
          <h3 className="font-bold text-lg text-white">Journey Timeline</h3>
          <p className="text-xs text-rail-400 font-medium mt-0.5">
            {route.train.name} ({route.train.number}) &bull; {route.totalDistanceKm} km
          </p>
        </div>
        <div className="bg-rail-800 px-3 py-1.5 rounded-xl border border-rail-750 flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-transit-orange animate-pulse" />
          <span className="text-xs font-mono font-bold text-white">
            {Math.floor(route.totalDurationMins / 60)}h {route.totalDurationMins % 60}m
          </span>
        </div>
      </div>

      <div className="relative pl-6 border-l-2 border-rail-800 flex flex-col gap-6 select-none ml-2">
        {/* Source Station */}
        <div className="relative">
          {/* Timeline Dot */}
          <div className="absolute -left-[33px] top-1.5 w-6 h-6 rounded-full bg-rail-900 border-2 border-transit-orange flex items-center justify-center z-10 shadow-lg shadow-transit-orange/20">
            <div className="w-2.5 h-2.5 rounded-full bg-transit-orange animate-ping-slow absolute" />
            <div className="w-2.5 h-2.5 rounded-full bg-transit-orange z-10" />
          </div>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold text-transit-orange uppercase tracking-wider bg-transit-orange/10 px-2 py-0.5 rounded-md">
                Origin
              </span>
              <h4 className="font-extrabold text-base text-white mt-1.5">{sourceStop.station.name}</h4>
              <p className="text-xs text-rail-400 font-semibold mt-0.5">
                {sourceStop.station.city} &bull; {sourceStop.platform || 'Platform 1'}
              </p>
            </div>
            <div className="text-left md:text-right">
              <span className="text-xs font-bold text-rail-400 block">Departure</span>
              <span className="text-lg font-black text-white font-mono">{sourceStop.departureTime}</span>
            </div>
          </div>
        </div>

        {/* Intermediate Stops Accordion */}
        {totalIntermediates > 0 ? (
          <div className="my-1">
            {/* Toggle Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between py-2.5 px-4 bg-rail-850/60 hover:bg-rail-800 border border-rail-850 hover:border-rail-700 rounded-xl text-left transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-rail-800 text-transit-cyan text-xs font-bold">
                  {totalIntermediates}
                </span>
                <span className="text-xs font-semibold text-rail-300">
                  {totalIntermediates} Intermediate Station{totalIntermediates > 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-rail-400">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {/* Expandable stops */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-5 pt-5 pb-2 pl-4 border-l border-dashed border-rail-700 ml-0.5 mt-2">
                    {intermediateStops.map((stop, index) => (
                      <motion.div
                        key={`${stop.station.id}-${index}`}
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="relative"
                      >
                        {/* Timeline Dot */}
                        <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-rail-900 border-2 border-rail-500 hover:border-transit-cyan transition-colors z-10 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-rail-500 hover:bg-transit-cyan transition-colors" />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                          <div>
                            <h5 className="font-bold text-sm text-rail-200">{stop.station.name}</h5>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-rail-400 font-semibold mt-0.5">
                              <span>{stop.station.city}</span>
                              <span>&bull;</span>
                              <span>{stop.platform || 'Platform 2'}</span>
                              <span>&bull;</span>
                              <span className="flex items-center gap-0.5 text-rail-500 font-mono">
                                <Navigation className="h-2.5 w-2.5" />
                                {stop.distanceOffsetKm} km
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-0 mt-1 sm:mt-0">
                            <div className="text-[10px] text-rail-400 font-semibold">
                              Arrives: <span className="font-bold text-rail-200 font-mono">{stop.arrivalTime}</span>
                            </div>
                            <div className="text-[10px] text-rail-400 font-semibold">
                              Departs: <span className="font-bold text-rail-200 font-mono">{stop.departureTime}</span>
                            </div>
                            <div className="text-[10px] bg-rail-800 text-transit-cyan px-1.5 py-0.5 rounded-md font-bold font-mono text-[9px] mt-1 sm:mt-0.5">
                              Halt: {stop.waitTimeMins}m
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-3 px-4 bg-rail-950/40 border border-rail-850/60 rounded-xl my-1">
            <span className="w-1.5 h-1.5 rounded-full bg-transit-cyan animate-pulse" />
            <span className="text-xs font-semibold text-rail-400">Direct Route &mdash; No Intermediate Stops</span>
          </div>
        )}

        {/* Destination Station */}
        <div className="relative">
          {/* Timeline Dot */}
          <div className="absolute -left-[33px] top-1.5 w-6 h-6 rounded-full bg-rail-900 border-2 border-transit-cyan flex items-center justify-center z-10 shadow-lg shadow-transit-cyan/20">
            <div className="w-2.5 h-2.5 rounded-full bg-transit-cyan z-10 animate-pulse" />
          </div>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold text-transit-cyan uppercase tracking-wider bg-transit-cyan/10 px-2 py-0.5 rounded-md">
                Destination
              </span>
              <h4 className="font-extrabold text-base text-white mt-1.5">{destStop.station.name}</h4>
              <p className="text-xs text-rail-400 font-semibold mt-0.5">
                {destStop.station.city} &bull; {destStop.platform || 'Platform 1'}
              </p>
            </div>
            <div className="text-left md:text-right">
              <span className="text-xs font-bold text-rail-400 block">Arrival</span>
              <span className="text-lg font-black text-white font-mono">{destStop.arrivalTime}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
