"use client";

import Lenis from "lenis";
import { useEffect, useRef, type ReactNode } from "react";

type HomeFeedScrollerProps = {
  children: ReactNode;
};

const HomeFeedScroller = ({ children }: HomeFeedScrollerProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;

    if (!wrapper || !content) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      wrapper,
      content,
      smoothWheel: true,
      lerp: 0.085,
      wheelMultiplier: 0.95,
      touchMultiplier: 1,
      gestureOrientation: "vertical",
    });

    let frame = 0;

    const animate = (time: number) => {
      lenis.raf(time);
      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="h-full overflow-y-auto pb-24 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
};

export default HomeFeedScroller;
