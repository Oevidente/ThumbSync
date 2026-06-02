import { ReactNode, useEffect, useState, useId, MouseEvent } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

interface LiquidGlassProps {
  children?: ReactNode;
  className?: string;
  intensity?: "low" | "medium" | "high";
  interactive?: boolean;
  animated?: boolean;
}

export function LiquidGlass({
  children,
  className = "",
  intensity = "medium",
  interactive = true,
  animated = true,
}: LiquidGlassProps) {
  const filterId = useId().replace(/:/g, "-");
  
  // Mouse position tracking with damping for smooth responsive liquid lag
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springConfig = { damping: 45, stiffness: 120, mass: 1 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isMobile || !interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Smooth magnetic float within bounds
    mouseX.set(x * 0.15);
    mouseY.set(y * 0.18);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Setup blurring levels
  const blurValue = {
    low: "backdrop-blur-[12px]",
    medium: "backdrop-blur-[28px]",
    high: "backdrop-blur-[48px]",
  }[intensity];

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative rounded-3xl overflow-hidden border border-white/[0.07] bg-[#09090c]/80 group transition-all duration-500 shadow-[0_24px_50px_rgba(0,0,0,0.65)] ${blurValue} ${className}`}
      style={{
        transformStyle: "preserve-3d",
        perspective: "1000px",
      }}
    >
      {/* Gloss reflection overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-tr from-transparent via-white/[0.015] to-transparent opacity-100 transition-opacity duration-500" />
      
      {/* Fine inner border gloss */}
      <div className="absolute inset-[1px] z-10 pointer-events-none rounded-[23px] border border-white/[0.02] bg-gradient-to-b from-white/[0.015] to-transparent" />
      
      {/* High-contrast highlight flare on top-left */}
      <div className="absolute top-0 left-10 right-10 h-[1px] z-10 pointer-events-none bg-gradient-to-r from-transparent via-white/[0.12] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-305" />

      {/* Content wrapper */}
      <div className="relative z-20 h-full w-full">{children}</div>
    </div>
  );
}
