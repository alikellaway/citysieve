'use client';

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from 'next-themes';
import type { Poi, AmenityCategory } from '@/lib/poi-types';
import { CATEGORY_CONFIG } from '@/lib/poi-types';

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

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

function createPoiIcon(category: AmenityCategory): L.DivIcon {
  const config = CATEGORY_CONFIG[category];
  return L.divIcon({
    html: `
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: ${config.color};
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        cursor: pointer;
      ">
        ${config.icon}
      </div>
    `,
    className: 'poi-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

interface AreaModalMapProps {
  center: { lat: number; lng: number };
  pois: Poi[];
  activeFilter: AmenityCategory | 'all';
  onPoiClick?: (poi: Poi) => void;
}

function FitBounds({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView([center.lat, center.lng], 15, { animate: true });
  }, [center.lat, center.lng, map]);
  
  return null;
}

function MarkerLayer({ 
  pois, 
  activeFilter, 
}: { 
  pois: Poi[]; 
  activeFilter: AmenityCategory | 'all';
}) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const isInitializedRef = useRef(false);

  const filteredPois = useMemo(() => {
    if (activeFilter === 'all') return pois;
    return pois.filter(poi => poi.category === activeFilter);
  }, [pois, activeFilter]);

  useEffect(() => {
    if (!isInitializedRef.current) {
      clusterRef.current = L.markerClusterGroup({
        maxClusterRadius: 40,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          let size = 40;
          if (count >= 20) size = 48;
          if (count >= 50) size = 56;
          return L.divIcon({
            html: `<div style="
              width: ${size}px;
              height: ${size}px;
              border-radius: 50%;
              background: #3b82f6;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: ${size >= 50 ? 16 : 14}px;
              font-weight: 700;
              color: white;
              font-family: system-ui, -apple-system, sans-serif;
            ">${count}</div>`,
            className: 'cluster-marker',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });
        },
      });
      map.addLayer(clusterRef.current);
      isInitializedRef.current = true;
    }

    const cluster = clusterRef.current;
    if (!cluster) return;

    cluster.clearLayers();

    filteredPois.forEach(poi => {
      const marker = L.marker([poi.lat, poi.lng], {
        icon: createPoiIcon(poi.category),
      });

      const config = CATEGORY_CONFIG[poi.category];
      marker.bindPopup(`
        <div style="min-width: 150px;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${poi.name}</div>
          <div style="font-size: 12px; color: #6b7280; display: flex; align-items: center; gap: 4px;">
            <span>${config.icon}</span>
            <span>${config.label}</span>
          </div>
          <a 
            href="https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lng}"
            target="_blank"
            rel="noopener noreferrer"
            style="
              display: inline-block;
              margin-top: 8px;
              font-size: 12px;
              color: #3b82f6;
              text-decoration: underline;
            "
          >
            Open in Google Maps
          </a>
        </div>
      `);

      cluster.addLayer(marker);
    });

    return () => {
      if (clusterRef.current && map.hasLayer(clusterRef.current)) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, [map, filteredPois]);

  return null;
}

export function AreaModalMap({ center, pois, activeFilter }: AreaModalMapProps) {
  const { resolvedTheme } = useTheme();
  const tile = resolvedTheme === 'dark' ? TILE_LAYERS.dark : TILE_LAYERS.light;

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={15}
      className="h-full w-full rounded-lg"
      style={{ minHeight: '300px' }}
    >
      <TileLayer
        key={tile.url}
        attribution={tile.attribution}
        url={tile.url}
      />
      <FitBounds center={center} />
      <MarkerLayer pois={pois} activeFilter={activeFilter} />
    </MapContainer>
  );
}
