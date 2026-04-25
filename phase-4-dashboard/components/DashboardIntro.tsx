'use client';

import { useState } from 'react';

export default function DashboardIntro() {
  const [done, setDone] = useState(false);

  if (done) return null;

  return (
    <>
      <style>{`
        @keyframes intro-fade {
          0%   { opacity: 0; }
          20%  { opacity: 1; }
          75%  { opacity: 1; }
          100% { opacity: 0; }
        }
        .intro-overlay {
          animation: intro-fade 2s ease-in-out forwards;
        }
        .intro-logo {
          animation: intro-fade 2s ease-in-out forwards;
        }
        .intro-glow {
          animation: intro-fade 2s ease-in-out forwards;
        }
      `}</style>

      <div
        className="intro-overlay fixed inset-0 z-[9999] bg-[var(--bg-color)] pointer-events-none flex items-center justify-center"
        onAnimationEnd={() => {
          sessionStorage.setItem('promptos-intro-played', '1');
          setDone(true);
        }}
      >
        {/* Ambient glow */}
        <div className="intro-glow absolute w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-blue-600/30 via-indigo-500/20 to-purple-600/30 blur-[100px]" />

        {/* Centered logo */}
        <span
          className="intro-logo relative font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 select-none whitespace-nowrap"
          style={{ fontSize: 'clamp(3.5rem, 10vw, 7rem)', letterSpacing: '-0.04em', lineHeight: 1 }}
        >
          PromptOS
        </span>
      </div>
    </>
  );
}
