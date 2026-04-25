'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const PAGE_COLORS: Record<string, { r: number; g: number; b: number }> = {
  '/dashboard/knowledge': { r: 52,  g: 211, b: 153 }, // emerald
  '/dashboard/decay':     { r: 251, g: 191, b: 36  }, // amber
  '/dashboard/team':      { r: 34,  g: 211, b: 238 }, // cyan
  '/dashboard/quiz':      { r: 129, g: 140, b: 248 }, // indigo
};

const DEFAULT_COLOR = { r: 99, g: 102, b: 241 }; // indigo-purple

export default function GlowScrollbar() {
  const pathname = usePathname();

  useEffect(() => {
    const color = PAGE_COLORS[pathname] ?? DEFAULT_COLOR;
    const { r, g, b } = color;

    const existingStyle = document.getElementById('glow-scrollbar-style');
    if (existingStyle) existingStyle.remove();

    const style = document.createElement('style');
    style.id = 'glow-scrollbar-style';
    style.textContent = `
      ::-webkit-scrollbar {
        width: 6px;
      }

      ::-webkit-scrollbar-track {
        background: transparent;
      }

      /* Thumb — fully transparent at top, blazing glow at bottom */
      ::-webkit-scrollbar-thumb {
        border-radius: 999px;
        background: linear-gradient(
          to bottom,
          rgba(${r},${g},${b},0.0)  0%,
          rgba(${r},${g},${b},0.0) 15%,
          rgba(${r},${g},${b},0.3) 40%,
          rgba(${r},${g},${b},0.8) 72%,
          rgba(${r},${g},${b},1.0) 100%
        );
        box-shadow:
          0 0  6px  1px rgba(${r},${g},${b},0.3),
          0 0 14px  4px rgba(${r},${g},${b},0.35),
          0 0 28px  8px rgba(${r},${g},${b},0.25),
          0 0 50px 14px rgba(${r},${g},${b},0.15),
          0 0 80px 20px rgba(${r},${g},${b},0.08);
        animation: scrollbar-glow-pulse 3s ease-in-out infinite;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(
          to bottom,
          rgba(${r},${g},${b},0.0)   0%,
          rgba(${r},${g},${b},0.15) 20%,
          rgba(${r},${g},${b},0.6)  55%,
          rgba(${r},${g},${b},1.0)  100%
        );
        box-shadow:
          0 0  8px  2px rgba(${r},${g},${b},0.6),
          0 0 20px  6px rgba(${r},${g},${b},0.5),
          0 0 40px 12px rgba(${r},${g},${b},0.35),
          0 0 70px 20px rgba(${r},${g},${b},0.2),
          0 0 120px 30px rgba(${r},${g},${b},0.1);
      }

      @keyframes scrollbar-glow-pulse {
        0%, 100% {
          box-shadow:
            0 0  6px  1px rgba(${r},${g},${b},0.3),
            0 0 14px  4px rgba(${r},${g},${b},0.35),
            0 0 28px  8px rgba(${r},${g},${b},0.25),
            0 0 50px 14px rgba(${r},${g},${b},0.15),
            0 0 80px 20px rgba(${r},${g},${b},0.08);
        }
        50% {
          box-shadow:
            0 0 10px  2px rgba(${r},${g},${b},0.55),
            0 0 22px  6px rgba(${r},${g},${b},0.5),
            0 0 45px 12px rgba(${r},${g},${b},0.38),
            0 0 80px 22px rgba(${r},${g},${b},0.22),
            0 0 120px 32px rgba(${r},${g},${b},0.12);
        }
      }

      /* Firefox */
      * {
        scrollbar-width: thin;
        scrollbar-color: rgba(${r},${g},${b},0.7) transparent;
      }
    `;

    document.head.appendChild(style);

    return () => {
      const el = document.getElementById('glow-scrollbar-style');
      if (el) el.remove();
    };
  }, [pathname]);

  return null;
}
