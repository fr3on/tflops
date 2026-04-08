"use client";
import React from "react";
import { Cpu, Zap, Database, Search, FileText } from "lucide-react";
import Link from "next/link";

interface LeaderboardProps {
  data: any[];
  onInspect: (item: any) => void;
  selectedId: number | null;
}

export default function Leaderboard({ data, onInspect, selectedId }: LeaderboardProps) {
  if (!data || !Array.isArray(data) || data.length === 0) return (
    <div className="p-12 flex flex-col items-center justify-center bg-tech/5 border border-dashed border-tech font-mono">
      <div className="w-6 h-6 border-2 border-sage rounded-full animate-ping mb-4" />
      <div className="text-[10px] uppercase tracking-widest text-foreground/40 italic">Awaiting Global Intelligence Feed...</div>
    </div>
  );

  // Calculate peak for relative capacity bars
  const maxTflops = Math.max(...data.map(item => item.gpu_tflops_f32 || item.cpu_tflops || 0.1), 1);

  const getVendorColor = (vendor: string) => {
    switch (vendor?.toUpperCase()) {
      case "NVIDIA": return "bg-[#76b900]/10 text-[#76b900] border-[#76b900]/20";
      case "APPLE": return "bg-slate-400/10 text-slate-600 border-slate-400/20";
      case "AMD": return "bg-red-500/10 text-red-600 border-red-500/20";
      case "INTEL": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default: return "bg-foreground/5 text-foreground/40 border-foreground/10";
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse font-mono">
        <thead className="bg-[#f2efe6] border-y border-tech">
          <tr>
            <th className="py-5 px-8 text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] font-serif">Rank</th>
            <th className="py-5 px-8 text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] font-serif">Infrastructure Specification</th>
            <th className="py-5 px-8 text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] font-serif">Capacity Index</th>
            <th className="py-5 px-8 text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] font-serif text-right font-serif">Verified Throughput</th>
            <th className="py-5 px-8 text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] font-serif text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-tech/30">
          {data.slice(0, 30).map((item, index) => {
            const currentTflops = item.gpu_tflops_f32 || item.cpu_tflops || 0;
            const capacityPerc = (currentTflops / maxTflops) * 100;
            const isSelected = selectedId === item.id;

            return (
              <tr
                key={item.id}
                className={`transition-colors group cursor-pointer ${isSelected ? 'bg-sage/10' : 'hover:bg-sage/5'}`}
                onClick={() => onInspect(item)}
              >
                <td className="py-6 px-8 text-xs font-bold text-foreground/20 italic font-serif">
                  {String(index + 1).padStart(3, '0')}
                </td>
                <td className="py-6 px-8">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-foreground group-hover:text-sage transition-colors font-serif italic">
                        {item.gpu_model || item.cpu_model}
                      </span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full border font-bold tracking-widest uppercase ${getVendorColor(item.manufacturer)}`}>
                        {item.manufacturer || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-foreground/40 uppercase font-bold tracking-tighter">
                      <span className="flex items-center gap-1 opacity-60">
                        <Database size={10} /> {item.vram_total_gb || item.ram_total_gb || '--'} GB
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 opacity-60">
                        <Zap size={10} /> {item.estimated_power_w || '--'} W
                      </span>
                      <span>•</span>
                      <span className="opacity-40 font-mono tracking-widest">{item.device_hash}</span>
                    </div>
                  </div>
                </td>
                <td className="py-6 px-8">
                  <div className="flex flex-col gap-1.5 min-w-[100px]">
                    <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-widest text-foreground/30">
                      <span>Capacity</span>
                      <span>{Math.round(capacityPerc)}%</span>
                    </div>
                    <div className="w-full h-1 bg-tech/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sage transition-all duration-1000 ease-out"
                        style={{ width: `${capacityPerc}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-6 px-8 text-right">
                  <div className="text-base font-black tabular-nums text-sage leading-none">
                    {currentTflops.toFixed(3)} <span className="text-[10px] font-bold opacity-40">TF</span>
                  </div>
                </td>
                <td className="py-6 px-8 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      title="Quick Inspect"
                      className={`p-2 rounded border transition-all ${isSelected ? 'bg-sage text-white border-sage' : 'border-tech text-foreground/20 hover:border-sage hover:text-sage'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspect(item);
                      }}
                    >
                      <Search size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="p-10 bg-[#f2efe6]/20 border-t border-tech flex justify-between items-center">
        <div className="text-[10px] italic text-foreground/40 font-serif max-w-md">
          * All infrastructure records are cryptographically verified against the Global Gating Authority. Performance bars are relative to the highest performing node in the current intelligence epoch.
        </div>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-sage/40" />
          <div className="w-2 h-2 rounded-full bg-sage/20" />
          <div className="w-2 h-2 rounded-full bg-sage/10" />
        </div>
      </div>
    </div>
  );
}
