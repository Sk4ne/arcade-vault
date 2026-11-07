"use client";

import { useEffect, useRef } from "react";

/**
 * Envuelve una sección y le añade `.in` al entrar en el viewport (animación `.reveal`).
 * Con `prefers-reduced-motion: reduce` (o sin IntersectionObserver) se muestra de inmediato.
 */
export function Reveal({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      el.classList.add("in");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className={(className + " reveal").trim()}>
      {children}
    </section>
  );
}
