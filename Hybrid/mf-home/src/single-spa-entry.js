/**
 * ============================================================================
 * SINGLE-SPA ENTRY — THE HEART OF THE HYBRID DUAL NATURE
 * ============================================================================
 *
 * CODE ANNOTATION: What is this file?
 * -------------------------------------
 * This is the file that makes this micro frontend "hybrid." It bridges the
 * gap between Module Federation (how the code is loaded) and single-spa
 * (how the lifecycle is managed).
 *
 * This file is EXPOSED via Module Federation:
 *   webpack.config.js → exposes: { './singleSpaEntry': './src/single-spa-entry' }
 *
 * And CONSUMED by the shell's mf-loader bridge:
 *   import('mfHome/singleSpaEntry') → returns { bootstrap, mount, unmount }
 *
 * THE DUAL NATURE EXPLAINED:
 *
 *   As a MODULE FEDERATION remote module:
 *     - This file is listed in the `exposes` config of webpack.config.js
 *     - Module Federation generates a chunk for it and lists it in remoteEntry.js
 *     - The shell loads it via: container.get('./singleSpaEntry')
 *     - From MF's perspective, this is just another exposed module — it doesn't
 *       know or care that it contains single-spa lifecycle hooks
 *
 *   As a SINGLE-SPA application:
 *     - This file exports { bootstrap, mount, unmount } lifecycle hooks
 *     - These hooks are created by wrapping the React App component with
 *       single-spa-react (same pattern as pure Single-Spa micro frontends)
 *     - From single-spa's perspective, this is just another registered app —
 *       it doesn't know or care that the code was loaded via Module Federation
 *
 * COMPARE TO THE OTHER APPROACHES:
 *
 *   Pure Single-Spa (Single-Spa/app-react-home/src/app-name.js):
 *     - Exports lifecycle hooks using single-spa-react ← SAME
 *     - Loaded via SystemJS: System.import('app-react-home') ← DIFFERENT
 *     - Output format: SystemJS module (libraryTarget: 'system') ← DIFFERENT
 *
 *   Pure Module Federation (ModuleFederation/remote-products/src/ProductList.js):
 *     - Exports a React COMPONENT (not lifecycle hooks) ← DIFFERENT
 *     - Loaded via MF: import('remoteProducts/ProductList') ← SAME mechanism
 *     - No single-spa involvement — just a component ← DIFFERENT
 *
 *   Hybrid (THIS FILE):
 *     - Exports lifecycle hooks using single-spa-react ← SAME as Single-Spa
 *     - Loaded via MF: import('mfHome/singleSpaEntry') ← SAME as Module Fed
 *     - Combines both: MF loading + single-spa lifecycle ← THE HYBRID MAGIC
 *
 * INTERVIEW INSIGHT: "How does a Hybrid micro frontend work?"
 * Answer: "Each micro frontend exposes a single-spa lifecycle module via
 * Module Federation's `exposes` config. The module uses single-spa-react to
 * wrap a React component with bootstrap/mount/unmount hooks. The shell's
 * mf-loader bridge loads this module via MF's dynamic import and passes the
 * lifecycle hooks to single-spa's registerApplication(). Module Federation
 * handles the code loading and dependency sharing; single-spa handles the
 * lifecycle orchestration and routing."
 *
 * ============================================================================
 */

import React from 'react';
import ReactDOM from 'react-dom';
import singleSpaReact from 'single-spa-react';
import App from './App';

/**
 * ============================================================================
 * CREATING LIFECYCLE HOOKS WITH single-spa-react
 * ============================================================================
 *
 * CODE ANNOTATION: This is identical to the pure Single-Spa approach
 * --------------------------------------------------------------------
 * The singleSpaReact() call here is the SAME as in:
 *   Single-Spa/app-react-home/src/app-name.js
 *
 * It takes a configuration object and returns { bootstrap, mount, unmount }.
 * The lifecycle hooks handle all the React-specific plumbing:
 *   - mount(): Creates a React root and renders <App /> into the DOM container
 *   - unmount(): Unmounts the React component tree, cleaning up the DOM
 *   - bootstrap(): One-time initialization (minimal for React apps)
 *
 * THE HYBRID TWIST:
 * In pure Single-Spa, this file IS the webpack entry point. The entire
 * micro frontend is built around this file.
 *
 * In the Hybrid approach, this file is an EXPOSED MODULE — one of potentially
 * many modules this remote could expose. The webpack entry point is index.js
 * (for standalone mode). This file is only loaded when the shell requests it
 * via Module Federation.
 *
 * This means you could expose BOTH lifecycle hooks AND individual components:
 *   exposes: {
 *     './singleSpaEntry': './src/single-spa-entry',  // For shell orchestration
 *     './HomeWidget': './src/components/HomeWidget',  // For direct component use
 *   }
 *
 * The shell could use the lifecycle entry for full-page routing, and other
 * micro frontends could import individual components for embedding. This
 * flexibility is unique to the Hybrid approach.
 */
const lifecycles = singleSpaReact({
  React,
  ReactDOM,

  /**
   * CODE ANNOTATION: rootComponent — the React component to render
   * ----------------------------------------------------------------
   * This is the same App component used in standalone mode (bootstrap.js).
   * Whether the app runs standalone or integrated, the SAME component renders.
   *
   * The difference is WHO controls the rendering:
   *   - Standalone: ReactDOM.createRoot() in bootstrap.js
   *   - Integrated: single-spa-react's mount() hook (which calls ReactDOM internally)
   */
  rootComponent: App,

  /**
   * CODE ANNOTATION: errorBoundary — resilience at the micro frontend level
   * -------------------------------------------------------------------------
   * If the App component throws during rendering, this error boundary catches
   * it and displays a fallback UI. This prevents one micro frontend's error
   * from crashing the entire Hybrid shell.
   *
   * ERROR HANDLING IN THE HYBRID APPROACH — THREE LAYERS:
   *
   *   Layer 1: This errorBoundary (component-level)
   *     Catches React rendering errors inside this micro frontend.
   *     The user sees a friendly error message instead of a blank screen.
   *
   *   Layer 2: single-spa's addErrorHandler (orchestration-level)
   *     Catches lifecycle hook failures (mount/unmount throwing errors).
   *     Defined in the shell's bootstrap.js. Logs errors and does emergency
   *     DOM cleanup.
   *
   *   Layer 3: Module Federation loading failures (loading-level)
   *     If remoteEntry.js can't be fetched (remote is down), the mf-loader
   *     bridge's Promise rejects. Single-Spa catches this and fires the
   *     error handler from Layer 2.
   *
   * COMPARE TO PURE MODULE FEDERATION:
   * In the pure MF approach, you'd use React Error Boundaries + Suspense
   * to handle loading and rendering failures. In the Hybrid approach,
   * single-spa adds an additional orchestration-level error handling layer
   * that catches failures BEFORE React is even involved.
   */
  errorBoundary(err, info, props) {
    return (
      <div style={{ padding: '2rem', color: '#c62828' }}>
        <h2>⚠️ Home App Error</h2>
        <p>The Home micro frontend encountered an error and couldn't render.</p>
        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
          This error was caught by the single-spa-react error boundary.
          In the Hybrid approach, this is Layer 1 of three error handling layers.
        </p>
        <pre style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>
          {err.message}
        </pre>
      </div>
    );
  },
});

/**
 * ============================================================================
 * EXPORTED LIFECYCLE HOOKS — The single-spa contract
 * ============================================================================
 *
 * CODE ANNOTATION: These exports are the INTERFACE between this micro frontend
 * and the Hybrid shell's single-spa orchestrator.
 *
 * The shell's mf-loader does:
 *   const module = await import('mfHome/singleSpaEntry');
 *   return module; // { bootstrap, mount, unmount }
 *
 * Single-Spa then calls these hooks at the appropriate times:
 *
 *   [URL matches /home for the first time]
 *     → bootstrap() — one-time initialization
 *     → mount() — render React component into DOM
 *
 *   [URL changes away from /home]
 *     → unmount() — remove React component, clean up DOM
 *
 *   [URL matches /home again]
 *     → mount() — re-render (bootstrap is NOT called again)
 *
 *   [URL changes away again]
 *     → unmount() — clean up again
 *
 * This is the EXACT SAME lifecycle flow as pure Single-Spa. The only
 * difference is how the module was loaded (MF instead of SystemJS).
 *
 * ============================================================================
 */

/**
 * CODE ANNOTATION: bootstrap — one-time initialization
 * ------------------------------------------------------
 * Called ONCE, the very first time this micro frontend is activated.
 * In the Hybrid approach, this happens after Module Federation has loaded
 * the singleSpaEntry module and single-spa decides to activate the app.
 *
 * single-spa-react's bootstrap is minimal — it just resolves a Promise.
 * For a production app, you might add custom bootstrap logic:
 *   - Initialize analytics SDK
 *   - Load configuration from an API
 *   - Set up WebSocket connections
 */
export const bootstrap = lifecycles.bootstrap;

/**
 * CODE ANNOTATION: mount — render the micro frontend
 * ----------------------------------------------------
 * Called EVERY TIME the URL matches /home (this app's activeWhen).
 *
 * What single-spa-react does inside mount():
 *   1. Finds or creates the DOM container (from customProps.domElement)
 *   2. Creates a React root (React 18) or calls ReactDOM.render (React 17)
 *   3. Renders <App {...singleSpaProps} /> into the container
 *
 * In the Hybrid approach, the DOM container is #micro-frontend-container
 * in the shell's HTML. This is the same container used by ALL micro
 * frontends — single-spa ensures only one app is mounted at a time.
 */
export const mount = lifecycles.mount;

/**
 * CODE ANNOTATION: unmount — clean up the micro frontend
 * --------------------------------------------------------
 * Called EVERY TIME the URL stops matching /home (user navigated away).
 *
 * What single-spa-react does inside unmount():
 *   1. Calls root.unmount() (React 18) to remove the component tree
 *   2. All React cleanup runs: useEffect cleanups, event listener removal, etc.
 *   3. The DOM container is left empty (no child elements)
 *
 * DOM CLEANUP IS CRITICAL in the Hybrid approach because multiple micro
 * frontends share the same container. If unmount doesn't clean up properly,
 * the next micro frontend mounts into a dirty container, causing:
 *   - Visual glitches (old content visible behind new content)
 *   - Memory leaks (old event listeners still firing)
 *   - React errors (conflicting React roots in the same container)
 *
 * The shell's bootstrap.js has a DOM cleanup verification listener that
 * logs warnings if residual DOM nodes are detected after unmount.
 */
export const unmount = lifecycles.unmount;
