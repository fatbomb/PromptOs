'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-8">
          PromptOS Documentation
        </h1>
        
        <p className="text-[var(--text-secondary)] text-lg mb-12">
          Welcome to the PromptOS documentation. Here you will find everything you need to know about setting up and using the PromptOS CLI and browser extensions.
        </p>

        <div className="space-y-12">
          {/* CLI Section */}
          <section className="bg-[var(--glass-card-bg)] border border-[var(--glass-border)] rounded-2xl p-8 shadow-lg backdrop-blur-xl">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">CLI Tool</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              The PromptOS CLI is your main interface for interacting with the AI directly from your terminal. It supports interactive sessions, auto-saving telemetry, and more.
            </p>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2 mt-6">Installation</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Install the CLI globally using npm:
            </p>
            <div className="bg-black/50 p-4 rounded-lg overflow-x-auto mb-6">
              <code className="text-emerald-400">npm install -g promptos-cli</code>
            </div>

            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Usage</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Start an interactive session:
            </p>
            <div className="bg-black/50 p-4 rounded-lg overflow-x-auto">
              <code className="text-blue-400">promptos interactive</code>
            </div>
          </section>

          {/* Chrome Extension Section */}
          <section className="bg-[var(--glass-card-bg)] border border-[var(--glass-border)] rounded-2xl p-8 shadow-lg backdrop-blur-xl">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Chrome Extension</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              The Chrome Extension allows you to track and evaluate prompts you write in web interfaces like ChatGPT or Claude, syncing data directly to this dashboard.
            </p>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2 mt-6">Installation (Developer Mode)</h3>
            <ol className="list-decimal list-inside text-[var(--text-secondary)] space-y-3 mb-6">
              <li>Download the extension from the <a href="https://github.com/promptos/releases" className="text-blue-400 hover:underline">Releases Page</a>.</li>
              <li>Extract the downloaded <code>.zip</code> file.</li>
              <li>Open Chrome and navigate to <code>chrome://extensions/</code>.</li>
              <li>Enable <strong>Developer mode</strong> in the top right corner.</li>
              <li>Click <strong>Load unpacked</strong> and select the extracted folder.</li>
            </ol>
          </section>

          {/* VS Code Extension Section */}
          <section className="bg-[var(--glass-card-bg)] border border-[var(--glass-border)] rounded-2xl p-8 shadow-lg backdrop-blur-xl">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">VS Code Extension</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              The VS Code Extension brings PromptOS directly into your IDE, allowing you to highlight code and automatically send prompts for analysis.
            </p>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2 mt-6">Installation (VSIX)</h3>
            <ol className="list-decimal list-inside text-[var(--text-secondary)] space-y-3 mb-6">
              <li>Download the <code>.vsix</code> file from the <a href="https://github.com/promptos/releases" className="text-blue-400 hover:underline">Releases Page</a>.</li>
              <li>Open VS Code and navigate to the Extensions view (<kbd className="bg-white/10 px-1 rounded">Ctrl+Shift+X</kbd>).</li>
              <li>Click the <code>...</code> menu in the top right corner.</li>
              <li>Select <strong>Install from VSIX...</strong> and choose the downloaded file.</li>
            </ol>
            <p className="text-[var(--text-secondary)] mt-4">
              <em>Note: We plan to publish directly to the Visual Studio Marketplace in the future for one-click installation.</em>
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
