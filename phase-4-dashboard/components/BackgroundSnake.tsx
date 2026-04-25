'use client';

<<<<<<< HEAD
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
=======
import { useEffect, useState, useRef } from 'react';

const GRID_SIZE = 24;

type Point = { x: number, y: number };

const DIRS = [
  { x: 0, y: -1 }, // UP (0)
  { x: 1, y: 0 },  // RIGHT (1)
  { x: 0, y: 1 },  // DOWN (2)
  { x: -1, y: 0 }, // LEFT (3)
];

const SNAKE_COLORS = [
  { base: 'bg-purple-600 dark:bg-purple-500', shadow: '168,85,247' },
  { base: 'bg-blue-600 dark:bg-blue-500', shadow: '59,130,246' },
  { base: 'bg-emerald-600 dark:bg-emerald-500', shadow: '16,185,129' },
];

export default function BackgroundSnake() {
  const [snake, setSnake] = useState<Point[]>([]);
  const [windowSize, setWindowSize] = useState({ w: 0, h: 0 });
  const [snakeColor, setSnakeColor] = useState(SNAKE_COLORS[0]);
  
  const dirRef = useRef<number>(1);
  const snakeRef = useRef<Point[]>([]);
  const isDeadRef = useRef(true);
  const stepsSinceTurnRef = useRef(0);

  // Initialize and handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        w: Math.floor(window.innerWidth / GRID_SIZE),
        h: Math.floor(window.innerHeight / GRID_SIZE)
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (windowSize.w === 0) return;

    const spawnSnake = () => {
      if (windowSize.w === 0) return;

      // Pick random border: 0: top, 1: right, 2: bottom, 3: left
      const border = Math.floor(Math.random() * 4);
      let headX = 0, headY = 0;
      let startDir = 0;
      
      const { w, h } = windowSize;

      if (border === 0) { // top
        headX = Math.floor(Math.random() * w);
        headY = 0;
        startDir = 2; // DOWN
      } else if (border === 1) { // right
        headX = w - 1;
        headY = Math.floor(Math.random() * h);
        startDir = 3; // LEFT
      } else if (border === 2) { // bottom
        headX = Math.floor(Math.random() * w);
        headY = h - 1;
        startDir = 0; // UP
      } else { // left
        headX = 0;
        headY = Math.floor(Math.random() * h);
        startDir = 1; // RIGHT
      }

      const newSnake: Point[] = [{ x: headX, y: headY }];
      dirRef.current = startDir;
      snakeRef.current = newSnake;
      stepsSinceTurnRef.current = 0;
      
      setSnakeColor(SNAKE_COLORS[Math.floor(Math.random() * SNAKE_COLORS.length)]);
      setSnake(newSnake);
      isDeadRef.current = false;
    };

    if (isDeadRef.current) {
        spawnSnake();
    }

    const interval = setInterval(() => {
      if (isDeadRef.current) {
        spawnSnake();
        return;
      }

      let currentDir = dirRef.current;
      const { w, h } = windowSize;
      const head = snakeRef.current[0];

      if (!head) {
        isDeadRef.current = true;
        return;
      }

      const straightDir = currentDir;
      const leftDir = (currentDir + 3) % 4;
      const rightDir = (currentDir + 1) % 4;

      // Helper function to check if a specific direction causes death (wall or own body)
      const isInvalid = (d: number) => {
          const pt = { x: head.x + DIRS[d].x, y: head.y + DIRS[d].y };
          if (pt.x < 0 || pt.x >= w || pt.y < 0 || pt.y >= h) return true; // Wall collision
          if (snakeRef.current.some(bodyPt => bodyPt.x === pt.x && bodyPt.y === pt.y)) return true; // Body collision
          return false;
      };

      const safeOptions = [straightDir, leftDir, rightDir].filter(d => !isInvalid(d));

      if (safeOptions.length === 0) {
          // Snake is completely trapped with nowhere to go. Time to vanish.
          isDeadRef.current = true;
          setSnake([]);
          snakeRef.current = [];
          return;
      }

      let intentDir = straightDir;
      let wantedToTurn = false;

      // 10% chance to randomly turn, but only if it's moved straight for at least 3 steps
      if (stepsSinceTurnRef.current >= 3 && Math.random() < 0.1) {
          wantedToTurn = true;
          intentDir = Math.random() < 0.5 ? leftDir : rightDir;
      }

      // If the intended move is invalid/blocked (by body or wall)
      if (isInvalid(intentDir)) {
          if (wantedToTurn) {
              const otherTurn = intentDir === leftDir ? rightDir : leftDir;
              if (!isInvalid(otherTurn)) {
                  intentDir = otherTurn; // Try the other turn direction
              } else if (!isInvalid(straightDir)) {
                  intentDir = straightDir; // Fallback to straight
              } else {
                  intentDir = safeOptions[Math.floor(Math.random() * safeOptions.length)]; // Any random safe path
              }
          } else {
              // We wanted to go straight, but it's blocked. Force a random safe turn.
              intentDir = safeOptions[Math.floor(Math.random() * safeOptions.length)];
          }
      }
      
      if (intentDir !== currentDir) {
          stepsSinceTurnRef.current = 0;
      } else {
          stepsSinceTurnRef.current += 1;
      }

      currentDir = intentDir;
      dirRef.current = currentDir;

      let nextHead = {
          x: head.x + DIRS[intentDir].x,
          y: head.y + DIRS[intentDir].y
      };

      // Move snake
      const newSnake = [nextHead, ...snakeRef.current];
      
      // Target length of 25. Grows by 1 every tick until it reaches 25
      if (newSnake.length > 25) {
          newSnake.pop();
      }

      snakeRef.current = newSnake;
      setSnake(newSnake);

    }, 200); // Super slow relaxed speed

    return () => clearInterval(interval);

  }, [windowSize]);

  if (windowSize.w === 0) return null;

  return (
    <div 
      className="absolute inset-0 overflow-hidden pointer-events-none z-[1]"
      style={{
        maskImage: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,1) 60%)',
        WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,1) 60%)'
      }}
    >
      {snake.map((part, index) => {
        // Simple fade out on the tail
        const isHead = index === 0;
        const opacity = isHead ? 0.9 : Math.max(0.1, 0.7 - (index / snake.length) * 0.6);
        
        return (
          <div
            key={`${part.x}-${part.y}-${index}`}
            onMouseDown={(e) => {
              // Using onMouseDown for faster response than onClick
              e.stopPropagation();
              isDeadRef.current = true;
              setSnake([]);
              snakeRef.current = [];
            }}
            className={`absolute ${snakeColor.base} rounded-sm transition-all duration-75 pointer-events-auto cursor-pointer hover:scale-110 active:scale-90`}
            style={{
              width: GRID_SIZE - 2,
              height: GRID_SIZE - 2,
              left: part.x * GRID_SIZE,
              top: part.y * GRID_SIZE,
              opacity: opacity,
              boxShadow: isHead ? `0 0 15px rgba(${snakeColor.shadow},0.8)` : `0 0 10px rgba(${snakeColor.shadow},0.4)`
            }}
          />
        );
      })}
    </div>
>>>>>>> fe0e6bc2a434528fb054e80900176895d5bdeec1
  );
}
