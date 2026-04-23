/**
 * Webview Entry Point — Phase 5, Task 5.3
 * esbuild bundles this into out/webview.js
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
