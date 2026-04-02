/**
 * ============================================================================
 * HYBRID SHELL — BOOTSTRAP (The Real Entry Point)
 * ============================================================================
 *
 * CODE ANNOTATION: What happens here
 * ------------------------------------
 * This is where the Hybrid approach comes together. We:
 *   1. Import single-spa's registration and start APIs
 *   2. Import our mf-loader bridge (the glue between Single-Spa and MF)
 *   3. Register each micro frontend using single-spa's registerApplication()
 *      but with the MF loader as the `app` function
 *   4. Call start() to kick off single-spa's routing engine
 *
 * By the time this file executes, Module Federation's shared dependency
 * negotiation has already completed (thanks to the async boundary in index.js).
 * That means:
 *   - `single-spa` is the shared singleton version
 *   - `react` and `react-dom` are the shared singleton versions
 *   - Remote container entry points (remoteEntry.js) are available for loading
 *
 * COMPARE TO PURE SINGLE-SPA (Single-Spa/root-config/src/index.js):
 * The registration pattern is almost identical! The only difference is HOW
 * we load the micro frontend code:
 *
 *   Pure Single-Spa:  app: () => System.import('app-react-home')
 *   Hybrid:           app: loadMFApp('mfHome', 'singleSpaEntry')
 *
 * System.import() uses SystemJS + import maps to resolve the module URL.
 * loadMFApp() uses Module Federation's dynamic import to load from a remote
 * container. The result is the same: a module with { bootstrap, mount, unmount }.
 *
 * ============================================================================
 */

import { registerApplication, start, addErrorHandler } from 'single-spa';
import { loadMFApp } from './mf-loader';

/**
 * ============================================================================
 * MICRO FRONTEND REGISTRATION — Using the MF Loader Bridge
 * ============================================================================
 *
 * CODE ANNOTATION: The registerApplication() API
 * ------------------------------------------------
 * This is the same single-spa API used in the pure Single-Spa approach.
 * The parameters are identical:
 *
 *   name:       Unique identifier for this micro frontend
 *   app:        Function that returns a Promise resolving to lifecycle hooks
 *   activeWhen: URL paths that activate this micro frontend
 *   customProps: Data passed to lifecycle hooks (optional)
 *
 * THE HYBRID TWIST:
 * Instead of `app: () => System.import('app-name')`, we use:
 *   `app: loadMFApp('remoteName', 'modulePath')`
 *
 * loadMFApp() returns a function that:
 *   1. Uses Module Federation's import() to load the remote module
 *   2. The remote module exports { bootstrap, mount, unmount }
 *   3. Single-Spa receives these lifecycle hooks and manages them as usual
 *
 * This is the bridge pattern — Single-Spa doesn't know or care that the code
 * came from Module Federation. It just sees lifecycle hooks. And Module
 * Federation doesn't know or care that Single-Spa is managing the lifecycle.
 * It just loads code. Each tool does what it's best at.
 */

/**
 * CODE ANNOTATION: Micro Frontend 1 — Home
 * ------------------------------------------
 * Loaded from the mfHome remote (http://localhost:4001).
 * The remote exposes a './singleSpaEntry' module that exports single-spa
 * lifecycle hooks wrapping a React component.
 *
 * When the user navigates to /home:
 *   1. Single-Spa sees that activeWhen matches
 *   2. Single-Spa calls the `app` function (our loadMFApp bridge)
 *   3. loadMFApp does: import('mfHome/singleSpaEntry')
 *   4. Module Federation fetches remoteEntry.js from localhost:4001
 *   5. Module Federation loads the singleSpaEntry module from the remote
 *   6. The module returns { bootstrap, mount, unmount }
 *   7. Single-Spa calls bootstrap() then mount()
 *   8. The React component renders into the DOM container
 *
 * When the user navigates AWAY from /home:
 *   1. Single-Spa calls unmount()
 *   2. React unmounts the component, cleaning up the DOM
 *   3. The micro frontend stays in memory (bootstrapped) for fast re-mount
 */
registerApplication({
  name: 'mf-home',
  app: loadMFApp('mfHome', 'singleSpaEntry'),
  activeWhen: ['/home'],
  customProps: {
    domElement: '#micro-frontend-container',
  },
});

/**
 * CODE ANNOTATION: Micro Frontend 2 — Settings
 * -----------------------------------------------
 * Same pattern as Home, but loaded from the mfSettings remote (port 4002).
 * Activates on /settings.
 *
 * This second registration demonstrates that the Hybrid pattern scales
 * cleanly — adding a new micro frontend is just one more registerApplication()
 * call with a loadMFApp() bridge. The remote team deploys independently,
 * exposes their singleSpaEntry module, and the shell picks it up.
 *
 * INTERVIEW INSIGHT: "How do you add a new micro frontend in the Hybrid setup?"
 * Answer: Three steps:
 *   1. The remote team creates their app with ModuleFederationPlugin exposing
 *      a singleSpaEntry module (with lifecycle hooks)
 *   2. The shell adds the remote to webpack.config.js `remotes` config
 *   3. The shell adds a registerApplication() call with loadMFApp()
 * Steps 2 and 3 require a shell redeploy. In a more advanced setup, you could
 * make this dynamic by fetching the remote registry from an API.
 */
registerApplication({
  name: 'mf-settings',
  app: loadMFApp('mfSettings', 'singleSpaEntry'),
  activeWhen: ['/settings'],
  customProps: {
    domElement: '#micro-frontend-container',
  },
});

/**
 * CODE ANNOTATION: start() — Kick off single-spa's routing engine
 * -----------------------------------------------------------------
 * Same as in the pure Single-Spa approach. This tells single-spa to:
 *   1. Evaluate the current URL
 *   2. Determine which registered apps should be active
 *   3. Load, bootstrap, and mount the active apps
 *   4. Start listening for URL changes
 *
 * MUST be called AFTER all registerApplication() calls.
 */
start();

/**
 * CODE ANNOTATION: Global error handler
 * ---------------------------------------
 * Single-Spa's addErrorHandler catches errors thrown by lifecycle hooks.
 * This is especially important in the Hybrid approach because errors can
 * come from TWO sources:
 *
 *   1. Module Federation loading failures — the remote is down, network error,
 *      or the remote's remoteEntry.js is unavailable
 *   2. Lifecycle hook failures — the micro frontend's mount() or unmount()
 *      throws an error (React rendering error, missing DOM container, etc.)
 *
 * In the pure Module Federation approach, you'd use React Error Boundaries
 * to catch loading failures. In the Hybrid approach, single-spa's error
 * handler catches them at the orchestration level — before React even gets
 * involved. This gives you a centralized place to handle ALL micro frontend
 * failures, regardless of the cause.
 */
addErrorHandler(function (error) {
  /**
   * CODE ANNOTATION: Error object structure in the Hybrid approach
   * ---------------------------------------------------------------
   * Single-spa's error object includes:
   *   - error.appOrParcelName: Which micro frontend threw the error
   *   - error.message: The error message
   *   - error.stack: Stack trace
   *
   * In the Hybrid approach, errors can come from TWO sources:
   *   1. Module Federation loading failures — the remote is down, network error,
   *      or the remote's remoteEntry.js is unavailable. These surface as
   *      "Loading error" from single-spa because the app loading function
   *      (our loadMFApp bridge) rejected its Promise.
   *   2. Lifecycle hook failures — the micro frontend's mount() or unmount()
   *      threw an error (React rendering error, missing DOM container, etc.)
   *
   * COMPARE TO PURE MODULE FEDERATION:
   * In the pure MF approach, loading failures are caught by React Error
   * Boundaries at the component level. In the Hybrid approach, single-spa
   * catches them at the orchestration level — BEFORE React even gets involved.
   * This gives you centralized error handling for ALL micro frontend failures.
   */
  console.error(
    '[Hybrid Shell Error] Lifecycle error in app "' +
    error.appOrParcelName + '": ' + error.message
  );

  /**
   * CODE ANNOTATION: Emergency DOM cleanup on error
   * -------------------------------------------------
   * If a lifecycle hook (especially unmount) fails, the container may
   * be in a dirty state. We perform emergency cleanup to prevent the
   * next app from mounting into a polluted container.
   *
   * This is the same pattern used in the pure Single-Spa root-config
   * (see Single-Spa/root-config/src/index.js). The Hybrid approach
   * inherits this need because single-spa still manages the DOM lifecycle.
   */
  const errorContainer = document.getElementById('micro-frontend-container');
  if (errorContainer && errorContainer.childNodes.length > 0) {
    console.warn(
      '[Emergency Cleanup] Clearing container after lifecycle error in "' +
      error.appOrParcelName + '"'
    );
    errorContainer.innerHTML = '';
  }
});

/**
 * ============================================================================
 * DOM CLEANUP VERIFICATION — Ensuring micro frontends leave no residual markup
 * ============================================================================
 *
 * CODE ANNOTATION: Why DOM cleanup matters in the Hybrid approach
 * ----------------------------------------------------------------
 * This is the same DOM cleanup verification used in the pure Single-Spa
 * root-config (see Single-Spa/root-config/src/index.js), and it's equally
 * important here. When single-spa unmounts a micro frontend, the app's
 * unmount() lifecycle hook must remove all DOM elements it created.
 *
 * In the Hybrid approach, the micro frontends are loaded via Module Federation
 * but their lifecycle is managed by single-spa. The unmount behavior is
 * identical to pure Single-Spa — single-spa-react calls root.unmount()
 * (React 18) to clean up the DOM.
 *
 * We listen to 'single-spa:before-mount-routing-event' because it fires
 * at the perfect moment for verification:
 *   - All unmounts have COMPLETED (old apps have cleaned up)
 *   - No mounts have STARTED yet (new apps haven't rendered)
 *   - The container SHOULD be empty at this exact moment
 *
 * INTERVIEW INSIGHT: "How do you ensure DOM cleanup in a Hybrid micro frontend?"
 * Answer: Three layers:
 *   1. single-spa-react handles cleanup automatically via React's unmount API
 *   2. Runtime verification (this code) logs warnings if cleanup fails
 *   3. Emergency cleanup in the error handler clears the container on failures
 */
globalThis.addEventListener('single-spa:before-mount-routing-event', function () {
  const container = document.getElementById('micro-frontend-container');

  if (container && container.childNodes.length > 0) {
    console.warn(
      '[DOM Cleanup Verification] WARNING: The micro-frontend container ' +
      'has residual DOM nodes after unmount. This indicates a micro frontend ' +
      'did not properly clean up during its unmount() lifecycle hook.\n' +
      'Residual child node count: ' + container.childNodes.length + '\n' +
      'Residual innerHTML: ' + container.innerHTML.substring(0, 200)
    );

    /**
     * CODE ANNOTATION: Forced cleanup as a safety net
     * -------------------------------------------------
     * In development, we forcibly clear the container to prevent cascading
     * issues. The warning above should be investigated and fixed.
     *
     * Note: The initial welcome message in the HTML template will also
     * trigger this on the first navigation. In a production setup, you'd
     * want to distinguish between "expected initial content" and "residual
     * micro frontend DOM". For this learning example, we keep it simple.
     */
    container.innerHTML = '';
  }
});
