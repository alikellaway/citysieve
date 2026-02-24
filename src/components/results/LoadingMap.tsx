'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
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

interface MapControllerProps {
  onMapReady: (map: L.Map) => void;
}

function MapController({ onMapReady }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  return null;
}

function TileLoadingIndicator({ onLoadingChange }: { onLoadingChange: (loading: boolean) => void }) {
  useMapEvents({
    loading: () => onLoadingChange(true),
    load: () => onLoadingChange(false),
  });
  return null;
}

function BreathingAnimation({ 
  paused,
  centre 
}: { 
  paused: boolean;
  centre: { lat: number; lng: number };
}) {
  const map = useMap();
  const breathingRef = useRef<NodeJS.Timeout | null>(null);
  const phaseRef = useRef<'in' | 'out'>('out');

  useEffect(() => {
    if (paused) {
      if (breathingRef.current) {
        clearInterval(breathingRef.current);
        breathingRef.current = null;
      }
      return;
    }

    const breathe = () => {
      const currentZoom = map.getZoom();
      const targetZoom = phaseRef.current === 'out' ? 13 : 14.5;
      
      map.flyTo([centre.lat, centre.lng], targetZoom, {
        duration: 3,
        easeLinearity: 0.25,
      });
      
      phaseRef.current = phaseRef.current === 'out' ? 'in' : 'out';
    };

    breathe();
    breathingRef.current = setInterval(breathe, 6000);

    return () => {
      if (breathingRef.current) {
        clearInterval(breathingRef.current);
      }
    };
  }, [map, paused, centre]);

  return null;
}

function PanToCandidate({ 
  activeIndex, 
  candidates,
  enabled 
}: { 
  activeIndex: number | null;
  candidates: CandidateArea[];
  enabled: boolean;
}) {
  const map = useMap();
  const lastPanIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || activeIndex === null || activeIndex === lastPanIndexRef.current) return;
    
    if (activeIndex % 4 === 0 && activeIndex > 0 && candidates[activeIndex]) {
      const target = candidates[activeIndex];
      map.flyTo([target.lat, target.lng], 13.5, {
        duration: 2.5,
        easeLinearity: 0.25,
      });
      lastPanIndexRef.current = activeIndex;
    }
  }, [activeIndex, candidates, enabled, map]);

  return null;
}

function InteractionHandler({ onInteractionChange }: { onInteractionChange: (interacting: boolean) => void }) {
  useMapEvents({
    dragstart: () => onInteractionChange(true),
    dragend: () => onInteractionChange(false),
    zoomstart: () => onInteractionChange(true),
    zoomend: () => onInteractionChange(false),
  });
  return null;
}

function MovementHandler({ onMoveChange }: { onMoveChange: (moving: boolean) => void }) {
  useMapEvents({
    movestart: () => onMoveChange(true),
    moveend: () => onMoveChange(false),
  });
  return null;
}

function SonarPulse({ isMoving }: { isMoving: boolean }) {
  return (
    <div 
      className={`relative flex items-center justify-center transition-all duration-300 ease-in-out ${
        isMoving ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
      }`}
    >
      {/* Centre dot */}
      <div className="absolute z-10 h-3 w-3 rounded-full bg-indigo-500/80 dark:bg-indigo-400/80" />
      {/* Three rings, staggered 0.8s apart */}
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

interface LoadingMapProps {
  centre: { lat: number; lng: number };
  onMapReady?: (map: L.Map) => void;
  activeCandidateIndex?: number | null;
  candidates?: CandidateArea[];
}

export function LoadingMap({ centre, onMapReady, activeCandidateIndex = 0, candidates = [] }: LoadingMapProps) {
  const { resolvedTheme } = useTheme();
  const tile = resolvedTheme === 'dark' ? TILE_LAYERS.dark : TILE_LAYERS.light;
  const [tilesLoading, setTilesLoading] = useState(true);
  const [userInteracting, setUserInteracting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const handleMapReady = useCallback((map: L.Map) => {
    onMapReady?.(map);
  }, [onMapReady]);

  return (
    <div className="relative w-full h-[calc(100vh-180px)] min-h-[400px]">
      <MapContainer
        center={[centre.lat, centre.lng]}
        zoom={14}
        className="h-full w-full"
        zoomControl={true}
      >
        <TileLoadingIndicator onLoadingChange={setTilesLoading} />
        <TileLayer
          key={tile.url}
          attribution={tile.attribution}
          url={tile.url}
        />
        {onMapReady && <MapController onMapReady={handleMapReady} />}
        <BreathingAnimation paused={userInteracting} centre={centre} />
        <PanToCandidate 
          activeIndex={activeCandidateIndex ?? 0} 
          candidates={candidates} 
          enabled={!userInteracting}
        />
        <InteractionHandler onInteractionChange={setUserInteracting} />
        <MovementHandler onMoveChange={setIsMoving} />
      </MapContainer>

      {/* Sonar pulse — centred over the map, pointer-events-none so map interaction still works */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
        style={{ zIndex: 1000 }}
      >
        <SonarPulse isMoving={isMoving} />
      </div>

      {tilesLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Loading map...</span>
          </div>
        </div>
      )}
    </div>
  );
}
