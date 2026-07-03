# AÉRA — Engineering Without Compromise
## Technical System Architecture & Memory Document (BRAIN.md)

This document contains the comprehensive system layout, animations, scroll behaviors, transitions, and codebase mapping for the automotive landing page. It is structured to serve as the single source of truth for all technical logic, constraints, and visual assets, allowing any development agent to maintain, debug, and scale the application without friction.

---

## 1. PROJECT OVERVIEW

* **Project Name**: AÉRA — Automotive Hero Landing Page
* **Purpose**: Immersive product showcase landing experience for the Porsche 911 GT3 RS.
* **Website Goal**: Recreate an ultra-luxurious, editorial digital experience that captures the high-performance heritage and design aesthetics of the Porsche 911 GT3 RS.
* **User Experience Goal**: Present a seamless, single-shot flow from a preloading video intro to an interactive scroll-driven canvas sequence of the car, culminating in a premium title card.
* **Overall Design Philosophy**: Confident, minimalist display layout. Strong typographic focus, bold scale, thin rectangular structures, minimal visual clutter, and strict editorial composition.
* **Brand Direction**: High contrast, architectural framing, technical specification highlights, and silent focus on the vehicle silhouette.
* **Visual Style**: Clean dark theme blending into pure black wrappers, monochromatic layouts, razor-thin borders, and selective red color accents.
* **Animation Style**: confidence-driven, linear scroll alignments, cubic-bezier timing transitions, and slow color fades.
* **Typography Style**: Ultra-bold condensed display headings, geometric sans-serif body tags, and letter-spaced headers.
* **Color Palette**:
  - Pure Black: `#000000` (Used for viewports, transitions, overlay shields, and backdrops)
  - Pure White: `#FFFFFF` (Used for default typography, borders, and hover states)
  - Soft Porsche Red: `#D5001C` (Brand accent color for logo animations and focal highlights)
  - Light Grey Page Canvas: `radial-gradient(circle at 50% 50%, #FDFDFD 0%, #F5F5F3 100%)` (Active scroll page backdrop)

---

## 2. TECH STACK

* **Framework**: React (v19.0.1)
* **Language**: TypeScript (v5.8.2)
* **Build System**: Vite (v6.2.3)
* **Styling (CSS)**: Tailwind CSS (v4.1.14) with custom token overrides in `src/index.css`
* **Animation Library**: 
  - Motion / Framer Motion (v12.23.24) (Handles initial loading exit transitions and layout mounting states)
  - Native CSS Animations & GPU Transitions (Handles CTA button breathing loops, hover animations, and overlay fades)
* **Scroll System**: Direct DOM Scroll Intercept Ticker (`requestAnimationFrame` scroll interpolation logic)
* **Image Loading Strategy**: Concurrent batched image loading (batch size: 20) with off-thread pre-decoding via `img.decode()` to cache decompressed bitmaps in GPU memory before paint, ensuring a solid 60 FPS scroll performance.

---

## 3. PROJECT STRUCTURE

### Folder Hierarchy

```
automotive-hero-landing-page/
├── public/
│   ├── part 1/              # JPG frames 001 through 281
│   ├── part 2/              # JPG frames 001 through 281
│   └── intro.mp4            # Cinematic intro video (52MB)
├── src/
│   ├── components/
│   │   ├── CinematicIntro.tsx # Video preloading, playback, and CTA handoff controller
│   │   ├── FrameSequence.tsx  # Sticky canvas preloader & interpolation scroll loop
│   │   ├── ComponentReveal.tsx # Chapter 3 (forged wheels specs) text reveal overlay
│   │   ├── CockpitReveal.tsx  # Chapter 2 (cockpit branding specs) text reveal overlay
│   │   ├── Navbar.tsx         # Mobile drawer and navbar headers (unused placeholder)
│   │   ├── HeroContent.tsx    # Unused layout placeholder
│   │   ├── StudioStage.tsx    # Unused component
│   │   ├── FilmTheater.tsx    # Unused component
│   │   └── ScrollIndicator.tsx# Unused component (returns null)
│   ├── App.tsx              # Main orchestrator, scroll controllers, and styling overrides
│   ├── index.css            # Custom CSS animations, font themes, and viewport resets
│   ├── main.tsx             # React mount bootstrap
│   └── types.ts             # TypeScript typings
├── index.html               # Main HTML document template
├── package.json             # Package scripts & dependencies
├── tsconfig.json            # Compiler configurations
└── vite.config.ts           # Vite compile parameters with tailwindcss plugin
```

### Component Roles

* **`App.tsx`**:
  - Acts as the main application wrapper.
  - Manages `introActive`, `framesLoaded`, `canvasFirstFrameReady`, and `scrollUnlocked` global states.
  - Implements the scroll lock `useEffect` hook to hold body overflow styles while the intro is active.
  - Hosts the unified `updateChapterStyles` scroll interpolation callback which computes page frames, applies transformations on left-aligned spec cards, and controls chapter overlays.
  - Renders the sticky Ending Screen wrapper and its click resets.
* **`FrameSequence.tsx`**:
  - Implements the concurrent batch preloader (`preloadImage`) and concurrent buffer cache.
  - Declares the `<canvas>` element and itsbacking 2D context (`{ alpha: false, colorSpace: "srgb" }`).
  - Implements the independent `requestAnimationFrame` lerp animation loop, tracking `smoothFrameRef` and calling `renderFrame` when the frame index updates.
  - Mounts `<ComponentReveal />` and `<CockpitReveal />` overlays and calls their direct DOM update methods during canvas ticks.
* **`CinematicIntro.tsx`**:
  - Manages the playback of `/intro.mp4`.
  - Displays the initial black preloading page and AÉRA percentage loader bar.
  - Drives the video time update loops, fading in the PORSCHE heading, THE DRIVE STARTS HERE display line by line, and the ENTER THE GT3 RS CTA button.
  - Handles the CTA click transition, unlocking scroll immediately and fading out the overlay wrapper over 650ms after a 100ms delay.
* **`CockpitReveal.tsx`**:
  - Implements scroll-driven entrance and exit typography reveals for the interior cockpit sequence (Chapter 2, frames 58 to 160).
  - Drives text opacity, blur filters, translation offsets, and draws the horizontal accent line.
* **`ComponentReveal.tsx`**:
  - Implements scroll-driven reveals for the forged wheels sequence (Chapter 3, frames 170 to 234).
  - Animates specs reveals dynamically using direct DOM updates.

---

## 4. FRAME SEQUENCE

* **Total Frames**: 562 frames.
* **Folder Division**:
  - **Part 1**: 281 frames (`ezgif-frame-001.jpg` to `ezgif-frame-281.jpg`)
  - **Part 2**: 281 frames (`ezgif-frame-001.jpg` to `ezgif-frame-281.jpg`)
* **Split Rationale**: Splitting prevents massive single-folder file counts, bypasses network compilation limits, and enables concurrent batch loading of parts across parallel HTTP request slots.
* **Asset Format**: JPEG (`image/jpeg`) compressed and optimized for rapid decoding.
* **Loading & GPU Caching Strategy**:
  - Concurrently preloaded in parallel batches of 20 images.
  - Every image is passed to `img.decode()` before resolving:
    ```typescript
    img.decode()
      .then(() => resolve(img))
      .catch(() => resolve(img));
    ```
    This asynchronous instruction decodes the image data off the main UI thread and uploads the raw bitmap directly into GPU memory, completely preventing scroll stutters or layout freezes during scroll.
* **Buffer Draw Parameters**: Renders onto a 2D canvas with `alpha: false` to disable blending overhead, and `colorSpace: "srgb"` for exact display compliance.
* **Fitting Logic**: `drawCover` computes sizing matches dynamically to scale the frame container symmetrically (equivalent to CSS `object-fit: cover`).

---

## 5. FRAME LOCATIONS

All frame assets are stored relative to the project root inside the public folder:
* **Part 1 frames**: `public/part 1/ezgif-frame-[001-281].jpg`
* **Part 2 frames**: `public/part 2/ezgif-frame-[001-281].jpg`

The frame fetch path resolver is implemented as follows:
```typescript
function getFramePath(globalIndex: number): string {
  const isSecondPart = globalIndex >= 281;
  const folder = isSecondPart ? "part 2" : "part 1";
  const localIndex = isSecondPart ? globalIndex - 281 + 1 : globalIndex + 1;
  const padded = String(localIndex).padStart(3, "0");
  return `/${encodeURIComponent(folder)}/ezgif-frame-${padded}.jpg`;
}
```

---

## 6. SCROLL SYSTEM

* **Scroll Heights**: The interactive frame scroll wrapper occupies exactly **20x viewport height** (`2000vh` scrollable canvas space).
* **Scroll Mapping**: Computes scroll progress as a percentage of the client container bounds, mapping the viewport scroll range to a float index from `0` to `561`.
* **Inertial Interpolation Engine**:
  - Runs inside an independent `requestAnimationFrame` render loop inside `FrameSequence.tsx`.
  - Computes dynamic LERP steps on every tick to maintain a heavy, premium, aerodynamic drag momentum:
    ```typescript
    const delta = targetFrame - smoothFrame;
    const distance = Math.abs(delta);
    const dynamicLerp = 0.022 + 0.018 * Math.exp(-distance * 0.06);
    const step = 2.8 * Math.tanh((delta * dynamicLerp) / 2.8);
    smoothFrameRef.current += step;
    ```
  - Loops are paused when the interpolation delta falls below the settle threshold of `0.001` frames.
* **Canvas Pinning**: The canvas is fixed viewport-wide (`position: fixed; top: 0; left: 0; w: 100%; h: 100%`) with `zIndex: 10`, remaining sticky throughout the scroll duration.

---

## 7. INTRO VIDEO

* **Video Source**: `/intro.mp4` (52MB local file, autoplaying, muted, inline).
* **Background Autoplay**: Plays continuously in the background underneath the loading overlay immediately upon mount. The video metadata loads, and playback starts while the preloader is visible, so the video is already in progress when the loading screen fades out.
* **Playback Parameters**:
  - `preload="auto"`
  - `muted` (Mandatory to bypass browser autoplay blocks)
  - `playsInline`
  - `loop={false}`
  - Never pauses or freezes during the loading overlay stage.
* **Preload Safety**: If the video reaches the final `200ms` of its timeline before the scroll frame sequences have finished preloading in the background, a check-loop pauses the video. It resumes immediately once the frames are ready.
* **Handoff Exit**: When the video is ready, the loading screen dissolves, exposing the video in motion.

---

## 8. LOADING SCREEN

* **Layout**: Fixed `z-50` full-screen black backdrop.
* **AÉRA Branding & Counters**:
  - Centered brand label "AÉRA" and establishment subtitle.
  - Typography loader: "SYSTEM BOOTING • [loadProgress]%" and "PRELOADING IMMERSIVE ENGINE".
  - Linear red progress bar (`#D5001C`) reflecting preloading values from 0% to 100%.
* **Dissolve Reveal**: When `videoReady` becomes `true`, the loading screen fades out smoothly (`exit={{ opacity: 0 }}` transition over 800ms) to reveal the video playing underneath.

---

## 9. PART 1 TIMELINE (Frames 0–280)

* **Chapter 1 — "The Silhouette" (Frames 0–85)**:
  - Background: radial gradient backdrop.
  - Elements: Left-aligned Porsche header, large display title `911 GT3 RS`, red accent bar, subtitle (`TRACK-BORN. ROAD-PERFECTED.`), black CTA button (`EXPLORE THE GT3 RS`), and bottom specifications row.
  - Reveal: Elements fade in and translate (`translateY: 20px -> 12px`) sequentially based on scrolling ticks:
    - Title & CTA fade in from frame 0 to 30.
    - Spec row items slide in with staggered delays (150ms, 250ms, 350ms, 450ms).
  - Exit: From frame 70 to 85, elements fade out (`opacity: 1 -> 0`) as the camera starts orbiting the vehicle.
* **Chapter 2 — "Purpose" (Frames 86–170)**:
  - Background: Camera zooms in on the Porsche cockpit.
  - Elements: Charcoal gradient overlay (`linear-gradient(to right, rgba(11, 11, 11, 0) 30%, #0B0B0B 100%)`) on the right.
  - Typographic Reveals (Frames 58 to 160):
    - Staggered entrance: label (66-76), title block `DRIVEN BY PURPOSE.` (76-98), red line (98-112), and description details (staggered 112-145).
    - Exit: Elements blur and fade out from frame 145 to 160.

---

## 10. PART 2 TIMELINE (Frames 281–561)

* **Chapter 3 — "Wheels" (Frames 171–234)**:
  - Background: Camera zooms close on the forged tires and center-lock wheels.
  - Elements: Typographic specs reveals on the right side of the screen.
  - Timeline Reveals (Frames 170 to 234):
    - Entrance: label (170-176), titles `CENTER-LOCK FORGED WHEELS` (176-192), body descriptions (192-218).
    - Exit: Elements fade and slide down from frame 222 to 234.
* **Chapter 4 — "Dynamic Performance" (Frames 235–530)**:
  - Background: Silent sequence. The vehicle orbits and settles into a side profile silhouette.
* **Ending Screen (Frames 531–561)**:
  - Background: The canvas fades to pure black.
  - Elements: Centered branding title card reveals sequentially.

---

## 11. TEXT ANIMATIONS

Text elements are animated using direct DOM updates inside requestAnimationFrame loops:
* **Eased Transforms**: Opacity `0 -> 1`, blur `16px -> 0px`, and transform `translate3d(0, 24px, 0) -> translate3d(0, 0px, 0)` using `easeOutQuint` interpolation curves.
* **Blur Correction**: To avoid subpixel text pixelation or ghosting, the blur filter is completely deleted (`style.filter = ""`) once the opacity is fully 0 or 1, or when the blur factor falls below `0.1px`.
* **Replay & Reset Logic**: Scrolling back up above frame 531 calls `resetEndingScreen`, immediately clearing all inline style declarations, resets typography classes, and stops active animations from stacking.

---

## 12. BUTTON DETAILS (CTAs)

CTAs are designed as clean, rectangular, thin-bordered elements with zero rounded pill styling:
* **Branding CTA style**:
  - Transparent background, 1px white border, uppercase tracking text.
  - Font: Neue Haas Grotesk.
  - Width: `320px`, Height: `60px`, centered layout.
* **Idle loop**: Stays animated using native CSS keyframes:
  - **Breathing**: Slow scale breathing loop (`1.00 -> 1.012 -> 1.00` scale over 4 seconds).
  - **Shine Sweep**: Linear gradient sweep (`ending-cta-shine` animation over 6 seconds) sliding a reflective glare overlay across the button container.
* **Hover State**: background transitions to pure white, text turns black, scale goes to `1.03`, and idle animations are paused.
* **Click Animation**: Triggers a rapid click squash keyframe (`ending-cta-click-anim` over 200ms) scaling the button container (`1.03 -> 0.98 -> 1.00`).

---

## 13. FINAL ENDING SCREEN

```
                    PORSCHE  <-- (Slowly fades white to Soft Porsche Red)
                       ↓
                    THE END
                    IS ONLY
                 THE BEGINNING. <-- (Static pure white, no animation)
                       ↓
               (48px vertical gap)
                       ↓
              BEGIN THE EXPERIENCE <-- (CTA button)
```

* **Porsche Brand Title**:
  - Size: dominant visual element.
  - Typography: `Druk Condensed Super`, Weight: 900, letter spacing `-2px`.
  - Color Transition: Initially reveals in pure white (`#FFFFFF`). Once fully visible, transitions slowly to Soft Porsche Red (`#D5001C`) over `1200ms` with `ease-in-out` ease. The red color remains solid after transition finishes.
* **Subtitle Lines**:
  - Static pure white `#FFFFFF` throughout. Never changes to red, and color is never animated.
* **CTA Button**:
  - Text: `BEGIN THE EXPERIENCE`.
  - Reveal Trigger: Revealing starts at **80% scroll progress** (frame `f >= 555` of the scroll-reveal range `531–561`) with a `0ms` delay. The reveal transition (opacity `0 -> 100%`, scale `0.96 -> 1.00`, TranslateY `24px -> 0px` over `700ms`) starts during scroll progress. By the time the user stops scrolling, the button is already fully visible.
  - Click Action: Triggers a click scaling class and initiates the fade-out reset loop.

---

## 14. TRANSITIONS FLOW

```
[System Boot loading Screen (z-50, black)]
                 │
                 ▼ (videoReady = true / loading overlay fades out over 800ms)
[Intro video Plays in Background (z-40, transparent wrapper)]
                 │
                 ▼ (video slows down & freezes on last frame)
[Cinematic Bridge Overlay Visible (z-30, black, 94% opacity)]
                 │
                 ▼ (User clicks "ENTER THE GT3 RS" CTA)
[CTA clicked: scroll unlocks, overlay opacity goes to 100% black instantly]
                 │
                 ▼ (100ms delay passes)
[Overlay dissolves from 100% to 0% over 650ms, revealing canvas sequence]
                 │
                 ▼ (User scrolls page)
[Chapters 1, 2, 3 reveals & camera orbits]
                 │
                 ▼ (Scroll progress reaches frame 531+)
[Ending screen overlay fades to black, typography reveals]
                 │
                 ▼ (User clicks "BEGIN THE EXPERIENCE" CTA)
[CTA clicked: page fades out, scroll resets to 0, app resets to frame 0 state]
```

---

## 15. ANIMATION SYSTEM DETAILS

* **Framer Motion**: Controls the mount lifecycle and exit ease of the preloader spinner screen.
* **CSS Transitions & Keyframes**: Drive the button's breathing scale loop, glinting reflections, hover state background conversions, and the PORSCHE color transition.
* **State & Ref Management**:
  - Transition lock states (`isTransitioningRef.current`) are queried in frame loop tickers. If transitioning, scroll ticks are skipped.
  - Active transition timeouts are stored in React refs (`resetTimeoutRef.current`) and cleared on reset to prevent animation overlap.

---

## 16. PERFORMANCE OPTIMIZATION

1. **Hardware Layer Acceleration**: Canvas and viewport overlays are promoted to GPU composition layers using `transform: "translate3d(0,0,0)"` and `backfaceVisibility: "hidden"`.
2. **Pre-decoded Images**: Asynchronous image decoding (`img.decode()`) eliminates UI thread main freezes when changing canvas source frames.
3. **Optimized Back-buffer Draw**: Context initialized with `alpha: false` to disable compositing transparency checks.
4. **Passive Listeners**: Passive scroll hooks bypass main thread layout wait conditions.
5. **Memoization Protection**: Prop callbacks (`handleFirstFrameReady`, `updateChapterStyles`) are wrapped in `useCallback` to prevent breaking `<FrameSequence />`'s `React.memo` container.

---

## 17. DESIGN SYSTEM TOKENS

* **Typography**:
  - Sans/Body: `Inter`, sans-serif
  - Display: `Outfit`, sans-serif
  - Grotesque Stack: `Neue Haas Grotesk Display`, `Helvetica Now Display`, `Suisse Int'l`
  - Condensed Stack: `Druk Condensed Super`, `Druk Condensed`, `Bebas Neue`
* **Spacing**:
  - Ending CTA vertical gap: `48px` under subtitle.
  - Margin boundaries: minimal side layouts, spec cards aligned to left margins (`8%` or `10%`).
* **Motion Easing Constants**:
  - Primary Reveal Ease: `cubic-bezier(0.22, 1, 0.36, 1)`
  - Confident Slow Ease: `ease-in-out`
  - Quick Linear: `linear`

---

## 18. CURRENT PROJECT STATUS

* **Completed Features**: Fullscreen intro video loop, loading preloader bar, scroll canvas pre-decoding pipeline, scroll chapters 1, 2, 3 spec cards, and final ending screen text animations.
* **Working Features**: Multi-cycle scroll resets, click transitions, GPU coverage styling.
* **Known Bugs**: None.
* **Pending Fixes**: None.

---

## 19. IMPORTANT DEVELOPMENT DECISIONS

* **Pure Black Viewport Background**: The wrapper container background in `App.tsx` is set to `#000000` (pure black) while the intro is active. This prevents any white layout flash if the canvas clears its buffer or during DOM updates.
* **Absolute Video Cover**: Video styled absolute cover to stretch edge-to-edge across the screen independently of the aspect ratio.
* **Scroll Unlock decoupling**: Scroll unlocking is decoupled from the overlay fade-out speed, unlocking page interaction immediately to let the canvas sequence start.
* **Transition Overwrite Block**: The freeze-frame `useEffect` inside `CinematicIntro` exits early if `isTransitioning` is true. This prevents re-renders from resetting the opacity and double-triggering black fades.
* **No letters split**: Typographic text sequences reveal per line (or block) rather than splitting into single letters to prevent layout shifts.

---

## 20. AI CONTINUATION INSTRUCTIONS

When continuing development on this repository, you must adhere strictly to the following parameters:

1. **Keep Component Memoization**: Never pass inline anonymous arrow functions to props on `<FrameSequence />` (e.g. `onFirstFrameReady={() => ...}`). Always wrap callbacks in `useCallback` to preserve identity and avoid canvas buffer resets.
2. **Never change the background gradient logic**: The background gradient `radial-gradient(...)` must only activate when `introActive` is `false`. Keep it `#000000` while `introActive` is `true`.
3. **Maintain direct DOM updates**: Do not bind canvas render coordinates or typography style values to React state changes. Style values must be set directly on the DOM ref elements (`ref.current.style.opacity`, etc.) to run at 60 FPS.
4. **Preserve transition timing values**:
   - CTA click transition delay: 100ms.
   - CTA overlay fade duration: 650ms.
   - Transition curve: `cubic-bezier(0.22, 1, 0.36, 1)`.
5. **Always double-guard resets**: Clear timeout references (`resetTimeoutRef.current`) and layout updates in `resetEndingScreen` to avoid animation stack overlays when scrolling rapidly.
