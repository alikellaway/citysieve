'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { ScoredArea } from '@/lib/scoring/engine';

import 'leaflet/dist/leaflet.css';

// Fix default marker icons that break with bundlers
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const activeIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
  shadowSize: [49, 49],
  className: 'active-marker',
});

interface ResultMapProps {
  results: ScoredArea[];
  activeIndex: number | null;
  onMarkerClick: (index: number) => void;
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

export function ResultMap({ results, activeIndex, onMarkerClick }: ResultMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  if (results.length === 0) return null;

  // Centre on first result
  const center = results[0].area.coordinates;

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={11}
      className="h-[400px] w-full rounded-lg"
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToActive results={results} activeIndex={activeIndex} />
      {results.map((result, i) => (
        <Marker
          key={result.area.id}
          position={[result.area.coordinates.lat, result.area.coordinates.lng]}
          icon={i === activeIndex ? activeIcon : defaultIcon}
          eventHandlers={{ click: () => onMarkerClick(i) }}
        >
          <Popup>
            <strong>{result.area.name}</strong>
            <br />
            Match: {Math.round(result.score)}%
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
