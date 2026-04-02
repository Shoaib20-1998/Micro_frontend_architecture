/**
 * ============================================================================
 * APP.JS — STANDALONE SHELL FOR THE REMOTE
 * ============================================================================
 *
 * This component is the "standalone wrapper" for the remote app. It provides
 * a minimal UI shell so the Products team can develop and test their
 * ProductList component independently, without needing the host app running.
 *
 * WHEN THIS IS USED:
 *   - `npm start` in this directory → opens http://localhost:3001
 *   - This App component renders with ProductList embedded
 *   - The developer sees their component in a simple standalone page
 *
 * WHEN THIS IS NOT USED:
 *   - When the host app loads this remote via Module Federation
 *   - The host only imports the exposed modules (ProductList)
 *   - This App.js, bootstrap.js, and index.js are never fetched
 *
 * WHY THIS MATTERS FOR TEAM AUTONOMY:
 * In a real micro frontend architecture, the Products team owns this entire
 * repository. They can:
 *   - Run it standalone for local development
 *   - Deploy it independently (the host doesn't need to rebuild)
 *   - Add new features without coordinating with the host team
 *   - Use their own CI/CD pipeline
 *
 * The standalone shell is what makes this possible. Without it, the team
 * would need to run the entire host app just to see their component.
 */

import React from 'react';
import ProductList from './ProductList';

function App() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <header style={{ borderBottom: '2px solid #2e7d32', marginBottom: '20px', paddingBottom: '10px' }}>
        <h1>📦 Remote Products App (Standalone)</h1>
        <p style={{ color: '#666' }}>
          This is the standalone view of the Products remote. In production,
          the ProductList component below is loaded by the host app via
          Module Federation. This standalone shell is for local development only.
        </p>
      </header>

      <main>
        <ProductList />
      </main>

      <footer style={{ borderTop: '1px solid #ddd', marginTop: '20px', paddingTop: '10px', color: '#999' }}>
        <p>Remote Products running standalone on port 3001</p>
      </footer>
    </div>
  );
}

export default App;
