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
const ZOOM_IN = 14;

// ─── MapController ──────────────────────────────────────────────────────────
function MapController({ onMapReady, initialCenter }: { onMapReady: (map: L.Map) => void; initialCenter: [number, number] }) {
  const map = useMap();
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    if (!hasCenteredRef.current) {
      map.setView(initialCenter, ZOOM_OUT);
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
  });
  
  const map = useMap();
  
  useEffect(() => {
    const handleUserAction = () => onInteract();
    const container = map.getContainer();
    
    // Only detect true user interactions to avoid catching programmatic pans/zooms
    container.addEventListener('wheel', handleUserAction, { passive: true });
    container.addEventListener('touchstart', handleUserAction, { passive: true });
    container.addEventListener('mousedown', handleUserAction, { passive: true });
    
    return () => {
      container.removeEventListener('wheel', handleUserAction);
      container.removeEventListener('touchstart', handleUserAction);
      container.removeEventListener('mousedown', handleUserAction);
    };
  }, [map, onInteract]);
  
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
  const targetRef = useRef<CandidateArea | null>(null);
  const isAnimatingRef = useRef(false);
  const mountedRef = useRef(true);
  const processQueueRef = useRef<(() => Promise<void>) | null>(null);

  // When a new candidate starts checking, set it as the next target in the queue.
  // We overwrite the target so the map can "skip ahead" if data fetching outpaces the animation.
  useEffect(() => {
    if (activeCandidateIndex !== null && candidates[activeCandidateIndex]) {
      targetRef.current = candidates[activeCandidateIndex];
      if (processQueueRef.current) {
        processQueueRef.current();
      }
    }
  }, [activeCandidateIndex, candidates]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const processQueue = useCallback(async () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    // A helper to robustly wait for a Leaflet event (or timeout)
    const waitForEvent = (event: string, action: () => void, maxWaitMs = 1500) => {
      return new Promise<void>((resolve) => {
        let fired = false;
        const handler = () => {
          fired = true;
          map.off(event, handler);
          resolve();
        };
        map.on(event, handler);
        action();
        
        setTimeout(() => {
          if (!fired) {
            map.off(event, handler);
            resolve();
          }
        }, maxWaitMs);
      });
    };

    while (targetRef.current && mountedRef.current) {
      const target = targetRef.current;
      targetRef.current = null; // Consume the target

      // 1. Pulser OFF
      onPulseChange(false);
      await new Promise((r) => setTimeout(r, 200)); // Brief pause to let pulser fade
      if (!mountedRef.current) break;

      // 2. Zoom out
      if (map.getZoom() > ZOOM_OUT) {
        await waitForEvent('zoomend', () => {
          map.setZoom(ZOOM_OUT, { animate: true, duration: 0.5 });
        });
      }
      if (!mountedRef.current) break;

      // 3. Pan to location
      const currentCenter = map.getCenter();
      if (Math.abs(currentCenter.lat - target.lat) > 0.0001 || Math.abs(currentCenter.lng - target.lng) > 0.0001) {
        await waitForEvent('moveend', () => {
          map.panTo([target.lat, target.lng], { animate: true, duration: 1.0 });
        }, 2000);
      }
      if (!mountedRef.current) break;

      // 4. Zoom in
      if (map.getZoom() < ZOOM_IN) {
        await waitForEvent('zoomend', () => {
          map.setZoom(ZOOM_IN, { animate: true, duration: 0.5 });
        });
      }
      if (!mountedRef.current) break;

      // 5. Pulser ON
      onPulseChange(true);

      // 6. Dwell time so the user can register the location
      await new Promise((r) => setTimeout(r, 1000));
    }

    isAnimatingRef.current = false;
  }, [map, onPulseChange]);

  useEffect(() => {
    processQueueRef.current = processQueue;
  }, [processQueue]);

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
  candidateStatus?: Map<string, CandidateStatus>; // Kept for prop signature compatibility, but unused here
}

export function LoadingMap({
  centre,
  onMapReady,
  candidates = [],
  activeCandidateIndex = null,
}: LoadingMapProps) {
  const { resolvedTheme } = useTheme();
  const tile = resolvedTheme === 'dark' ? TILE_LAYERS.dark : TILE_LAYERS.light;

  const [tilesLoading, setTilesLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [pulserActive, setPulserActive] = useState(true); // Default to ON at the center

  const hasInitiallyLoadedRef = useRef(false);
  const initialCenterRef = useRef<[number, number] | null>(null);

  if (initialCenterRef.current === null) {
    initialCenterRef.current = [centre.lat, centre.lng];
  }
  const initialCenter = initialCenterRef.current;

  const handleMapReady = useCallback((map: L.Map) => {
    onMapReady?.(map);
  }, [onMapReady]);

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
        <TileLayer
          key={tile.url}
          attribution={tile.attribution}
          url={tile.url}
        />
        {onMapReady && <MapController onMapReady={handleMapReady} initialCenter={initialCenter} />}
        <UserInteractionWatcher onInteract={handleUserInteract} />
        
        {!paused && (
          <SequenceAnimator
            candidates={candidates}
            activeCandidateIndex={activeCandidateIndex}
            onPulseChange={handlePulseChange}
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
