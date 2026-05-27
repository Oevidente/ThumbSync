import { motion } from "motion/react";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className = "", hover = false }: GlassCardProps) {
  return (
    <motion.div
      whileHover={hover ? { 
        y: -2,
        backgroundColor: "rgba(255, 255, 255, 0.05)", 
        borderColor: "rgba(255, 255, 255, 0.12)",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)"
      } : {}}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`acrylic rounded-2xl p-6 relative overflow-hidden group ${className}`}
    >
      {/* Light shine backdrop glow */}
      <div className="absolute -inset-1 bg-gradient-to-tr from-[#0a84ff]/0 via-white/[0.015] to-[#30d158]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

