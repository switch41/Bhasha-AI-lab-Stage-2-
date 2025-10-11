import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  animated?: boolean;
}

export function Logo({ size = "md", className, onClick, animated = false }: LogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  };

  const LogoComponent = () => (
    <div className={cn("relative", sizeClasses[size], className)}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        onClick={onClick}
        style={{ cursor: onClick ? "pointer" : "default" }}
      >
        {/* Central golden circle */}
        <circle
          cx="50"
          cy="50"
          r="12"
          fill="url(#goldenGradient)"
          className="drop-shadow-sm"
        />
        
        {/* Radiating shapes - alternating golden and reddish-brown */}
        {/* Golden shapes */}
        <path
          d="M50 20 C45 25, 45 35, 50 40 C55 35, 55 25, 50 20 Z"
          fill="url(#goldenGradient)"
          className="drop-shadow-sm"
        />
        <path
          d="M80 50 C75 45, 65 45, 60 50 C65 55, 75 55, 80 50 Z"
          fill="url(#goldenGradient)"
          className="drop-shadow-sm"
        />
        <path
          d="M50 80 C55 75, 55 65, 50 60 C45 65, 45 75, 50 80 Z"
          fill="url(#goldenGradient)"
          className="drop-shadow-sm"
        />
        <path
          d="M20 50 C25 55, 35 55, 40 50 C35 45, 25 45, 20 50 Z"
          fill="url(#goldenGradient)"
          className="drop-shadow-sm"
        />
        
        {/* Reddish-brown shapes */}
        <path
          d="M65 25 C60 30, 60 40, 65 45 C70 40, 70 30, 65 25 Z"
          fill="url(#brownGradient)"
          className="drop-shadow-sm"
        />
        <path
          d="M75 65 C70 60, 60 60, 55 65 C60 70, 70 70, 75 65 Z"
          fill="url(#brownGradient)"
          className="drop-shadow-sm"
        />
        <path
          d="M35 75 C40 70, 40 60, 35 55 C30 60, 30 70, 35 75 Z"
          fill="url(#brownGradient)"
          className="drop-shadow-sm"
        />
        <path
          d="M25 35 C30 40, 40 40, 45 35 C40 30, 30 30, 25 35 Z"
          fill="url(#brownGradient)"
          className="drop-shadow-sm"
        />
        
        {/* Outer circular elements */}
        <circle cx="50" cy="15" r="4" fill="url(#goldenGradient)" />
        <circle cx="85" cy="50" r="4" fill="url(#goldenGradient)" />
        <circle cx="50" cy="85" r="4" fill="url(#goldenGradient)" />
        <circle cx="15" cy="50" r="4" fill="url(#goldenGradient)" />
        
        {/* Gradients */}
        <defs>
          <radialGradient id="goldenGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="70%" stopColor="#FFA500" />
            <stop offset="100%" stopColor="#FF8C00" />
          </radialGradient>
          <radialGradient id="brownGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#CD853F" />
            <stop offset="70%" stopColor="#8B4513" />
            <stop offset="100%" stopColor="#654321" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 200, 
          damping: 15,
          duration: 0.8 
        }}
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
      >
        <LogoComponent />
      </motion.div>
    );
  }

  return <LogoComponent />;
}

// Simple logo for headers
export function HeaderLogo({ onClick }: { onClick?: () => void }) {
  return (
    <Logo 
      size="md" 
      onClick={onClick}
      className="cursor-pointer hover:scale-105 transition-transform duration-200"
    />
  );
}

// Large animated logo for landing pages
export function LandingLogo({ onClick }: { onClick?: () => void }) {
  return (
    <Logo 
      size="lg" 
      onClick={onClick}
      animated={true}
      className="cursor-pointer"
    />
  );
}
