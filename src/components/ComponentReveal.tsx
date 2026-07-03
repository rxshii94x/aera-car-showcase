import React, { forwardRef, useImperativeHandle, useRef } from "react";

export interface ComponentRevealRef {
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
  label: { enterStart: 170, enterEnd: 176, exitStart: 226, exitEnd: 234 },
  title1: { enterStart: 176, enterEnd: 184, exitStart: 226, exitEnd: 234 },
  title2: { enterStart: 184, enterEnd: 192, exitStart: 224, exitEnd: 232 },
  s1: { enterStart: 192, enterEnd: 202, exitStart: 222, exitEnd: 230 },
  s2: { enterStart: 202, enterEnd: 210, exitStart: 220, exitEnd: 228 },
  s3: { enterStart: 210, enterEnd: 218, exitStart: 218, exitEnd: 226 },
};

const computeStyle = (frame: number, timeline: ElementTimeline) => {
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
    blur = 8 * (1 - p); // Blurs from 0px to 8px
    translateY = 12 * (1 - p); // Slides down from 0px to 12px
  }

  return {
    opacity: opacity.toFixed(4),
    filter: `blur(${blur.toFixed(2)}px)`,
    transform: `translate3d(0, ${translateY.toFixed(2)}px, 0)`,
  };
};

const ComponentReveal = forwardRef<ComponentRevealRef, {}>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const labelRef = useRef<HTMLSpanElement>(null);
  const title1Ref = useRef<HTMLHeadingElement>(null);
  const title2Ref = useRef<HTMLHeadingElement>(null);
  const s1Ref = useRef<HTMLParagraphElement>(null);
  const s2Ref = useRef<HTMLParagraphElement>(null);
  const s3Ref = useRef<HTMLParagraphElement>(null);

  useImperativeHandle(ref, () => ({
    updateReveal(frame, _canvasW, _canvasH, _imgW, _imgH) {
      const container = containerRef.current;
      if (!container) return;

      const isInside = frame >= 170 && frame <= 234;

      if (!isInside) {
        container.style.display = "none";
        return;
      }

      container.style.display = "block";

      const applyStyle = (el: HTMLElement | null, style: any) => {
        if (!el) return;
        el.style.opacity = style.opacity;
        el.style.filter = style.filter;
        el.style.transform = style.transform;
      };

      applyStyle(labelRef.current, computeStyle(frame, TIMELINES.label));
      applyStyle(title1Ref.current, computeStyle(frame, TIMELINES.title1));
      applyStyle(title2Ref.current, computeStyle(frame, TIMELINES.title2));
      applyStyle(s1Ref.current, computeStyle(frame, TIMELINES.s1));
      applyStyle(s2Ref.current, computeStyle(frame, TIMELINES.s2));
      applyStyle(s3Ref.current, computeStyle(frame, TIMELINES.s3));
    },
  }));

  const styles = `
    .reveal-container {
      display: none;
    }

    /* --- Base Reveal Style --- */
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
      className="reveal-container fixed inset-0 pointer-events-none z-20"
      style={{ display: "none" }}
    >
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      {/* Typography Content Area */}
      <div className="absolute right-[8%] md:right-[10%] top-1/2 -translate-y-1/2 flex flex-col items-start w-[260px] md:w-[280px] pointer-events-auto select-none">
        {/* Small Label */}
        <span
          ref={labelRef}
          className="reveal-item text-[10px] md:text-xs font-semibold tracking-[0.30em] text-[#767676] uppercase"
        >
          ENGINEERING
        </span>

        {/* Heading */}
        <div className="mt-2 flex flex-col items-start">
          <h3
            ref={title1Ref}
            className="reveal-item text-5xl md:text-6xl lg:text-7xl font-black uppercase text-[#111111] leading-[0.85] tracking-[-0.03em]"
            style={{ fontFamily: '"Druk Condensed Super", "Bebas Neue", sans-serif' }}
          >
            CENTER-LOCK
          </h3>
          <h3
            ref={title2Ref}
            className="reveal-item text-5xl md:text-6xl lg:text-7xl font-black uppercase text-[#111111] leading-[0.85] tracking-[-0.03em] mt-1"
            style={{ fontFamily: '"Druk Condensed Super", "Bebas Neue", sans-serif' }}
          >
            FORGED WHEELS
          </h3>
        </div>

        {/* Description Sentences */}
        <div
          className="mt-[20px] pl-[32px] flex flex-col gap-3 font-semibold uppercase text-[#1a1a1a] [text-rendering:optimizeLegibility] -webkit-font-smoothing: antialiased"
          style={{
            fontFamily: '"Neue Haas Grotesk", "Helvetica Neue", Arial, sans-serif',
            fontWeight: 600,
            fontSize: "19px",
            letterSpacing: "0.02em",
            lineHeight: "1.28",
          }}
        >
          <p ref={s1Ref} className="reveal-item">
            LIGHTER.
          </p>
          <p ref={s2Ref} className="reveal-item">
            FASTER.
          </p>
          <p ref={s3Ref} className="reveal-item">
            PURE PRECISION.
          </p>
        </div>
      </div>
    </div>
  );
});

ComponentReveal.displayName = "ComponentReveal";

export default ComponentReveal;
