import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  glow: number;
};

function createParticles(reducedMotion: boolean): Particle[] {
  return Array.from({ length: reducedMotion ? 18 : 86 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.4 + Math.random() * 2.2,
    vx: -0.0008 + Math.random() * 0.0016,
    vy: -0.001 - Math.random() * 0.0026,
    glow: 0.35 + Math.random() * 0.65
  }));
}

function drawHills(context: CanvasRenderingContext2D, width: number, height: number) {
  context.fillStyle = "#1a1512";
  context.beginPath();
  context.moveTo(0, height * 0.74);
  context.bezierCurveTo(width * 0.2, height * 0.58, width * 0.38, height * 0.86, width * 0.58, height * 0.68);
  context.bezierCurveTo(width * 0.74, height * 0.54, width * 0.86, height * 0.66, width, height * 0.54);
  context.lineTo(width, height);
  context.lineTo(0, height);
  context.closePath();
  context.fill();

  context.fillStyle = "#0e0d0c";
  context.beginPath();
  context.moveTo(0, height * 0.82);
  context.bezierCurveTo(width * 0.28, height * 0.7, width * 0.48, height * 0.92, width * 0.76, height * 0.75);
  context.bezierCurveTo(width * 0.86, height * 0.69, width * 0.94, height * 0.77, width, height * 0.7);
  context.lineTo(width, height);
  context.lineTo(0, height);
  context.closePath();
  context.fill();
}

export function EmberCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext("2d");
    if (!context) return undefined;

    const currentCanvas = canvas;
    const currentContext = context;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionPreference.matches;
    const particles = createParticles(reducedMotion);
    let frameId = 0;

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      currentCanvas.width = Math.floor(currentCanvas.clientWidth * ratio);
      currentCanvas.height = Math.floor(currentCanvas.clientHeight * ratio);
      currentContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function drawFrame() {
      const width = currentCanvas.clientWidth;
      const height = currentCanvas.clientHeight;
      currentContext.clearRect(0, 0, width, height);

      const sky = currentContext.createLinearGradient(0, 0, width, height);
      sky.addColorStop(0, "#251510");
      sky.addColorStop(0.45, "#3a2017");
      sky.addColorStop(1, "#0e0d0c");
      currentContext.fillStyle = sky;
      currentContext.fillRect(0, 0, width, height);

      const fireGlow = currentContext.createRadialGradient(width * 0.76, height * 0.5, 0, width * 0.76, height * 0.5, width * 0.42);
      fireGlow.addColorStop(0, "rgba(255, 105, 38, 0.46)");
      fireGlow.addColorStop(0.32, "rgba(255, 105, 38, 0.18)");
      fireGlow.addColorStop(1, "rgba(255, 105, 38, 0)");
      currentContext.fillStyle = fireGlow;
      currentContext.fillRect(0, 0, width, height);

      drawHills(currentContext, width, height);

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.y < -0.08 || particle.x < -0.08 || particle.x > 1.08) {
          particle.x = 0.56 + Math.random() * 0.4;
          particle.y = 0.76 + Math.random() * 0.18;
        }

        currentContext.beginPath();
        currentContext.fillStyle = `rgba(255, ${Math.floor(120 + particle.glow * 80)}, 62, ${particle.glow})`;
        currentContext.shadowColor = "rgba(255, 102, 35, 0.72)";
        currentContext.shadowBlur = 14;
        currentContext.arc(particle.x * width, particle.y * height, particle.r, 0, Math.PI * 2);
        currentContext.fill();
        currentContext.shadowBlur = 0;
      });

      if (!reducedMotion) frameId = requestAnimationFrame(drawFrame);
    }

    function handleMotionPreferenceChange(event: MediaQueryListEvent) {
      reducedMotion = event.matches;
      cancelAnimationFrame(frameId);
      frameId = 0;
      drawFrame();
    }

    window.addEventListener("resize", resize);
    motionPreference.addEventListener("change", handleMotionPreferenceChange);
    resize();
    drawFrame();

    return () => {
      window.removeEventListener("resize", resize);
      motionPreference.removeEventListener("change", handleMotionPreferenceChange);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas ref={canvasRef} id="emberCanvas" aria-hidden="true" />;
}
