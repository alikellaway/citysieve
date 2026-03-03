'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from 'next-themes';
import type { ScoredArea } from '@/lib/scoring/engine';
import { getRankColor } from '@/components/results/rankColors';
import { CitySieveLogo } from '@/components/CitySieveLogo';

import 'leaflet/dist/leaflet.css';

type PinState = 'default' | 'hover' | 'active';

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

// Pill badge: rounded rectangle body + small sharp pointer triangle
const POINTER_H = 7;
const PIN_SIZES: Record<PinState, { pillW: number; pillH: number; r: number; fontSize: number }> = {
  default: { pillW: 36, pillH: 24, r: 6,  fontSize: 12 },
  hover:   { pillW: 40, pillH: 26, r: 7,  fontSize: 13 },
  active:  { pillW: 44, pillH: 28, r: 8,  fontSize: 14 },
};

function createPinIcon(rank: number, state: PinState, animate: boolean): L.DivIcon {
  const color = getRankColor(rank);
  const { pillW, pillH, r, fontSize } = PIN_SIZES[state];
  const totalH = pillH + POINTER_H;
  const cx = pillW / 2;
  const ptw = 7; // half-width of pointer base

  const animationClass = animate ? 'animate-map-pin' : '';
  const svg = `
    <svg class="${animationClass}" width="${pillW}" height="${totalH}" viewBox="0 0 ${pillW} ${totalH}" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35)); transition: width 0.2s ease, height 0.2s ease, viewBox 0.2s ease">
      <rect x="1" y="1" width="${pillW - 2}" height="${pillH - 2}" rx="${r}" ry="${r}" fill="${color}" stroke="white" stroke-width="1.5"/>
      <polygon points="${cx - ptw},${pillH - 1} ${cx + ptw},${pillH - 1} ${cx},${totalH - 1}" fill="${color}"/>
      <line x1="${cx - ptw}" y1="${pillH - 1}" x2="${cx}" y2="${totalH - 1}" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="${cx + ptw}" y1="${pillH - 1}" x2="${cx}" y2="${totalH - 1}" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      <text
        x="${cx}"
        y="${pillH / 2}"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${fontSize}"
        font-weight="700"
        fill="white"
      >${rank}</text>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [pillW, totalH],
    iconAnchor: [cx, totalH],
    popupAnchor: [0, -totalH - 4],
  });
}

interface ResultMapProps {
  results: ScoredArea[];
  activeIndex: number | null;
  hoverIndex: number | null;
  onMarkerClick: (index: number) => void;
  onMarkerHover: (index: number | null) => void;
  disabled?: boolean;
  centre?: { lat: number; lng: number } | null;
  searchedRadiusKm?: number;
}

function FlyToActive({ results, activeIndex }: { results: ScoredArea[]; activeIndex: number | null }) {
  const map = useMap();

  useEffect(() => {
    if (activeIndex !== null && results[activeIndex]) {
      const { lat, lng } = results[activeIndex].area.coordinates;
      map.flyTo([lat, lng], map.getZoom(), { duration: 0.5 });
    }
  }, [activeIndex, results, map]);

  return null;
}

function TileLoadingIndicator({ onLoadingChange }: { onLoadingChange: (loading: boolean) => void }) {
  useMapEvents({
    loading: () => onLoadingChange(true),
    load: () => onLoadingChange(false),
  });
  return null;
}

export function ResultMap({ results, activeIndex, hoverIndex, onMarkerClick, onMarkerHover, disabled = false, centre, searchedRadiusKm }: ResultMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const { resolvedTheme } = useTheme();
  const [tilesLoading, setTilesLoading] = useState(true);
  const animatePinsRef = useRef(true);

  useEffect(() => {
    // Disable initial drop animation after it completes so hover doesn't re-trigger it
    if (animatePinsRef.current) {
      const timer = setTimeout(() => {
        animatePinsRef.current = false;
      }, 1000);
      return () => clearTimeout(timer);
    }
  });

  if (results.length === 0) return null;

  const center = results[0].area.coordinates;
  const tile = resolvedTheme === 'dark' ? TILE_LAYERS.dark : TILE_LAYERS.light;

  return (
    <div className="relative z-0">
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={11}
      className="h-[400px] w-full rounded-lg"
      ref={mapRef}
      dragging={!disabled}
      zoomControl={!disabled}
      scrollWheelZoom={!disabled}
      doubleClickZoom={!disabled}
      touchZoom={!disabled}
    >
      <TileLoadingIndicator onLoadingChange={setTilesLoading} />
      <TileLayer
        key={tile.url}
        attribution={tile.attribution}
        url={tile.url}
      />
      <FlyToActive results={results} activeIndex={activeIndex} />
      {results.map((result, i) => {
        const rank = i + 1;
        const isActive = i === activeIndex;
        const isHovered = i === hoverIndex && !isActive;
        const state: PinState = isActive ? 'active' : isHovered ? 'hover' : 'default';

        return (
          <Marker
            key={result.area.id}
            position={[result.area.coordinates.lat, result.area.coordinates.lng]}
            icon={createPinIcon(rank, state, animatePinsRef.current)}
            eventHandlers={{
              click: () => onMarkerClick(i),
              mouseover: () => onMarkerHover(i),
              mouseout: () => onMarkerHover(null),
            }}
          >
            <Popup>
              <strong>{result.area.name}</strong>
              <br />
              Match: {Math.round(result.score)}%
            </Popup>
          </Marker>
        );
      })}
      {centre && searchedRadiusKm && (
        <SearchAreaCircles
          centre={[centre.lat, centre.lng]}
          searchedRadiusKm={searchedRadiusKm}
        />
      )}
    </MapContainer>
    {tilesLoading && (
      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
        <CitySieveLogo variant="icon-only" iconSize={40} animateDots />
      </div>
    )}
    </div>
  );
}

// ─── SearchAreaCircles ───────────────────────────────────────────────────────
function SearchAreaCircles({
  centre,
  searchedRadiusKm,
}: {
  centre: [number, number];
  searchedRadiusKm?: number;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  if (!searchedRadiusKm) return null;

  const innerColor = isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)';
  const innerStroke = isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.3)';

  return (
    <CircleWithLabel
      centre={centre}
      radiusKm={searchedRadiusKm}
      fillColor={innerColor}
      strokeColor={innerStroke}
      label={searchedRadiusKm <= 10 ? `${searchedRadiusKm} km` : undefined}
      isDark={isDark}
    />
  );
}

function CircleWithLabel({
  centre,
  radiusKm,
  fillColor,
  strokeColor,
  label,
  isDark,
}: {
  centre: [number, number];
  radiusKm: number;
  fillColor: string;
  strokeColor: string;
  label?: string;
  isDark: boolean;
}) {
  const radiusMeters = radiusKm * 1000;

  return (
    <Circle
      center={centre}
      radius={radiusMeters}
      pathOptions={{
        fillColor,
        fillOpacity: 1,
        color: strokeColor,
        weight: 2,
        dashArray: label ? undefined : '8, 8',
      }}
    >
      {label && (
        <Tooltip direction="center" permanent interactive={false} className="!bg-transparent !border-0 !shadow-none">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${isDark ? 'bg-slate-800/80 text-slate-200' : 'bg-white/80 text-slate-700'}`}>
            {label}
          </span>
        </Tooltip>
      )}
    </Circle>
  );
}
