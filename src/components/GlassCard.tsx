import { motion, useMotionValue, useSpring } from "motion/react";
import { ReactNode, useEffect, useState, useId, MouseEvent } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  liquid?: boolean;
  intensity?: "low" | "medium" | "high";
}

export function GlassCard({
  children,
  className = "",
  hover = false,
  liquid = true, // Enabled by default to deliver the spectacular Apple 2026 aesthetics
  intensity = "medium",
}: GlassCardProps) {
  const filterId = useId().replace(/:/g, "-");
  const [isMobile, setIsMobile] = useState(false);

  // Dynamic user-customized settings synced via localStorage
  const [enabled, setEnabled] = useState(liquid);
  const [level, setLevel] = useState(intensity);

  useEffect(() => {
    const updateSettings = () => {
      const savedEnabled = localStorage.getItem("liquid-glass-enabled");
      const savedLevel = localStorage.getItem("liquid-glass-intensity");
      if (savedEnabled !== null) {
        setEnabled(savedEnabled === "true");
      } else {
        setEnabled(liquid);
      }
      if (savedLevel !== null) {
        setLevel(savedLevel as any);
      } else {
        setLevel(intensity);
      }
    };

    updateSettings();
    window.addEventListener("liquid-glass-settings-updated", updateSettings);
    return () => window.removeEventListener("liquid-glass-settings-updated", updateSettings);
  }, [liquid, intensity]);

  // Motion values for smooth physical/chemical shift on mouse pointer hover
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 40, stiffness: 100, mass: 1 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isMobile || !hover) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    // Gentle magnetic shift to background fluids
    mouseX.set(x * 0.12);
    mouseY.set(y * 0.15);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const blurClass = {
    low: "backdrop-blur-[12px]",
    medium: "backdrop-blur-[28px]",
    high: "backdrop-blur-[48px]",
  }[level];

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={hover ? {
        y: -3,
        borderColor: "rgba(255, 255, 255, 0.14)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
      } : {}}
      transition={{ duration: 0.35, cubicBezier: [0.16, 1, 0.3, 1] }}
      className={`rounded-2xl p-6 relative overflow-hidden group border border-white/[0.07] bg-[#09090c]/80 shadow-[0_12px_45px_0_rgba(0,0,0,0.65)] ${enabled ? blurClass : ''} ${className}`}
      style={{
        transformStyle: "preserve-3d",
        perspective: "1000px",
      }}
    >
      {/* Gloss reflection overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/[0.015] to-transparent opacity-100 transition-opacity duration-500 z-10" />

      {/* Inner sheen border */}
      <div className="absolute inset-[1px] pointer-events-none rounded-[15px] border border-white/[0.02] bg-gradient-to-b from-white/[0.015] to-transparent z-10" />

      {/* Spotlight highlight */}
      <div className="absolute top-0 left-5 right-5 h-[1px] pointer-events-none bg-gradient-to-r from-transparent via-white/[0.12] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-305 z-10" />

      {/* Content slot */}
      <div className="relative z-25 h-full w-full">{children}</div>
    </motion.div>
  );
}
