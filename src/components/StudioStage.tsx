import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { VehicleColorway } from "../types";

export const COLORWAYS: VehicleColorway[] = [
  {
    id: "aether-white",
    name: "Aether Chalk",
    hex: "#F5F5F7",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-white-sports-car-parked-in-a-studio-with-flashing-lights-40080-large.mp4",
    accentColor: "neutral-900",
    specs: {
      power: "1420 HP",
      acceleration: "1.89s",
      topSpeed: "350 KM/H",
      dragCoefficient: "0.19 Cd",
    }
  },
  {
    id: "chrono-silver",
    name: "Chrono Silver",
    hex: "#D2D2D7",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-sports-car-in-a-studio-light-setup-40081-large.mp4",
    accentColor: "sky-500",
    specs: {
      power: "1150 HP",
      acceleration: "2.10s",
      topSpeed: "320 KM/H",
      dragCoefficient: "0.20 Cd",
    }
  },
  {
    id: "cosmic-stealth",
    name: "Cosmic Obsidian",
    hex: "#1C1C1E",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-luxury-car-parked-in-a-garage-with-underglow-41793-large.mp4",
    accentColor: "emerald-400",
    specs: {
      power: "1600 HP",
      acceleration: "1.75s",
      topSpeed: "410 KM/H",
      dragCoefficient: "0.18 Cd",
    }
  }
];

interface StudioStageProps {
  onColorwayChange: (colorway: VehicleColorway) => void;
  activeColorway: VehicleColorway;
  hideVideo?: boolean;
}

export default function StudioStage({ onColorwayChange, activeColorway, hideVideo = false }: StudioStageProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setVideoLoaded(false);
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [activeColorway.videoUrl]);

  return (
    <div className={`absolute inset-0 w-full h-full overflow-hidden select-none ${hideVideo ? '' : 'bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,1)_0%,rgba(248,248,250,1)_50%,rgba(238,238,242,1)_100%)]'}`}>
      
      {/* Background Studio Grid Lines - Extremely Subtle for technical aesthetic */}
      {!hideVideo && <div className="absolute inset-0 bg-[radial-gradient(#e1e1e6_1px,transparent_1px)] [background-size:48px_48px] opacity-[0.35] pointer-events-none" />}

      {/* Cinematic Looping Video Stage - Right-aligned & fully integrated with no visible boundaries */}
      {!hideVideo && (
        <div className="absolute inset-0 lg:left-1/3 flex items-center justify-center lg:justify-end pointer-events-none z-0">
          <div className="relative w-full lg:w-[110%] max-w-[1300px] aspect-[16/9] lg:translate-x-[15%] px-4 md:px-12 lg:px-0 flex items-center justify-center">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeColorway.id}
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: videoLoaded ? 0.9 : 0.3, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full h-full overflow-hidden"
              >
                <video
                  ref={videoRef}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover mix-blend-multiply"
                  onCanPlay={() => setVideoLoaded(true)}
                >
                  <source src={activeColorway.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </motion.div>
            </AnimatePresence>

            {/* Luxury Ambient Edge Blending Masks - Multi-directional soft fades to completely dissolve any edge */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/40 pointer-events-none" />
            
            {/* Top Fade */}
            <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-[rgba(255,255,255,0.95)] via-white/40 to-transparent pointer-events-none" />
            
            {/* Bottom Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[rgba(238,238,242,0.95)] via-white/30 to-transparent pointer-events-none" />
            
            {/* Left Fade - Extra deep to merge with the content half */}
            <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-[rgba(248,248,250,1)] via-[rgba(248,248,250,0.8)] to-transparent pointer-events-none" />
            
            {/* Right Fade */}
            <div className="absolute top-0 bottom-0 right-0 w-1/4 bg-gradient-to-l from-[rgba(248,248,250,0.7)] to-transparent pointer-events-none" />

            {/* Radial Center Integration Mask */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,rgba(248,248,250,0.45)_70%,rgba(248,248,250,0.95)_100%)] pointer-events-none" />
          </div>
        </div>
      )}

      
    </div>
  );
}
