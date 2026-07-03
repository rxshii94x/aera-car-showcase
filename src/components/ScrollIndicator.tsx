import React, { useEffect, useRef } from "react";

/**
 * Premium cinematic scroll cue.
 * Communicates that the experience continues below.
 *
 * Behavior:
 * - Visible only while the user is at the very beginning of the scroll experience.
 * - Listens to the existing "frame-update" CustomEvent dispatched by FrameSequence.
 * - Once any scroll progress is detected (frame > 0), fades out in 300ms and never reappears.
 * - After fade-out, pointer events are removed.
 *
 * Design: Floating text + arrow only. No background, card, circle, button, glass, or shadow.
 */
export default function ScrollIndicator() {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasDismissedRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleFrameUpdate = (e: Event) => {
      if (hasDismissedRef.current) return;

      const frame = (e as CustomEvent).detail as number;

      // Once any scroll progress is detected, fade out permanently
      if (frame > 0.5) {
        hasDismissedRef.current = true;
        el.style.transition = "opacity 300ms ease-in-out";
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
      }
    };

    window.addEventListener("frame-update", handleFrameUpdate);

    return () => {
      window.removeEventListener("frame-update", handleFrameUpdate);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed z-50 pointer-events-none select-none"
      style={{
        right: "clamp(24px, 4vw, 64px)",
        top: "50%",
        transform: "translateY(-50%)",
        opacity: 1,
        willChange: "opacity",
      }}
      aria-hidden="true"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
          opacity: 0.35,
        }}
      >
        {/* SCROLL label */}
        <span
          style={{
            fontFamily: '"Inter", "Neue Haas Grotesk", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.35em",
            textTransform: "uppercase" as const,
            color: "#111111",
            lineHeight: 1,
          }}
        >
          SCROLL
        </span>

        {/* Animated arrow */}
        <span
          className="scroll-cue-arrow"
          style={{
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: "14px",
            fontWeight: 300,
            color: "#111111",
            lineHeight: 1,
            display: "block",
          }}
        >
          ↓
        </span>
      </div>

      {/* Scoped keyframe animation for the arrow */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scroll-cue-drift {
          0% {
            transform: translateY(0px);
            opacity: 1;
          }
          50% {
            transform: translateY(8px);
            opacity: 0.4;
          }
          100% {
            transform: translateY(0px);
            opacity: 1;
          }
        }

        .scroll-cue-arrow {
          animation: scroll-cue-drift 1.6s ease-in-out infinite;
          will-change: transform, opacity;
        }

        @media (prefers-reduced-motion: reduce) {
          .scroll-cue-arrow {
            animation: none !important;
          }
        }
      `}} />
    </div>
  );
}
