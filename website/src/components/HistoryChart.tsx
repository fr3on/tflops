"use client";
import React from "react";
import { motion } from "framer-motion";

interface HistoryPoint {
  month: string;
  total_tflops: number;
  device_count: number;
}

export default function HistoryChart({ 
    data, 
    selectedYear, 
    onYearChange 
}: { 
    data: HistoryPoint[], 
    selectedYear: string,
    onYearChange: (y: string) => void
}) {
  if (!data || data.length === 0) return (
    <div className="h-64 flex flex-col items-center justify-center border border-tech bg-tech/5 border-dashed">
        <div className="w-8 h-8 border-2 border-tech rounded-full animate-pulse mb-4" />
        <div className="mono-label">Initializing Temporal Audit...</div>
    </div>
  );

  const padding = 60;
  const width = 1000;
  const height = 300;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxVal = Math.max(...data.map(d => d.total_tflops), 1);
  const minVal = Math.min(...data.map(d => d.total_tflops), 0);
  const range = (maxVal - minVal) || 1; // Prevent division by zero

  const points = data.map((d, i) => {
    // Prevent division by zero if only 1 data point
    const xDist = (data.length > 1) ? (i / (data.length - 1)) : 0.5;
    const x = padding + xDist * chartWidth;
    const y = height - padding - ((d.total_tflops - minVal) / range) * chartHeight;
    return { x, y, value: d.total_tflops, month: d.month };
  });

  const pathD = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ")
    : "";

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length-1].x} ${height-padding} L ${points[0].x} ${height-padding} Z`
    : "";

  const formatTF = (val: number) => {
      if (val >= 1000000) return (val / 1000000).toFixed(2) + " EF";
      if (val >= 1000) return (val / 1000).toFixed(1) + " PF";
      return val.toFixed(0) + " TF";
  };

  return (
    <div className="w-full bg-[#fcf9f2] border border-tech relative select-none">
      <div className="p-6 border-b border-tech flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#f2efe6]/30">
          <div className="flex flex-col">
              <span className="mono-label !text-rust mb-1">Fig. 2 // Expansion Forensic</span>
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Global Compute Expansion Dynamics</h3>
          </div>
          <div className="flex gap-1 bg-tech/5 p-1 border border-tech">
              {["2025", "2026", "All"].map((yr) => (
                  <button
                    key={yr}
                    onClick={() => onYearChange(yr)}
                    className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                        selectedYear === yr 
                        ? "bg-sage text-white" 
                        : "text-foreground/40 hover:text-foreground hover:bg-tech/10"
                    }`}
                  >
                      {yr}
                  </button>
              ))}
          </div>
      </div>

      <div className="relative p-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible font-mono">
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                <g key={i}>
                    <line 
                        x1={padding} 
                        y1={height - padding - (p * chartHeight)} 
                        x2={width - padding} 
                        y2={height - padding - (p * chartHeight)} 
                        stroke="currentColor" 
                        strokeWidth="1" 
                        className="text-tech opacity-10" 
                        strokeDasharray="4 4"
                    />
                    <text 
                        x={padding - 10} 
                        y={height - padding - (p * chartHeight)} 
                        textAnchor="end" 
                        alignmentBaseline="middle" 
                        className="fill-foreground/30 text-[9px] font-bold uppercase"
                    >
                        {formatTF(minVal + (p * range))}
                    </text>
                </g>
            ))}

            {/* Area Fill */}
            <motion.path 
                d={areaD}
                fill="url(#areaGradient)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5 }}
            />

            {/* Main Line */}
            <motion.path 
                d={pathD}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-sage"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, ease: "easeInOut" }}
            />

            {/* X Axis Labels */}
            {points.map((p, i) => (
                (i % 2 === 0 || i === data.length - 1) && (
                    <text 
                        key={i}
                        x={p.x}
                        y={height - padding + 20}
                        textAnchor="middle"
                        className="fill-foreground/40 text-[9px] font-bold uppercase tracking-widest"
                    >
                        {p.month}
                    </text>
                )
            ))}

            {/* Target Milestone Guide */}
            <line 
                x1={padding} 
                y1={padding - 20} 
                x2={width - padding} 
                y2={padding - 20} 
                stroke="currentColor" 
                className="text-rust/20" 
                strokeWidth="1" 
                strokeDasharray="6 4" 
            />
            <text 
                x={width - padding} 
                y={padding - 28} 
                textAnchor="end" 
                className="fill-rust/40 text-[8px] font-bold uppercase tracking-[0.2em]"
            >
                Milestone Alpha: 1.0 PF Target
            </text>

            {/* Data Points */}
            {points.map((p, i) => (
                <g key={i} className="group cursor-help">
                    <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r="4" 
                        className="fill-sage"
                    />
                    <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r="8" 
                        className="fill-sage/0 hover:fill-sage/10 transition-colors"
                    />
                    <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <rect 
                            x={p.x - 35} 
                            y={p.y - 35} 
                            width="70" 
                            height="25" 
                            className="fill-white stroke-tech" 
                            strokeWidth="1"
                        />
                        <text 
                            x={p.x} 
                            y={p.y - 18} 
                            textAnchor="middle" 
                            className="fill-foreground text-[10px] font-black"
                        >
                            {formatTF(p.value)}
                        </text>
                    </g>
                </g>
            ))}

            <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" className="text-sage" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" className="text-sage" />
                </linearGradient>
            </defs>
        </svg>
      </div>

      <div className="p-6 border-t border-tech bg-tech/5 flex justify-between items-center text-[10px] font-serif italic text-foreground/40">
          <div>* Analysis covers localized hardware expansion across the current intelligence epoch.</div>
          <div className="flex gap-1">
              <div className="w-px h-3 bg-tech" />
              <div className="w-px h-3 bg-tech" />
              <div className="w-px h-3 bg-tech" />
          </div>
      </div>
    </div>
  );
}
