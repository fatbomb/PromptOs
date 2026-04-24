'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export default function CLILoginToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (searchParams.get('cli_login') === 'success') {
      setShow(true);
      
      // Clean up the URL after a short delay so the param doesn't stick around
      const timer1 = setTimeout(() => {
        router.replace(pathname, { scroll: false });
      }, 1000);

      // Hide the toast after 4 seconds
      const timer2 = setTimeout(() => {
        setShow(false);
      }, 4000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [searchParams, router, pathname]);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in-up">
      <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-6 py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.15)] flex items-center gap-3 backdrop-blur-md">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium">CLI Login Successful! Return to terminal.</span>
      </div>
    </div>
  );
}
