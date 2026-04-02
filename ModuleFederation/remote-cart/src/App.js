/**
 * ============================================================================
 * APP.JS — STANDALONE SHELL FOR THE CART REMOTE
 * ============================================================================
 *
 * This component is the standalone wrapper for the Cart remote. It lets the
 * Cart team develop and test their component independently on port 3002,
 * without needing the host app or the Products remote running.
 *
 * WHEN THIS IS USED:
 *   - `npm start` in this directory → opens http://localhost:3002
 *   - This App component renders with the Cart component embedded
 *   - The Cart team sees their component in a simple standalone page
 *
 * WHEN THIS IS NOT USED:
 *   - When the host app loads this remote via Module Federation
 *   - The host only imports the exposed module (Cart)
 *   - This App.js, bootstrap.js, and index.js are never fetched by the host
 *
 * MULTI-REMOTE DEVELOPMENT PATTERN:
 * In a real organization with multiple remote teams:
 *
 *   Products team → runs remote-products standalone on port 3001
 *   Cart team     → runs remote-cart standalone on port 3002
 *   Host team     → runs host-app on port 3000 (consumes both remotes)
 *
 * Each team has a fully independent development loop. They only need to
 * coordinate on:
 *   1. The exposed module's public API (props interface)
 *   2. Shared dependency versions (React ^18.0.0)
 *   3. The remoteEntry.js URL (for the host's config)
 *
 * Everything else — internal state, styling, data fetching, testing — is
 * owned entirely by the team that owns the remote.
 */

import React from 'react';
import Cart from './Cart';

function App() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <header style={{ borderBottom: '2px solid #1565c0', marginBottom: '20px', paddingBottom: '10px' }}>
        <h1>🛒 Remote Cart App (Standalone)</h1>
        <p style={{ color: '#666' }}>
          This is the standalone view of the Cart remote. In production,
          the Cart component below is loaded by the host app via Module
          Federation. This standalone shell is for local development only.
        </p>
      </header>

      <main>
        <Cart />
      </main>

      <footer style={{ borderTop: '1px solid #ddd', marginTop: '20px', paddingTop: '10px', color: '#999' }}>
        <p>Remote Cart running standalone on port 3002</p>
      </footer>
    </div>
  );
}

export default App;
