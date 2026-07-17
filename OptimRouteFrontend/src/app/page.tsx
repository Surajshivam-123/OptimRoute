'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Train,
  SlidersHorizontal,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Map,
  ListFilter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { transformRoutes, BackendRoute } from '../lib/transformer';
import { Route, RouteFilters, SortOption, TrainType } from '../types';
import SearchForm from './components/SearchForm';
import RouteCard from './components/RouteCard';
import StationTimeline from './components/StationTimeline';
import VisualMap from './components/VisualMap';
import JourneyInsights from './components/JourneyInsights';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState<{
    sourceCode: string;
    destinationCode: string;
    date: string;
  } | null>(null);
  const [isSearching, setIsSearching]     = useState(false);
  const [fetchError,  setFetchError]      = useState<string | null>(null);
  const [allRoutes,   setAllRoutes]       = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [mobileTab,   setMobileTab]       = useState<'routes' | 'map'>('routes');


  const [filters, setFilters] = useState<RouteFilters>({
    sort: 'fastest',
    trainTypes: ['Bullet', 'Express', 'Passenger'],
  });

  // ── Search handler — calls the Next.js API proxy ──────────────────────────
  const handleSearch = useCallback(async (
    sourceCode: string,
    destinationCode: string,
    date: string,
  ) => {
    setIsSearching(true);
    setFetchError(null);
    setAllRoutes([]);
    setSelectedRoute(null);
    setSearchQuery({ sourceCode, destinationCode, date });
    setMobileTab('routes');

    try {
      const qs  = new URLSearchParams({ origin: sourceCode, destination: destinationCode });
      const res = await fetch(`/api/routes?${qs}`);
      const data = await res.json();

      if (!data.success) throw new Error(data.error ?? 'Unknown error from server');

      const routes = transformRoutes(data.routes as BackendRoute[]);
      setAllRoutes(routes);
      if (routes.length > 0) setSelectedRoute(routes[0]);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch routes');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // ── Winners (for badge labels) ────────────────────────────────────────────
  const winners = useMemo(() => {
    if (allRoutes.length === 0) return { fastestId: '', shortestId: '', cheapestId: '' };
    let fastest = allRoutes[0], shortest = allRoutes[0], cheapest = allRoutes[0];
    allRoutes.forEach(r => {
      if (r.totalDurationMins < fastest.totalDurationMins)   fastest  = r;
      if (r.totalDistanceKm   < shortest.totalDistanceKm)    shortest = r;
      if (r.basePrice         < cheapest.basePrice)          cheapest = r;
    });
    return { fastestId: fastest.id, shortestId: shortest.id, cheapestId: cheapest.id };
  }, [allRoutes]);

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const processedRoutes = useMemo(() => {
    let result = allRoutes.filter(r => filters.trainTypes.includes(r.train.type));
    result.sort((a, b) => {
      if (filters.sort === 'fastest')  return a.totalDurationMins - b.totalDurationMins;
      if (filters.sort === 'shortest') return a.totalDistanceKm   - b.totalDistanceKm;
      if (filters.sort === 'cheapest') return a.basePrice         - b.basePrice;
      return 0;
    });
    return result;
  }, [allRoutes, filters]);

  const directRoutes = useMemo(() => processedRoutes.filter(r => r.legs.length === 1), [processedRoutes]);
  const oneTransferRoutes = useMemo(() => processedRoutes.filter(r => r.legs.length === 2), [processedRoutes]);
  const twoTransferRoutes = useMemo(() => processedRoutes.filter(r => r.legs.length >= 3), [processedRoutes]);

  const toggleTrainType = (type: TrainType) => {
    setFilters(prev => {
      const types = prev.trainTypes.includes(type)
        ? prev.trainTypes.filter(t => t !== type)
        : [...prev.trainTypes, type];
      return { ...prev, trainTypes: types.length > 0 ? types : prev.trainTypes };
    });
  };

  return (
    <div className="min-h-screen flex flex-col pb-12 relative overflow-x-hidden">

      {/* Ambient header gradient */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-transit-orange/5 via-rail-950/0 to-rail-950/0 pointer-events-none z-0" />

      {/* Header */}
      <header className="w-full border-b border-rail-900/60 bg-rail-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-transit-orange to-transit-darkOrange p-2 rounded-xl text-white shadow-lg shadow-transit-orange/25">
              <Train className="h-5 w-5" />
            </div>
            <div>
              <span className="font-black text-lg text-white tracking-tight uppercase">
                Optim<span className="text-transit-orange font-semibold">Route</span>
              </span>
              <span className="hidden sm:inline-block text-[9px] font-bold tracking-widest text-rail-500 uppercase font-mono ml-2">
                HUD_V2.0
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-rail-900/40 border border-rail-800/80 px-3 py-1 rounded-full text-xs font-semibold text-rail-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Rail Networks Online
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 mt-6 relative z-10 flex flex-col gap-6">

        {/* Hero text */}
        {!searchQuery && (
          <div className="text-center py-8 max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-rail-900 border border-rail-800 px-3 py-1 rounded-full text-xs font-semibold text-transit-orange mb-4"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Smart Rail Router & Analyzer</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none"
            >
              Train Travel,{' '}
              <span className="bg-gradient-to-r from-transit-orange to-transit-cyan bg-clip-text text-transparent">
                Optimized.
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="text-rail-400 mt-3 text-sm sm:text-base font-semibold leading-relaxed"
            >
              Search station schedules, compare transit speeds, discover eco-savings, and track
              itineraries in real-time.
            </motion.p>
          </div>
        )}

        {/* Search Panel */}
        <SearchForm
          onSearch={handleSearch}
          isLoading={isSearching}
          initialSourceId={searchQuery?.sourceCode}
          initialDestinationId={searchQuery?.destinationCode}
          initialDate={searchQuery?.date}
        />

        {/* Results */}
        <div className="flex-1 flex flex-col min-h-[500px]">
          <AnimatePresence mode="wait">

            {/* Loading */}
            {isSearching && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full flex-1"
              >
                <div className="md:col-span-5 flex flex-col gap-4">
                  <div className="h-10 bg-rail-900/40 border border-rail-800 rounded-xl animate-pulse" />
                  {[1,2,3].map(i => (
                    <div key={i} className="h-[140px] bg-rail-900/40 border border-rail-800 rounded-2xl animate-pulse" />
                  ))}
                </div>
                <div className="md:col-span-7 h-[420px] bg-rail-900/40 border border-rail-800 rounded-2xl animate-pulse" />
              </motion.div>
            )}

            {/* Empty state */}
            {!isSearching && !searchQuery && (
              <motion.div key="empty" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex-1 flex flex-col items-center justify-center border border-dashed border-rail-800/80 bg-rail-900/10 rounded-2xl py-12 px-6 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-rail-900 border border-rail-850 flex items-center justify-center mb-4 shadow-inner">
                  <SlidersHorizontal className="h-7 w-7 text-transit-orange animate-pulse" />
                </div>
                <h3 className="font-extrabold text-lg text-white">No active route searched</h3>
                <p className="text-sm text-rail-400 mt-1 max-w-sm font-semibold leading-relaxed">
                  Select a departure station, your destination, and travel date above to analyze
                  optimal rails.
                </p>
              </motion.div>
            )}

            {/* API error */}
            {!isSearching && fetchError && (
              <motion.div key="api-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="w-full flex-1 flex flex-col items-center justify-center border border-red-900/20 bg-red-950/5 rounded-2xl py-14 px-6 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-900/30 flex items-center justify-center text-red-400 mb-4">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <h3 className="font-extrabold text-lg text-white">Could not reach the server</h3>
                <p className="text-sm text-rail-400 mt-1 max-w-sm font-semibold">{fetchError}</p>
                <p className="text-xs text-rail-500 mt-2">Make sure the backend is running on port 5000.</p>
              </motion.div>
            )}

            {/* No routes found (successful call but empty) */}
            {!isSearching && !fetchError && searchQuery && processedRoutes.length === 0 && allRoutes.length === 0 && (
              <motion.div key="no-routes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="w-full flex-1 flex flex-col items-center justify-center border border-red-900/20 bg-red-950/5 rounded-2xl py-14 px-6 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-900/30 flex items-center justify-center text-red-400 mb-4">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <h3 className="font-extrabold text-lg text-white">No routes found</h3>
                <p className="text-sm text-rail-400 mt-1 max-w-sm font-semibold">
                  No trains connect these stations in the database. Try a different pair.
                </p>
              </motion.div>
            )}

            {/* Filter mismatch */}
            {!isSearching && !fetchError && searchQuery && processedRoutes.length === 0 && allRoutes.length > 0 && (
              <motion.div key="filter-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="w-full flex-1 flex flex-col items-center justify-center border border-red-900/20 bg-red-950/5 rounded-2xl py-14 px-6 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-900/30 flex items-center justify-center text-red-400 mb-4">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <h3 className="font-extrabold text-lg text-white">No routes match filters</h3>
                <p className="text-sm text-rail-400 mt-1 max-w-sm font-semibold">
                  Try enabling more train categories.
                </p>
                <button
                  onClick={() => setFilters({ sort: 'fastest', trainTypes: ['Bullet', 'Express', 'Passenger'] })}
                  className="mt-6 px-4 py-2 bg-rail-800 hover:bg-rail-750 border border-rail-700 text-xs font-bold text-white rounded-lg transition-colors"
                >
                  Reset Filters
                </button>
              </motion.div>
            )}

            {/* Results */}
            {!isSearching && !fetchError && searchQuery && processedRoutes.length > 0 && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-6 w-full flex-1"
              >
                {/* Journey insights for selected route */}
                {selectedRoute && <JourneyInsights route={selectedRoute} />}

                {/* Mobile tab switcher */}
                <div className="flex md:hidden w-full bg-rail-900/50 p-1 border border-rail-800 rounded-xl">
                  {(['routes', 'map'] as const).map(tab => (
                    <button key={tab} onClick={() => setMobileTab(tab)}
                      className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                        mobileTab === tab ? 'bg-transit-orange text-white' : 'text-rail-400 hover:text-white'
                      }`}
                    >
                      {tab === 'routes'
                        ? <><ListFilter className="h-3.5 w-3.5" /> Routes ({processedRoutes.length})</>
                        : <><Map className="h-3.5 w-3.5" /> Track Radar</>
                      }
                    </button>
                  ))}
                </div>

                {/* Desktop split */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full items-start">

                  {/* Left — filters + cards */}
                  <div className={`md:col-span-5 flex flex-col gap-4 ${mobileTab === 'routes' ? 'block' : 'hidden md:flex'}`}>
                    <div className="bg-rail-900/40 border border-rail-800 p-4 rounded-xl flex flex-col gap-4">

                      {/* Sort tabs */}
                      <div>
                        <div className="text-[10px] text-rail-400 font-extrabold uppercase tracking-widest font-mono mb-2">
                          Sort Results By
                        </div>
                        <div className="flex bg-rail-950 p-1 rounded-lg border border-rail-850">
                          {(['fastest', 'shortest', 'cheapest'] as SortOption[]).map(opt => (
                            <button key={opt}
                              onClick={() => setFilters(prev => ({ ...prev, sort: opt }))}
                              className={`flex-1 py-1.5 rounded-md font-bold text-[11px] capitalize tracking-wide transition-all ${
                                filters.sort === opt
                                  ? 'bg-rail-800 text-white shadow'
                                  : 'text-rail-400 hover:text-rail-200'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Train type filters */}
                      <div>
                        <div className="text-[10px] text-rail-400 font-extrabold uppercase tracking-widest font-mono mb-2">
                          Train Categories
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(['Bullet', 'Express', 'Passenger'] as TrainType[]).map(type => {
                            const active = filters.trainTypes.includes(type);
                            return (
                              <button key={type} onClick={() => toggleTrainType(type)}
                                className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                  active
                                    ? 'bg-rail-800/80 border-transit-orange text-white'
                                    : 'bg-transparent border-rail-800 text-rail-500 hover:border-rail-700 hover:text-rail-300'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  type === 'Bullet' ? 'bg-transit-cyan' : type === 'Express' ? 'bg-transit-orange' : 'bg-transit-green'
                                }`} />
                                {type}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Route cards */}
                    <div className="flex flex-col gap-4">
                      
                      {/* 1. Direct Routes */}
                      <div className="border border-rail-800/85 bg-rail-900/10 rounded-xl overflow-hidden flex flex-col h-[200px] shadow-lg">
                        <div className="p-3 bg-rail-900/30 border-b border-rail-800/60 flex items-center gap-2 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow shadow-emerald-500/50" />
                          <span className="font-extrabold text-[10px] text-white uppercase tracking-wider">
                            Direct Routes ({directRoutes.length})
                          </span>
                        </div>
                        
                        <div className="p-3 flex flex-col gap-3 overflow-y-auto flex-1 custom-scrollbar">
                          {directRoutes.length > 0 ? (
                            directRoutes.map(route => (
                              <RouteCard
                                key={route.id}
                                route={route}
                                isSelected={selectedRoute?.id === route.id}
                                onSelect={() => { setSelectedRoute(route); setMobileTab('map'); }}
                                isFastest={route.id === winners.fastestId}
                                isShortest={route.id === winners.shortestId}
                                isCheapest={route.id === winners.cheapestId}
                              />
                            ))
                          ) : (
                            <div className="text-[9px] text-rail-500 font-bold uppercase tracking-wider py-8 text-center font-mono my-auto">
                              No direct routes
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 2. 1-Transfer Routes */}
                      <div className="border border-rail-800/85 bg-rail-900/10 rounded-xl overflow-hidden flex flex-col h-[200px] shadow-lg">
                        <div className="p-3 bg-rail-900/30 border-b border-rail-800/60 flex items-center gap-2 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow shadow-amber-500/50" />
                          <span className="font-extrabold text-[10px] text-white uppercase tracking-wider">
                            Change Train Once ({oneTransferRoutes.length})
                          </span>
                        </div>

                        <div className="p-3 flex flex-col gap-3 overflow-y-auto flex-1 custom-scrollbar">
                          {oneTransferRoutes.length > 0 ? (
                            oneTransferRoutes.map(route => (
                              <RouteCard
                                key={route.id}
                                route={route}
                                isSelected={selectedRoute?.id === route.id}
                                onSelect={() => { setSelectedRoute(route); setMobileTab('map'); }}
                                isFastest={route.id === winners.fastestId}
                                isShortest={route.id === winners.shortestId}
                                isCheapest={route.id === winners.cheapestId}
                              />
                            ))
                          ) : (
                            <div className="text-[9px] text-rail-500 font-bold uppercase tracking-wider py-8 text-center font-mono my-auto">
                              No 1-transfer routes
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3. 2-Transfer Routes */}
                      <div className="border border-rail-800/85 bg-rail-900/10 rounded-xl overflow-hidden flex flex-col h-[200px] shadow-lg">
                        <div className="p-3 bg-rail-900/30 border-b border-rail-800/60 flex items-center gap-2 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow shadow-cyan-500/50" />
                          <span className="font-extrabold text-[10px] text-white uppercase tracking-wider">
                            Change Train Twice ({twoTransferRoutes.length})
                          </span>
                        </div>

                        <div className="p-3 flex flex-col gap-3 overflow-y-auto flex-1 custom-scrollbar">
                          {twoTransferRoutes.length > 0 ? (
                            twoTransferRoutes.map(route => (
                              <RouteCard
                                key={route.id}
                                route={route}
                                isSelected={selectedRoute?.id === route.id}
                                onSelect={() => { setSelectedRoute(route); setMobileTab('map'); }}
                                isFastest={route.id === winners.fastestId}
                                isShortest={route.id === winners.shortestId}
                                isCheapest={route.id === winners.cheapestId}
                              />
                            ))
                          ) : (
                            <div className="text-[9px] text-rail-500 font-bold uppercase tracking-wider py-8 text-center font-mono my-auto">
                              No 2-transfer routes
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Right — map + timeline */}
                  <div className={`md:col-span-7 flex flex-col gap-6 md:sticky md:top-20 ${mobileTab === 'map' ? 'block' : 'hidden md:flex'}`}>
                    {selectedRoute ? (
                      <>
                        <VisualMap route={selectedRoute} />
                        <StationTimeline route={selectedRoute} />
                      </>
                    ) : (
                      <div className="bg-rail-900/40 border border-rail-800 p-8 rounded-2xl text-center text-rail-400">
                        Select a route card on the left to review transit timeline details.
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </main>
    </div>
  );
}
