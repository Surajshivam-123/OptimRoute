'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Navigation, Leaf, Gauge, Award, ShieldCheck } from 'lucide-react';
import { Route } from '../../types';

interface JourneyInsightsProps {
  route: Route;
}

export default function JourneyInsights({ route }: JourneyInsightsProps) {
  // Calculate average speed
  const hours = route.totalDurationMins / 60;
  const avgSpeed = Math.round(route.totalDistanceKm / hours);

  // Carbon emission calculation:
  // Average passenger train emits ~24g of CO2 per km.
  // Average passenger car emits ~140g of CO2 per km.
  const trainEmissionsKg = Math.round((route.totalDistanceKm * 0.024) * 10) / 10;
  const carEmissionsKg = Math.round((route.totalDistanceKm * 0.140) * 10) / 10;
  const co2SavedKg = Math.round((carEmissionsKg - trainEmissionsKg) * 10) / 10;
  const savingPercentage = Math.round(((carEmissionsKg - trainEmissionsKg) / carEmissionsKg) * 100);

  const stopsCount = route.stops.length - 2;

  // Efficiency Rating based on speed and stops
  const getEfficiencyScore = () => {
    if (route.train.type === 'Bullet') return { score: '9.8', label: 'Optimal Speed' };
    if (route.train.type === 'Express') {
      return stopsCount <= 2 
        ? { score: '8.6', label: 'Very Balanced' }
        : { score: '7.8', label: 'Standard Express' };
    }
    return { score: '6.2', label: 'High Stop Frequency' };
  };

  const { score, label } = getEfficiencyScore();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {/* Distance Insight */}
      <motion.div
        variants={itemVariants}
        className="bg-rail-900/40 border border-rail-800 p-4.5 rounded-2xl backdrop-blur-sm flex items-center gap-3.5 hover:bg-rail-900/60 transition-colors"
      >
        <div className="bg-transit-orange/15 p-2.5 rounded-xl text-transit-orange border border-transit-orange/10">
          <Navigation className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[10px] text-rail-400 font-extrabold uppercase tracking-widest font-mono">Distance</div>
          <div className="text-lg font-black text-white mt-0.5">{route.totalDistanceKm} km</div>
        </div>
      </motion.div>

      {/* Average Velocity */}
      <motion.div
        variants={itemVariants}
        className="bg-rail-900/40 border border-rail-800 p-4.5 rounded-2xl backdrop-blur-sm flex items-center gap-3.5 hover:bg-rail-900/60 transition-colors"
      >
        <div className="bg-transit-cyan/15 p-2.5 rounded-xl text-transit-cyan border border-transit-cyan/10">
          <Gauge className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[10px] text-rail-400 font-extrabold uppercase tracking-widest font-mono">Avg Speed</div>
          <div className="text-lg font-black text-white mt-0.5">{avgSpeed} km/h</div>
        </div>
      </motion.div>

      {/* Route Efficiency */}
      <motion.div
        variants={itemVariants}
        className="bg-rail-900/40 border border-rail-800 p-4.5 rounded-2xl backdrop-blur-sm flex items-center gap-3.5 hover:bg-rail-900/60 transition-colors"
      >
        <div className="bg-amber-500/15 p-2.5 rounded-xl text-amber-400 border border-amber-500/10">
          <Award className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[10px] text-rail-400 font-extrabold uppercase tracking-widest font-mono">Score</div>
          <div className="text-lg font-black text-white mt-0.5">
            {score} <span className="text-[10px] text-rail-400 font-bold">/10</span>
          </div>
          <div className="text-[9px] text-rail-400 mt-0.5 font-bold truncate max-w-[90px]">{label}</div>
        </div>
      </motion.div>

      {/* Ecological Carbon Impact */}
      <motion.div
        variants={itemVariants}
        className="bg-emerald-950/20 border border-emerald-900/50 p-4.5 rounded-2xl backdrop-blur-sm flex items-center gap-3.5 col-span-2 lg:col-span-1 hover:bg-emerald-950/30 transition-colors"
      >
        <div className="bg-transit-green/15 p-2.5 rounded-xl text-transit-green border border-transit-green/10">
          <Leaf className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[10px] text-transit-green font-extrabold uppercase tracking-widest font-mono">CO₂ Saved</div>
          <div className="text-lg font-black text-white mt-0.5">{co2SavedKg} kg</div>
          <div className="text-[9px] text-transit-green font-bold mt-0.5">
            -{savingPercentage}% vs driving
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
