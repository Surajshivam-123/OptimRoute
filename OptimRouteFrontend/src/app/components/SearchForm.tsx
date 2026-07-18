'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ArrowRightLeft, Calendar, Search, Train, ChevronDown, Loader2 } from 'lucide-react';
import { Station } from '../../types';

interface SearchFormProps {
  initialSourceId?: string;
  initialDestinationId?: string;
  initialDate?: string;
  onSearch: (sourceCode: string, destinationCode: string, date: string) => void;
  isLoading?: boolean;
}

// ── Highlight matching substring in suggestion text ───────────────────────────
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <span className="text-transit-orange font-extrabold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </span>
  );
}

// ── Reusable autocomplete dropdown ───────────────────────────────────────────
interface AutocompleteProps {
  inputRef: React.RefObject<HTMLDivElement | null>;
  label: string;
  placeholder: string;
  value: string;
  selected: Station | null;
  suggestions: Station[];
  showSuggestions: boolean;
  stationsLoading: boolean;
  accentClass: string; // e.g. 'text-transit-orange' | 'text-transit-cyan'
  focusRingClass: string;
  onInputChange: (val: string) => void;
  onFocus: () => void;
  onSelect: (stn: Station) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  highlightIndex: number;
  iconColor: string;
}

function StationAutocomplete({
  inputRef,
  label,
  placeholder,
  value,
  suggestions,
  showSuggestions,
  stationsLoading,
  accentClass,
  focusRingClass,
  onInputChange,
  onFocus,
  onSelect,
  onKeyDown,
  highlightIndex,
  iconColor,
}: AutocompleteProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && highlightIndex >= 0) {
      const item = listRef.current.children[highlightIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  return (
    <div ref={inputRef} className="flex-1 relative">
      <label className="block text-xs font-semibold text-rail-400 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <MapPin className={`h-5 w-5 ${iconColor}`} />
        </span>
        <input
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={stationsLoading ? 'Loading stations…' : placeholder}
          value={value}
          onChange={e => onInputChange(e.target.value)}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          disabled={stationsLoading}
          className={`w-full bg-rail-800/60 border border-rail-700/60 rounded-xl py-3 pl-11 pr-10 text-sm ${focusRingClass} outline-none transition-all placeholder:text-rail-500 font-medium disabled:opacity-50 disabled:cursor-wait`}
        />
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {stationsLoading
            ? <Loader2 className="h-4 w-4 text-rail-500 animate-spin" />
            : <ChevronDown className={`h-4 w-4 text-rail-500 transition-transform duration-200 ${showSuggestions ? 'rotate-180' : ''}`} />
          }
        </span>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {showSuggestions && !stationsLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.13 }}
            className="absolute left-0 right-0 mt-2 bg-rail-900 border border-rail-800 rounded-xl overflow-hidden shadow-2xl z-50 max-h-64 overflow-y-auto"
            ref={listRef}
          >
            {suggestions.length > 0 ? (
              suggestions.map((stn, i) => (
                <button
                  key={stn.id}
                  type="button"
                  onMouseDown={e => e.preventDefault()} // prevent blur before click
                  onClick={() => onSelect(stn)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-rail-800/40 last:border-b-0 ${i === highlightIndex
                      ? 'bg-rail-800'
                      : 'hover:bg-rail-800/60'
                    }`}
                >
                  <div className={`bg-rail-800 p-1.5 rounded-lg shrink-0 ${accentClass}`}>
                    <Train className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate text-white">
                      <HighlightMatch text={stn.name} query={value} />
                    </div>
                    <div className="text-xs text-rail-400 font-mono truncate">
                      <HighlightMatch text={stn.code} query={value} />
                    </div>
                  </div>
                  <div className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${i === highlightIndex
                      ? `${accentClass} border-current opacity-80`
                      : 'text-rail-500 border-rail-700'
                    }`}>
                    {stn.code}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-5 text-sm text-rail-500 text-center font-medium flex flex-col items-center gap-1.5">
                <Train className="h-5 w-5 opacity-40" />
                No stations match <span className="text-rail-300 font-semibold">&ldquo;{value}&rdquo;</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SearchForm({
  initialSourceId = '',
  initialDestinationId = '',
  initialDate = '',
  onSearch,
  isLoading = false,
}: SearchFormProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [stationsLoading, setStationsLoading] = useState(true);

  const [sourceInput, setSourceInput] = useState('');
  const [sourceStation, setSourceStation] = useState<Station | null>(null);
  const [destInput, setDestInput] = useState('');
  const [destStation, setDestStation] = useState<Station | null>(null);
  const [travelDate, setTravelDate] = useState('');

  const [showSource, setShowSource] = useState(false);
  const [showDest, setShowDest] = useState(false);
  const [sourceHL, setSourceHL] = useState(-1); // keyboard highlight index
  const [destHL, setDestHL] = useState(-1);
  const [errorMsg, setErrorMsg] = useState('');

  const sourceRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);

  const lastInitialSourceRef = useRef<string | null>(null);
  const lastInitialDestRef = useRef<string | null>(null);
  const lastInitialDateRef = useRef<string | null>(null);

  // ── Fetch all stations once on mount (used as the base list) ─────────────
  useEffect(() => {
    fetch('/stations.json')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setStations(d);
        }
      })
      .catch(() => { })
      .finally(() => setStationsLoading(false));
  }, []);

  // ── Init from props ───────────────────────────────────────────────────────
  useEffect(() => {
    if (stations.length === 0) return;

    const sourceChanged = initialSourceId !== lastInitialSourceRef.current;
    const destChanged = initialDestinationId !== lastInitialDestRef.current;
    const dateChanged = initialDate !== lastInitialDateRef.current;

    if (sourceChanged && initialSourceId) {
      const s = stations.find(s => s.id === initialSourceId || s.code === initialSourceId);
      if (s) {
        setSourceStation(s);
        setSourceInput(s.name);
        lastInitialSourceRef.current = initialSourceId;
      }
    }
    if (destChanged && initialDestinationId) {
      const s = stations.find(s => s.id === initialDestinationId || s.code === initialDestinationId);
      if (s) {
        setDestStation(s);
        setDestInput(s.name);
        lastInitialDestRef.current = initialDestinationId;
      }
    }
    if (dateChanged) {
      if (initialDate) {
        setTravelDate(initialDate);
        lastInitialDateRef.current = initialDate;
      } else if (!travelDate) {
        const today = new Date().toISOString().split('T')[0];
        setTravelDate(today);
        lastInitialDateRef.current = today;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, initialSourceId, initialDestinationId, initialDate]);

  // ── Set default date on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!travelDate && !initialDate) {
      setTravelDate(new Date().toISOString().split('T')[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Click-outside closes dropdowns ───────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (sourceRef.current && !sourceRef.current.contains(e.target as Node)) {
        setShowSource(false);
        setSourceHL(-1);
        if (!sourceStation) setSourceInput('');
        else setSourceInput(sourceStation.name);
      }
      if (destRef.current && !destRef.current.contains(e.target as Node)) {
        setShowDest(false);
        setDestHL(-1);
        if (!destStation) setDestInput('');
        else setDestInput(destStation.name);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sourceStation, destStation]);

  // ── Filter logic — show all when input is empty, filter otherwise ─────────
  const filteredSource = useMemo(() => {
    const term = sourceInput.toLowerCase().trim();
    let result = stations;
    if (destStation) {
      result = result.filter(s => s.id !== destStation.id && s.code !== destStation.code);
    }
    if (term) {
      result = result.filter(s =>
        s.name.toLowerCase().includes(term) ||
        s.code.toLowerCase().includes(term)
      );
    }
    return result.slice(0, 30);
  }, [stations, sourceInput, destStation]);

  const filteredDest = useMemo(() => {
    const term = destInput.toLowerCase().trim();
    let result = stations;
    if (sourceStation) {
      result = result.filter(s => s.id !== sourceStation.id && s.code !== sourceStation.code);
    }
    if (term) {
      result = result.filter(s =>
        s.name.toLowerCase().includes(term) ||
        s.code.toLowerCase().includes(term)
      );
    }
    return result.slice(0, 30);
  }, [stations, destInput, sourceStation]);

  // ── Keyboard nav factory ──────────────────────────────────────────────────
  const makeKeyHandler = useCallback((
    list: Station[],
    hlIndex: number,
    setHL: (i: number) => void,
    setShow: (b: boolean) => void,
    onSelect: (s: Station) => void,
  ) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!list.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHL(Math.min(hlIndex + 1, list.length - 1));
      setShow(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHL(Math.max(hlIndex - 1, 0));
    } else if (e.key === 'Enter' && hlIndex >= 0) {
      e.preventDefault();
      onSelect(list[hlIndex]);
    } else if (e.key === 'Escape') {
      setShow(false);
      setHL(-1);
    }
  }, []);

  const sourceKeyHandler = makeKeyHandler(
    filteredSource, sourceHL, setSourceHL, setShowSource,
    stn => { setSourceStation(stn); setSourceInput(stn.name); setShowSource(false); setSourceHL(-1); setErrorMsg(''); }
  );
  const destKeyHandler = makeKeyHandler(
    filteredDest, destHL, setDestHL, setShowDest,
    stn => { setDestStation(stn); setDestInput(stn.name); setShowDest(false); setDestHL(-1); setErrorMsg(''); }
  );

  // ── Swap ──────────────────────────────────────────────────────────────────
  const handleSwap = () => {
    setErrorMsg('');
    const tmpStn = sourceStation, tmpIn = sourceInput;
    setSourceStation(destStation); setSourceInput(destInput);
    setDestStation(tmpStn); setDestInput(tmpIn);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!sourceStation) { setErrorMsg('Please select a valid departure station from the list.'); return; }
    if (!destStation) { setErrorMsg('Please select a valid destination station from the list.'); return; }
    if (sourceStation.code === destStation.code) {
      setErrorMsg('Departure and destination cannot be the same station.');
      return;
    }
    if (!travelDate) { setErrorMsg('Please pick a travel date.'); return; }
    onSearch(sourceStation.code, destStation.code, travelDate);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end bg-rail-900/40 border border-rail-800 p-5 rounded-2xl backdrop-blur-md relative z-10 shadow-lg">

        {/* FROM */}
        <StationAutocomplete
          inputRef={sourceRef}
          label="From Station"
          placeholder="Search station name or code…"
          value={sourceInput}
          selected={sourceStation}
          suggestions={filteredSource}
          showSuggestions={showSource}
          stationsLoading={stationsLoading}
          accentClass="text-transit-orange"
          focusRingClass="focus:border-transit-orange focus:ring-1 focus:ring-transit-orange"
          iconColor="text-transit-orange"
          highlightIndex={sourceHL}
          onInputChange={val => {
            setSourceInput(val);
            setSourceStation(null);
            setShowSource(true);
            setSourceHL(-1);
          }}
          onFocus={() => setShowSource(true)}
          onSelect={stn => {
            setSourceStation(stn);
            setSourceInput(stn.name);
            setShowSource(false);
            setSourceHL(-1);
            setErrorMsg('');
          }}
          onKeyDown={sourceKeyHandler}
        />

        {/* Swap */}
        <div className="flex justify-center -my-2 lg:my-0 lg:-mx-2 z-20">
          <motion.button
            type="button" onClick={handleSwap}
            whileHover={{ scale: 1.15, rotate: 180 }} whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-10 h-10 rounded-full bg-rail-800 border border-rail-700 hover:border-transit-orange hover:bg-rail-700 flex items-center justify-center text-transit-orange shadow-md"
            title="Swap stations"
          >
            <ArrowRightLeft className="h-4 w-4 rotate-90 lg:rotate-0" />
          </motion.button>
        </div>

        {/* TO */}
        <StationAutocomplete
          inputRef={destRef}
          label="To Station"
          placeholder="Search station name or code…"
          value={destInput}
          selected={destStation}
          suggestions={filteredDest}
          showSuggestions={showDest}
          stationsLoading={stationsLoading}
          accentClass="text-transit-cyan"
          focusRingClass="focus:border-transit-cyan focus:ring-1 focus:ring-transit-cyan"
          iconColor="text-transit-cyan"
          highlightIndex={destHL}
          onInputChange={val => {
            setDestInput(val);
            setDestStation(null);
            setShowDest(true);
            setDestHL(-1);
          }}
          onFocus={() => setShowDest(true)}
          onSelect={stn => {
            setDestStation(stn);
            setDestInput(stn.name);
            setShowDest(false);
            setDestHL(-1);
            setErrorMsg('');
          }}
          onKeyDown={destKeyHandler}
        />

        {/* Date */}
        <div className="w-full lg:w-48">
          <label className="block text-xs font-semibold text-rail-400 mb-1.5 uppercase tracking-wider">
            Travel Date
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <Calendar className="h-5 w-5 text-transit-orange" />
            </span>
            <input
              type="date"
              value={travelDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setTravelDate(e.target.value)}
              className="w-full bg-rail-800/60 border border-rail-700/60 rounded-xl py-3 pl-11 pr-4 text-sm focus:border-transit-orange focus:ring-1 focus:ring-transit-orange outline-none transition-all font-medium text-white appearance-none"
            />
          </div>
        </div>

        {/* Search button */}
        <div className="w-full lg:w-auto mt-2 lg:mt-0">
          <motion.button
            type="submit" disabled={isLoading}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="w-full lg:w-auto bg-gradient-to-r from-transit-orange to-transit-darkOrange text-white hover:brightness-110 font-bold px-8 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-transit-orange/20 transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isLoading
              ? <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Search className="h-5 w-5" />
            }
            <span>{isLoading ? 'Searching…' : 'Search Routes'}</span>
          </motion.button>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mt-3 text-red-400 text-xs font-semibold flex items-center gap-1.5 bg-red-950/40 border border-red-900/50 px-4 py-2.5 rounded-xl backdrop-blur-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
