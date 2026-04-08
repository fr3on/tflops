import React from "react";
import { BookOpen } from "lucide-react";
import { motion } from "framer-motion";

interface RegistryLabelProps {
  text?: string;
  className?: string;
  showPulse?: boolean;
}

const RegistryLabel: React.FC<RegistryLabelProps> = ({ 
  text = "Official Publication // Global TFLOPS Census 2027", 
  className = "",
  showPulse = true 
}) => {
  return (
    <div className={`flex items-center gap-3 px-4 py-1.5 border border-tech/30 bg-tech/5 rounded-full ${className}`}>
      {showPulse && (
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rust opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rust"></span>
        </div>
      )}
      <BookOpen size={12} className="text-foreground/40" />
      <span className="mono-label !text-[10px] tracking-[0.2em] whitespace-nowrap uppercase">
        {text}
      </span>
    </div>
  );
};

export default RegistryLabel;
