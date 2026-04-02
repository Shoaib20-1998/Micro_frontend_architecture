/**
 * ============================================================================
 * MF-LOADER — THE BRIDGE BETWEEN SINGLE-SPA AND MODULE FEDERATION
 * ============================================================================
 *
 * CODE ANNOTATION: What is this file?
 * -------------------------------------
 * This is the KEY innovation of the Hybrid approach. It's a bridge function
 * that connects two systems that don't know about each other:
 *
 *   SINGLE-SPA expects: a function that returns a Promise resolving to
 *     { bootstrap, mount, unmount } — the lifecycle hooks it needs to
 *     manage a micro frontend's lifecycle.
 *
 *   MODULE FEDERATION provides: a way to dynamically import modules from
 *     remote webpack containers at runtime via import('remoteName/modulePath').
 *
 * The mf-loader bridges these by:
 *   1. Taking a remote name and module path as parameters
 *   2. Returning a function that single-spa can call when it's time to load
 *   3. That function uses Module Federation's import() to load the remote module
 *   4. The remote module exports { bootstrap, mount, unmount }
 *   5. Single-Spa receives the lifecycle hooks and manages them as usual
 *
 * VISUAL FLOW:
 *
 *   URL changes
 *     → single-spa evaluates activeWhen
 *     → single-spa calls the `app` function
 *     → loadMFApp() is called
 *       → import('mfHome/singleSpaEntry')
 *         → Module Federation fetches remoteEntry.js (if not cached)
 *         → Module Federation loads the singleSpaEntry module
 *         → Module returns { bootstrap, mount, unmount }
 *     → single-spa receives lifecycle hooks
 *     → single-spa calls bootstrap() then mount()
 *     → React component renders
 *
 * WHY THIS BRIDGE IS NECESSARY:
 *
 *   Without it, you'd have to choose ONE approach:
 *     - Single-Spa alone: Uses SystemJS for loading. No dependency sharing.
 *     - Module Federation alone: No lifecycle management. No clean mount/unmount.
 *
 *   With the bridge, you get BOTH:
 *     - Single-Spa's lifecycle management (clean mount/unmount, error handling)
 *     - Module Federation's code loading (dependency sharing, no import maps)
 *
 * COMPARE TO PURE SINGLE-SPA:
 *   In Single-Spa/root-config/src/index.js, the app loading function is:
 *     app: () => System.import('app-react-home')
 *
 *   System.import() uses SystemJS + import maps to resolve the URL and load
 *   the module. The module must be a SystemJS module (libraryTarget: 'system').
 *
 *   In the Hybrid approach, the app loading function is:
 *     app: loadMFApp('mfHome', 'singleSpaEntry')
 *
 *   loadMFApp() uses Module Federation's import() to load from a remote
 *   container. The module is a standard webpack module — no SystemJS needed.
 *
 * COMPARE TO PURE MODULE FEDERATION:
 *   In ModuleFederation/host-app/src/App.js, remote components are loaded with:
 *     const RemoteComponent = React.lazy(() => import('remoteProducts/ProductList'))
 *
 *   This loads a React COMPONENT, not lifecycle hooks. There's no mount/unmount
 *   management — React just renders the component when it's in the JSX tree.
 *
 *   In the Hybrid approach, the remote module exports lifecycle hooks that
 *   WRAP a React component. Single-Spa controls when the component mounts
 *   and unmounts, giving you explicit lifecycle management.
 *
 * INTERVIEW INSIGHT: "How does the Hybrid approach connect Single-Spa and
 * Module Federation?"
 * Answer: "Through a bridge function (mf-loader) that uses Module Federation's
 * dynamic import to load remote modules, and returns the result to single-spa
 * as lifecycle hooks. Single-Spa handles orchestration and routing; Module
 * Federation handles code loading and dependency sharing. The bridge is the
 * thin adapter layer that makes them work together."
 *
 * ============================================================================
 */

/**
 * loadMFApp — Load a Module Federation remote as a single-spa application
 *
 * @param {string} remoteName  — The name of the MF remote container, as declared
 *                                in the shell's webpack.config.js `remotes` config.
 *                                Example: 'mfHome' (maps to mfHome@http://localhost:4001/remoteEntry.js)
 *
 * @param {string} modulePath  — The module exposed by the remote, as declared in
 *                                the remote's webpack.config.js `exposes` config.
 *                                Example: 'singleSpaEntry' (maps to './singleSpaEntry' in exposes)
 *                                Note: we omit the './' prefix here — it's added internally.
 *
 * @returns {Function} A function that single-spa will call when it's time to load
 *                     the micro frontend. The function returns a Promise that resolves
 *                     to { bootstrap, mount, unmount } — the lifecycle hooks single-spa needs.
 *
 * CODE ANNOTATION: Why return a function instead of a Promise directly?
 * ----------------------------------------------------------------------
 * Single-Spa's registerApplication() expects the `app` parameter to be either:
 *   a) A function that returns a Promise (lazy loading — load on first activation)
 *   b) A Promise directly (eager loading — load immediately)
 *
 * We use option (a) because we want LAZY loading. The micro frontend's code
 * should only be fetched when the user navigates to its route. If we returned
 * a Promise directly, ALL micro frontends would start loading immediately on
 * page load, even if the user never visits their routes.
 *
 * This is the same pattern used in pure Single-Spa:
 *   app: () => System.import('app-name')  // function that returns a Promise
 *
 * CODE ANNOTATION: Error handling in the bridge
 * -----------------------------------------------
 * If the Module Federation import fails (remote is down, network error, etc.),
 * the Promise rejects. Single-Spa catches this rejection and:
 *   1. Fires the error to any registered error handlers (addErrorHandler)
 *   2. Puts the app in a LOAD_ERROR state
 *   3. Does NOT crash the entire shell — other micro frontends keep working
 *
 * This is a significant advantage over pure Module Federation, where a failed
 * import would need to be caught by React Error Boundaries at the component
 * level. In the Hybrid approach, single-spa catches it at the orchestration
 * level, giving you centralized error handling.
 */
export function loadMFApp(remoteName, modulePath) {
  return async () => {
    let module;
    if (remoteName === 'mfHome') {
      module = await import('mfHome/singleSpaEntry');
    } else if (remoteName === 'mfSettings') {
      module = await import('mfSettings/singleSpaEntry');
    } else {
      throw new Error(`Unknown remote: ${remoteName}`);
    }
    return module;
  };
}
