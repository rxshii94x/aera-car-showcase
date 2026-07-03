import React, { useRef, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { premiumAudio } from "../App";

interface CinematicIntroProps {
  onVideoEnd: () => void;
  onScrollUnlock: () => void;
  isFramesLoaded: boolean;
  loadProgress: number;
  isFirstFrameReady: boolean;
}

export default function CinematicIntro({ 
  onVideoEnd, 
  onScrollUnlock, 
  isFramesLoaded, 
  loadProgress,
  isFirstFrameReady
}: CinematicIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isTransitioningRef = useRef(false);
  const hasClickedCtaRef = useRef(false);
  const fadeStartedRef = useRef(false);

  const bridgeOverlayRef = useRef<HTMLDivElement>(null);
  const introContainerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);
  const line3Ref = useRef<HTMLSpanElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);

  // Staggered overlay opacity mapping based on Phase 02/03 timings
  const getOverlayOpacity = (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 0.94; // Top visibility at 94% opacity
    
    let opacity = 0;
    if (t < 0.125) {
      opacity = (t / 0.125) * 0.15;
    } else if (t < 0.25) {
      opacity = 0.15 + ((t - 0.125) / 0.125) * 0.15;
    } else if (t < 0.375) {
      opacity = 0.30 + ((t - 0.25) / 0.125) * 0.15;
    } else if (t < 0.50) {
      opacity = 0.45 + ((t - 0.375) / 0.125) * 0.15;
    } else if (t < 0.625) {
      opacity = 0.60 + ((t - 0.50) / 0.125) * 0.15;
    } else if (t < 0.75) {
      opacity = 0.75 + ((t - 0.625) / 0.125) * 0.10;
    } else {
      opacity = 0.85 + ((t - 0.75) / 0.25) * 0.09;
    }
    return opacity;
  };

  // Set up video listeners and start loading
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      setVideoEnded(true);
    };

    const handleCanPlayThrough = () => {
      setVideoReady(true);
    };

    video.addEventListener("ended", handleEnded);
    video.addEventListener("canplaythrough", handleCanPlayThrough);

    if (video.readyState >= 4) {
      setVideoReady(true);
    } else {
      video.load();
    }

    return () => {
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("canplaythrough", handleCanPlayThrough);
    };
  }, []);

  // Start playing the video immediately on mount to run in the background
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.play().catch((err) => {
      console.warn("Initial autoplay start failed:", err);
    });
  }, []);

  // Ensure video is playing when ready
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (videoReady) {
      video.play().catch((err) => {
        console.warn("Playback ensure failed:", err);
      });
    }
  }, [videoReady]);

  // Precision check loop to identify when video ends and drive overlay timelines
  useEffect(() => {
    let animId: number;
    const checkTime = () => {
      if (isTransitioningRef.current) {
        animId = requestAnimationFrame(checkTime);
        return;
      }

      const video = videoRef.current;
      if (!video || video.paused || !video.duration) {
        animId = requestAnimationFrame(checkTime);
        return;
      }

      const duration = video.duration;
      const currentTime = video.currentTime;

      if (duration > 0) {
        // Starts exactly 4.0 seconds before the video ends
        const slowDownStart = Math.max(0, duration - 4.0);
        if (currentTime >= slowDownStart) {
          const t = Math.min(1, Math.max(0, (currentTime - slowDownStart) / (duration - slowDownStart)));
          
          // 1. Overlay opacity scales continuously from 0% up to 80%
          const overlay = bridgeOverlayRef.current;
          if (overlay) {
            overlay.style.display = "flex";
            overlay.style.opacity = getOverlayOpacity(t).toFixed(4);
            if (t >= 0.70) {
              overlay.style.pointerEvents = "auto";
            }
          }

          // 2. Sequential typography reveals
          const easeOutQuint = (x: number) => 1 - Math.pow(1 - x, 5);

          const animateElement = (
            elRef: React.RefObject<HTMLElement | null>,
            start: number,
            durationVal: number,
            maxOpacity = 1
          ) => {
            const el = elRef.current;
            if (!el) return;

            const end = start + durationVal;
            if (t < start) {
              el.style.opacity = "0";
              el.style.filter = "blur(16px)";
              el.style.transform = "translate3d(0, 40px, 0)";
            } else if (t > end) {
              el.style.opacity = maxOpacity.toString();
              el.style.filter = "blur(0px)";
              el.style.transform = "translate3d(0, 0px, 0)";
            } else {
              const progress = (t - start) / durationVal;
              const eased = easeOutQuint(progress);
              const opacity = eased * maxOpacity;
              const blur = (1 - eased) * 16;
              const translateY = (1 - eased) * 40;

              el.style.opacity = opacity.toFixed(4);
              el.style.filter = `blur(${blur.toFixed(2)}px)`;
              el.style.transform = `translate3d(0, ${translateY.toFixed(2)}px, 0)`;
            }
          };

          animateElement(labelRef, 0.10, 0.225, 0.50);
          animateElement(line1Ref, 0.25, 0.225);
          animateElement(line2Ref, 0.38, 0.225);
          animateElement(line3Ref, 0.51, 0.225);
          animateElement(ctaRef, 0.70, 0.225);

          // PHASE 04: Frame sequence takeover & Video opacity fade-out
          if (t >= 0.75) {
            const takeoverProgress = (t - 0.75) / 0.25; // 0 to 1
            if (video) {
              video.style.opacity = (1 - takeoverProgress).toFixed(4);
            }
          }
        } else {
          // PHASE 01: Porsche is fully visible, no overlay
          const overlay = bridgeOverlayRef.current;
          if (overlay) {
            overlay.style.display = "none";
            overlay.style.opacity = "0";
            overlay.style.pointerEvents = "none";
          }
          if (video) {
            video.style.opacity = "1";
          }
        }
      }

      const timeRemaining = duration - currentTime;

      // Scenario A: Frames are NOT loaded, and we are within 200ms of the end.
      if (!isFramesLoaded && timeRemaining <= 0.2) {
        video.pause();
      }

      // Scenario B: Frames ARE loaded, and we are within 40ms of the end.
      if (isFramesLoaded && timeRemaining <= 0.04) {
        // Synchronously hide and pause the video to avoid any frozen frames before React state commits
        video.style.display = "none";
        video.style.opacity = "0";
        video.pause();
        setVideoEnded(true);
      }

      animId = requestAnimationFrame(checkTime);
    };

    const handleVisibilityChange = () => {
      const video = videoRef.current;
      if (document.hidden) {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = 0;
        }
        if (video && !video.paused) {
          (video as any)._wasPlayingBeforeHidden = true;
          video.pause();
        }
      } else {
        if (video && (video as any)._wasPlayingBeforeHidden && videoReady && !videoEnded) {
          video.play().catch((err) => console.warn("Resume play failed:", err));
          (video as any)._wasPlayingBeforeHidden = false;
        }
        if (videoReady && !videoEnded && !animId) {
          animId = requestAnimationFrame(checkTime);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (videoReady && !videoEnded) {
      animId = requestAnimationFrame(checkTime);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [videoReady, videoEnded, isFramesLoaded]);

  // Resume playback if we paused near the end and now frames are loaded
  useEffect(() => {
    if (isFramesLoaded && videoReady && !videoEnded) {
      const video = videoRef.current;
      if (video && video.paused) {
        video.play().catch((err) => {
          console.warn("Resuming playback failed:", err);
        });
      }
    }
  }, [isFramesLoaded, videoReady, videoEnded]);

  // Freeze exactly on the last frame, hold user interaction until CTA click
  useEffect(() => {
    if (isTransitioningRef.current || isTransitioning) return;

    if (videoEnded && isFramesLoaded) {
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.style.display = "none";
      }

      // Ensure overlay and typography elements are fully set and clickable
      const overlay = bridgeOverlayRef.current;
      if (overlay) {
        overlay.style.display = "flex";
        overlay.style.opacity = "0.94";
        overlay.style.pointerEvents = "auto";
      }

      const forceVisible = (elRef: React.RefObject<HTMLElement | null>, maxOpacity = 1) => {
        const el = elRef.current;
        if (el) {
          el.style.opacity = maxOpacity.toString();
          el.style.filter = "blur(0px)";
          el.style.transform = "translate3d(0, 0, 0)";
        }
      };

      forceVisible(labelRef, 0.50);
      forceVisible(line1Ref);
      forceVisible(line2Ref);
      forceVisible(line3Ref);
      forceVisible(ctaRef);
    }
  }, [videoEnded, isFramesLoaded, isTransitioning]);

  const startOverlayFadeOut = () => {
    if (fadeStartedRef.current) return;
    fadeStartedRef.current = true;
    premiumAudio.playTransitionSweep();

    const overlay = bridgeOverlayRef.current;
    if (overlay) {
      overlay.style.pointerEvents = "none";
      overlay.style.transition = "opacity 650ms cubic-bezier(0.22, 1, 0.36, 1)";
      overlay.style.opacity = "0";
    }

    const container = introContainerRef.current;
    if (container) {
      container.style.transition = "opacity 650ms cubic-bezier(0.22, 1, 0.36, 1)";
      container.style.opacity = "0";
    }

    setTimeout(() => {
      onVideoEnd();
    }, 650);
  };

  const handleCtaClick = () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setIsTransitioning(true);
    hasClickedCtaRef.current = true;

    // Apply click scaling class
    const cta = ctaRef.current;
    if (cta) {
      cta.classList.add("cta-clicked");
    }

    // 1. Immediately fade out Button and Typography
    const typography = document.getElementById("transition-bridge-typography");
    if (typography) {
      typography.style.transition = "opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1), transform 0.8s cubic-bezier(0.22, 1, 0.36, 1), filter 0.8s cubic-bezier(0.22, 1, 0.36, 1)";
      typography.style.opacity = "0";
      typography.style.transform = "translate3d(0, -20px, 0)";
      typography.style.filter = "blur(12px)";
    }

    // 2. Unlock scroll immediately so frame sequence can begin rendering immediately
    onScrollUnlock();

    // 3. Make overlay 100% black instantly to completely hide canvas first-paint latency
    const overlay = bridgeOverlayRef.current;
    if (overlay) {
      overlay.style.opacity = "1";
    }

    // 4. Start overlay fade-out: if frame is already ready, start with a tiny 100ms delay for motion.
    // Otherwise, wait for the canvas ready event.
    if (isFirstFrameReady) {
      startOverlayFadeOut();
    }
  };

  useEffect(() => {
    if (isFirstFrameReady && hasClickedCtaRef.current) {
      startOverlayFadeOut();
    }
  }, [isFirstFrameReady]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      premiumAudio.init();
      premiumAudio.playIntroAmbience();
      
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };

    window.addEventListener("click", handleFirstInteraction, { once: true, passive: true });
    window.addEventListener("touchstart", handleFirstInteraction, { once: true, passive: true });

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
      premiumAudio.stopIntroAmbience();
    };
  }, []);
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video) {
        try {
          video.pause();
          video.src = "";
          video.load();
        } catch (e) {}
      }
    };
  }, []);

  return (
    <div
      ref={introContainerRef}
      className="fixed inset-0 z-40 select-none pointer-events-none overflow-hidden"
      style={{
        backgroundColor: "#000000",
        width: "100vw",
        height: "100vh",
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src="/intro.mp4"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          display: "block",
          opacity: videoReady ? 1 : 0,
          transform: "translate3d(0, 0, 0)",
          backfaceVisibility: "hidden",
          willChange: "transform, opacity",
        }}
        playsInline
        muted
        autoPlay
        preload="auto"
      />

      {/* Cinematic Transition Bridge Overlay */}
      <div
        ref={bridgeOverlayRef}
        id="transition-bridge-overlay"
        className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black px-4 select-none pointer-events-none"
        style={{
          opacity: 0,
          display: "none",
          willChange: "opacity"
        }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes cta-breathing {
            0%, 100% {
              transform: scale(1.00);
            }
            50% {
              transform: scale(1.015);
            }
          }

          @keyframes cta-shine {
            0% {
              left: -150%;
            }
            16% {
              left: 150%;
            }
            100% {
              left: 150%;
            }
          }

          @keyframes cta-click-anim {
            0% {
              transform: scale(1.03);
            }
            50% {
              transform: scale(0.98);
            }
            100% {
              transform: scale(1.00);
            }
          }

          .cta-btn-premium {
            position: relative;
            overflow: hidden;
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 1);
            color: #ffffff;
            font-family: "Neue Haas Grotesk", "Neue Haas Grotesk Display", "Helvetica Neue", -apple-system, BlinkMacSystemFont, sans-serif;
            text-transform: uppercase;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 3px;
            padding: 18px 0px;
            width: 350px;
            max-width: 90vw;
            text-align: center;
            cursor: pointer;
            outline: none;
            user-select: none;
            pointer-events: auto;
            display: inline-block;
            transition: background-color 350ms cubic-bezier(0.22, 1, 0.36, 1), 
                        color 350ms cubic-bezier(0.22, 1, 0.36, 1), 
                        transform 350ms cubic-bezier(0.22, 1, 0.36, 1);
            animation: cta-breathing 4s ease-in-out infinite;
          }

          .cta-btn-premium::after {
            content: '';
            position: absolute;
            top: 0;
            width: 60%;
            height: 100%;
            background: linear-gradient(
              90deg,
              rgba(255, 255, 255, 0) 0%,
              rgba(255, 255, 255, 0.15) 30%,
              rgba(255, 255, 255, 0.3) 50%,
              rgba(255, 255, 255, 0.15) 70%,
              rgba(255, 255, 255, 0) 100%
            );
            transform: skewX(-25deg);
            animation: cta-shine 5s cubic-bezier(0.43, 0.19, 0.15, 0.84) infinite;
            pointer-events: none;
          }

          .cta-btn-premium:hover {
            background-color: #ffffff;
            color: #000000;
            transform: scale(1.03);
            animation: none;
          }

          .cta-btn-premium.cta-clicked {
            animation: cta-click-anim 220ms cubic-bezier(0.22, 1, 0.36, 1) forwards !important;
          }
        `}} />

        <div 
          id="transition-bridge-typography"
          className="flex flex-col items-center justify-center text-center max-w-[480px] w-full gap-0"
        >
          {/* Small Label: PORSCHE */}
          <span
            ref={labelRef}
            className="font-neue text-[10px] font-semibold tracking-[0.45em] text-[#D8D8D8] opacity-50 uppercase mb-8 block pl-[0.45em]"
            style={{ opacity: 0, transform: "translate3d(0, 40px, 0)", filter: "blur(16px)" }}
          >
            PORSCHE
          </span>

          {/* 3-Line Heading: THE DRIVE STARTS HERE. */}
          <div className="flex flex-col items-center leading-[0.78] mb-6">
            <span
              ref={line1Ref}
              className="font-druk text-white text-[11vw] sm:text-[8.5vw] md:text-[4.2rem] lg:text-[5rem] font-[900] tracking-[-0.03em] uppercase block"
              style={{ opacity: 0, transform: "translate3d(0, 40px, 0)", filter: "blur(16px)" }}
            >
              THE DRIVE
            </span>
            <span
              ref={line2Ref}
              className="font-druk text-white text-[11vw] sm:text-[8.5vw] md:text-[4.2rem] lg:text-[5rem] font-[900] tracking-[-0.03em] uppercase block mt-1"
              style={{ opacity: 0, transform: "translate3d(0, 40px, 0)", filter: "blur(16px)" }}
            >
              STARTS
            </span>
            <span
              ref={line3Ref}
              className="font-druk text-white text-[11vw] sm:text-[8.5vw] md:text-[4.2rem] lg:text-[5rem] font-[900] tracking-[-0.03em] uppercase block mt-1"
              style={{ opacity: 0, transform: "translate3d(0, 40px, 0)", filter: "blur(16px)" }}
            >
              HERE.
            </span>
          </div>

          {/* Premium CTA Button */}
          <button
            ref={ctaRef}
            data-magnetic
            onMouseEnter={() => premiumAudio.playTactileHover()}
            onClick={() => {
              if (isTransitioningRef.current) return;
              premiumAudio.init();
              premiumAudio.playCtaClickAndTransition();
              handleCtaClick();
            }}
            className="cta-btn-premium mt-6 cta-breath-eligible"
            style={{ opacity: 0, transform: "translate3d(0, 40px, 0)", filter: "blur(16px)" }}
          >
            ENTER THE GT3 RS
          </button>

        </div>
      </div>


     </div>
   );
 }
