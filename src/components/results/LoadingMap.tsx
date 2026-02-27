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

const ZOOM_OUT = 11;
const ZOOM_IN  = 14;

// ─── MapController ──────────────────────────────────────────────────────────
function MapController({
  onMapReady,
  initialCenter,
}: {
  onMapReady: (map: L.Map) => void;
  initialCenter: [number, number];
}) {
  const map = useMap();
  const ready = useRef(false);

  useEffect(() => {
    if (!ready.current) {
      map.setView(initialCenter, ZOOM_OUT);
      ready.current = true;
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
// Only watches for drag — programmatic setView does NOT fire dragstart, so
// this cleanly distinguishes user intent from our own animation calls.
function UserInteractionWatcher({ onInteract }: { onInteract: () => void }) {
  useMapEvents({ dragstart: onInteract });
  return null;
}

// ─── SequenceAnimator ───────────────────────────────────────────────────────
function SequenceAnimator({
  candidates,
  activeCandidateIndex,
  onPulseChange,
}: {
  candidates: CandidateArea[];
  activeCandidateIndex: number | null;
  onPulseChange: (active: boolean) => void;
}) {
  const map = useMap();
  const targetRef        = useRef<CandidateArea | null>(null);
  const isAnimatingRef   = useRef(false);
  const mountedRef       = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Await a single map.setView() call — setView always fires moveend, regardless
  // of distance or zoom delta, making it the only reliable way to sequence steps.
  const step = useCallback(
    (action: () => void, maxWaitMs = 2500) =>
      new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };
        map.once('moveend', finish);
        action();
        setTimeout(() => {
          map.off('moveend', finish);
          finish();
        }, maxWaitMs);
      }),
    [map],
  );

  const processQueue = useCallback(async () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    while (targetRef.current && mountedRef.current) {
      const target = targetRef.current;
      targetRef.current = null; // consume

      // 1. Stop the pulser
      onPulseChange(false);
      await new Promise((r) => setTimeout(r, 150));
      if (!mountedRef.current) break;

      // 2. Zoom out (stay on current centre)
      if (map.getZoom() !== ZOOM_OUT) {
        await step(() => map.setView(map.getCenter(), ZOOM_OUT, { animate: true }));
        if (!mountedRef.current) break;
      }

      // 3. Pan to target at the zoomed-out level
      //    setView handles any distance — panTo silently fails for far points.
      const c = map.getCenter();
      if (Math.abs(c.lat - target.lat) > 0.001 || Math.abs(c.lng - target.lng) > 0.001) {
        await step(() => map.setView([target.lat, target.lng], ZOOM_OUT, { animate: true }), 3000);
        if (!mountedRef.current) break;
      }

      // 4. Zoom in on the target
      await step(() => map.setView([target.lat, target.lng], ZOOM_IN, { animate: true }));
      if (!mountedRef.current) break;

      // 5. Pulser ON
      onPulseChange(true);

      // 6. Dwell so the user registers where we are
      await new Promise((r) => setTimeout(r, 1200));
    }

    isAnimatingRef.current = false;
  }, [map, onPulseChange, step]);

  // Each time a new batch starts, overwrite the pending target and kick the loop.
  // If the loop is already running it will pick up the latest target on its next
  // iteration — this is the "skip ahead" / catch-up mechanism.
  useEffect(() => {
    if (activeCandidateIndex !== null && candidates[activeCandidateIndex]) {
      targetRef.current = candidates[activeCandidateIndex];
      processQueue();
    }
  }, [activeCandidateIndex, candidates, processQueue]);

  return null;
}

// ─── SonarPulse ─────────────────────────────────────────────────────────────
function SonarPulse({ active }: { active: boolean }) {
  return (
    <div
      className={`relative flex items-center justify-center transition-all duration-300 ease-in-out ${
        active ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
      }`}
    >
      <div className="absolute z-10 h-3 w-3 rounded-full bg-indigo-500/80 dark:bg-indigo-400/80" />
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
  candidateStatus?: Map<string, CandidateStatus>; // kept for prop compat
}

export function LoadingMap({
  centre,
  onMapReady,
  candidates = [],
  activeCandidateIndex = null,
}: LoadingMapProps) {
  const { resolvedTheme } = useTheme();
  const tile = resolvedTheme === 'dark' ? TILE_LAYERS.dark : TILE_LAYERS.light;

  const [tilesLoading, setTilesLoading]   = useState(true);
  const [paused, setPaused]               = useState(false);
  const [pulserActive, setPulserActive]   = useState(true);

  const hasInitiallyLoadedRef = useRef(false);
  const initialCenterRef      = useRef<[number, number] | null>(null);
  if (initialCenterRef.current === null) {
    initialCenterRef.current = [centre.lat, centre.lng];
  }
  const initialCenter = initialCenterRef.current;

  const handleMapReady = useCallback((map: L.Map) => { onMapReady?.(map); }, [onMapReady]);

  const handleTilesLoadingChange = useCallback((loading: boolean) => {
    if (!loading) hasInitiallyLoadedRef.current = true;
    setTilesLoading(loading);
  }, []);

  const handleUserInteract = useCallback(() => {
    setPaused(true);
    setPulserActive(false);
  }, []);

  const handlePulseChange = useCallback((active: boolean) => {
    setPulserActive(active);
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-180px)] min-h-[400px]">
      <MapContainer
        center={initialCenter}
        zoom={ZOOM_OUT}
        className="h-full w-full"
        zoomControl={true}
      >
        <TileLoadingIndicator onLoadingChange={handleTilesLoadingChange} />
        <TileLayer key={tile.url} attribution={tile.attribution} url={tile.url} />
        {onMapReady && (
          <MapController onMapReady={handleMapReady} initialCenter={initialCenter} />
        )}
        <UserInteractionWatcher onInteract={handleUserInteract} />

        {!paused && (
          <SequenceAnimator
            candidates={candidates}
            activeCandidateIndex={activeCandidateIndex}
            onPulseChange={handlePulseChange}
          />
        )}
      </MapContainer>

      {/* Sonar pulse — pointer-events-none so the map stays interactive */}
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
            <span className="text-sm text-muted-foreground">Loading map…</span>
          </div>
        </div>
      )}
    </div>
  );
}
