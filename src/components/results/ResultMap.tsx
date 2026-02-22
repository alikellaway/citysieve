'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from 'next-themes';
import type { ScoredArea } from '@/lib/scoring/engine';
import { getRankColor } from '@/components/results/rankColors';

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

const PIN_SIZES: Record<PinState, { width: number; height: number; anchorY: number }> = {
  default: { width: 28, height: 38, anchorY: 38 },
  hover: { width: 32, height: 43, anchorY: 43 },
  active: { width: 36, height: 48, anchorY: 48 },
};

function createPinIcon(rank: number, state: PinState): L.DivIcon {
  const color = getRankColor(rank);
  const { width, height, anchorY } = PIN_SIZES[state];
  const fontSize = state === 'active' ? 14 : state === 'hover' ? 13 : 12;
  const topRadius = (width - 4) / 2;

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M${width / 2} ${height - 2}
           C${width / 2 - 3} ${height - 10} ${width / 2 - 6} ${height - 14} ${width / 2 - 6} ${topRadius + 6}
           C${width / 2 - 6} ${topRadius - 2} ${width / 2 - topRadius} 4 ${width / 2} 4
           C${width / 2 + topRadius} 4 ${width / 2 + 6} ${topRadius - 2} ${width / 2 + 6} ${topRadius + 6}
           C${width / 2 + 6} ${height - 14} ${width / 2 + 3} ${height - 10} ${width / 2} ${height - 2}Z"
        fill="${color}"
        stroke="white"
        stroke-width="2"
      />
      <circle cx="${width / 2}" cy="${topRadius + 4}" r="${topRadius - 4}" fill="${color}" />
      <text
        x="${width / 2}"
        y="${topRadius + 8}"
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
    iconSize: [width, height],
    iconAnchor: [width / 2, anchorY],
    popupAnchor: [0, -anchorY - 8],
  });
}

interface ResultMapProps {
  results: ScoredArea[];
  activeIndex: number | null;
  hoverIndex: number | null;
  onMarkerClick: (index: number) => void;
  onMarkerHover: (index: number | null) => void;
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

export function ResultMap({ results, activeIndex, hoverIndex, onMarkerClick, onMarkerHover }: ResultMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const { resolvedTheme } = useTheme();

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
    >
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
            icon={createPinIcon(rank, state)}
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
    </MapContainer>
    </div>
  );
}
