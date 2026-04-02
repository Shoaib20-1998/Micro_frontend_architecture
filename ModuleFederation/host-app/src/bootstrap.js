/**
 * ============================================================================
 * BOOTSTRAP — THE REAL APPLICATION ENTRY POINT
 * ============================================================================
 *
 * This is where the actual React application mounts. It's separated from
 * index.js because of the async boundary pattern (see index.js for the
 * full explanation).
 *
 * WHY THIS FILE EXISTS (THE SHORT VERSION):
 *
 * index.js does `import('./bootstrap')` — a dynamic import. This creates
 * an async chunk boundary. Webpack's Module Federation runtime uses this
 * boundary to negotiate shared dependencies (React, ReactDOM) with any
 * remote containers BEFORE this code executes.
 *
 * By the time this file runs:
 *   1. The Module Federation runtime has already loaded
 *   2. Shared dependency versions have been negotiated
 *   3. React and ReactDOM are guaranteed to be the shared singleton versions
 *   4. Remote container entry points (remoteEntry.js) are available
 *
 * If we put this code directly in index.js (synchronous entry), React would
 * load before negotiation happens, and we'd end up with duplicate React
 * instances — which breaks hooks and causes the infamous "Invalid hook call"
 * error.
 *
 * INTERVIEW TIP:
 * "The bootstrap.js pattern ensures that shared dependency negotiation
 * completes before any React code runs. This is what prevents the duplicate
 * React instance problem in Module Federation setups."
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * We use React 18's createRoot API here.
 * The older ReactDOM.render() still works but is considered legacy in React 18.
 *
 * Note: By the time this code executes, the React import above has already
 * been resolved to the shared singleton version negotiated by Module Federation.
 * We don't need to do anything special — webpack handles it transparently.
 */
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
