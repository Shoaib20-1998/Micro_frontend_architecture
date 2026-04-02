/**
 * ============================================================================
 * SINGLE-SPA ENTRY — HYBRID SETTINGS LIFECYCLE HOOKS
 * ============================================================================
 *
 * CODE ANNOTATION: This file is the SAME PATTERN as mf-home's single-spa-entry.js
 * ----------------------------------------------------------------------------------
 * Compare this file to Hybrid/mf-home/src/single-spa-entry.js. The structure
 * is identical:
 *   1. Import React, ReactDOM, singleSpaReact, and the App component
 *   2. Create lifecycle hooks with singleSpaReact({ rootComponent: App })
 *   3. Export { bootstrap, mount, unmount }
 *
 * The ONLY differences are:
 *   - The imported App component (Settings UI instead of Home UI)
 *   - The error boundary text (says "Settings" instead of "Home")
 *
 * SCALING OBSERVATION — The single-spa-entry.js is BOILERPLATE:
 * Every hybrid micro frontend has an almost-identical single-spa-entry.js.
 * The pattern is so mechanical that some teams generate it automatically:
 *
 *   // Hypothetical generator
 *   function createSingleSpaEntry(appName, AppComponent) {
 *     return singleSpaReact({
 *       React, ReactDOM,
 *       rootComponent: AppComponent,
 *       errorBoundary: (err) => <ErrorFallback appName={appName} error={err} />
 *     });
 *   }
 *
 * In a production codebase with 10+ micro frontends, you'd likely extract
 * this into a shared utility package to eliminate the copy-paste.
 *
 * THIS FILE IS EXPOSED VIA MODULE FEDERATION:
 *   webpack.config.js → exposes: { './singleSpaEntry': './src/single-spa-entry' }
 *
 * AND CONSUMED BY THE SHELL'S MF-LOADER:
 *   import('mfSettings/singleSpaEntry') → returns { bootstrap, mount, unmount }
 *
 * The shell's mf-loader.js uses the SAME import pattern for every hybrid MF:
 *   import(`${remoteName}/singleSpaEntry`)
 *
 * Because every hybrid MF exposes the same key ('./singleSpaEntry') and
 * exports the same interface ({ bootstrap, mount, unmount }), the mf-loader
 * is completely generic. It doesn't need any MF-specific logic.
 *
 * INTERVIEW INSIGHT: "What makes the Hybrid pattern scalable?"
 * Answer: "Every micro frontend follows the same template: expose a
 * single-spa lifecycle module via Module Federation. The shell's mf-loader
 * bridge is generic — it loads any remote's './singleSpaEntry' module and
 * passes the lifecycle hooks to single-spa. Adding a new MF doesn't require
 * changes to the bridge, the shared config, or any existing MF. Teams can
 * develop, deploy, and iterate independently."
 *
 * ============================================================================
 */

import React from 'react';
import ReactDOM from 'react-dom';
import singleSpaReact from 'single-spa-react';
import App from './App';

/**
 * ============================================================================
 * CREATING LIFECYCLE HOOKS — Same singleSpaReact() pattern as mf-home
 * ============================================================================
 *
 * CODE ANNOTATION: Spot the pattern
 * ------------------------------------
 * This singleSpaReact() call is structurally identical to mf-home's.
 * The configuration object has the same shape:
 *   { React, ReactDOM, rootComponent, errorBoundary }
 *
 * The only thing that changes per MF is:
 *   - rootComponent: which App component to render
 *   - errorBoundary: which error message to show
 *
 * Everything else — the React/ReactDOM references, the lifecycle hook
 * generation, the DOM container management — is handled by single-spa-react
 * identically for every micro frontend.
 */
const lifecycles = singleSpaReact({
  React,
  ReactDOM,

  /**
   * rootComponent — the Settings React component
   * -----------------------------------------------
   * Same pattern as mf-home: the App component is used in both standalone
   * and integrated modes. The component doesn't know which mode it's in.
   */
  rootComponent: App,

  /**
   * errorBoundary — resilience for the Settings micro frontend
   * ------------------------------------------------------------
   * Same three-layer error handling as mf-home:
   *   Layer 1: This errorBoundary (component-level rendering errors)
   *   Layer 2: single-spa's addErrorHandler (lifecycle hook failures)
   *   Layer 3: Module Federation loading failures (remote unavailable)
   *
   * Each hybrid MF gets its own error boundary with MF-specific messaging.
   * This helps users and developers identify WHICH micro frontend failed,
   * which is critical in a multi-MF architecture.
   */
  errorBoundary(err, info, props) {
    return (
      <div style={{ padding: '2rem', color: '#c62828' }}>
        <h2>⚠️ Settings App Error</h2>
        <p>The Settings micro frontend encountered an error and couldn't render.</p>
        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
          This error was caught by the single-spa-react error boundary.
          In a multi-MF Hybrid setup, each MF has its own error boundary so
          one MF's failure doesn't crash the others.
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
 * EXPORTED LIFECYCLE HOOKS — Same contract as every hybrid MF
 * ============================================================================
 *
 * CODE ANNOTATION: The single-spa lifecycle contract is UNIVERSAL
 * -----------------------------------------------------------------
 * These three exports are the SAME interface that mf-home exports, that
 * pure Single-Spa apps export, and that any future hybrid MF will export.
 *
 * The shell's mf-loader does:
 *   const module = await import('mfSettings/singleSpaEntry');
 *   return module; // { bootstrap, mount, unmount }
 *
 * Single-Spa then manages the lifecycle:
 *
 *   [URL matches /settings for the first time]
 *     → bootstrap() — one-time initialization
 *     → mount() — render Settings component into #micro-frontend-container
 *
 *   [URL changes away from /settings]
 *     → unmount() — remove Settings component, clean up DOM
 *
 *   [URL matches /settings again]
 *     → mount() — re-render (bootstrap NOT called again)
 *
 * This is the EXACT SAME flow as mf-home. The lifecycle management is
 * completely generic — single-spa doesn't know or care whether it's
 * managing a Home page or a Settings page. It just calls the hooks.
 *
 * ============================================================================
 */

/**
 * bootstrap — one-time initialization
 * Called ONCE, the first time the user navigates to /settings.
 */
export const bootstrap = lifecycles.bootstrap;

/**
 * mount — render the Settings micro frontend
 * Called EVERY TIME the URL matches /settings.
 * single-spa-react creates a React root and renders <App /> into the
 * shell's #micro-frontend-container.
 */
export const mount = lifecycles.mount;

/**
 * unmount — clean up the Settings micro frontend
 * Called EVERY TIME the user navigates away from /settings.
 * single-spa-react unmounts the React component tree, leaving the
 * DOM container empty for the next micro frontend to use.
 */
export const unmount = lifecycles.unmount;
