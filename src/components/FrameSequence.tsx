import React, { useEffect, useRef, useCallback, useState, memo } from "react";
import ComponentReveal, { ComponentRevealRef } from "./ComponentReveal";
import CockpitReveal, { CockpitRevealRef } from "./CockpitReveal";

// ─── Constants ───────────────────────────────────────────────────────────────
const FRAMES_PER_PART = 281;
const TOTAL_FRAMES = FRAMES_PER_PART * 2; // 562
const SCROLL_HEIGHT_MULTIPLIER = 20; // 20x viewport height — premium cinematic scroll pacing

/**
 * Generates the full URL path for a given global frame index (0-based).
 * Frames 0–280 come from "part 1", frames 281–561 come from "part 2".
 * Filenames are zero-padded to 3 digits: ezgif-frame-001.jpg … ezgif-frame-281.jpg
 */
function getFramePath(globalIndex: number): string {
  const isSecondPart = globalIndex >= FRAMES_PER_PART;
  const folder = isSecondPart ? "part 2" : "part 1";
  const localIndex = isSecondPart
    ? globalIndex - FRAMES_PER_PART + 1
    : globalIndex + 1;
  const padded = String(localIndex).padStart(3, "0");
  return `/${encodeURIComponent(folder)}/ezgif-frame-${padded}.jpg`;
}

/**
 * Preloads a single image and resolves with the HTMLImageElement.
 * Rejects on error so the caller can handle failures.
 */
function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    img.onload = () => {
      img.onload = null;
      img.onerror = null;
      // Decode image off-thread to GPU memory before resolving to eliminate rendering stutter
      img.decode()
        .then(() => resolve(img))
        .catch(() => resolve(img));
    };
    img.onerror = (err) => {
      img.onload = null;
      img.onerror = null;
      reject(err);
    };
  });
}

/**
 * Draws an image onto the canvas using "cover" fit logic
 * (equivalent to CSS object-fit: cover).
 * No filters, no overlays — raw pixel data only.
 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasW: number,
  canvasH: number,
  seqWidthRef: React.MutableRefObject<number>,
  seqHeightRef: React.MutableRefObject<number>
) {
  let imgW = img.naturalWidth;
  let imgH = img.naturalHeight;
  if (imgW === 0 || imgH === 0) return;

  // Lock sequence dimensions to the first loaded frame to eliminate scroll position wobble
  if (seqWidthRef.current === 0) {
    seqWidthRef.current = imgW;
    seqHeightRef.current = imgH;
  } else {
    imgW = seqWidthRef.current;
    imgH = seqHeightRef.current;
  }

  // Calculate the cover scale factor symmetrically
  const scale = Math.max(canvasW / imgW, canvasH / imgH);
  const drawW = Math.round(imgW * scale);
  const drawH = Math.round(imgH * scale);
  const offsetX = Math.round((canvasW - drawW) / 2);
  const offsetY = Math.round((canvasH - drawH) / 2);

  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
}

// ─── Component ───────────────────────────────────────────────────────────────

interface FrameSequenceProps {
  /** Called with loading progress 0→1, then true when fully loaded */
  onLoadProgress?: (progress: number) => void;
  onLoaded?: () => void;
  onFrameUpdate?: (frame: number) => void;
  onFirstFrameReady?: () => void;
}

function FrameSequence({ onLoadProgress, onLoaded, onFrameUpdate, onFirstFrameReady }: FrameSequenceProps) {
  // Persistent refs — never recreated during scroll
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const revealRef = useRef<ComponentRevealRef>(null);
  const cockpitRef = useRef<CockpitRevealRef>(null);
  const [loaded, setLoaded] = useState(false);
  const firstFrameRenderedRef = useRef(false);
  const hasRenderedFrameOneRef = useRef(false);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const lastScrollTimeRef = useRef<number>(0);
  const breathingIntensityRef = useRef<number>(0);
  const seqWidthRef = useRef<number>(0);
  const seqHeightRef = useRef<number>(0);

  // Cached DPR and buffer dimensions — avoid recomputing every frame
  const cachedDprRef = useRef<number>(0);
  const cachedBufferWRef = useRef<number>(0);
  const cachedBufferHRef = useRef<number>(0);

  // Reusable string cache for canvas filter/opacity to avoid string allocation per tick
  const lastFilterStrRef = useRef<string>("none");
  const lastOpacityStrRef = useRef<string>("1");

  // ─── Preload all 562 frames ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const images: HTMLImageElement[] = new Array(TOTAL_FRAMES);
    let loadedCount = 0;

    // Use batched concurrent loading for performance.
    // Load in batches of 20 to avoid overwhelming the browser.
    const BATCH_SIZE = 20;

    async function loadAllFrames() {
      for (let batchStart = 0; batchStart < TOTAL_FRAMES; batchStart += BATCH_SIZE) {
        if (cancelled) return;

        const batchEnd = Math.min(batchStart + BATCH_SIZE, TOTAL_FRAMES);
        const batchPromises: Promise<void>[] = [];

        for (let i = batchStart; i < batchEnd; i++) {
          const idx = i;
          batchPromises.push(
            preloadImage(getFramePath(idx))
              .then((img) => {
                if (!cancelled) {
                  images[idx] = img;
                  loadedCount++;
                  onLoadProgress?.(loadedCount / TOTAL_FRAMES);
                }
              })
              .catch((err) => {
                // On failure, create a transparent 1x1 placeholder so the
                // array stays dense and we never render undefined.
                console.warn(`Frame ${idx} failed to load:`, err);
                const fallback = new Image();
                fallback.width = 1;
                fallback.height = 1;
                images[idx] = fallback;
                loadedCount++;
                onLoadProgress?.(loadedCount / TOTAL_FRAMES);
              })
          );
        }

        await Promise.all(batchPromises);
      }

      if (!cancelled) {
        framesRef.current = images;
        setLoaded(true);
        onLoaded?.();

        // Render the first frame immediately
        renderFrame(0);
      }
    }

    loadAllFrames();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Canvas rendering ────────────────────────────────────────────────────
  // Uses window.innerWidth/innerHeight directly since the canvas is position:fixed.
  // Only called when the integer frame index actually changes.
  const renderFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx = ctxRef.current;
    if (!ctx) {
      ctx = canvas.getContext("2d", { alpha: false, colorSpace: "srgb" });
      if (!ctx) return;
      ctxRef.current = ctx;
    }

    const img = framesRef.current[frameIndex];
    if (!img || img.naturalWidth === 0) return;

    // Ensure canvas buffer matches the viewport (retina-aware)
    // Cache DPR and buffer dimensions to avoid recomputing every frame
    const dpr = window.devicePixelRatio || 1;
    let bufferW: number;
    let bufferH: number;

    if (dpr !== cachedDprRef.current) {
      // DPR changed (e.g., moved to a different display) — recompute
      cachedDprRef.current = dpr;
      bufferW = Math.round(window.innerWidth * dpr);
      bufferH = Math.round(window.innerHeight * dpr);
      cachedBufferWRef.current = bufferW;
      cachedBufferHRef.current = bufferH;
    } else {
      const displayW = window.innerWidth;
      const displayH = window.innerHeight;
      const newBufW = Math.round(displayW * dpr);
      const newBufH = Math.round(displayH * dpr);
      if (newBufW !== cachedBufferWRef.current || newBufH !== cachedBufferHRef.current) {
        cachedBufferWRef.current = newBufW;
        cachedBufferHRef.current = newBufH;
      }
      bufferW = cachedBufferWRef.current;
      bufferH = cachedBufferHRef.current;
    }

    if (canvas.width !== bufferW || canvas.height !== bufferH) {
      canvas.width = bufferW;
      canvas.height = bufferH;
      // Smoothing resets when canvas dimensions update, so apply only on resize events
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    }

    // No clearRect needed — alpha:false canvas with full-cover drawImage overwrites all pixels

    // Draw directly at backing-store physical dimensions (prevents sub-pixel rounding errors during context scaling)
    drawCover(ctx, img, bufferW, bufferH, seqWidthRef, seqHeightRef);

    // Call onFirstFrameReady after the browser paints the canvas
    if (frameIndex === 0 && !firstFrameRenderedRef.current) {
      firstFrameRenderedRef.current = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          onFirstFrameReady?.();
        });
      });
    }
  }, [onFirstFrameReady]);

  // ─── Interpolation engine ────────────────────────────────────────────────
  const BASE_LERP = 0.35;        // Minimal smoothing layer for visual stability
  const SETTLE_THRESHOLD = 0.005; // Tight threshold for quick settling
  const MAX_FRAME_STEP = 15.0;    // Allow fast tracking of scroll velocity

  // ─── Shared helpers for the animation loop ─────────────────────────────
  // Computes canvas filter + opacity for the cinematic ending transition.
  // Extracted to eliminate duplicated code between the running loop and the settle branch.
  const applyEndingFilter = (canvas: HTMLCanvasElement, currentFrame: number) => {
    let nextFilter = "none";
    let nextOpacity = "1";
    if (currentFrame >= 531) {
      const fadeT = Math.min(1, Math.max(0, (currentFrame - 531) / 30));
      const brightness = 1 - fadeT;
      const contrast = 1 + 3 * fadeT;
      const grayscale = fadeT;
      nextFilter = `brightness(${brightness.toFixed(4)}) contrast(${contrast.toFixed(4)}) grayscale(${grayscale.toFixed(4)})`;
      nextOpacity = fadeT >= 1.0 ? "0" : "1";
    }
    // Guard against redundant style writes (avoids style recalc)
    if (lastFilterStrRef.current !== nextFilter) {
      lastFilterStrRef.current = nextFilter;
      canvas.style.filter = nextFilter;
    }
    if (lastOpacityStrRef.current !== nextOpacity) {
      lastOpacityStrRef.current = nextOpacity;
      canvas.style.opacity = nextOpacity;
    }
  };

  const targetFrameRef = useRef<number>(0);   // Where scroll wants to go (float)
  const smoothFrameRef = useRef<number>(0);   // Current interpolated position (float)
  const lastRenderedRef = useRef<number>(-1); // Last integer frame drawn
  const isAnimatingRef = useRef<boolean>(false);
  const animRafRef = useRef<number>(0);

  // Continuous animation loop — runs independently of scroll events
  const animationLoop = useCallback(() => {
    const target = targetFrameRef.current;
    const current = smoothFrameRef.current;
    const delta = target - current;

    // Soft-clamp velocity transition (aerodynamic drag emulation)
    // Avoids hard linear caps which cause a "jerk" (discontinuous acceleration) upon release
    const rawStep = delta * BASE_LERP;
    const step = MAX_FRAME_STEP * Math.tanh(rawStep / MAX_FRAME_STEP);
    
    const nextSmooth = Math.max(0, Math.min(TOTAL_FRAMES - 1, current + step));
    smoothFrameRef.current = nextSmooth;

    // Convert to integer frame index
    let frameIndex = Math.min(
      Math.max(0, Math.round(nextSmooth)),
      TOTAL_FRAMES - 1
    );

    // Adaptive first-frame render threshold
    if (!hasRenderedFrameOneRef.current && nextSmooth > 0) {
      frameIndex = 1;
      hasRenderedFrameOneRef.current = true;
    }

    const canvas = canvasRef.current;

    // Only re-render if the displayed frame actually changed
    if (frameIndex !== lastRenderedRef.current) {
      lastRenderedRef.current = frameIndex;
      renderFrame(frameIndex);
    }

    // Update ComponentReveal and CockpitReveal overlays
    if (canvas) {
      const cw = canvas.width;
      const ch = canvas.height;
      const sw = seqWidthRef.current || 1920;
      const sh = seqHeightRef.current || 1080;

      revealRef.current?.updateReveal(nextSmooth, cw, ch, sw, sh);
      cockpitRef.current?.updateReveal(nextSmooth, cw, ch, sw, sh);

      // Cinematic ending transition filter
      applyEndingFilter(canvas, nextSmooth);
    }

    // Notify parent of smooth frame change to update UI overlay styles
    onFrameUpdate?.(nextSmooth);
    (window as any).currentFrameIndex = nextSmooth;
    window.dispatchEvent(new CustomEvent("frame-update", { detail: nextSmooth }));

    // Check if settled (close enough to target)
    if (Math.abs(target - nextSmooth) > SETTLE_THRESHOLD) {
      // Not settled yet — continue loop
      animRafRef.current = requestAnimationFrame(animationLoop);
    } else {
      // Settled — snap to exact target, render final frame, stop loop
      smoothFrameRef.current = target;
      if (target === 0) {
        hasRenderedFrameOneRef.current = false;
      }
      const finalFrame = Math.min(
        Math.max(0, Math.round(target)),
        TOTAL_FRAMES - 1
      );
      if (finalFrame !== lastRenderedRef.current) {
        lastRenderedRef.current = finalFrame;
        renderFrame(finalFrame);
      }

      // Final update of overlays upon settling
      if (canvas) {
        const cw = canvas.width;
        const ch = canvas.height;
        const sw = seqWidthRef.current || 1920;
        const sh = seqHeightRef.current || 1080;

        revealRef.current?.updateReveal(target, cw, ch, sw, sh);
        cockpitRef.current?.updateReveal(target, cw, ch, sw, sh);
        applyEndingFilter(canvas, target);
      }

      onFrameUpdate?.(target);
      (window as any).currentFrameIndex = target;
      window.dispatchEvent(new CustomEvent("frame-update", { detail: target }));
      animRafRef.current = 0;
      isAnimatingRef.current = false;
    }
  }, [renderFrame, onFrameUpdate]);

  // Starts the animation loop if it isn't already running
  const ensureAnimating = useCallback(() => {
    if (!isAnimatingRef.current && !animRafRef.current) {
      isAnimatingRef.current = true;
      animRafRef.current = requestAnimationFrame(animationLoop);
    }
  }, [animationLoop]);

  // ─── Scroll handler ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;

    function onScroll() {
      lastScrollTimeRef.current = performance.now();

      const scrolled = window.scrollY;
      const scrollableHeight = (SCROLL_HEIGHT_MULTIPLIER - 1) * window.innerHeight;
      const progress = scrollableHeight > 0 
        ? Math.max(0, Math.min(1, scrolled / scrollableHeight))
        : 0;

      // Set target as a float — the animation loop will interpolate toward it
      targetFrameRef.current = progress * (TOTAL_FRAMES - 1);

      // Kick the animation loop
      ensureAnimating();
    }

    window.addEventListener("scroll", onScroll, { passive: true });

    // Initial target computation
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (animRafRef.current) {
        cancelAnimationFrame(animRafRef.current);
        animRafRef.current = 0;
      }
      isAnimatingRef.current = false;
    };
  }, [loaded, ensureAnimating]);

  // Clear image references for garbage collection only on genuine component unmount
  useEffect(() => {
    return () => {
      framesRef.current = [];
    };
  }, []);



  // ─── Handle resize ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;

    function onResize() {
      // Re-render current frame at new canvas dimensions
      const frameIndex = lastRenderedRef.current;
      if (frameIndex >= 0) {
        renderFrame(frameIndex);

        const canvas = canvasRef.current;
        if (canvas) {
          revealRef.current?.updateReveal(
            smoothFrameRef.current,
            canvas.width,
            canvas.height,
            seqWidthRef.current || 1920,
            seqHeightRef.current || 1080
          );
          cockpitRef.current?.updateReveal(
            smoothFrameRef.current,
            canvas.width,
            canvas.height,
            seqWidthRef.current || 1920,
            seqHeightRef.current || 1080
          );
        }
      }
    }

    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [loaded, renderFrame]);
  // Page visibility lifecycle management
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animRafRef.current) {
          cancelAnimationFrame(animRafRef.current);
          animRafRef.current = 0;
        }
        isAnimatingRef.current = false;
      } else {
        const target = targetFrameRef.current;
        if (Math.abs(target - smoothFrameRef.current) > SETTLE_THRESHOLD) {
          ensureAnimating();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [ensureAnimating]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: `${SCROLL_HEIGHT_MULTIPLIER * 100}vh`,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "block",
          pointerEvents: "none",
          zIndex: 10,
          transform: "translate3d(0, 0, 0)", // Promote to GPU layer for hardware acceleration
          backfaceVisibility: "hidden",     // GPU optimization
        }}
      />
      <ComponentReveal ref={revealRef} />
      <CockpitReveal ref={cockpitRef} />
    </div>
  );
}

export default memo(FrameSequence);
