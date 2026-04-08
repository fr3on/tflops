"use client";
import { useEffect, useRef } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";

const idToIso: Record<string, string> = {
  "840": "US", "124": "CA", "392": "JP", "276": "DE", "250": "FR",
  "826": "GB", "156": "CN", "410": "KR", "356": "IN", "076": "BR",
  "710": "ZA", "036": "AU", "643": "RU", "528": "NL", "752": "SE",
  "756": "CH", "040": "AT", "056": "BE", "724": "ES", "380": "IT",
  "484": "MX", "608": "PH", "702": "SG", "458": "MY", "360": "ID",
  "818": "EG", "784": "AE", "682": "SA", "792": "TR"
};

export default function GlobeMap({ stats }: { stats: any }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 600;

    d3.select(containerRef.current).select("svg").remove();

    const svg = d3.select(containerRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("background", "transparent");

    const projection = d3.geoNaturalEarth1()
      .scale(width / 5.5)
      .translate([width / 2, height / 1.7]);

    const path = d3.geoPath().projection(projection);

    const statsMap = new Map();
    if (stats?.countries) {
      stats.countries.forEach((d: any) => statsMap.set(d.code, d));
    }

    d3.json("https://unpkg.com/world-atlas@2.0.2/countries-110m.json").then((world: any) => {
      const countries = (topojson.feature(world, world.objects.countries) as any).features;

      svg.selectAll(".country")
        .data(countries)
        .enter()
        .append("path")
        .attr("d", path as any)
        .attr("fill", (d: any) => {
          const iso = idToIso[d.id];
          if (!iso) return "#1a1f26";
          const countryStats = statsMap.get(iso);
          if (!countryStats) return "#1a1f26";
          const intensity = Math.min(countryStats.avg_score / 1000, 1.0);
          return d3.interpolateBlues(0.2 + intensity * 0.8);
        })
        .style("stroke", "rgba(255,255,255,0.05)")
        .style("stroke-width", "0.5px")
        .on("mouseover", function() {
          d3.select(this).style("stroke", "rgba(0, 210, 255, 0.5)").style("stroke-width", "1.5px");
        })
        .on("mouseout", function() {
          d3.select(this).style("stroke", "rgba(255,255,255,0.05)").style("stroke-width", "0.5px");
        })
        .append("title")
        .text((d: any) => {
          const iso = idToIso[d.id] || "XX";
          const countryStats = statsMap.get(iso);
          if (countryStats) {
            return `${d.properties.name} (${iso})\nAverage Score: ${countryStats.avg_score.toFixed(1)}\nDevices: ${countryStats.device_count}`;
          }
          return `${d.properties.name} - No data`;
        });
    });
  }, [stats]);

  return (
    <div ref={containerRef} className="w-full relative">
      <div className="absolute inset-0 bg-radial-[circle_at_50%_50%] from-accent-blue/5 to-transparent pointer-none" />
    </div>
  );
}
