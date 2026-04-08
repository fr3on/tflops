"use client";
import React, { useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { Tooltip } from "react-tooltip";
import 'react-tooltip/dist/react-tooltip.css';
import { getCentroid } from "@/lib/centroids";

// Using our local verified GeoJSON for 100% reliability and data consistency
const geoUrl = "/world.json";

interface NetworkMapProps {
  stats: any;
  onCountrySelect: (code: string) => void;
  selectedCountry: string | null;
}

export default function NetworkMap({ stats, onCountrySelect, selectedCountry }: NetworkMapProps) {
  const statsMap = useMemo(() => {
    const map = new Map();
    if (stats?.countries) {
      stats.countries.forEach((c: any) => map.set(c.code, c));
    }
    return map;
  }, [stats]);

  const countryList: any[] = useMemo(() => stats?.countries || [], [stats]);

  const primaryHub = useMemo(() => {
    if (!countryList.length) return null;
    return countryList.reduce((prev, current) => 
      (prev.avg_score * prev.device_count > current.avg_score * current.device_count) ? prev : current
    );
  }, [countryList]);

  return (
    <div className="w-full h-full min-h-[500px] cursor-crosshair relative">
      <ComposableMap
        projectionConfig={{ scale: 200 }}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              // Standard extraction from our local countries.geojson
              const props = geo.properties;
              const iso = props.iso_a2 || props.ISO_A2 || "XX";
              const name = props.name || props.NAME || "Unknown Territory";
              
              const isSelected = selectedCountry === iso;
              const hasData = statsMap.has(iso);
              const countryStats = statsMap.get(iso);

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  data-tooltip-id="map-tooltip"
                  data-tooltip-content={hasData ? `${name}: ${countryStats.device_count} Node(s)` : `${name}: No cluster detected`}
                  onClick={() => onCountrySelect(iso)}
                  style={{
                    default: {
                      fill: isSelected ? "#3d7a5a" : hasData ? "#e8e5dc" : "#f1f1f1",
                      stroke: "#d1d5db",
                      strokeWidth: 0.5,
                      outline: "none",
                    },
                    hover: {
                      fill: "#3d7a5a",
                      stroke: "#3d7a5a",
                      strokeWidth: 0.5,
                      outline: "none",
                      cursor: "pointer",
                    },
                    pressed: {
                      fill: "#8c4a4a",
                      outline: "none",
                    },
                  }}
                />
              );
            })
          }
        </Geographies>

        {primaryHub && countryList.map((c: any) => {
          if (c.code === primaryHub.code) return null;
          const start = getCentroid(primaryHub.code);
          const end = getCentroid(c.code);
          if (!start || !end) return null;

          const [x1, y1] = start;
          const [x2, y2] = end;

          return (
            <path
              key={`arc-${c.code}`}
              d={`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 - 20} ${x2} ${y2}`}
              fill="none"
              stroke="#3d7a5a"
              strokeWidth={0.3}
              opacity={0.15}
              strokeDasharray="2,2"
            />
          );
        })}

        {countryList.map((c: any) => {
          const coordinates = getCentroid(c.code);
          if (!coordinates) return null;
          
          const isPrimary = primaryHub?.code === c.code;
          const radius = Math.max(1.5, Math.min(6, Math.log10(c.device_count + 1) * 2));
          
          return (
            <Marker key={c.code} coordinates={coordinates as [number, number]} onClick={() => onCountrySelect(c.code)}>
              <circle 
                r={radius} 
                fill={isPrimary ? "#8c4a4a" : "#3d7a5a"} 
                stroke="#fff" 
                strokeWidth={0.5} 
                className="transition-all hover:scale-150 cursor-pointer"
              />
              <text
                textAnchor="middle"
                y={-(radius + 4)}
                style={{ 
                    fontFamily: "var(--font-mono)", 
                    fontSize: "7px", 
                    fill: "#1a1a1a", 
                    opacity: 0.4,
                    fontWeight: "bold",
                    pointerEvents: "none"
                }}
              >
                {c.code}
              </text>
            </Marker>
          );
        })}
      </ComposableMap>
      <Tooltip 
        id="map-tooltip" 
        style={{ 
            backgroundColor: "#fcf9f2", 
            color: "#1a1a1a", 
            border: "1px solid #e8e4db",
            borderRadius: "0px",
            fontSize: "10px",
            fontFamily: "var(--font-mono)",
            fontWeight: "bold",
            padding: "8px 12px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
            zIndex: 1000
        }} 
      />
    </div>
  );
}
