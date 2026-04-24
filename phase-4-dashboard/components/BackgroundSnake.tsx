'use client';

import { useEffect, useRef } from 'react';

export default function BackgroundSnake() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const onResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener('resize', onResize);

    // Snake state
    const segments = 120;
    const points: { x: number; y: number }[] = [];
    let t = 0;

    for (let i = 0; i < segments; i++) {
      points.push({ x: w / 2, y: h / 2 });
    }

    let headX = w / 2;
    let headY = h / 2;
    let vx = 1.2;
    let vy = 0.8;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Move head
      headX += vx + Math.sin(t * 0.7) * 0.6;
      headY += vy + Math.cos(t * 0.5) * 0.6;
      t += 0.018;

      // Bounce off edges
      if (headX < 0 || headX > w) vx *= -1;
      if (headY < 0 || headY > h) vy *= -1;
      headX = Math.max(0, Math.min(w, headX));
      headY = Math.max(0, Math.min(h, headY));

      // Shift segments
      for (let i = points.length - 1; i > 0; i--) {
        points[i].x = points[i - 1].x;
        points[i].y = points[i - 1].y;
      }
      points[0].x = headX;
      points[0].y = headY;

      // Draw snake as gradient path
      if (points.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const mx = (points[i].x + points[i + 1].x) / 2;
        const my = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
      }

      const grad = ctx.createLinearGradient(
        points[0].x, points[0].y,
        points[points.length - 1].x, points[points.length - 1].y
      );
      grad.addColorStop(0, 'rgba(99,102,241,0.35)');
      grad.addColorStop(0.5, 'rgba(168,85,247,0.2)');
      grad.addColorStop(1, 'rgba(99,102,241,0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
