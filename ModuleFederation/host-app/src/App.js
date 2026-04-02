/**
 * ============================================================================
 * APP.JS — HOST APPLICATION COMPONENT
 * ============================================================================
 *
 * This is the main component of the Module Federation host app. It demonstrates
 * the key patterns for consuming remote micro frontend components:
 *
 *   1. React.lazy()  — Dynamically imports remote components
 *   2. <Suspense>    — Shows a loading UI while the remote loads
 *   3. <ErrorBoundary> — Shows a fallback UI if the remote fails to load
 *
 * HOW REMOTE IMPORTS WORK AT RUNTIME:
 *
 * When React.lazy(() => import('remoteProducts/ProductList')) executes:
 *   1. Webpack's runtime checks if the 'remoteProducts' container is loaded
 *   2. If not, it fetches http://localhost:3001/remoteEntry.js (a ~2KB file)
 *   3. remoteEntry.js registers the container and its available modules
 *   4. Webpack calls container.get('./ProductList') on the remote container
 *   5. The remote returns a module factory that webpack executes
 *   6. The resulting React component is returned to React.lazy()
 *   7. React renders it like any other component
 *
 * All of this happens transparently — from React's perspective, it's just
 * a normal lazy-loaded component. The magic is in webpack's runtime.
 *
 * INTERVIEW TIP:
 * "React.lazy() + Suspense + ErrorBoundary is the standard pattern for
 * consuming Module Federation remotes. lazy() handles the async import,
 * Suspense handles the loading state, and ErrorBoundary handles failures.
 * Each remote should have its own ErrorBoundary so one failure doesn't
 * cascade to others."
 */

import React, { Suspense } from 'react';
import ErrorBoundary from './ErrorBoundary';

/**
 * REMOTE COMPONENT IMPORTS
 * ------------------------
 * React.lazy() takes a function that returns a dynamic import() promise.
 * The import path 'remoteProducts/ProductList' is resolved by webpack:
 *   - 'remoteProducts' → maps to the remote container declared in webpack.config.js
 *   - '/ProductList'   → maps to the module exposed by that remote's `exposes` config
 *
 * These are NOT regular npm imports. They're resolved at RUNTIME by fetching
 * the remote's remoteEntry.js and calling container.get('./ProductList').
 *
 * The lazy() wrapper means the component won't be fetched until it's actually
 * rendered. This is important for performance — if a section of the page
 * isn't visible, its remote code isn't loaded.
 */
const RemoteProductList = React.lazy(() => import('remoteProducts/ProductList'));
const RemoteCart = React.lazy(() => import('remoteCart/Cart'));

/**
 * LOADING FALLBACK COMPONENT
 * --------------------------
 * Shown by <Suspense> while a remote component is being fetched.
 * In production, you'd want something more polished (skeleton screens, etc.)
 */
function LoadingFallback({ name }) {
  return (
    <div style={{
      padding: '20px',
      textAlign: 'center',
      color: '#666',
    }}>
      ⏳ Loading {name}...
    </div>
  );
}

/**
 * MAIN APP COMPONENT
 * ------------------
 * Composes the remote micro frontend components into a single page.
 *
 * Notice the pattern: each remote is wrapped in its OWN ErrorBoundary
 * and Suspense. This is intentional:
 *
 *   - Separate ErrorBoundary per remote: If Products fails, Cart still works.
 *     If they shared one ErrorBoundary, one failure would hide both.
 *
 *   - Separate Suspense per remote: Each remote loads independently and shows
 *     its own loading state. If they shared one Suspense, the entire page
 *     would show "loading" until ALL remotes finish.
 *
 * This is the "independent failure" principle of micro frontends — each
 * micro frontend should be able to fail, load, and recover independently.
 */
function App() {
  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
      <header style={{ borderBottom: '2px solid #333', marginBottom: '20px', paddingBottom: '10px' }}>
        <h1>🏠 Module Federation Host App</h1>
        <p style={{ color: '#666' }}>
          This host app consumes components from two independent remote applications
          at runtime using Webpack 5 Module Federation.
        </p>
      </header>

      <main>
        {/*
          REMOTE: PRODUCT LIST
          --------------------
          Loaded from http://localhost:3001 (remote-products app).

          PATTERN: ErrorBoundary → Suspense → LazyComponent
          The order matters:
            - ErrorBoundary is the OUTER wrapper because it catches errors
              from both the Suspense and the lazy component inside it.
            - Suspense is the INNER wrapper because it only handles the
              loading state (the pending promise from React.lazy).

          If you reversed them (Suspense outside, ErrorBoundary inside),
          the ErrorBoundary wouldn't catch errors thrown by Suspense itself.

          The `name` prop helps identify which boundary caught an error in
          console logs — critical when you have multiple remotes.

          RENDER FUNCTION FALLBACK:
          Here we pass a function as the fallback prop. The ErrorBoundary
          calls it with { error, retry }, giving us access to the retry
          handler. This lets the fallback UI include a "Try Again" button
          that re-attempts the remote import.
        */}
        <section style={{ marginBottom: '30px' }}>
          <h2>📦 Products (from Remote on port 3001)</h2>
          <ErrorBoundary
            name="remote-products"
            fallback={({ error, retry }) => (
              <div style={{ padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
                <p>⚠️ Products micro frontend is unavailable. The remote at localhost:3001 may be down.</p>
                {/**
                 * RETRY BUTTON — Calls the ErrorBoundary's retry handler.
                 * This resets the boundary's error state, causing React to
                 * re-render the children and re-attempt the lazy import.
                 * If the remote has recovered, the component loads normally.
                 */}
                <button
                  onClick={retry}
                  style={{
                    marginTop: '8px',
                    padding: '6px 16px',
                    cursor: 'pointer',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                  }}
                >
                  🔄 Retry Loading Products
                </button>
              </div>
            )}
          >
            <Suspense fallback={<LoadingFallback name="Product List" />}>
              <RemoteProductList />
            </Suspense>
          </ErrorBoundary>
        </section>

        {/*
          REMOTE: CART
          ------------
          Loaded from http://localhost:3002 (remote-cart app).
          Same ErrorBoundary + Suspense pattern, but INDEPENDENT from Products.

          WHY SEPARATE BOUNDARIES PER REMOTE:
          If Products and Cart shared a single ErrorBoundary, a failure in
          Products would unmount BOTH components and show one fallback for
          the entire section. With separate boundaries, Products can fail
          while Cart keeps working perfectly. This is the "independent
          failure" principle — the whole point of micro frontends.

          Here we use a static JSX fallback (not a function) to demonstrate
          both approaches. The default fallback in ErrorBoundary.js already
          includes a retry button, so even without a render-function fallback,
          users can still retry by using the default fallback (just omit the
          fallback prop entirely).
        */}
        <section style={{ marginBottom: '30px' }}>
          <h2>🛒 Cart (from Remote on port 3002)</h2>
          <ErrorBoundary
            name="remote-cart"
            fallback={({ error, retry }) => (
              <div style={{ padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
                <p>⚠️ Cart micro frontend is unavailable. The remote at localhost:3002 may be down.</p>
                <button
                  onClick={retry}
                  style={{
                    marginTop: '8px',
                    padding: '6px 16px',
                    cursor: 'pointer',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                  }}
                >
                  🔄 Retry Loading Cart
                </button>
              </div>
            )}
          >
            <Suspense fallback={<LoadingFallback name="Cart" />}>
              <RemoteCart />
            </Suspense>
          </ErrorBoundary>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid #ddd', marginTop: '20px', paddingTop: '10px', color: '#999' }}>
        <p>
          Host App running on port 3000 | Remotes: Products (3001), Cart (3002)
        </p>
      </footer>
    </div>
  );
}

export default App;
