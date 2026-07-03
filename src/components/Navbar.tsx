import React, { useState, useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import { premiumAudio } from "../App";

interface NavbarProps {
  scrollUnlocked?: boolean;
}

export default function Navbar({ scrollUnlocked = false }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Sync to frame sequence directly via frame-update CustomEvent
  useEffect(() => {
    const handleFrameUpdate = (e: Event) => {
      const frame = (e as CustomEvent).detail;
      if (frame > 50) {
        setNavHidden(true);
      } else {
        setNavHidden(false);
      }
    };
    window.addEventListener("frame-update", handleFrameUpdate, { passive: true });
    return () => window.removeEventListener("frame-update", handleFrameUpdate);
  }, []);

  // Restore rendering when unhidden (e.g. on reset)
  useEffect(() => {
    if (!navHidden) {
      setShouldRender(true);
    }
  }, [navHidden]);

  const navLinks = [
    { label: "Experience", href: "#experience" },
    { label: "Engineering", href: "#engineering" },
    { label: "Performance", href: "#performance" },
    { label: "Gallery", href: "#gallery" },
  ];

  const handleLinkClick = (href: string) => {
    premiumAudio.playUiClick();
    setMobileMenuOpen(false);
    
    // Smooth scroll to chapter triggers if scrolled unlocked
    if (scrollUnlocked) {
      const id = href.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  // Text color state: white against black intro video, pure black against light layout background
  const textColor = scrollUnlocked ? "text-black" : "text-white";

  return (
    <>
      <style>{`
        /* Isolated premium hover effects and animations */
        .premium-nav-item {
          position: relative;
          transition: opacity 250ms ease, color 250ms ease;
        }
        .premium-nav-item::after {
          content: "";
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 100%;
          height: 1px;
          background-color: #D5001C; /* Premium Porsche Red */
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 250ms ease;
        }
        .premium-nav-item:hover::after {
          transform: scaleX(1);
        }
        .premium-nav-item:hover {
          color: #D5001C !important;
          opacity: 1;
        }
        
        .premium-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: opacity 250ms ease, color 250ms ease;
        }
        .premium-cta-btn:hover {
          color: #D5001C !important;
          opacity: 1;
        }
        .premium-cta-arrow {
          transition: transform 250ms ease;
        }
        .premium-cta-btn:hover .premium-cta-arrow {
          transform: translate3d(6px, -6px, 0);
        }

        /* Hambuger animated lines */
        .hamburger-line {
          width: 20px;
          height: 1.5px;
          background-color: currentColor;
          transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1), opacity 250ms ease;
        }
        .hamburger-active .line-1 {
          transform: translate3d(0, 5.5px, 0) rotate(45deg);
        }
        .hamburger-active .line-2 {
          opacity: 0;
          transform: scaleX(0);
        }
        .hamburger-active .line-3 {
          transform: translate3d(0, -5.5px, 0) rotate(-45deg);
        }

        /* Entrance fade-in slide */
        @keyframes navFadeIn {
          from {
            opacity: 0;
            transform: translate3d(0, -12px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        .nav-animate-entrance {
          animation: navFadeIn 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        #floating-navbar {
          transition: opacity 450ms cubic-bezier(0.22, 1, 0.36, 1), 
                      transform 450ms cubic-bezier(0.22, 1, 0.36, 1), 
                      background-color 300ms ease-out, 
                      color 300ms ease-out;
        }
        #floating-navbar.nav-hidden {
          opacity: 0 !important;
          transform: translate3d(0, -16px, 0) scale(0.98) !important;
          pointer-events: none !important;
        }
      `}</style>

      <header
        id="floating-navbar"
        onTransitionEnd={(e) => {
          if (navHidden && e.propertyName === "opacity") {
            setShouldRender(false);
          }
        }}
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 nav-animate-entrance select-none border-none shadow-none ${textColor} ${
          scrolled
            ? (scrollUnlocked ? "bg-black/[0.015]" : "bg-white/[0.015]")
            : "bg-transparent"
        } ${navHidden ? "nav-hidden" : ""} ${!shouldRender ? "hidden" : ""}`}
        style={{
          transform: "translate3d(0, -12px, 0)",
          opacity: 0,
        }}
      >
        {/* Left: Brand logo */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleLinkClick("#");
          }}
          className="font-porsche text-xs md:text-sm font-semibold tracking-[0.25em] hover:opacity-80 transition-opacity duration-200"
          aria-label="PORSCHE Homepage"
        >
          PORSCHE
        </a>

        {/* Center Links: Hidden on mobile, spaced on tablet, fully spaced on desktop */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-10">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onMouseEnter={() => premiumAudio.playTactileHover()}
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick(link.href);
              }}
              className="premium-nav-item text-[13px] font-medium tracking-[0.22em] uppercase cursor-pointer"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right: CTA Explore */}
        <div className="hidden md:flex items-center">
          <a
            href="#explore"
            onMouseEnter={() => premiumAudio.playTactileHover()}
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick("#explore");
            }}
            className="premium-cta-btn text-[13px] font-medium tracking-[0.22em] uppercase cursor-pointer"
          >
            Explore <ArrowUpRight className="premium-cta-arrow w-3.5 h-3.5" />
          </a>
        </div>

        {/* Mobile menu trigger: replaces center links */}
        <button
          onClick={() => {
            premiumAudio.playUiClick();
            setMobileMenuOpen(!mobileMenuOpen);
          }}
          className={`md:hidden flex flex-col gap-[4px] p-2 focus:outline-none cursor-pointer ${
            mobileMenuOpen ? "hamburger-active" : ""
          }`}
          aria-label="Toggle menu"
        >
          <div className="hamburger-line line-1" />
          <div className="hamburger-line line-2" />
          <div className="hamburger-line line-3" />
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className={`fixed inset-0 z-40 md:hidden flex flex-col justify-between p-8 pt-28 backdrop-blur-[24px] transition-all duration-300 ease-out ${
            scrollUnlocked
              ? "bg-[#FDFDFD]/90 text-[#111111]"
              : "bg-black/90 text-white"
          }`}
        >
          <nav className="flex flex-col gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick(link.href);
                }}
                className="text-xl font-medium tracking-[0.22em] uppercase transition-opacity duration-200 hover:opacity-70 cursor-pointer"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex flex-col gap-6">
            <div
              className={`h-[1px] ${
                scrollUnlocked ? "bg-neutral-200" : "bg-neutral-800"
              }`}
            />
            <a
              href="#explore"
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick("#explore");
              }}
              className="py-4 text-center border border-current rounded-full text-[13px] font-medium tracking-[0.22em] uppercase flex items-center justify-center gap-2 cursor-pointer hover:bg-neutral-900 hover:text-white transition-all duration-300"
            >
              Explore <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </>
  );
}
