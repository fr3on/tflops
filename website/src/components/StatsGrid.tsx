"use client";
import { motion } from "framer-motion";

interface StatProps {
  label: string;
  value: string | number;
  suffix?: string;
}

function StatCard({ label, value, suffix }: StatProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-accent-blue/5 to-transparent pointer-none" />
      <div className="text-3xl font-bold mb-1 truncate">
        {value}{suffix}
      </div>
      <div className="text-gray-500 text-xs uppercase tracking-wider font-semibold">
        {label}
      </div>
    </motion.div>
  );
}

export default function StatsGrid({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-10">
      <StatCard label="Total Network TFLOPS" value={stats.totalTflops} />
      <StatCard label="Active Compute Nodes" value={stats.nodes} />
      <StatCard label="Leading Region" value={stats.topCountry} />
    </div>
  );
}
