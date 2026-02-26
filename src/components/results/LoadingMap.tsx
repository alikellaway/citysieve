'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from 'next-themes';

import 'leaflet/dist/leaflet.css';

export type CandidateStatus = 'pending' | 'checking' | 'checked' | 'filtered';

type CandidateArea = {
  id: string;
  lat: number;
  lng: number;
};

const TILE_LAYERS = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
};

// Zoom levels
const ZOOM_WAITING   = 12;
const ZOOM_CANDIDATE = 14;

// ─── State machine phases ────────────────────────────────────────────────────
type AnimPhase =
  | 'waiting'  // No candidates yet — parked at centre, pulser on
  | 'flying'   // flyTo() in progress — pulser hidden
  | 'pulsing'  // Arrived at candidate — pulser on, dwell timer running
  | 'paused';  // User interacted — frozen

// ─── MapController ──────────────────────────────────────────────────────────
function MapController({ onMapReady, initialCenter }: { onMapReady: (map: L.Map) => void; initialCenter: [number, number] }) {
  const map = useMap();
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    // Set initial center only once when map is ready
    if (!hasCenteredRef.current) {
      map.setView(initialCenter, ZOOM_WAITING);
      hasCenteredRef.current = true;
    }
    onMapReady(map);
  }, [map, onMapReady, initialCenter]);
  return null;
}

// ─── TileLoadingIndicator ───────────────────────────────────────────────────
function TileLoadingIndicator({ onLoadingChange }: { onLoadingChange: (v: boolean) => void }) {
  useMapEvents({
    loading: () => onLoadingChange(true),
    load:    () => onLoadingChange(false),
  });
  return null;
}

// ─── UserInteractionWatcher ─────────────────────────────────────────────────
function UserInteractionWatcher({ onInteract }: { onInteract: () => void }) {
  useMapEvents({
    dragstart: onInteract,
    zoomstart: onInteract,
  });
  return null;
}

// ─── AnimationController ────────────────────────────────────────────────────
// All mutable loop state lives in refs so the advance() function is created
// once and never re-created, avoiding stale-closure bugs entirely.
interface AnimationControllerProps {
  candidates: CandidateArea[];
  activeCandidateIndex: number | null;
  candidateStatus: Map<string, CandidateStatus>;
  onPhaseChange: (p: AnimPhase) => void;
}

function AnimationController({ candidates, activeCandidateIndex, candidateStatus, onPhaseChange }: AnimationControllerProps) {
  const map = useMap();

  // ── Stable refs ───────────────────────────────────────────────────────────
  const candidatesRef    = useRef<CandidateArea[]>([]);
  const lastIndexRef     = useRef<number | null>(null);
  const moveEndListenerRef = useRef<(() => void) | null>(null);
  const mountedRef       = useRef(true);
  const isFlyingRef     = useRef(false);

  // ── Sync candidates ref ───────────────────────────────────────────────────
  useEffect(() => {
    candidatesRef.current = candidates;
  }, [candidates]);

  // ── Cancel moveend listener ────────────────────────────────────────────────
  const cancelMoveEnd = useCallback(() => {
    if (moveEndListenerRef.current) {
      map.off('moveend', moveEndListenerRef.current);
      moveEndListenerRef.current = null;
    }
  }, [map]);

  // ── Fly to current candidate when index changes ────────────────────────────
  useEffect(() => {
    if (!mountedRef.current) return;
    if (activeCandidateIndex === null || activeCandidateIndex === undefined) return;
    if (activeCandidateIndex === lastIndexRef.current) return;

    const idx = activeCandidateIndex;
    const list = candidatesRef.current;
    if (idx >= list.length) return;

    const target = list[idx];
    lastIndexRef.current = idx;

    const status = candidateStatus.get(target.id);
    if (status === 'checking') {
      isFlyingRef.current = true;
      onPhaseChange('flying');

      cancelMoveEnd();
      const onArrival = () => {
        moveEndListenerRef.current = null;
        isFlyingRef.current = false;
        if (!mountedRef.current) return;
        onPhaseChange('pulsing');
      };
      moveEndListenerRef.current = onArrival;
      map.once('moveend', onArrival);

      map.flyTo([target.lat, target.lng], ZOOM_CANDIDATE, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  }, [activeCandidateIndex, candidateStatus, map, onPhaseChange, cancelMoveEnd]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelMoveEnd();
      try {
        map.stop();
      } catch {
        // Map may be partially destroyed during unmount
      }
    };
  }, [map, cancelMoveEnd]);

  return null;
}

// ─── SonarPulse ─────────────────────────────────────────────────────────────
function SonarPulse({ active }: { active: boolean }) {
  return (
    <div
      className={`relative flex items-center justify-center transition-all duration-500 ease-in-out ${
        active ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
      }`}
    >
      {/* Centre dot */}
      <div className="absolute z-10 h-3 w-3 rounded-full bg-indigo-500/80 dark:bg-indigo-400/80" />
      {/* Three rings staggered 0.8 s apart */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute rounded-full border-2 border-indigo-500/60 dark:border-indigo-400/60"
          style={{
            width: 40,
            height: 40,
            animationName: 'sonar-ring',
            animationDuration: '2.4s',
            animationTimingFunction: 'ease-out',
            animationIterationCount: 'infinite',
            animationDelay: `${i * 0.8}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── LoadingMap ──────────────────────────────────────────────────────────────
interface LoadingMapProps {
  centre: { lat: number; lng: number };
  onMapReady?: (map: L.Map) => void;
  candidates?: CandidateArea[];
  activeCandidateIndex?: number | null;
  candidateStatus?: Map<string, CandidateStatus>;
}

export function LoadingMap({ 
  centre, 
  onMapReady, 
  candidates = [],
  activeCandidateIndex = null,
  candidateStatus = new Map(),
}: LoadingMapProps) {
  const { resolvedTheme } = useTheme();
  const tile = resolvedTheme === 'dark' ? TILE_LAYERS.dark : TILE_LAYERS.light;

  const [tilesLoading, setTilesLoading] = useState(true);
  const [phase, setPhase] = useState<AnimPhase>('waiting');
  // Once the user interacts we permanently unmount the controller for this session
  const [paused, setPaused] = useState(false);
  // Tracks whether the initial tile load has ever completed.
  // After that first load, tile activity from flyTo() should not show the full-screen
  // overlay or suppress the sonar pulse — those events are normal and expected.
  const hasInitiallyLoadedRef = useRef(false);

  // Use ref to capture initial center only on first render - prevents MapContainer
  // from resetting to this position on subsequent re-renders
  const initialCenterRef = useRef<[number, number] | null>(null);
  if (initialCenterRef.current === null) {
    initialCenterRef.current = [centre.lat, centre.lng];
  }
  const initialCenter = initialCenterRef.current;

  const handlePhaseChange = useCallback((p: AnimPhase) => { setPhase(p); }, []);
  const handleMapReady    = useCallback((map: L.Map)   => { onMapReady?.(map); }, [onMapReady]);

  const handleTilesLoadingChange = useCallback((loading: boolean) => {
    if (!loading) hasInitiallyLoadedRef.current = true;
    setTilesLoading(loading);
  }, []);

  const handleUserInteract = useCallback(() => {
    setPaused(true);
    setPhase('paused');
  }, []);

  // Show pulse when in an active animation phase or when a candidate is being checked.
  // Before the initial load we also require tiles to be ready; after that, subsequent
  // tile activity (from flyTo) should never suppress the pulse.
  const hasActiveCandidate = activeCandidateIndex !== null && 
    candidates[activeCandidateIndex] && 
    candidateStatus.get(candidates[activeCandidateIndex].id) === 'checking';
  
  const pulserActive = (hasInitiallyLoadedRef.current || !tilesLoading) &&
    (phase === 'waiting' || phase === 'pulsing' || hasActiveCandidate);

  return (
    <div className="relative w-full h-[calc(100vh-180px)] min-h-[400px]">
      <MapContainer
        center={initialCenter}
        zoom={ZOOM_WAITING}
        className="h-full w-full"
        zoomControl={true}
      >
        <TileLoadingIndicator onLoadingChange={handleTilesLoadingChange} />
        <TileLayer
          key={tile.url}
          attribution={tile.attribution}
          url={tile.url}
        />
        {onMapReady && <MapController onMapReady={handleMapReady} initialCenter={initialCenter} />}
        <UserInteractionWatcher onInteract={handleUserInteract} />
        {/* Unmounting the controller on pause kills all timers and listeners cleanly */}
        {!paused && (
          <AnimationController
            candidates={candidates}
            activeCandidateIndex={activeCandidateIndex}
            candidateStatus={candidateStatus}
            onPhaseChange={handlePhaseChange}
          />
        )}
      </MapContainer>

      {/* Sonar pulse overlay — pointer-events-none so map is still interactive */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
        style={{ zIndex: 1000 }}
      >
        <SonarPulse active={pulserActive} />
      </div>

      {tilesLoading && !hasInitiallyLoadedRef.current && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Loading map...</span>
          </div>
        </div>
      )}
    </div>
  );
}
