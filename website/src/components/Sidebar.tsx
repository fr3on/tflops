"use client";
import { LayoutDashboard, Globe, ListOrdered, ShieldCheck } from "lucide-react";
import Link from "next/link";

const menuItems = [
  { id: "dash", icon: LayoutDashboard, label: "Network", active: true },
  { id: "map", icon: Globe, label: "Map" },
  { id: "lead", icon: ListOrdered, label: "Authority" },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-24 flex flex-col items-center py-10 border-r border-border bg-slate-950/50 backdrop-blur-md z-50">
      <div className="mb-14 text-primary">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
            <Globe size={24} />
          </div>
      </div>

      <div className="flex flex-col gap-8">
        {menuItems.map((item) => (
          <Link 
            key={item.id}
            href="#"
            className={`p-2 transition-all group relative ${item.active ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <item.icon size={22} />
            <span className="absolute left-full ml-4 px-2 py-1 bg-slate-900 border border-border text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none uppercase tracking-widest font-bold">
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-8 items-center">
        <div className="text-slate-700 hover:text-slate-500 cursor-pointer transition-colors">
          <ShieldCheck size={20} />
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-800 border border-border flex items-center justify-center text-[10px] font-bold text-slate-400">
          JD
        </div>
      </div>
    </aside>
  );
}
