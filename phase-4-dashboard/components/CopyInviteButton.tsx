'use client';

import { useState } from 'react';

interface Props {
  inviteCode: string;
}

export default function CopyInviteButton({ inviteCode }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  return (
    <button 
      onClick={handleCopy}
      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] border ${
        copied 
          ? 'bg-emerald-600 border-emerald-500 text-white' 
          : 'bg-cyan-600 hover:bg-cyan-500 border-cyan-500 text-white'
      }`}
    >
      {copied ? 'Copied!' : 'Copy Invite Code'}
    </button>
  );
}
