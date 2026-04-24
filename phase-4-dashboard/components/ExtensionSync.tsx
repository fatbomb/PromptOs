'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function ExtensionSync() {
  useEffect(() => {
    const sync = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        // Try to sync with common browser extension IDs
        // NOTE: In a real app, this would be a single fixed ID from the store.
        // For development, we can try to send it if the extension is installed.
        const EXTENSION_IDS = [
          'promptos-extension-id', // Placeholder
        ];

        EXTENSION_IDS.forEach(id => {
          try {
            const chrome = (window as any).chrome;
            if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
              chrome.runtime.sendMessage(id, { 
                type: 'SET_TOKEN', 
                token: session.access_token 
              }, (response: any) => {
                if (chrome.runtime.lastError) {
                  // Extension not found or not connectable - normal in dev
                  return;
                }
                console.log('PromptOS: Extension synced successfully!');
              });
            }
          } catch (e) {
            // Extension not installed or different ID
          }
        });
      }
    };

    sync();
  }, []);

  return null;
}
