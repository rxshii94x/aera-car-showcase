import React, { forwardRef, useImperativeHandle, useRef } from "react";

export interface CockpitRevealRef {
  updateReveal: (
    frame: number,
    canvasW: number,
    canvasH: number,
    imgW: number,
    imgH: number
  ) => void;
}

interface ElementTimeline {
  enterStart: number;
  enterEnd: number;
  exitStart: number;
  exitEnd: number;
}

const TIMELINES = {
  gradient: { enterStart: 58, enterEnd: 66, exitStart: 150, exitEnd: 160 },
  label: { enterStart: 66, enterEnd: 76, exitStart: 150, exitEnd: 160 },
  title1: { enterStart: 76, enterEnd: 88, exitStart: 148, exitEnd: 158 },
  title2: { enterStart: 88, enterEnd: 98, exitStart: 148, exitEnd: 158 },
  redLine: { enterStart: 98, enterEnd: 112, exitStart: 146, exitEnd: 156 },
  s1: { enterStart: 112, enterEnd: 124, exitStart: 144, exitEnd: 154 },
  s2: { enterStart: 124, enterEnd: 136, exitStart: 142, exitEnd: 152 },
  s3: { enterStart: 136, enterEnd: 145, exitStart: 140, exitEnd: 150 },
};

const computeTextStyle = (frame: number, timeline: ElementTimeline) => {
  let opacity = 0;
  let blur = 12;
  let translateY = 18;

  if (frame < timeline.enterStart || frame > timeline.exitEnd) {
    return {
      opacity: "0",
      filter: "blur(12px)",
      transform: "translate3d(0, 18px, 0)",
    };
  }

  if (frame >= timeline.enterEnd && frame <= timeline.exitStart) {
    return {
      opacity: "1",
      filter: "blur(0px)",
      transform: "translate3d(0, 0px, 0)",
    };
  }

  if (frame >= timeline.enterStart && frame < timeline.enterEnd) {
    // Entrance: Quintic Ease Out
    const t = (frame - timeline.enterStart) / (timeline.enterEnd - timeline.enterStart);
    const p = 1 - Math.pow(1 - t, 5);

    opacity = p;
    blur = 12 * (1 - p);
    translateY = 18 * (1 - p);
  } else if (frame > timeline.exitStart && frame <= timeline.exitEnd) {
    // Exit: Quintic Ease In
    const t = (frame - timeline.exitStart) / (timeline.exitEnd - timeline.exitStart);
    const p = 1 - Math.pow(t, 5); // Starts at 1, goes to 0

    opacity = p;
    blur = 8 * (1 - p);
    translateY = 12 * (1 - p);
  }

  return {
    opacity: opacity.toFixed(4),
    filter: `blur(${blur.toFixed(2)}px)`,
    transform: `translate3d(0, ${translateY.toFixed(2)}px, 0)`,
  };
};

const computeLineStyle = (frame: number, timeline: ElementTimeline) => {
  let width = 0;

  if (frame < timeline.enterStart || frame > timeline.exitEnd) {
    return { width: "0px" };
  }

  if (frame >= timeline.enterEnd && frame <= timeline.exitStart) {
    return { width: "120px" };
  }

  if (frame >= timeline.enterStart && frame < timeline.enterEnd) {
    // Entrance: Quintic Ease Out
    const t = (frame - timeline.enterStart) / (timeline.enterEnd - timeline.enterStart);
    const p = 1 - Math.pow(1 - t, 5);
    width = 120 * p;
  } else if (frame > timeline.exitStart && frame <= timeline.exitEnd) {
    // Exit: Quintic Ease In
    const t = (frame - timeline.exitStart) / (timeline.exitEnd - timeline.exitStart);
    const p = 1 - Math.pow(t, 5); // Starts at 1, goes to 0
    width = 120 * p;
  }

  return { width: `${width.toFixed(1)}px` };
};

const computeGradientStyle = (frame: number, timeline: ElementTimeline) => {
  let opacity = 0;

  if (frame < timeline.enterStart || frame > timeline.exitEnd) {
    return { opacity: "0" };
  }

  if (frame >= timeline.enterEnd && frame <= timeline.exitStart) {
    return { opacity: "0.7" };
  }

  if (frame >= timeline.enterStart && frame < timeline.enterEnd) {
    // Entrance: Quintic Ease Out
    const t = (frame - timeline.enterStart) / (timeline.enterEnd - timeline.enterStart);
    const p = 1 - Math.pow(1 - t, 5);
    opacity = 0.7 * p;
  } else if (frame > timeline.exitStart && frame <= timeline.exitEnd) {
    // Exit: Quintic Ease In
    const t = (frame - timeline.exitStart) / (timeline.exitEnd - timeline.exitStart);
    const p = 1 - Math.pow(t, 5); // Starts at 1, goes to 0
    opacity = 0.7 * p;
  }

  return { opacity: opacity.toFixed(4) };
};

const CockpitReveal = forwardRef<CockpitRevealRef, {}>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gradientRef = useRef<HTMLDivElement>(null);
  
  const labelRef = useRef<HTMLSpanElement>(null);
  const title1Ref = useRef<HTMLHeadingElement>(null);
  const title2Ref = useRef<HTMLHeadingElement>(null);
  const redLineRef = useRef<HTMLDivElement>(null);
  const s1Ref = useRef<HTMLParagraphElement>(null);
  const s2Ref = useRef<HTMLParagraphElement>(null);
  const s3Ref = useRef<HTMLParagraphElement>(null);

  useImperativeHandle(ref, () => ({
    updateReveal(frame, _canvasW, _canvasH, _imgW, _imgH) {
      const container = containerRef.current;
      if (!container) return;

      // Translate global frame index to local Part 2 frame index
      // ezgif-frame-001.jpg in part 2 is global index 281.
      const localFrame = frame - 280;

      const isInside = localFrame >= 50 && localFrame <= 160;

      if (!isInside) {
        container.style.display = "none";
        return;
      }

      container.style.display = "block";

      const applyStyle = (el: HTMLElement | null, style: any) => {
        if (!el) return;
        el.style.opacity = style.opacity;
        if (style.filter) el.style.filter = style.filter;
        if (style.transform) el.style.transform = style.transform;
      };

      // Update gradient
      if (gradientRef.current) {
        gradientRef.current.style.opacity = computeGradientStyle(localFrame, TIMELINES.gradient).opacity;
      }

      // Update red accent line
      if (redLineRef.current) {
        redLineRef.current.style.width = computeLineStyle(localFrame, TIMELINES.redLine).width;
      }

      // Update text elements
      applyStyle(labelRef.current, computeTextStyle(localFrame, TIMELINES.label));
      applyStyle(title1Ref.current, computeTextStyle(localFrame, TIMELINES.title1));
      applyStyle(title2Ref.current, computeTextStyle(localFrame, TIMELINES.title2));
      applyStyle(s1Ref.current, computeTextStyle(localFrame, TIMELINES.s1));
      applyStyle(s2Ref.current, computeTextStyle(localFrame, TIMELINES.s2));
      applyStyle(s3Ref.current, computeTextStyle(localFrame, TIMELINES.s3));
    },
  }));

  const styles = `
    .cockpit-reveal-container {
      display: none;
    }

    .reveal-item {
      opacity: 0;
      filter: blur(12px);
      transform: translate3d(0, 18px, 0);
      will-change: opacity, transform, filter;
    }
  `;

  return (
    <div
      ref={containerRef}
      className="cockpit-reveal-container fixed inset-0 pointer-events-none z-20"
      style={{ display: "none" }}
    >
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      {/* Charcoal Gradient Overlay */}
      <div
        ref={gradientRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to right, rgba(11, 11, 11, 0) 30%, #0B0B0B 100%)",
          opacity: 0,
          willChange: "opacity",
        }}
      />

      {/* Typography Content Area */}
      <div className="absolute right-[8%] md:right-[10%] top-1/2 -translate-y-1/2 flex flex-col items-start w-[320px] md:w-[440px] pointer-events-auto select-none">
        {/* Small Label */}
        <span
          ref={labelRef}
          className="reveal-item text-[12px] md:text-[15px] font-medium tracking-[0.35em] text-[#B8B8B8] uppercase mb-4"
          style={{ fontFamily: '"Neue Haas Grotesk", "Helvetica Neue", Arial, sans-serif' }}
        >
          PORSCHE
        </span>

        {/* Heading */}
        <div className="mt-2 flex flex-col items-start">
          <h3
            ref={title1Ref}
            className="reveal-item text-7xl sm:text-8xl md:text-[5.5rem] lg:text-[5.75rem] xl:text-[6.5rem] font-black uppercase text-white leading-[0.85] tracking-[-0.03em]"
            style={{ fontFamily: '"Druk Condensed Super", "Bebas Neue", sans-serif' }}
          >
            DRIVEN BY
          </h3>
          <h3
            ref={title2Ref}
            className="reveal-item text-7xl sm:text-8xl md:text-[5.5rem] lg:text-[5.75rem] xl:text-[6.5rem] font-black uppercase text-white leading-[0.85] tracking-[-0.03em] mt-1"
            style={{ fontFamily: '"Druk Condensed Super", "Bebas Neue", sans-serif' }}
          >
            PURPOSE.
          </h3>
        </div>

        {/* Red Accent Line - Redefined gaps: mt-7, mb-24px (sits 24px above first body line) */}
        <div
          ref={redLineRef}
          className="h-[2px] bg-[#D5001C] mt-7 mb-[24px] origin-left"
          style={{ width: "0px", willChange: "width" }}
        />

        {/* Description Sentences - Reduced vertical line gap by ~40% (gap-3), mt-0 to pull block upward */}
        <div
          className="mt-0 flex flex-col gap-3 font-medium uppercase text-[#D8D8D8]"
          style={{
            fontFamily: '"Neue Haas Grotesk", "Helvetica Neue", Arial, sans-serif',
            fontSize: "25px",
            lineHeight: "1.7",
          }}
        >
          <p ref={s1Ref} className="reveal-item">
            EVERY DETAIL.
          </p>
          <p ref={s2Ref} className="reveal-item">
            EVERY CONTROL.
          </p>
          <p ref={s3Ref} className="reveal-item">
            BUILT TO PUT YOU AHEAD.
          </p>
        </div>
      </div>
    </div>
  );
});

CockpitReveal.displayName = "CockpitReveal";

export default CockpitReveal;
