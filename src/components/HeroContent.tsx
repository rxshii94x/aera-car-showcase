import React from "react";

export default function HeroContent() {
  return (
    <div className="absolute top-0 left-0 w-full h-screen z-20 pointer-events-none">
      
      {/* Main Layout Container (aligns with max-w-7xl grid, matching Swiss editorial design) */}
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col justify-between px-8 py-16 md:px-16 md:py-20 pointer-events-none relative z-20">
        
        {/* Left Column Content Area - constrained max-width to completely avoid overlapping the car */}
        <div className="flex flex-col items-start justify-center flex-grow max-w-[450px] pt-12 md:pt-16">
          
          {/* Brand label */}
          <span className="text-[10px] md:text-xs font-semibold tracking-[0.30em] text-[#111111] uppercase select-none">
            SINCE 1991
          </span>

          {/* Large Title - Single Line */}
          <h1 className="font-porsche text-6xl sm:text-7xl md:text-8xl lg:text-[6.25rem] xl:text-[7.25rem] font-black tracking-tight text-[#111111] uppercase leading-none select-none mt-4 [text-rendering:optimizeLegibility]">
            911 GT3 RS
          </h1>

          {/* Small red bar */}
          <div className="w-10 h-1 bg-red-600 my-4" />

          {/* Subtitle */}
          <h2 className="font-bold text-2xl text-[#111111] leading-tight select-none uppercase tracking-wider">
            TRACK-BORN. <br /> ROAD-PERFECTED.
          </h2>

          {/* Action Button */}
          <button className="mt-6 px-6 py-3 bg-black text-white text-[11px] font-semibold tracking-wider uppercase rounded-none border border-black flex items-center gap-3.5 group pointer-events-auto select-none cursor-pointer hover:bg-neutral-900 transition-colors">
            EXPLORE THE GT3 RS
          </button>

        </div>

        {/* Bottom Specs Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 w-full pt-6 md:pt-8 border-t border-neutral-300/40">
          
          {/* Spec 1 */}
          <div className="flex flex-col items-center justify-center px-6 select-none md:border-r border-neutral-300">
            <span className="font-display font-medium text-2xl md:text-3xl text-[#111111] leading-none">
              525
            </span>
            <div className="w-6 h-1 bg-red-600 mx-auto mt-2"></div>
            <span className="text-[10px] md:text-xs font-semibold text-neutral-400 mt-2 select-none uppercase">
              HP
            </span>
          </div>

          {/* Spec 2 */}
          <div className="flex flex-col items-center justify-center px-6 select-none md:border-r border-neutral-300">
            <span className="font-display font-medium text-2xl md:text-3xl text-[#111111] leading-none">
              4.0L
            </span>
            <div className="w-6 h-1 bg-red-600 mx-auto mt-2"></div>
            <span className="text-[10px] md:text-xs font-semibold text-neutral-400 mt-2 select-none uppercase">
              FLAT-SIX
            </span>
          </div>

          {/* Spec 3 */}
          <div className="flex flex-col items-center justify-center px-6 select-none md:border-r border-neutral-300">
            <span className="font-display font-medium text-2xl md:text-3xl text-[#111111] leading-none">
              3.2s
            </span>
            <div className="w-6 h-1 bg-red-600 mx-auto mt-2"></div>
            <span className="text-[10px] md:text-xs font-semibold text-neutral-400 mt-2 select-none">
              0-100 km/h
            </span>
          </div>

          {/* Spec 4 */}
          <div className="flex flex-col items-center justify-center px-6 select-none">
            <span className="font-display font-medium text-2xl md:text-3xl text-[#111111] leading-none">
              296
            </span>
            <div className="w-6 h-1 bg-red-600 mx-auto mt-2"></div>
            <span className="text-[10px] md:text-xs font-semibold text-neutral-400 mt-2 select-none uppercase">
              TOP SPEED
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}
