"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import NetworkMap from "@/components/NetworkMap";
import Leaderboard from "@/components/Leaderboard";
import HistoryChart from "@/components/HistoryChart";
import RegistryLabel from "@/components/RegistryLabel";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Globe2, Layers, RefreshCw, Maximize, Minimize, X, Cpu, Zap, FileText, Search, Copy, Terminal, Check } from "lucide-react";

const BASE_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const formatNumber = (val: number) => {
  return new Intl.NumberFormat().format(val);
};

const getCountryName = (code: string) => {
  const names: Record<string, string> = {
    "US": "United States", "GB": "United Kingdom", "DE": "Germany", "FR": "France",
    "CN": "China", "IN": "India", "BR": "Brazil", "CA": "Canada", "AU": "Australia",
    "JP": "Japan", "KR": "South Korea", "SG": "Singapore", "SE": "Sweden",
    "CH": "Switzerland", "NL": "Netherlands"
  };
  return names[code] || code;
};

export default function Home() {
  const [stats, setStats] = useState<any>({ countries: [] });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState("All");
  const [derived, setDerived] = useState({
    totalTflops: "0.00",
    nodes: 0,
    topCountry: "-",
    carbonFootprint: "0.00"
  });

  const leaderboardRef = useRef<HTMLDivElement>(null);
  const [inspectedItem, setInspectedItem] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedShell, setSelectedShell] = useState<"unix" | "powershell">("unix");

  const installCommand = selectedShell === "unix" 
    ? "curl -sSL https://tflops.world/install.sh | bash"
    : "iwr -useb https://tflops.world/install.ps1 | iex";

  const copyCommand = () => {
    navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const loadData = useCallback(async (countryCode: string | null = null) => {
    try {
      const statsRes = await fetch(`${BASE_API}/v1/stats/global`);
      const statsData = await statsRes.json();
      setStats(statsData);

      const historyRes = await fetch(`${BASE_API}/v1/stats/history?year=${selectedYear}`);
      const historyData = await historyRes.json();
      setHistory(historyData);

      const lbUrl = countryCode
        ? `${BASE_API}/v1/leaderboard?country=${countryCode}`
        : `${BASE_API}/v1/leaderboard`;
      const leaderRes = await fetch(lbUrl);
      const leaderData = await leaderRes.json();
      setLeaderboard(leaderData);

      let totalTflops = 0;
      let nodes = 0;
      let totalCarbon = 0;
      let topCode = "-";
      let topAgg = 0;

      if (statsData?.countries) {
        statsData.countries.forEach((c: any) => {
          // If a country filter is active, only include matching regions
          if (countryCode && c.code !== countryCode) return;

          const currentAgg = (c.avg_tflops * c.device_count);
          totalTflops += currentAgg;
          nodes += c.device_count;

          // Carbon Calculation: (Avg Power W * Carbon intensity gCO2/W) * device_count
          totalCarbon += (c.avg_power * c.avg_carbon * c.device_count);

          if (currentAgg > topAgg) {
            topAgg = currentAgg;
            topCode = c.code;
          }
        });
      }

      const formatCompute = (val: number) => {
        if (val >= 1000000) return (val / 1000000).toFixed(2) + " EF";
        if (val >= 1000) return (val / 1000).toFixed(2) + " PF";
        return val.toFixed(2) + " TF";
      };

      const formatCarbon = (val: number) => {
        // Converting to "Index" value for the archival look
        const megatons = val / 1000000000;
        return megatons.toFixed(2) + " MT";
      };

      setDerived({
        totalTflops: formatCompute(totalTflops),
        nodes,
        topCountry: topCode,
        carbonFootprint: formatCarbon(totalCarbon)
      });
    } catch (e) {
      console.error("API error:", e);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadData(selectedCountry);
    const interval = setInterval(() => loadData(selectedCountry), 5000);
    return () => clearInterval(interval);
  }, [selectedCountry, selectedYear, loadData]);

  const handleCountrySelect = (code: string) => {
    const isNew = code !== selectedCountry;
    setSelectedCountry(isNew ? code : null);
    if (isNew && leaderboardRef.current) {
      leaderboardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const closeInspection = () => setInspectedItem(null);

  const cStats = stats.countries?.find((c: any) => c.code === selectedCountry);

  return (
    <div className="min-h-screen bg-background text-foreground py-20 px-6 flex flex-col items-center relative overflow-x-hidden">

      {/* Inspection Sidebar Overlay */}
      <AnimatePresence>
        {inspectedItem && (
          <React.Fragment key="inspection">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeInspection}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full md:w-[450px] bg-[#fcf9f2] border-l border-tech z-[101] flex flex-col p-10 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-10">
                <div className="mono-label !text-rust">Registry Forensic // ID: {inspectedItem.id}</div>
                <button onClick={closeInspection} className="p-2 hover:bg-tech/10 rounded border border-tech cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-8">
                <div>
                  <h2 className="text-3xl font-bold font-serif italic mb-2">{inspectedItem.gpu_model || inspectedItem.cpu_model}</h2>
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 bg-sage/10 text-sage text-[10px] font-bold uppercase rounded border border-sage/20 tracking-widest">
                      {inspectedItem.manufacturer}
                    </span>
                    <span className="px-2 py-0.5 bg-foreground/5 text-foreground/40 text-[10px] font-bold uppercase rounded border border-tech tracking-widest">
                      Verified
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-px bg-tech border border-tech">
                  <div className="bg-[#fcf9f2] p-5">
                    <div className="mono-label !text-[8px] mb-1">Architecture</div>
                    <div className="text-sm font-bold font-mono">{inspectedItem.arch}</div>
                  </div>
                  <div className="bg-[#fcf9f2] p-5">
                    <div className="mono-label !text-[8px] mb-1">Operating System</div>
                    <div className="text-sm font-bold font-mono">{inspectedItem.os}</div>
                  </div>
                  <div className="bg-[#fcf9f2] p-5">
                    <div className="mono-label !text-[8px] mb-1">RAM Capacity</div>
                    <div className="text-sm font-bold font-mono">{inspectedItem.ram_total_gb} GB</div>
                  </div>
                  <div className="bg-[#fcf9f2] p-5">
                    <div className="mono-label !text-[8px] mb-1">VRAM Capacity</div>
                    <div className="text-sm font-bold font-mono">{inspectedItem.vram_total_gb} GB</div>
                  </div>
                </div>

                <div className="p-8 border border-tech bg-white/50 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="mono-label">Throughput Index</span>
                    <span className="text-xl font-bold font-mono text-sage">{(inspectedItem.gpu_tflops_f32 || inspectedItem.cpu_tflops).toFixed(4)} TF</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="mono-label">Energy Intensity</span>
                    <span className="text-xl font-bold font-mono">{inspectedItem.estimated_power_w} W</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="mono-label">Carbon Impact</span>
                    <span className="text-xl font-bold font-mono">{(inspectedItem.carbon_intensity || 0).toFixed(2)} gCO2</span>
                  </div>
                </div>

                <div className="mt-10 pt-10 border-t border-tech">
                  <div className="mono-label mb-4">Cryptographic Audit Trail</div>
                  <div className="bg-black/5 p-4 rounded-sm font-mono text-[9px] break-all leading-relaxed text-foreground/60">
                    HASH_SIG: {inspectedItem.device_hash}<br />
                    TIMESTAMP: {inspectedItem.timestamp_utc}<br />
                    SCHEMA_VER: {inspectedItem.schema_ver}<br />
                    STATUS: AUTHORIZED_BY_GATING_V2
                  </div>
                </div>
              </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>

      <main className="w-full max-w-[1000px] flex flex-col">

        <header className="mb-24 flex flex-col items-center text-center relative w-full">
          <div className="absolute right-0 top-0 flex items-center gap-2">
            {selectedCountry && (
              <button
                onClick={() => setSelectedCountry(null)}
                className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-rust border border-rust/20 bg-rust/5 rounded hover:bg-rust hover:text-white transition-all mr-4 cursor-pointer"
              >
                <X size={12} /> Clear Filter [{selectedCountry}]
              </button>
            )}
            <button onClick={() => loadData(selectedCountry)} className="p-2 hover:bg-tech/10 rounded-lg text-foreground/40 border border-tech transition-colors cursor-pointer">
              <RefreshCw size={18} />
            </button>
            <button onClick={toggleFullscreen} className="p-2 hover:bg-tech/10 rounded-lg text-foreground/40 border border-tech transition-colors cursor-pointer">
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>

          <RegistryLabel
            className="mb-6"
            text="Official Archive // Global TFLOPS Census"
          />
          <h1 className="text-6xl font-extrabold mb-8 tracking-tighter max-w-3xl leading-[1.1]">
            Global <span className="text-sage italic font-serif">TFLOPS</span> Report.
          </h1>
          <p className="text-xl text-foreground/70 max-w-2xl leading-relaxed italic">
            A real-time comprehensive audit of decentralized hardware throughput, cryptographic verification protocols, and regional intelligence saturation levels.
          </p>
          <div className="mt-12 flex items-center gap-10">
            <div className="flex flex-col items-center text-center">
              <span className="mono-label !text-sage">Status</span>
              <span className="text-sm font-bold uppercase tracking-widest mt-1">Authorized</span>
            </div>
            <div className="w-px h-8 bg-tech" />
            <div className="flex flex-col items-center text-center">
              <span className="mono-label">Version</span>
              <span className="text-sm font-bold uppercase tracking-widest mt-1">v0.0.1</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-16 w-full max-w-xl group relative"
          >
            <div className="flex items-center gap-2 mb-3">
              <button 
                onClick={() => setSelectedShell("unix")}
                className={`text-[9px] uppercase tracking-widest px-3 py-1 rounded-full border transition-all cursor-pointer ${selectedShell === "unix" ? "bg-sage text-black border-sage" : "text-foreground/40 border-tech/50 hover:border-sage/50"}`}
              >
                Unix Shell
              </button>
              <button 
                onClick={() => setSelectedShell("powershell")}
                className={`text-[9px] uppercase tracking-widest px-3 py-1 rounded-full border transition-all cursor-pointer ${selectedShell === "powershell" ? "bg-sage text-black border-sage" : "text-foreground/40 border-tech/50 hover:border-sage/50"}`}
              >
                PowerShell
              </button>
            </div>
            <div className="relative flex items-center bg-[#1a1a1a] text-white p-4 rounded-lg border border-white/10 overflow-hidden">
              <div className="flex items-center gap-3 shrink-0 mr-4 border-r border-white/10 pr-4">
                <Terminal size={18} className="text-sage" />
              </div>
              <code className="text-sm font-mono text-sage/90 flex-1 truncate text-left select-all">
                {installCommand}
              </code>
              <button
                onClick={copyCommand}
                className="ml-4 p-2 hover:bg-white/10 rounded-md transition-all cursor-pointer text-white/40 hover:text-white"
                title="Copy to clipboard"
              >
                {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-center gap-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-foreground/30 font-bold">Initiate Forensic Audit Vector</span>
              <div className="h-px w-8 bg-tech/20" />
              <span className="text-[9px] font-mono text-sage animate-pulse">Waiting for synchronization...</span>
            </div>
          </motion.div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-0 border-t border-b border-tech mb-24 py-12">
          <div className="flex flex-col items-center border-b md:border-b-0 md:border-r border-tech pb-10 md:pb-0 relative group">
            <span className="mono-label mb-2">Global Capacity Index</span>
            <span className="text-4xl font-bold font-mono tracking-tighter">{derived.totalTflops}</span>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-[10px] text-sage font-bold uppercase tracking-widest">+12.4% Velocity</span>
              <div className="w-1 h-1 bg-sage rounded-full animate-pulse" />
            </div>
            <span className="text-[8px] text-foreground/30 mt-1 uppercase opacity-0 group-hover:opacity-100 transition-opacity">Certified Throughput GCI-1</span>
          </div>
          <div className="flex flex-col items-center border-b md:border-b-0 md:border-r border-tech py-10 md:py-0">
            <span className="mono-label mb-2">Network Expansion</span>
            <span className="text-4xl font-bold font-mono tracking-tighter">{formatNumber(derived.nodes)}</span>
            <span className="text-[10px] text-foreground/40 mt-2 uppercase">Active Sync Clusters</span>
          </div>
          <div className="flex flex-col items-center border-b md:border-b-0 md:border-r border-tech py-10 md:py-0">
            <span className="mono-label mb-2">Dominant Region</span>
            <span className="text-4xl font-bold font-mono tracking-tighter">{derived.topCountry}</span>
            <span className="text-[10px] text-foreground/40 mt-2 uppercase">Primary Geo-Cluster</span>
          </div>
          <div className="flex flex-col items-center pt-10 md:pt-0">
            <span className="mono-label mb-2">Carbon Footprint</span>
            <span className="text-4xl font-bold font-mono tracking-tighter">{derived.carbonFootprint}</span>
            <span className="text-[10px] text-foreground/40 mt-2 uppercase">Est. Net Intensity</span>
          </div>
        </section>



        <section className="appendix-sheet mb-24 relative">
          <div className="p-8 border-b border-tech flex justify-between items-center bg-[#f2efe6]/30">
            <div>
              <h3 className="text-lg font-bold">Fig. 1 // Global Network Connectivity</h3>
              <p className="mono-label !lowercase">Click a regional cluster to filter the compute authority leaderboard.</p>
            </div>
            <Globe2 size={24} className="text-sage opacity-40 shrink-0" />
          </div>
          <div className="flex flex-col md:flex-row bg-[#fcf9f2] min-h-[500px]">
            <div className="flex-1 flex items-center justify-center relative overflow-hidden p-8 border-r border-tech">
              <div className="absolute inset-0 bg-radial-[circle_at_50%_50%] from-sage/5 to-transparent pointer-none" />
              <NetworkMap
                stats={stats}
                onCountrySelect={handleCountrySelect}
                selectedCountry={selectedCountry}
              />
            </div>

            <div className="w-full md:w-80 p-8 flex flex-col gap-8 bg-tech/5 shrink-0">
              <div className="mono-label !text-sage">Regional Audit</div>
              {cStats ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={selectedCountry}
                  className="flex flex-col gap-8"
                >
                  <div>
                    <h4 className="text-2xl font-bold font-serif italic">{getCountryName(selectedCountry || '')}</h4>
                    <span className="text-[10px] text-foreground/40 uppercase font-mono tracking-widest">Active Geo-Cluster</span>
                  </div>

                  <div className="flex flex-col gap-10">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="flex flex-col">
                        <span className="text-3xl font-bold font-mono tracking-tighter">{formatNumber(cStats.device_count)}</span>
                        <span className="text-[10px] text-sage uppercase font-bold tracking-widest mt-1">Validated Clusters</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-3xl font-bold font-mono tracking-tighter">{cStats.avg_tflops ? cStats.avg_tflops.toFixed(2) : '0.00'} TF</span>
                        <span className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest mt-1">Mean Regional Throughput</span>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-tech/30 flex flex-col gap-6">
                      <div className="mono-label !text-rust uppercase">Infrastructure DNA</div>
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-xl font-bold font-mono">{cStats.top_vendor || 'Unknown'}</span>
                          <span className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest mt-1">Lead Provider</span>
                        </div>
                        <Cpu size={24} className="text-foreground/20" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xl font-bold font-mono">{cStats.top_tflops ? cStats.top_tflops.toFixed(2) : '0.00'} TF</span>
                        <span className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest mt-1">Peak Unit Capacity</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedCountry(null)}
                    className="mt-4 text-[10px] font-bold text-rust uppercase tracking-widest border border-rust/20 p-2 text-center hover:bg-rust hover:text-white transition-all cursor-pointer"
                  >
                    Reset Scope
                  </button>
                </motion.div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-20">
                  <Layers size={32} className="mb-4" />
                  <p className="text-xs italic">Select a geographic point to initialize regional data audit.</p>
                </div>
              )}
            </div>
          </div>
          <div className="p-4 bg-tech/10 flex items-center gap-6 justify-center border-t border-tech">
            <div className="flex items-center gap-2 mono-label"><div className="w-2 h-2 bg-sage rounded-full" /> Operational Region</div>
            <div className="flex items-center gap-2 mono-label"><div className="w-2 h-2 bg-rust rounded-full" /> Network Primary Hub</div>
          </div>
        </section>

        <section className="mb-24">
          <HistoryChart
            data={history}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        </section>

        <section className="flex flex-col mb-24" ref={leaderboardRef}>
          <div className="flex justify-between items-end mb-8">
            <div className="flex-1">
              <div className="mono-label !text-rust mb-2 font-black tracking-[0.2em]">Appendix A</div>
              <h2 className="text-3xl font-black italic underline decoration-tech decoration-4 underline-offset-8">
                TFLOPS Authority {selectedCountry ? `[${selectedCountry}]` : 'Index'}.
              </h2>
            </div>
          </div>
          <div className="appendix-sheet">
            <Leaderboard
              data={leaderboard}
              onInspect={setInspectedItem}
              selectedId={inspectedItem?.id}
            />
          </div>
        </section>

        <footer className="pt-24 pb-12 border-t border-tech text-center flex flex-col items-center">
          <p className="text-[10px] text-foreground/40 font-mono uppercase tracking-[0.4em] max-w-2xl leading-relaxed">
            SECURED VIA CRYPTOGRAPHIC ATTESTATION • AUTHORIZED UNDER GLOBAL INTELLIGENCE PROTOCOL CM-2027/A • TFLOPS DECENTRALIZED VERIFICATION NETWORK
          </p>
        </footer>

      </main>
    </div>
  );
}
