import { useMemo } from "react";

/**
 * Fixed full-viewport aurora background: drifting blurred color blobs
 * plus a sparse field of rising particles. Lives behind every page.
 */
export default function AuroraBackground() {
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 3,
        duration: 14 + Math.random() * 18,
        delay: Math.random() * 20,
        opacity: 0.3 + Math.random() * 0.5,
      })),
    []
  );

  return (
    <div className="aurora-layer" aria-hidden="true">
      <div
        className="aurora-blob anim-drift-a"
        style={{
          width: "42vw",
          height: "42vw",
          top: "-8%",
          left: "-6%",
          background:
            "radial-gradient(circle, rgba(34,211,238,0.55) 0%, rgba(34,211,238,0) 70%)",
        }}
      />
      <div
        className="aurora-blob anim-drift-b"
        style={{
          width: "38vw",
          height: "38vw",
          top: "10%",
          right: "-10%",
          background:
            "radial-gradient(circle, rgba(139,92,246,0.5) 0%, rgba(139,92,246,0) 70%)",
        }}
      />
      <div
        className="aurora-blob anim-drift-c"
        style={{
          width: "34vw",
          height: "34vw",
          bottom: "-10%",
          left: "18%",
          background:
            "radial-gradient(circle, rgba(251,146,60,0.4) 0%, rgba(251,146,60,0) 70%)",
        }}
      />
      <div
        className="aurora-blob anim-drift-a"
        style={{
          width: "30vw",
          height: "30vw",
          bottom: "5%",
          right: "5%",
          animationDuration: "34s",
          background:
            "radial-gradient(circle, rgba(37,99,235,0.45) 0%, rgba(37,99,235,0) 70%)",
        }}
      />

      {particles.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, transparent 0%, rgba(7,11,20,0.6) 70%, rgba(7,11,20,0.95) 100%)",
        }}
      />
    </div>
  );
}
