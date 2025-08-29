import React, { useEffect, useRef } from "react";

/**
 * BackgroundClockOrbits — dark aurora flow with orbiting clock icons
 * Pure JS/Canvas. No deps. Designed to be calm, modern, and legible behind UI.
 *
 * Usage:
 * <BackgroundClockOrbits opacity={0.28} hue={170} saturation={70} lightness={60} />
 *
 * Props:
 * - opacity: overall canvas opacity (0–1)
 * - hue/saturation/lightness: base HSL accent for aurora + icons
 * - trail: 0..1, motion persistence (0 = crisp, 1 = long trails)
 * - count: number of orbiters (default 10)
 * - paused: boolean to halt animation
 * - className: extra classes
 *
 * Notes:
 * - Respects prefers-reduced-motion
 * - DPR aware, pauses off-screen
 */
export default function BackgroundClockOrbits({
  opacity = 1,
  hue = 170,
  saturation = 70,
  lightness = 60,
  trail = 0.08,
  count = 20,
  paused = false,
  className = "",
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let width = 0,
      height = 0,
      running = true,
      t0 = performance.now();

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const resize = () => {
      const parent = canvas.parentElement || canvas;
      width = Math.max(1, parent.clientWidth);
      height = Math.max(1, parent.clientHeight);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // prefill background
      ctx.fillStyle = "#0b0f14";
      ctx.fillRect(0, 0, width, height);
    };

    // Debounced resize to prevent ResizeObserver loops
    let resizeTimeout;
    const debouncedResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(resize, 16); // ~60fps debouncing
    };

    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(rafRef.current);
    };

    resize();
    const ro = new ResizeObserver(debouncedResize);
    ro.observe(canvas.parentElement || canvas);
    document.addEventListener("visibilitychange", onVis);

    // (removed aurora/gradient band to keep only clocks)

    // ===== Orbiters =====
    const orbiters = new Array(count).fill(0).map(() => {
      const base = Math.random() * Math.PI * 2;
      return {
        ax: 0.35 + Math.random() * 0.55,
        ay: 0.25 + Math.random() * 0.55,
        fx: 1 + Math.floor(Math.random() * 3),
        fy: 2 + Math.floor(Math.random() * 3),
        phase: base,
        speed: (0.00015 + Math.random() * 0.00035) * 0.3, // slowed down 50%
        size: 0.6 + Math.random() * 1.6,
        alpha: 0.12 + Math.random() * 0.22,
        kind: Math.random() < 0.75 ? drawClock : drawStopwatch,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() * 2 - 1) * 0.00025 * 0.5, // slowed rotation 50%
      };
    });

    function loop(ts) {
      if (!running) return;
      const dt = Math.min(32, ts - t0);
      t0 = ts;

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = Math.max(0.04, 1 - trail);
      ctx.fillStyle = "#0b0f14";
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
      // removed aurora band and sparkle noise

      for (const o of orbiters) {
        o.phase += o.speed * dt;
        o.rot += o.vr * dt;
        const px = width * (0.5 + o.ax * Math.sin(o.phase * o.fx));
        const py = height * (0.5 + o.ay * Math.cos(o.phase * o.fy));
        const s = (Math.min(width, height) / 900) * o.size;

        ctx.beginPath();
        ctx.arc(px, py, 18 * s, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${o.alpha * 0.6})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        const glow = ctx.createRadialGradient(px, py, 0, px, py, 26 * s);
        glow.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.12)`);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(px - 30 * s, py - 30 * s, 60 * s, 60 * s);

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(o.rot);
        ctx.globalAlpha = o.alpha;
        ctx.strokeStyle = `hsl(${hue}, ${Math.min(100, saturation + 10)}%, ${Math.max(20, lightness - 10)}%)`;
        ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.06)`;
        ctx.lineWidth = 1.4;
        o.kind(ctx, s);
        ctx.restore();
      }

      if (!paused && !prefersReducedMotion) {
        rafRef.current = requestAnimationFrame(loop);
      }
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
    };
  }, [count, hue, saturation, lightness, trail, paused, opacity]);

  return (
    <div
      className={
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden " + className
      }
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        style={{ opacity, filter: "saturate(1.08)", mixBlendMode: "normal" }}
      />
      {/* micro-texture removed to avoid banding/overlay */}
    </div>
  );
}

// === Icon helpers ===
function drawClock(ctx, s) {
  ctx.beginPath();
  ctx.arc(0, 0, 16 * s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r0 = 12 * s;
    const r1 = 14.5 * s;
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
  }
  ctx.globalAlpha *= 0.8;
  ctx.stroke();
  ctx.globalAlpha /= 0.8;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -9 * s);
  ctx.moveTo(0, 0);
  ctx.lineTo(7 * s, 0);
  ctx.stroke();
}

function drawStopwatch(ctx, s) {
  ctx.beginPath();
  ctx.arc(0, 0, 14 * s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(-4 * s, -18 * s, 8 * s, 4 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(10 * s, -16 * s, 4 * s, 4 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -8 * s);
  ctx.moveTo(0, 0);
  ctx.lineTo(6 * s, 0);
  ctx.stroke();
}
