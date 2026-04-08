"use client";
import React, { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { Cpu, Zap, Shield, Globe2, FileText, ArrowLeft, Printer, Share2, Binary, Fingerprint } from "lucide-react";
import Link from "next/link";

const BASE_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const formatNumber = (val: number) => {
  return new Intl.NumberFormat().format(val);
};

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ReportContent() {
  const searchParams = useSearchParams();
  const idStr = searchParams.get("id");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!idStr) {
      setLoading(false);
      return;
    }
    fetch(`${BASE_API}/v1/submission/${idStr}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, [idStr]);

  if (!idStr || data?.error) return (
    <div className="min-h-screen bg-[#fcf9f2] flex flex-col items-center justify-center p-20 text-center">
      <h1 className="text-4xl font-bold text-rust mb-4">REDACTED // 404</h1>
      <p className="mono-label italic mb-8">Intelligence report not found in current epoch.</p>
      <Link href="/" className="px-6 py-2 border border-tech hover:bg-tech/10 transition-colors uppercase text-[10px] font-bold tracking-widest">
        Return to Global Census
      </Link>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-[#fcf9f2] flex flex-col items-center justify-center p-20">
      <div className="w-12 h-12 border-4 border-tech border-t-sage rounded-full animate-spin mb-6" />
      <div className="mono-label animate-pulse">Retrieving Hardware Forensic Audit...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcf9f2] text-foreground flex flex-col items-center py-20 px-6 font-serif">

      {/* Top Controls Overlay */}
      <div className="max-w-[800px] w-full mb-12 flex justify-between items-center no-print">
        <Link href="/" className="flex items-center gap-2 group text-foreground/40 hover:text-foreground transition-colors cursor-pointer">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="mono-label">Return to Census</span>
        </Link>
        <div className="flex gap-4">
          <button onClick={() => window.print()} className="p-2 border border-tech hover:bg-tech/10 transition-colors cursor-pointer text-foreground/60">
            <Printer size={18} />
          </button>
          <button className="p-2 border border-tech hover:bg-tech/10 transition-colors cursor-pointer text-foreground/60">
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* The Certificate Document */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[800px] w-full bg-white border-2 border-tech p-16 md:p-24 relative overflow-hidden shadow-none"
      >
        {/* Archival Overlays */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-tech/5 flex items-center justify-center rotate-45 translate-x-16 -translate-y-16 pointer-events-none">
          <div className="text-[8px] font-mono text-rust absolute bottom-4">CLASSIFIED</div>
        </div>

        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start gap-10 mb-20">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mono-label !text-rust">
              <Shield size={12} /> Hardware Intelligence Authority
            </div>
            <h1 className="text-4xl font-black tracking-tight leading-none uppercase">
              Certificate of <br />
              <span className="text-sage italic">Performance Audit</span>
            </h1>
            <div className="h-1 w-20 bg-tech" />
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="bg-black text-white px-4 py-2 font-mono text-xs mb-2">
              ID: CM-{idStr.padStart(6, '0')}
            </div>
            <div className="mono-label text-[10px] uppercase tracking-[0.2em] font-bold">
              Issued: {new Date(data.timestamp_utc).toLocaleDateString()}
            </div>
          </div>
        </header>

        {/* Forensic Matrix */}
        <section className="mb-20">
          <div className="mono-label mb-6 flex items-center gap-2">
            <Binary size={12} /> Sec. I // Hardware Forensics
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-tech border border-tech">
            {[
              { label: "Processor Unit", val: data.cpu_model },
              { label: "Instruction Set", val: data.arch },
              { label: "Core Allocation", val: `${data.cpu_cores} Logical` },
              { label: "System Memory", val: `${data.ram_total_gb} GB` },
              { label: "Intelligence Unit", val: data.gpu_model || "N/A" },
              { label: "VRAM Capacity", val: `${data.vram_total_gb || 0} GB` },
              { label: "OS Environment", val: data.os },
              { label: "Manufacturer", val: data.manufacturer || "Unknown Entity" },
            ].map((item, i) => (
              <div key={i} className="bg-white p-6">
                <div className="mono-label !text-[8px] opacity-40 mb-1">{item.label}</div>
                <div className="text-sm font-black font-mono truncate">{item.val}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Throughput Audit */}
        <section className="mb-20">
          <div className="mono-label mb-6 flex items-center gap-2">
            <Zap size={12} /> Sec. II // Throughput Audit
          </div>
          <div className="p-12 border-2 border-sage bg-sage/5 flex flex-col items-center text-center relative">
            <div className="absolute top-4 right-4 text-sage opacity-20"><Zap size={40} strokeWidth={1} /></div>
            <span className="mono-label !text-sage mb-2">Verified TFLOPS Index</span>
            <div className="text-7xl font-black font-mono tracking-tighter text-sage mb-2">
              {(data.gpu_tflops_f32 || data.cpu_tflops).toFixed(4)}
              <span className="text-2xl ml-2">TF</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sage/60">Authorized Intelligence Throughput</p>
          </div>
        </section>

        {/* Environmental Audit */}
        <section className="mb-20">
          <div className="mono-label mb-6 flex items-center gap-2">
            <Globe2 size={12} /> Sec. III // Energy Consumption Summary
          </div>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="mono-label !text-[8px] mb-1">Power Draw</div>
              <div className="text-xl font-bold font-mono">{data.estimated_power_w} W</div>
            </div>
            <div>
              <div className="mono-label !text-[8px] mb-1">Grid Intensity</div>
              <div className="text-xl font-bold font-mono">{(data.carbon_intensity).toFixed(2)} g/kWh</div>
            </div>
            <div>
              <div className="mono-label !text-[8px] mb-1">Regional Code</div>
              <div className="text-xl font-bold font-mono">{data.country_code}</div>
            </div>
          </div>
        </section>

        {/* Cryptographic Seal */}
        <footer className="pt-16 border-t border-tech flex flex-col md:flex-row justify-between items-end gap-10">
          <div className="flex flex-col gap-4 flex-1">
            <div className="flex items-center gap-2 mono-label">
              <Fingerprint size={12} /> Unique Cryptographic Seal
            </div>
            <div className="bg-tech/5 p-4 font-mono text-[9px] break-all leading-tight text-foreground/40 border border-tech/10">
              AUTH_SIG: {data.device_hash}<br />
              CHASH_V2: 0x{idStr.repeat(4).slice(0, 16)}...{data.device_hash.slice(-12)}
            </div>
          </div>

        </footer>

      </motion.div>

      <footer className="max-w-[800px] w-full mt-12 py-12 border-t border-tech/30 text-center no-print">
        <p className="text-[10px] text-foreground/40 font-mono uppercase tracking-[0.4em] leading-relaxed">
          SECURED VIA CRYPTOGRAPHIC ATTESTATION • AUTHORIZED UNDER GLOBAL INTELLIGENCE PROTOCOL CM-2027/A • TFLOPS DECENTRALIZED VERIFICATION NETWORK
        </p>
      </footer>

      {/* CSS for print support */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; }
          .min-h-screen { min-height: 0 !important; padding-top: 0 !important; }
        }
      `}</style>

    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fcf9f2] flex flex-col items-center justify-center p-20">
        <div className="w-12 h-12 border-4 border-tech border-t-sage rounded-full animate-spin mb-6" />
        <div className="mono-label animate-pulse">Initializing Archival Secure Channel...</div>
      </div>
    }>
      <ReportContent />
    </Suspense>
  );
}
