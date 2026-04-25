'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

const GRID_SIZE = 24;
const MOVE_INTERVAL = 150;

type Point = { x: number, y: number };

const DIRS = [
  { x: 0, y: -1 }, // UP
  { x: 1, y: 0 },  // RIGHT
  { x: 0, y: 1 },  // DOWN
  { x: -1, y: 0 }, // LEFT
];

const SNAKE_COLORS = [
  { base: 'bg-purple-600 dark:bg-purple-500', shadow: '168,85,247' },
  { base: 'bg-blue-600 dark:bg-blue-500', shadow: '59,130,246' },
  { base: 'bg-emerald-600 dark:bg-emerald-500', shadow: '16,185,129' },
  { base: 'bg-yellow-500 dark:bg-yellow-400', shadow: '234,179,8' },
];

export default function BackgroundSnake() {
  const [snake, setSnake] = useState<Point[]>([]);
  const [windowSize, setWindowSize] = useState({ w: 0, h: 0 });
  const [snakeColor, setSnakeColor] = useState(SNAKE_COLORS[0]);

  const dirRef = useRef<number>(1);
  const snakeRef = useRef<Point[]>([]);
  const isDeadRef = useRef(true);
  const stepsSinceTurnRef = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        w: Math.floor(window.innerWidth / GRID_SIZE),
        h: Math.floor(window.innerHeight / GRID_SIZE),
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const spawnSnake = useCallback(() => {
    if (windowSize.w === 0) return;
    const border = Math.floor(Math.random() * 4);
    const { w, h } = windowSize;
    let headX = 0, headY = 0, startDir = 0;

    if (border === 0) { headX = Math.floor(Math.random() * w); headY = 0; startDir = 2; }
    else if (border === 1) { headX = w - 1; headY = Math.floor(Math.random() * h); startDir = 3; }
    else if (border === 2) { headX = Math.floor(Math.random() * w); headY = h - 1; startDir = 0; }
    else { headX = 0; headY = Math.floor(Math.random() * h); startDir = 1; }

    const newSnake: Point[] = [{ x: headX, y: headY }];
    dirRef.current = startDir;
    snakeRef.current = newSnake;
    stepsSinceTurnRef.current = 0;
    setSnakeColor(SNAKE_COLORS[Math.floor(Math.random() * SNAKE_COLORS.length)]);
    setSnake(newSnake);
    isDeadRef.current = false;
  }, [windowSize]);

  const vanishAndRespawn = useCallback(() => {
    isDeadRef.current = true;
    setSnake([]);
    snakeRef.current = [];
    setTimeout(spawnSnake, 500);
  }, [spawnSnake]);

  useEffect(() => {
    if (windowSize.w === 0) return;

    spawnSnake();

    const interval = setInterval(() => {
      if (isDeadRef.current) return;

      const { w, h } = windowSize;
      const head = snakeRef.current[0];
      if (!head) { vanishAndRespawn(); return; }

      const currentDir = dirRef.current;
      const leftDir = (currentDir + 3) % 4;
      const rightDir = (currentDir + 1) % 4;

      const isInvalid = (d: number) => {
        const pt = { x: head.x + DIRS[d].x, y: head.y + DIRS[d].y };
        if (pt.x < 0 || pt.x >= w || pt.y < 0 || pt.y >= h) return true;
        return snakeRef.current.some(b => b.x === pt.x && b.y === pt.y);
      };

      const safeOptions = [currentDir, leftDir, rightDir].filter(d => !isInvalid(d));
      if (safeOptions.length === 0) {
        vanishAndRespawn();
        return;
      }

      let intentDir = currentDir;
      if (stepsSinceTurnRef.current >= 3 && Math.random() < 0.1) {
        const turn = Math.random() < 0.5 ? leftDir : rightDir;
        intentDir = !isInvalid(turn) ? turn : currentDir;
      }
      if (isInvalid(intentDir)) {
        intentDir = safeOptions[Math.floor(Math.random() * safeOptions.length)];
      }

      stepsSinceTurnRef.current = intentDir !== currentDir ? 0 : stepsSinceTurnRef.current + 1;
      dirRef.current = intentDir;

      const nextHead = { x: head.x + DIRS[intentDir].x, y: head.y + DIRS[intentDir].y };
      const newSnake = [nextHead, ...snakeRef.current];
      if (newSnake.length > 25) newSnake.pop();

      snakeRef.current = newSnake;
      setSnake(newSnake);
    }, MOVE_INTERVAL);

    return () => clearInterval(interval);
  }, [windowSize, spawnSnake]);

  if (windowSize.w === 0) return null;

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none z-[1]"
      style={{
        maskImage: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,1) 60%)',
        WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,1) 60%)',
      }}
    >
      {snake.map((part, index) => {
        const isHead = index === 0;
        const opacity = isHead ? 0.9 : Math.max(0.1, 0.7 - (index / snake.length) * 0.6);
        return (
          <div
            key={index}
            onPointerDown={vanishAndRespawn}
            className={`absolute ${snakeColor.base} rounded-sm pointer-events-auto cursor-pointer hover:scale-110 active:scale-90`}
            style={{
              width: GRID_SIZE - 2,
              height: GRID_SIZE - 2,
              left: part.x * GRID_SIZE,
              top: part.y * GRID_SIZE,
              transition: `left ${MOVE_INTERVAL}ms linear, top ${MOVE_INTERVAL}ms linear, opacity 300ms ease, transform 200ms ease`,
              opacity,
              boxShadow: isHead
                ? `0 0 15px rgba(${snakeColor.shadow},0.8)`
                : `0 0 10px rgba(${snakeColor.shadow},0.4)`,
            }}
          />
        );
      })}
    </div>
  );
}
