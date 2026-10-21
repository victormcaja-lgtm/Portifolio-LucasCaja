"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Revelar de imediato: movimento reduzido ou navegador sem IntersectionObserver. */
function shouldRevealImmediately(): boolean {
  if (typeof window.IntersectionObserver !== "function") return true;
  return typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** No servidor tudo começa "não revelado"; o CSS só oculta quando há JavaScript (classe `js`). */
function getServerSnapshot(): boolean {
  return false;
}

interface RevealProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}

export function Reveal({ children, className, delayMs = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const immediate = useSyncExternalStore(
    subscribeToMotionPreference,
    shouldRevealImmediately,
    getServerSnapshot,
  );
  const [intersected, setIntersected] = useState(false);
  const revealed = immediate || intersected;

  useEffect(() => {
    const element = ref.current;
    if (revealed || !element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.unobserve(element);
          observer.disconnect();
          setIntersected(true);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [revealed]);

  return (
    <div
      ref={ref}
      className={className}
      data-revealed={revealed ? "true" : "false"}
      style={delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
