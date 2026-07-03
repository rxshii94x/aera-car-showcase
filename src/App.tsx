import React, { useState, useCallback, useEffect, useRef } from "react";
import FrameSequence from "./components/FrameSequence";
import CinematicIntro from "./components/CinematicIntro";
import Navbar from "./components/Navbar";
import ScrollIndicator from "./components/ScrollIndicator";

// Easing helper solver for cubic-bezier transition curves
function createCubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3.0 * x1;
  const bx = 3.0 * (x2 - x1) - cx;
  const ax = 1.0 - cx - bx;
  
  const cy = 3.0 * y1;
  const by = 3.0 * (y2 - y1) - cy;
  const ay = 1.0 - cy - by;

  function sampleCurveX(t: number) {
    return ((ax * t + bx) * t + cx) * t;
  }

  function sampleCurveY(t: number) {
    return ((ay * t + by) * t + cy) * t;
  }

  function sampleCurveDerivativeX(t: number) {
    return (3.0 * ax * t + 2.0 * bx) * t + cx;
  }

  function solveCurveX(x: number) {
    let t2 = x;
    for (let i = 0; i < 8; i++) {
      const x2 = sampleCurveX(t2) - x;
      if (Math.abs(x2) < 1e-6) return t2;
      const d2 = sampleCurveDerivativeX(t2);
      if (Math.abs(d2) < 1e-6) break;
      t2 -= x2 / d2;
    }
    let t0 = 0.0;
    let t1 = 1.0;
    t2 = x;
    if (t2 < t0) return t0;
    if (t2 > t1) return t1;
    while (t0 < t1) {
      const x2 = sampleCurveX(t2);
      if (Math.abs(x2 - x) < 1e-6) return t2;
      if (x > x2) t0 = t2;
      else t1 = t2;
      t2 = (t1 - t0) * 0.5 + t0;
    }
    return t2;
  }

  return function solve(x: number) {
    return sampleCurveY(solveCurveX(x));
  };
}

const easeOutQuint = createCubicBezier(0.22, 1, 0.36, 1);

// Premium Audio System Architecture (Dormant Mode)
class PremiumAudioManager {
  private ctx: AudioContext | null = null;
  private isInitialized = false;
  private masterGain: GainNode | null = null;
  private currentVolume = 0.20; // Default 20% volume

  // Active voice nodes for smooth fades
  private activeNodes: Map<string, { source: AudioNode; gain: GainNode; type: string }> = new Map();

  public init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.currentVolume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
        this.isInitialized = true;
        console.log("Premium Audio System Initialized (Dormant Mode)");

        document.addEventListener("visibilitychange", this.handleVisibilityChange);
      }
    } catch (e) {
      console.warn("Failed to initialize Web Audio API:", e);
    }
  }

  private handleVisibilityChange = () => {
    if (!this.ctx || !this.masterGain) return;
    if (document.hidden) {
      // Smoothly fade master volume to 0 when tab becomes inactive
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
      setTimeout(() => {
        if (document.hidden && this.ctx?.state === "running") {
          this.ctx.suspend();
        }
      }, 500);
    } else {
      // Resume context and fade master volume back to default only if audio was previously active
      if (this.activeNodes.size > 0) {
        if (this.ctx.state === "suspended") {
          this.ctx.resume().then(() => {
            this.masterGain?.gain.setTargetAtTime(this.currentVolume, this.ctx!.currentTime, 0.15);
          });
        } else {
          this.masterGain.gain.setTargetAtTime(this.currentVolume, this.ctx.currentTime, 0.15);
        }
      }
    }
  };

  private fadeOutAndStop(key: string, fadeDuration = 0.3) {
    const active = this.activeNodes.get(key);
    if (!active) return;
    this.activeNodes.delete(key);

    const { source, gain } = active;
    if (!this.ctx) return;

    try {
      const currTime = this.ctx.currentTime;
      gain.gain.cancelScheduledValues(currTime);
      gain.gain.setValueAtTime(gain.gain.value, currTime);
      gain.gain.linearRampToValueAtTime(0, currTime + fadeDuration);

      setTimeout(() => {
        try {
          (source as any).stop?.();
          source.disconnect();
          gain.disconnect();
        } catch (e) {}
      }, fadeDuration * 1000 + 50);
    } catch (e) {}
  }

  private createNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error("AudioContext not initialized");
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // ─── Playback Engine Methods ──────────────────────────────────────────

  public playIntroAmbience() {
    if (!this.ctx || !this.isInitialized || !this.masterGain) return;
    if (this.activeNodes.has("intro_ambience")) return;

    this.fadeOutAndStop("cabin_ambience");
    this.fadeOutAndStop("wheel_texture");

    const currTime = this.ctx.currentTime;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(120, currTime);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, currTime);
    gainNode.gain.linearRampToValueAtTime(0.04, currTime + 2.0); // Distant Flat-Six ambience

    const osc1 = this.ctx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(55, currTime);

    const osc2 = this.ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(110, currTime);

    const osc3 = this.ctx.createOscillator();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(165, currTime);

    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc1.start(0);
    osc2.start(0);
    osc3.start(0);

    const sourceProxy = {
      stop: () => {
        try { osc1.stop(); } catch (e) {}
        try { osc2.stop(); } catch (e) {}
        try { osc3.stop(); } catch (e) {}
      },
      disconnect: () => {
        try { osc1.disconnect(); } catch (e) {}
        try { osc2.disconnect(); } catch (e) {}
        try { osc3.disconnect(); } catch (e) {}
        filter.disconnect();
      }
    };

    this.activeNodes.set("intro_ambience", { source: sourceProxy as any, gain: gainNode, type: "intro" });
  }

  public stopIntroAmbience() {
    this.fadeOutAndStop("intro_ambience", 0.6);
  }

  public playCtaClickAndTransition() {
    if (!this.ctx || !this.isInitialized || !this.masterGain) return;
    const currTime = this.ctx.currentTime;

    // 1. Mechanical transient click
    try {
      const osc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(1500, currTime);
      osc.frequency.exponentialRampToValueAtTime(150, currTime + 0.015);

      clickGain.gain.setValueAtTime(0.3, currTime);
      clickGain.gain.exponentialRampToValueAtTime(0.001, currTime + 0.015);

      osc.connect(clickGain);
      clickGain.connect(this.masterGain);
      osc.start(currTime);
      osc.stop(currTime + 0.02);
    } catch (e) {}

    // 2. Air transition sound
    try {
      const noiseBuffer = this.createNoiseBuffer();
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const bpf = this.ctx.createBiquadFilter();
      bpf.type = "bandpass";
      bpf.frequency.setValueAtTime(300, currTime);
      bpf.frequency.exponentialRampToValueAtTime(1200, currTime + 0.8);
      bpf.Q.setValueAtTime(3.0, currTime);

      const sweepGain = this.ctx.createGain();
      sweepGain.gain.setValueAtTime(0.001, currTime);
      sweepGain.gain.linearRampToValueAtTime(0.08, currTime + 0.25);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, currTime + 0.8);

      noiseSource.connect(bpf);
      bpf.connect(sweepGain);
      sweepGain.connect(this.masterGain);

      noiseSource.start(currTime);
      noiseSource.stop(currTime + 0.8);
    } catch (e) {}
  }

  public playTransitionSweep() {
    if (!this.ctx || !this.isInitialized || !this.masterGain) return;
    const currTime = this.ctx.currentTime;

    try {
      const noiseBuffer = this.createNoiseBuffer();
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const bpf = this.ctx.createBiquadFilter();
      bpf.type = "bandpass";
      bpf.frequency.setValueAtTime(400, currTime);
      bpf.frequency.exponentialRampToValueAtTime(1500, currTime + 0.9);
      bpf.Q.setValueAtTime(2.0, currTime);

      const sweepGain = this.ctx.createGain();
      sweepGain.gain.setValueAtTime(0.001, currTime);
      sweepGain.gain.linearRampToValueAtTime(0.05, currTime + 0.3);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, currTime + 0.9);

      noiseSource.connect(bpf);
      bpf.connect(sweepGain);
      sweepGain.connect(this.masterGain);

      noiseSource.start(currTime);
      noiseSource.stop(currTime + 0.9);
    } catch (e) {}
  }

  public playHeroRevealEngine() {
    if (!this.ctx || !this.isInitialized || !this.masterGain) return;

    this.fadeOutAndStop("intro_ambience");
    this.fadeOutAndStop("cabin_ambience");
    this.fadeOutAndStop("wheel_texture");

    const currTime = this.ctx.currentTime;

    const lpf = this.ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.setValueAtTime(150, currTime);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, currTime);
    gainNode.gain.linearRampToValueAtTime(0.08, currTime + 0.4); // Fades in over 400ms
    gainNode.gain.setValueAtTime(0.08, currTime + 1.2);
    gainNode.gain.linearRampToValueAtTime(0, currTime + 1.8); // Fades out over 600ms

    const osc1 = this.ctx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(65, currTime); // 65Hz hum

    const osc2 = this.ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(130, currTime);

    osc1.connect(lpf);
    osc2.connect(lpf);
    lpf.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc1.start(currTime);
    osc2.start(currTime);
    osc1.stop(currTime + 1.8);
    osc2.stop(currTime + 1.8);
  }

  public playCabinAmbience() {
    if (!this.ctx || !this.isInitialized || !this.masterGain) return;
    if (this.activeNodes.has("cabin_ambience")) return;

    this.fadeOutAndStop("intro_ambience");
    this.fadeOutAndStop("wheel_texture");

    const currTime = this.ctx.currentTime;

    const lpf = this.ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.setValueAtTime(80, currTime);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, currTime);
    gainNode.gain.linearRampToValueAtTime(0.05, currTime + 1.0); // Insulated Cabin Hum

    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(50, currTime); // Bass road hum

    const noiseBuffer = this.createNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    osc.connect(lpf);
    noiseSource.connect(lpf);
    lpf.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(currTime);
    noiseSource.start(currTime);

    const sourceProxy = {
      stop: () => {
        try { osc.stop(); } catch (e) {}
        try { noiseSource.stop(); } catch (e) {}
      },
      disconnect: () => {
        try { osc.disconnect(); } catch (e) {}
        try { noiseSource.disconnect(); } catch (e) {}
        lpf.disconnect();
      }
    };

    this.activeNodes.set("cabin_ambience", { source: sourceProxy as any, gain: gainNode, type: "cabin" });
  }

  public stopCabinAmbience() {
    this.fadeOutAndStop("cabin_ambience", 0.8);
  }

  public playWheelTexture() {
    if (!this.ctx || !this.isInitialized || !this.masterGain) return;
    if (this.activeNodes.has("wheel_texture")) return;

    this.fadeOutAndStop("intro_ambience");
    this.fadeOutAndStop("cabin_ambience");

    const currTime = this.ctx.currentTime;

    const hpf = this.ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.setValueAtTime(2500, currTime);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, currTime);
    gainNode.gain.linearRampToValueAtTime(0.008, currTime + 1.0); // Metallic shimmer

    const osc1 = this.ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(2800, currTime);

    const osc2 = this.ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(4200, currTime);

    osc1.connect(hpf);
    osc2.connect(hpf);
    hpf.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc1.start(currTime);
    osc2.start(currTime);

    const sourceProxy = {
      stop: () => {
        try { osc1.stop(); } catch (e) {}
        try { osc2.stop(); } catch (e) {}
      },
      disconnect: () => {
        try { osc1.disconnect(); } catch (e) {}
        try { osc2.disconnect(); } catch (e) {}
        hpf.disconnect();
      }
    };

    this.activeNodes.set("wheel_texture", { source: sourceProxy as any, gain: gainNode, type: "wheel" });
  }

  public stopWheelTexture() {
    this.fadeOutAndStop("wheel_texture", 0.8);
  }

  public fadeEverything() {
    this.fadeOutAndStop("intro_ambience", 0.5);
    this.fadeOutAndStop("cabin_ambience", 0.5);
    this.fadeOutAndStop("wheel_texture", 0.5);
  }

  public playTactileHover() {
    if (!this.ctx || !this.isInitialized || !this.masterGain) return;
    const currTime = this.ctx.currentTime;

    try {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, currTime);
      osc.frequency.exponentialRampToValueAtTime(600, currTime + 0.04);

      gainNode.gain.setValueAtTime(0.015, currTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, currTime + 0.04);

      osc.connect(gainNode);
      gainNode.connect(this.masterGain);
      osc.start(currTime);
      osc.stop(currTime + 0.045);
    } catch (e) {}
  }

  public playUiClick() {
    if (!this.ctx || !this.isInitialized || !this.masterGain) return;
    const currTime = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, currTime);
      osc.frequency.exponentialRampToValueAtTime(100, currTime + 0.02);

      gainNode.gain.setValueAtTime(0.05, currTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, currTime + 0.02);

      osc.connect(gainNode);
      gainNode.connect(this.masterGain);
      osc.start(currTime);
      osc.stop(currTime + 0.025);
    } catch (e) {}
  }

  public playConfirmationClick() {
    if (!this.ctx || !this.isInitialized || !this.masterGain) return;
    const currTime = this.ctx.currentTime;

    this.fadeEverything();

    const playClick = (timeOffset: number, vol: number) => {
      try {
        const osc = this.ctx!.createOscillator();
        const gainNode = this.ctx!.createGain();
        
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1000, currTime + timeOffset);
        osc.frequency.exponentialRampToValueAtTime(100, currTime + timeOffset + 0.02);

        gainNode.gain.setValueAtTime(vol, currTime + timeOffset);
        gainNode.gain.exponentialRampToValueAtTime(0.001, currTime + timeOffset + 0.02);

        osc.connect(gainNode);
        gainNode.connect(this.masterGain!);
        osc.start(currTime + timeOffset);
        osc.stop(currTime + timeOffset + 0.025);
      } catch (e) {}
    };

    // Double confirmation clicks
    playClick(0, 0.15);
    playClick(0.03, 0.1);
  }

  public updateEnginePitch(velocity: number) {
    if (!this.ctx || !this.isInitialized) return;
    // Master volume dynamic synth mapping slot if required in future
  }
}

export const premiumAudio = new PremiumAudioManager();

export default function App() {
  const [framesLoaded, setFramesLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [canvasFirstFrameReady, setCanvasFirstFrameReady] = useState(false);
  const [introActive, setIntroActive] = useState(true);
  const [scrollUnlocked, setScrollUnlocked] = useState(false);
  const [endingResetting, setEndingResetting] = useState(false);
  const endingResettingRef = useRef(false);
  const scrollUnlockedRef = useRef(false);

  useEffect(() => {
    scrollUnlockedRef.current = scrollUnlocked;
  }, [scrollUnlocked]);

  const handleScrollUnlock = useCallback(() => {
    scrollUnlockedRef.current = true; // Synchronous update to bypass React state commit delay
    setScrollUnlocked(true);
  }, []);

  // Prevent browser scroll restoration to avoid starting at non-zero offsets
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  // Lock browser viewport overflow and scroll position when intro is active
  useEffect(() => {
    if (!scrollUnlocked) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      window.scrollTo(0, 0);
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [scrollUnlocked]);

  const handleFirstFrameReady = useCallback(() => {
    setCanvasFirstFrameReady(true);
  }, []);

  // Chapter 1 UI elements refs
  const leftContentRef = useRef<HTMLDivElement>(null);
  const specsRef = useRef<HTMLDivElement>(null);

  // Cinematic Ending refs
  const bgOverlayRef = useRef<HTMLDivElement>(null);
  const cinematicEndingRef = useRef<HTMLDivElement>(null);
  const porscheRef = useRef<HTMLDivElement>(null);
  const theEndRef = useRef<HTMLSpanElement>(null);
  const isOnlyRef = useRef<HTMLSpanElement>(null);
  const theBeginningRef = useRef<HTMLSpanElement>(null);
  const redLineRef = useRef<HTMLDivElement>(null);
  const everyFrameRef = useRef<HTMLSpanElement>(null);
  const everyDetailRef = useRef<HTMLSpanElement>(null);
  const everyMomentRef = useRef<HTMLSpanElement>(null);
  const engineeredRef = useRef<HTMLSpanElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const resetTimeoutRef = useRef<any>(null);

  const resetEndingScreen = useCallback(() => {
    // 1. Clear any pending timeouts
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }

    // 2. Remove the trigger classes and transition properties
    if (cinematicEndingRef.current) {
      cinematicEndingRef.current.classList.remove("trigger-color-animation");
      cinematicEndingRef.current.style.transition = "";
      cinematicEndingRef.current.style.opacity = "0";
      cinematicEndingRef.current.style.transform = "";
      cinematicEndingRef.current.style.filter = "";
    }

    // 3. Wiggle/reset inline styles to initial values for scrolling reveals
    const textRefs = [porscheRef, theEndRef, isOnlyRef, theBeginningRef];
    textRefs.forEach((ref) => {
      const el = ref.current;
      if (el) {
        el.style.opacity = "0";
        el.style.transform = "translate3d(0, 24px, 0)";
        el.style.filter = "blur(16px)";
        el.style.transition = "";
        el.style.color = "";
      }
    });

    if (redLineRef.current) {
      redLineRef.current.style.transform = "scaleX(0)";
      redLineRef.current.style.opacity = "0";
      redLineRef.current.style.transition = "";
    }

    // Reset CTA container inline styles
    if (ctaRef.current) {
      ctaRef.current.style.opacity = "0";
      ctaRef.current.style.transform = "translate3d(0, 24px, 0) scale(0.96)";
      ctaRef.current.style.filter = "blur(16px)";
      ctaRef.current.style.transition = "";
    }

    // 4. Reset the button class and cancel active animation
    const ctaButton = document.getElementById("ending-cta-button");
    if (ctaButton) {
      ctaButton.classList.remove("cta-clicked");
      // Force layout recalculation to cancel CSS animations
      void ctaButton.offsetWidth;
    }
  }, []);

  const handleEndingClick = useCallback(() => {
    if (endingResettingRef.current) return;
    premiumAudio.playConfirmationClick();
    endingResettingRef.current = true;
    setEndingResetting(true);

    // Apply click scaling class
    const cta = document.getElementById("ending-cta-button");
    if (cta) {
      cta.classList.add("cta-clicked");
    }

    // 1. Immediately fade out subtitle & button
    if (cinematicEndingRef.current) {
      cinematicEndingRef.current.style.transition = "opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1), transform 0.8s cubic-bezier(0.22, 1, 0.36, 1), filter 0.8s cubic-bezier(0.22, 1, 0.36, 1)";
      cinematicEndingRef.current.style.opacity = "0";
      cinematicEndingRef.current.style.transform = "translate3d(0, -20px, 0)";
      cinematicEndingRef.current.style.filter = "blur(12px)";
    }

    // 2. Reduce overlay opacity from 1.0 to 0%
    let currentOpacity = 1.0;
    const fadeOutEndingOverlay = () => {
      const overlay = bgOverlayRef.current;
      if (!overlay) return;

      currentOpacity -= 0.02; // Smooth decrement
      if (currentOpacity <= 0) {
        overlay.style.opacity = "0";
        overlay.style.display = "none";
        overlay.style.pointerEvents = "none";

        // Reset scroll position to 0
        window.scrollTo(0, 0);

        // Reset state
        resetTimeoutRef.current = setTimeout(() => {
          endingResettingRef.current = false;
          setEndingResetting(false);
          resetEndingScreen();
          resetTimeoutRef.current = null;
        }, 100);
      } else {
        overlay.style.opacity = currentOpacity.toFixed(4);
        requestAnimationFrame(fadeOutEndingOverlay);
      }
    };

    requestAnimationFrame(fadeOutEndingOverlay);
  }, [resetEndingScreen]);

  // ─── Unified scroll-driven style update ────────────────────────────────
  // Performance: Direct DOM manipulation only. No React state changes.
  // Called on every requestAnimationFrame tick from the interpolation engine.
  const updateChapterStyles = useCallback((scrollFrame: number) => {
    if (endingResettingRef.current) return;
    const f = scrollFrame;

    // ═════════════════════════════════════════════════════════════════════
    // TRANSITION BRIDGE OVERLAY EXIT — Handled via CTA click transition
    // ═════════════════════════════════════════════════════════════════════

    // ═════════════════════════════════════════════════════════════════════
    // CHAPTER 1 — Frames 0–85
    // Visible from intro handoff. Fades out as camera begins orbiting.
    // ═════════════════════════════════════════════════════════════════════
    {
      let opacity = 1;
      let translateY = 0;

      if (f <= 40) {
        opacity = 1;
        translateY = 0;
      } else if (f > 40 && f <= 70) {
        // Subtle sinusoidal float during idle viewing
        const floatOffset = Math.sin((f - 40) * 0.08) * 1.5;
        opacity = 1;
        translateY = floatOffset;
      } else if (f > 70 && f <= 85) {
        const floatOffset = Math.sin((f - 40) * 0.08) * 1.5;
        const t = (f - 70) / 15;
        const ease = Math.pow(t, 5); // Quintic ease-in fade out
        opacity = Math.max(0, 1 - ease);
        translateY = -12 * ease + floatOffset;
      } else {
        opacity = 0;
        translateY = -12;
      }

      const opStr = opacity.toFixed(4);
      const tfStr = `translate3d(0, ${translateY.toFixed(2)}px, 0)`;

      if (leftContentRef.current) {
        if (leftContentRef.current.style.opacity !== opStr) {
          leftContentRef.current.style.opacity = opStr;
        }
        if (leftContentRef.current.style.transform !== tfStr) {
          leftContentRef.current.style.transform = tfStr;
        }
      }
      if (specsRef.current) {
        if (specsRef.current.style.opacity !== opStr) {
          specsRef.current.style.opacity = opStr;
        }
        if (specsRef.current.style.transform !== tfStr) {
          specsRef.current.style.transform = tfStr;
        }
      }
    }

    // ═════════════════════════════════════════════════════════════════════
    // CHAPTERS 2, 3, 4, 6 — SILENT
    // No DOM elements. The Porsche is the sole visual focus.
    // ═════════════════════════════════════════════════════════════════════





    // ═════════════════════════════════════════════════════════════════════
    // CINEMATIC ENDING — Frames 531–561 (Overlapping motion & fades)
    // ═════════════════════════════════════════════════════════════════════
    {
      // 1. Background black overlay fade (starts at frame 531, reaches 1.0 at frame 561)
      let bgOpacity = 0;
      if (f >= 531) {
        bgOpacity = Math.max(0, Math.min(1, (f - 531) / 30));
      }
      if (bgOverlayRef.current) {
        const bgOpStr = bgOpacity.toFixed(4);
        if (bgOverlayRef.current.style.opacity !== bgOpStr) {
          bgOverlayRef.current.style.opacity = bgOpStr;
        }
      }

      // 2. Cinematic Ending Typography Reveal (simultaneous with black overlay opacity)
      if (f >= 531) {
        if (cinematicEndingRef.current) {
          const targetOp = bgOpacity >= 0.15 ? "1" : "0";
          const targetPe = bgOpacity >= 0.15 ? "auto" : "none";
          if (cinematicEndingRef.current.style.opacity !== targetOp) {
            cinematicEndingRef.current.style.opacity = targetOp;
          }
          if (cinematicEndingRef.current.style.pointerEvents !== targetPe) {
            cinematicEndingRef.current.style.pointerEvents = targetPe;
          }

          if (f >= 560) {
            if (!cinematicEndingRef.current.classList.contains("trigger-color-animation")) {
              cinematicEndingRef.current.classList.add("trigger-color-animation");
            }
          } else {
            if (cinematicEndingRef.current.classList.contains("trigger-color-animation")) {
              cinematicEndingRef.current.classList.remove("trigger-color-animation");
            }
          }
        }

        // Helper to animate standard text elements
        const animateText = (
          ref: React.RefObject<HTMLElement | null>,
          start: number,
          end: number,
          isCtaContainer = false
        ) => {
          const el = ref.current;
          if (!el) return;

          const startScale = isCtaContainer ? 0.96 : 1;
          const initialTransform = isCtaContainer ? "translate3d(0, 24px, 0) scale(0.96)" : "translate3d(0, 24px, 0)";

          let targetOpacity = "0";
          let targetFilter = "";
          let targetTransform = "";

          if (bgOpacity < start) {
            targetOpacity = "0";
            targetFilter = "";
            targetTransform = initialTransform;
          } else if (bgOpacity > end) {
            targetOpacity = "1";
            targetFilter = "";
            targetTransform = isCtaContainer ? "translate3d(0, 0px, 0) scale(1)" : "translate3d(0, 0px, 0)";
          } else {
            const progress = (bgOpacity - start) / (end - start);
            const eased = easeOutQuint(progress);
            const opacity = eased;
            const blur = (1 - eased) * 16;
            const translateY = (1 - eased) * 24;
            const scale = startScale + (1 - startScale) * eased;

            targetOpacity = opacity.toFixed(4);
            targetFilter = blur > 0.1 ? `blur(${blur.toFixed(2)}px)` : "";
            targetTransform = isCtaContainer 
              ? `translate3d(0, ${translateY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`
              : `translate3d(0, ${translateY.toFixed(2)}px, 0)`;
          }

          if (el.style.opacity !== targetOpacity) {
            el.style.opacity = targetOpacity;
          }
          if (el.style.filter !== targetFilter) {
            el.style.filter = targetFilter;
          }
          if (el.style.transform !== targetTransform) {
            el.style.transform = targetTransform;
          }
        };

        // Helper to animate scaleX red line drawing
        const animateLine = (
          ref: React.RefObject<HTMLElement | null>,
          start: number,
          end: number
        ) => {
          const el = ref.current;
          if (!el) return;

          let targetTransform = "";
          let targetOpacity = "";

          if (bgOpacity < start) {
            targetTransform = "scaleX(0)";
            targetOpacity = "0";
          } else if (bgOpacity > end) {
            targetTransform = "scaleX(1)";
            targetOpacity = "1";
          } else {
            const progress = (bgOpacity - start) / (end - start);
            const eased = easeOutQuint(progress);
            targetTransform = `scaleX(${eased.toFixed(4)})`;
            targetOpacity = eased.toFixed(4);
          }

          if (el.style.transform !== targetTransform) {
            el.style.transform = targetTransform;
          }
          if (el.style.opacity !== targetOpacity) {
            el.style.opacity = targetOpacity;
          }
        };

        // Animate each typography element sequentially (based on bgOpacity overlay level)
        animateText(porscheRef, 0.30, 0.55);
        animateText(theEndRef, 0.45, 0.70);
        animateText(isOnlyRef, 0.55, 0.80);
        animateText(theBeginningRef, 0.65, 0.90);
        animateLine(redLineRef, 0.75, 0.92);
        animateText(ctaRef, 0.82, 0.98, true);
      } else {
        // Reset typographic elements when scrolling back above 531
        resetEndingScreen();
      }
    }

    // Easing-based chapter soundscape transitions
    if (f >= 531) {
      premiumAudio.fadeEverything();
    } else {
      if (f >= 170 && f <= 234) {
        premiumAudio.playWheelTexture();
      } else {
        premiumAudio.stopWheelTexture();
      }

      if (f >= 58 && f <= 160) {
        premiumAudio.playCabinAmbience();
      } else {
        premiumAudio.stopCabinAmbience();
      }
    }
  }, [resetEndingScreen]);

  // Lock scroll position while the intro sequence is active and scroll is locked
  useEffect(() => {
    if (introActive && !scrollUnlocked) {
      document.body.style.overflow = "hidden";
      window.scrollTo(0, 0);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [introActive, scrollUnlocked]);

  // Premium scroll momentum refinement
  useEffect(() => {
    // We register the event listeners on mount to guarantee immediate capture
    // of the user's first input, bypassing React state commit and layout/effects propagation delays.
    let targetScrollY = window.scrollY;
    let currentScrollY = window.scrollY;
    let isAnimating = false;
    let rafId = 0;
    let isVisible = true;

    if (endingResetting) {
      targetScrollY = 0;
      currentScrollY = 0;
      isAnimating = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    const LERP_FACTOR = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1.0 : 0.05;       // Instant snap for accessibility if motion is reduced
    const WHEEL_SENSITIVITY = 1.1;   // Precision sensitivity multiplier
    const SETTLE_THRESHOLD = 0.05;   // Snap threshold

    const stepScroll = () => {
      const diff = targetScrollY - currentScrollY;
      currentScrollY += diff * LERP_FACTOR;
      
      const maxScroll = 19 * window.innerHeight;
      currentScrollY = Math.max(0, Math.min(maxScroll, currentScrollY));
      
      window.scrollTo(0, currentScrollY);

      const scrollVelocity = Math.abs(diff) / window.innerHeight;
      premiumAudio.updateEnginePitch(scrollVelocity);
    };

    const smoothScrollLoop = () => {
      if (!isVisible || endingResetting) return;
      const diff = targetScrollY - currentScrollY;
      if (Math.abs(diff) > SETTLE_THRESHOLD) {
        stepScroll();
        rafId = requestAnimationFrame(smoothScrollLoop);
      } else {
        currentScrollY = targetScrollY;
        window.scrollTo(0, currentScrollY);
        isAnimating = false;
        rafId = 0;
        premiumAudio.updateEnginePitch(0);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (!scrollUnlockedRef.current) {
        e.preventDefault();
        return;
      }
      if (endingResetting) {
        e.preventDefault();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();

      const maxScroll = 19 * window.innerHeight;
      targetScrollY += e.deltaY * WHEEL_SENSITIVITY;
      targetScrollY = Math.max(0, Math.min(maxScroll, targetScrollY));

      if (!isAnimating && !rafId) {
        stepScroll();
        isAnimating = true;
        rafId = requestAnimationFrame(smoothScrollLoop);
      }
    };

    const handleNativeScroll = () => {
      if (endingResetting) return;
      if (!isAnimating) {
        targetScrollY = window.scrollY;
        currentScrollY = window.scrollY;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (endingResetting) {
        e.preventDefault();
        return;
      }

      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
        return;
      }

      let delta = 0;
      const viewHeight = window.innerHeight;
      const maxScroll = 19 * viewHeight;

      switch (e.key) {
        case "ArrowDown":
          delta = 120;
          break;
        case "ArrowUp":
          delta = -120;
          break;
        case "PageDown":
          delta = viewHeight * 0.8;
          break;
        case "PageUp":
          delta = -viewHeight * 0.8;
          break;
        case "Spacebar":
        case " ":
          delta = e.shiftKey ? -viewHeight * 0.8 : viewHeight * 0.8;
          break;
        case "Home":
          targetScrollY = 0;
          e.preventDefault();
          if (!isAnimating && !rafId) {
            stepScroll();
            isAnimating = true;
            rafId = requestAnimationFrame(smoothScrollLoop);
          }
          return;
        case "End":
          targetScrollY = maxScroll;
          e.preventDefault();
          if (!isAnimating && !rafId) {
            stepScroll();
            isAnimating = true;
            rafId = requestAnimationFrame(smoothScrollLoop);
          }
          return;
        default:
          return;
      }

      if (delta !== 0) {
        e.preventDefault();
        targetScrollY += delta;
        targetScrollY = Math.max(0, Math.min(maxScroll, targetScrollY));

        if (!isAnimating && !rafId) {
          stepScroll();
          isAnimating = true;
          rafId = requestAnimationFrame(smoothScrollLoop);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isVisible = false;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      } else {
        isVisible = true;
        if (isAnimating && !rafId) {
          rafId = requestAnimationFrame(smoothScrollLoop);
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("scroll", handleNativeScroll, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", handleNativeScroll);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [endingResetting]);

  // Premium Idle Intelligence System
  useEffect(() => {
    let idleTimeout: any = null;
    let isIdle = false;

    const startIdleTimer = () => {
      clearIdleTimer();
      idleTimeout = setTimeout(() => {
        isIdle = true;
        document.body.classList.add("app-idle");
      }, 8000); // 8 seconds
    };

    const clearIdleTimer = () => {
      if (idleTimeout) {
        clearTimeout(idleTimeout);
        idleTimeout = null;
      }
    };

    const handleInteraction = () => {
      if (isIdle) {
        isIdle = false;
        document.body.classList.remove("app-idle");
      }
      startIdleTimer();
    };

    const activityEvents = ["mousemove", "mousedown", "scroll", "keydown", "touchstart", "wheel"];
    
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleInteraction, { passive: true });
    });

    startIdleTimer();

    return () => {
      clearIdleTimer();
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleInteraction);
      });
      document.body.classList.remove("app-idle");
    };
  }, []);

  // Premium Magnetic Interaction System
  useEffect(() => {
    if (!scrollUnlocked) return;

    let targets: HTMLElement[] = [];
    const updateTargets = () => {
      targets = Array.from(document.querySelectorAll("[data-magnetic]"));
    };

    updateTargets();

    const observer = new MutationObserver(updateTargets);
    observer.observe(document.body, { childList: true, subtree: true });

    interface SpringState {
      rx: number;
      ry: number;
      vx: number;
      vy: number;
      isHovered: boolean;
      originalTransition: string;
      hasModifiedTransition: boolean;
    }

    const states = new Map<HTMLElement, SpringState>();

    let mouseX = -1000;
    let mouseY = -1000;
    let isVisible = true;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    let rafId = 0;
    const LERP_SPEED = 0.15;
    const DAMPING = 0.78;
    const MAX_PULL = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 6;
    const ACTIVATION_RADIUS = 30;

    const tick = () => {
      if (!isVisible) return;

      targets.forEach((el) => {
        let state = states.get(el);
        if (!state) {
          state = {
            rx: 0,
            ry: 0,
            vx: 0,
            vy: 0,
            isHovered: false,
            originalTransition: el.style.transition || window.getComputedStyle(el).transition || "",
            hasModifiedTransition: false,
          };
          states.set(el, state);
        }

        const rect = el.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0 || window.getComputedStyle(el).display === "none") {
          if (state.rx !== 0 || state.ry !== 0) {
            state.rx = 0;
            state.ry = 0;
            state.vx = 0;
            state.vy = 0;
            el.style.transform = "";
          }
          return;
        }

        const dx = Math.max(rect.left - mouseX, 0, mouseX - rect.right);
        const dy = Math.max(rect.top - mouseY, 0, mouseY - rect.bottom);
        const distance = Math.sqrt(dx * dx + dy * dy);

        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        let targetX = 0;
        let targetY = 0;
        const isNear = distance < ACTIVATION_RADIUS;

        if (isNear) {
          if (!state.hasModifiedTransition) {
            const computedStyle = window.getComputedStyle(el);
            state.originalTransition = el.style.transition || computedStyle.transition || "";
            el.style.transition = computedStyle.transition
              .split(",")
              .filter(t => !t.includes("transform") && !t.includes("all"))
              .join(",") + (computedStyle.transition ? ", " : "") + "background-color 0.4s, color 0.4s";
            state.hasModifiedTransition = true;
          }

          const pullRatio = 1 - distance / ACTIVATION_RADIUS;
          const pull = MAX_PULL * pullRatio;

          const vx = mouseX - cx;
          const vy = mouseY - cy;
          const d = Math.sqrt(vx * vx + vy * vy);

          if (d > 0) {
            targetX = (vx / d) * pull;
            targetY = (vy / d) * pull;
          }
        }

        const ax = (targetX - state.rx) * LERP_SPEED;
        const ay = (targetY - state.ry) * LERP_SPEED;

        state.vx = (state.vx + ax) * DAMPING;
        state.vy = (state.vy + ay) * DAMPING;

        state.rx += state.vx;
        state.ry += state.vy;

        const isHovered = mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom;
        const isActive = el.matches(":active");
        let scale = 1.0;
        if (isHovered) {
          if (el.classList.contains("cta-btn-premium")) {
            scale = isActive ? 1.01 : 1.03;
          } else {
            scale = isActive ? 0.98 : 1.0;
          }
        } else if (isActive) {
          scale = 0.98;
        }

        let transformStr = `translate3d(${state.rx.toFixed(3)}px, ${state.ry.toFixed(3)}px, 0)`;
        if (scale !== 1.0) {
          transformStr += ` scale(${scale})`;
        }

        if (!isNear && Math.abs(state.rx) < 0.01 && Math.abs(state.ry) < 0.01 && Math.abs(state.vx) < 0.01 && Math.abs(state.vy) < 0.01) {
          if (state.hasModifiedTransition) {
            el.style.transition = state.originalTransition;
            state.hasModifiedTransition = false;
          }
          el.style.transform = "";
          state.rx = 0;
          state.ry = 0;
          state.vx = 0;
          state.vy = 0;
        } else {
          el.style.transform = transformStr;
        }
      });

      rafId = requestAnimationFrame(tick);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isVisible = false;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      } else {
        isVisible = true;
        if (!rafId) {
          rafId = requestAnimationFrame(tick);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);

      targets.forEach((el) => {
        const state = states.get(el);
        if (state) {
          el.style.transform = "";
          el.style.transition = state.originalTransition;
        }
      });
    };
  }, [scrollUnlocked]);

  const handleFramesLoaded = useCallback(() => {
    setFramesLoaded(true);
  }, []);

  const handleLoadProgress = useCallback((progress: number) => {
    setLoadProgress(progress);
  }, []);

  const handleVideoEnd = useCallback(() => {
    setIntroActive(false);
    premiumAudio.playHeroRevealEngine();
  }, []);

  return (
    <div 
      className="relative min-h-screen text-[#111111] font-sans antialiased overflow-x-hidden selection:bg-neutral-900 selection:text-white"
      style={{
        background: introActive 
          ? "#000000" 
          : "radial-gradient(circle at 50% 50%, #FDFDFD 0%, #F5F5F3 100%)"
      }}
    >
      <Navbar scrollUnlocked={scrollUnlocked} />
      
      {/* ═══════════════════════════════════════════════════════════════════
          FRAME SEQUENCE SCROLL SECTION
          The FrameSequence component creates a tall scrollable container.
          Inside it, the canvas is pinned (sticky) so it stays in view.
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative">
        
        {/* Frame Sequence Canvas (Layer 3) */}
        <FrameSequence 
          onLoadProgress={handleLoadProgress}
          onLoaded={handleFramesLoaded}
          onFrameUpdate={updateChapterStyles}
          onFirstFrameReady={handleFirstFrameReady}
        />

        {/* ─── Cinematic Intro Video Overlay ────────────────────────────
            Plays once when the website loads and preloads frames in the background.
        ──────────────────────────────────────────────────────────── */}
        {introActive && (
          <CinematicIntro 
            onVideoEnd={handleVideoEnd}
            onScrollUnlock={handleScrollUnlock}
            isFramesLoaded={framesLoaded}
            loadProgress={loadProgress}
            isFirstFrameReady={canvasFirstFrameReady}
          />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CHAPTER 1 — "The Silhouette" (Frames 0–85)
          Elements: Title + CTA + Specs bar
          Position: Left-aligned, vertically centered
      ═══════════════════════════════════════════════════════════════════ */}
      <div 
        className={`fixed inset-0 z-50 pointer-events-none w-full h-full flex flex-col justify-center select-none transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          !scrollUnlocked ? "opacity-0 blur-md translate-y-4 intro-active" : "opacity-100 blur-0 translate-y-0 intro-inactive"
        }`}
        style={{
          transform: "translate3d(0, 0, 0)",
          backfaceVisibility: "hidden"
        }}
      >
        <div className="max-w-[1536px] mx-auto w-full h-full flex flex-col justify-between px-6 md:px-12 lg:px-16 py-16 md:py-20">
          <div 
            ref={leftContentRef}
            className="flex flex-col items-start justify-center flex-grow max-w-[450px] pt-12 md:pt-16 translate-y-[20px] gap-6"
            style={{ opacity: 0, transform: "translate3d(0, 15px, 0)", willChange: "transform, opacity" }}
          >
            
            {/* Brand label */}
            <span className="chapter1-item chapter1-label text-[10px] md:text-xs font-semibold tracking-[0.35em] text-[#111111] uppercase select-none">
              PORSCHE
            </span>

            {/* Large Title - Single Line */}
            <h1 className="chapter1-item chapter1-title font-porsche text-6xl sm:text-7xl md:text-8xl lg:text-[6.25rem] xl:text-[7.25rem] font-black tracking-[-0.03em] text-[#111111] uppercase leading-none select-none [text-rendering:optimizeLegibility]">
              911 GT3 RS
            </h1>

            {/* Small red bar */}
            <div className="chapter1-item chapter1-bar w-10 h-1 bg-red-600" />

            {/* Subtitle */}
            <h2 className="chapter1-item chapter1-sub font-bold text-2xl text-[#111111] leading-tight select-none uppercase tracking-wider">
              TRACK-BORN. <br /> ROAD-PERFECTED.
            </h2>

            {/* Explore the GT3 RS Action Button */}
            <button 
              data-magnetic
              onMouseEnter={() => premiumAudio.playTactileHover()}
              onClick={() => premiumAudio.playUiClick()}
              className="chapter1-item chapter1-cta px-6 py-3 bg-black text-white text-[11px] font-semibold tracking-wider uppercase rounded-none border border-black flex items-center gap-3.5 group pointer-events-auto select-none cursor-pointer hover:bg-neutral-900 transition-colors cta-breath-eligible"
            >
              EXPLORE THE GT3 RS
            </button>

          </div>

          {/* Bottom Specs Row — Chapter 1 only */}
          <div 
            ref={specsRef}
            className="w-full border-t border-neutral-200/40 pt-8"
            style={{ opacity: 0, transform: "translate3d(0, 15px, 0)", willChange: "transform, opacity" }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 max-w-7xl mx-auto w-full">
              
              {/* Spec 1 */}
              <div 
                className={`flex flex-col items-center justify-center px-6 md:border-r border-neutral-200/40 select-none text-center transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  !scrollUnlocked ? "opacity-0 translate-y-4 filter blur-sm" : "opacity-100 translate-y-0 filter blur-0"
                }`}
                style={{ transitionDelay: "150ms" }}
              >
                <span className="text-3xl md:text-4xl lg:text-[2.8rem] font-light tracking-[-0.03em] text-neutral-800/80 font-display leading-none">
                  525
                </span>
                <span className="text-[9px] md:text-[10px] font-medium tracking-[0.30em] text-neutral-500 uppercase mt-3.5">
                  HP
                </span>
              </div>

              {/* Spec 2 */}
              <div 
                className={`flex flex-col items-center justify-center px-6 md:border-r border-neutral-200/40 select-none text-center transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  !scrollUnlocked ? "opacity-0 translate-y-4 filter blur-sm" : "opacity-100 translate-y-0 filter blur-0"
                }`}
                style={{ transitionDelay: "250ms" }}
              >
                <span className="text-3xl md:text-4xl lg:text-[2.8rem] font-light tracking-[-0.03em] text-neutral-800/80 font-display leading-none">
                  4.0L
                </span>
                <span className="text-[9px] md:text-[10px] font-medium tracking-[0.30em] text-neutral-500 uppercase mt-3.5">
                  ENGINE
                </span>
              </div>

              {/* Spec 3 */}
              <div 
                className={`flex flex-col items-center justify-center px-6 md:border-r border-neutral-200/40 select-none text-center transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  !scrollUnlocked ? "opacity-0 translate-y-4 filter blur-sm" : "opacity-100 translate-y-0 filter blur-0"
                }`}
                style={{ transitionDelay: "350ms" }}
              >
                <span className="text-3xl md:text-4xl lg:text-[2.8rem] font-light tracking-[-0.03em] text-neutral-800/80 font-display leading-none">
                  3.2s
                </span>
                <span className="text-[9px] md:text-[10px] font-medium tracking-[0.30em] text-neutral-500 uppercase mt-3.5">
                  0–100 KM/H
                </span>
              </div>

              {/* Spec 4 */}
              <div 
                className={`flex flex-col items-center justify-center px-6 select-none text-center transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  !scrollUnlocked ? "opacity-0 translate-y-4 filter blur-sm" : "opacity-100 translate-y-0 filter blur-0"
                }`}
                style={{ transitionDelay: "450ms" }}
              >
                <span className="text-3xl md:text-4xl lg:text-[2.8rem] font-light tracking-[-0.03em] text-neutral-800/80 font-display leading-none">
                  296
                </span>
                <span className="text-[9px] md:text-[10px] font-medium tracking-[0.30em] text-neutral-500 uppercase mt-3.5">
                  KM/H
                </span>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CINEMATIC SCROLL CUE — Right side, vertically centered
          Visible only at the very beginning. Fades out on first scroll.
      ═══════════════════════════════════════════════════════════════════ */}
      {scrollUnlocked && <ScrollIndicator />}

      {/* Background black overlay behind the canvas (zIndex: 5) */}
      <div 
        ref={bgOverlayRef}
        className="fixed inset-0 bg-black pointer-events-none transition-opacity duration-100 ease-out"
        style={{ zIndex: 5, opacity: 0 }}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          CINEMATIC ENDING — Hero Brand Typography & Reveals (Scroll-driven)
          Position: Centered overlay on black screen
      ═══════════════════════════════════════════════════════════════════ */}
      <div 
        ref={cinematicEndingRef}
        className="fixed inset-0 z-60 pointer-events-none w-full h-full flex flex-col items-center justify-center select-none bg-transparent"
        style={{ transform: "translate3d(0, 0, 0)", backfaceVisibility: "hidden", opacity: 0 }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          .chapter1-item {
            opacity: 0;
            transform: translate3d(0, 20px, 0);
            filter: blur(8px);
            transition: opacity 800ms cubic-bezier(0.22, 1, 0.36, 1), 
                        transform 800ms cubic-bezier(0.22, 1, 0.36, 1), 
                        filter 800ms cubic-bezier(0.22, 1, 0.36, 1);
            will-change: opacity, transform, filter;
          }

          .intro-inactive .chapter1-item {
            opacity: 1;
            transform: translate3d(0, 0, 0);
            filter: blur(0px);
          }

          .chapter1-label { transition-delay: 200ms; }
          .chapter1-title { transition-delay: 350ms; }
          .chapter1-bar   { transition-delay: 450ms; }
          .chapter1-sub   { transition-delay: 550ms; }
          .chapter1-cta   { transition-delay: 650ms; }

          @keyframes ending-cta-shine {
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

          @keyframes ending-cta-click-anim {
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
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 3px;
            width: 320px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            cursor: pointer;
            outline: none;
            user-select: none;
            pointer-events: auto;
            transition: background-color 350ms cubic-bezier(0.22, 1, 0.36, 1), 
                        color 350ms cubic-bezier(0.22, 1, 0.36, 1), 
                        transform 350ms cubic-bezier(0.22, 1, 0.36, 1);
            animation: ending-cta-breathing 4s ease-in-out infinite;
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
            animation: ending-cta-shine 6s cubic-bezier(0.43, 0.19, 0.15, 0.84) infinite;
            pointer-events: none;
          }

          .cta-btn-premium:hover {
            background-color: #ffffff;
            color: #000000;
            transform: scale(1.03);
            animation: none;
          }

          .cta-btn-premium.cta-clicked {
            animation: ending-cta-click-anim 200ms cubic-bezier(0.22, 1, 0.36, 1) forwards !important;
          }

          /* Logo Color Transition Style */
          .ending-porsche-logo {
            color: #ffffff;
            transition: color 1200ms ease-in-out;
          }

          .trigger-color-animation .ending-porsche-logo {
            color: #D5001C !important;
          }

          /* CTA container style */
          .ending-cta-container {
            opacity: 0;
            transform: translate3d(0, 24px, 0) scale(0.96);
            margin-top: 48px !important;
          }
          
          @keyframes ending-cta-breathing {
            0%, 100% { transform: scale(1.00); }
            50% { transform: scale(1.012); }
          }
        `}} />

        <div className="flex flex-col items-center justify-center text-center max-w-[90vw] md:max-w-4xl px-4 gap-0">
          {/* PORSCHE (Hero Heading) */}
          <div 
            ref={porscheRef}
            className="ending-porsche-logo font-druk text-white text-[14.4vw] sm:text-[12vw] md:text-[7.8rem] lg:text-[9.6rem] font-[900] tracking-[-0.03em] leading-none uppercase select-none w-full text-center"
            style={{ opacity: 0, transform: "translate3d(0, 24px, 0)", filter: "blur(16px)", willChange: "transform, opacity, filter" }}
          >
            PORSCHE
          </div>

          {/* Subtitle Lines */}
          <div className="flex flex-col items-center gap-0.5 mt-6 mb-4 sm:mt-8 sm:mb-5">
            <span 
              ref={theEndRef}
              className="font-neue text-white text-[5.3vw] sm:text-[3.54vw] md:text-[1.4rem] lg:text-[1.77rem] font-medium tracking-[0.18em] uppercase leading-none"
              style={{ opacity: 0, transform: "translate3d(0, 24px, 0)", filter: "blur(16px)", willChange: "transform, opacity, filter" }}
            >
              THE END
            </span>
            <span 
              ref={isOnlyRef}
              className="font-neue text-white text-[5.3vw] sm:text-[3.54vw] md:text-[1.4rem] lg:text-[1.77rem] font-medium tracking-[0.18em] uppercase leading-none"
              style={{ opacity: 0, transform: "translate3d(0, 24px, 0)", filter: "blur(16px)", willChange: "transform, opacity, filter" }}
            >
              IS ONLY
            </span>
            <span 
              ref={theBeginningRef}
              className="font-neue text-white text-[5.3vw] sm:text-[3.54vw] md:text-[1.4rem] lg:text-[1.77rem] font-medium tracking-[0.18em] uppercase leading-none"
              style={{ opacity: 0, transform: "translate3d(0, 24px, 0)", filter: "blur(16px)", willChange: "transform, opacity, filter" }}
            >
              THE BEGINNING.
            </span>
          </div>

          {/* Premium CTA Button */}
          <div 
            ref={ctaRef}
            className="ending-cta-container flex flex-col items-center animate-none"
            style={{ opacity: 0, transform: "translate3d(0, 24px, 0) scale(0.96)", filter: "blur(16px)", willChange: "transform, opacity, filter" }}
          >
            <button
              id="ending-cta-button"
              data-magnetic
              onMouseEnter={() => premiumAudio.playTactileHover()}
              onClick={handleEndingClick}
              className="cta-btn-premium"
            >
              BEGIN THE EXPERIENCE
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}


