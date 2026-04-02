/**
 * =============================================================================
 * SHELL-LEVEL ROUTING — Routing Strategy #1
 * =============================================================================
 *
 * Pattern: The shell (container app) owns ALL top-level routes and decides
 * which micro frontend to render based on the URL path.
 *
 * WHY THIS PATTERN?
 * -----------------
 * Shell-level routing is the most common routing strategy in micro frontend
 * architectures. The shell acts as a centralized router — it inspects the URL,
 * determines which micro frontend should be active, and mounts/unmounts
 * accordingly. Individual micro frontends have NO knowledge of the URL and
 * NO ability to change which MF is displayed.
 *
 * This is exactly how Single-Spa works in this project. Look at:
 *   Single-Spa/root-config/src/index.js — registerApplication() with activeWhen
 *   Hybrid/shell/src/bootstrap.js — same pattern, but loading via Module Federation
 *
 * The shell is the single source of truth for "which MF is on screen right now."
 *
 * COUPLING ANALYSIS:
 * ------------------
 * - Coupling level: CENTRALIZED (shell knows about all MFs)
 * - The shell must know every micro frontend's route prefix at registration time.
 * - Micro frontends are decoupled from each other — they don't know about
 *   sibling MFs or their routes.
 * - Trade-off: adding a new MF requires updating the shell's route config.
 *   In production, this is often mitigated by fetching the route registry
 *   from an API instead of hardcoding it.
 *
 * REAL-WORLD EXAMPLES:
 * --------------------
 * - Single-Spa's registerApplication() with activeWhen (this project)
 * - Qiankun (Alibaba's micro frontend framework) — shell registers routes
 * - Luigi (SAP's micro frontend framework) — centralized route config
 *
 * WHEN TO USE:
 * ------------
 * ✅ You want a single, predictable URL structure across all MFs
 * ✅ The shell team controls the overall navigation experience
 * ✅ Deep linking must work consistently (shell owns the URL contract)
 * ✅ You need centralized access control (shell can gate routes by auth)
 * ⚠️  Adding new MFs requires a shell deployment (unless using dynamic registry)
 * ⚠️  Shell becomes a coordination bottleneck for route changes
 * ❌ Not ideal when teams need full autonomy over their URL structure
 *
 * =============================================================================
 */

// =============================================================================
// IMPLEMENTATION — A framework-agnostic shell-level router
// =============================================================================

/**
 * ShellRouter — A minimal shell-level router for micro frontends.
 *
 * DESIGN DECISIONS:
 * -----------------
 * 1. Framework-agnostic: Uses vanilla JS and the History API. No React Router,
 *    no Vue Router — the shell router is infrastructure, not UI framework code.
 *
 * 2. Path-prefix matching: Routes are matched by URL path prefix (e.g., '/products'
 *    matches '/products', '/products/123', '/products/123/reviews'). This gives
 *    each MF a "namespace" in the URL space. This is the same strategy Single-Spa
 *    uses with its activeWhen parameter.
 *
 * 3. Mount/unmount lifecycle: Each registered MF provides mount() and unmount()
 *    functions. The router calls these when activating/deactivating MFs. This
 *    mirrors Single-Spa's lifecycle hooks (see Single-Spa/app-react-home/src/app-name.js).
 *
 * 4. Only one MF active at a time: This is the simplest model and the most common.
 *    Single-Spa supports multiple simultaneous MFs (overlapping activeWhen), but
 *    for shell-level routing, one-at-a-time is the standard pattern.
 *
 * HOW THIS MAPS TO SINGLE-SPA:
 * -----------------------------
 *   ShellRouter.register()  →  registerApplication({ activeWhen, app })
 *   ShellRouter.navigate()  →  navigateToUrl() or pushState + popstate
 *   ShellRouter.start()     →  start()
 *   mount/unmount callbacks →  lifecycle hooks (bootstrap, mount, unmount)
 */
class ShellRouter {
  constructor(containerSelector) {
    /**
     * ANNOTATION: Container element
     * ------------------------------
     * The shell provides a single DOM container where the active MF renders.
     * This is the same pattern as Single-Spa's domElement customProp:
     *   customProps: { domElement: '#micro-frontend-container' }
     *
     * The shell owns this container. MFs render INTO it but don't create it.
     * This separation is important — the shell controls the page layout,
     * and MFs fill designated slots within that layout.
     */
    this._containerSelector = containerSelector;
    this._routes = [];
    this._activeMF = null;
  }

  /**
   * Register a micro frontend with a route prefix.
   *
   * WHY PATH PREFIX (not exact match)?
   * -----------------------------------
   * Prefix matching means '/products' activates the Products MF for ALL URLs
   * starting with '/products' — including '/products/123' and '/products/123/edit'.
   * The MF can then handle sub-routing internally (though in shell-level routing,
   * the MF typically doesn't have its own router).
   *
   * This is exactly how Single-Spa's activeWhen works:
   *   activeWhen: ['/products']  // matches /products, /products/123, etc.
   *
   * @param {string} pathPrefix - URL prefix that activates this MF (e.g., '/products')
   * @param {Object} microFrontend - Object with mount(container) and unmount(container) methods
   * @param {string} microFrontend.name - Unique identifier for this MF
   * @param {Function} microFrontend.mount - Called when the MF should render into the container
   * @param {Function} microFrontend.unmount - Called when the MF should clean up and remove its DOM
   */
  register(pathPrefix, microFrontend) {
    /**
     * ANNOTATION: Validation
     * -----------------------
     * In production, you'd validate that:
     * - No two MFs share the same prefix (ambiguous routing)
     * - The MF object has the required mount/unmount functions
     * - The prefix starts with '/' (convention)
     *
     * Single-Spa does similar validation internally and throws descriptive
     * errors if the registration is invalid.
     */
    if (typeof microFrontend.mount !== 'function' || typeof microFrontend.unmount !== 'function') {
      throw new Error(
        `ShellRouter: MF "${microFrontend.name}" must provide mount() and unmount() functions.`
      );
    }

    this._routes.push({
      pathPrefix,
      microFrontend,
    });
  }

  /**
   * Start the router — evaluate the current URL and listen for changes.
   *
   * HOW THIS MAPS TO SINGLE-SPA:
   * This is equivalent to calling start() in Single-Spa's root config.
   * It does two things:
   *   1. Evaluate the current URL and mount the matching MF
   *   2. Listen for future URL changes (popstate events)
   */
  start() {
    /**
     * ANNOTATION: popstate event
     * ---------------------------
     * The browser fires 'popstate' when the user clicks back/forward buttons
     * or when history.back()/history.forward() is called programmatically.
     *
     * IMPORTANT: pushState() and replaceState() do NOT fire popstate.
     * That's why our navigate() method calls _evaluateRoute() manually
     * after pushState(). This is a common gotcha — many developers expect
     * pushState to fire popstate, but it doesn't.
     *
     * Single-Spa handles this by patching pushState and replaceState to
     * fire custom events. We keep it simpler here — navigate() handles it.
     */
    window.addEventListener('popstate', () => {
      this._evaluateRoute();
    });

    // Evaluate the current URL on startup
    this._evaluateRoute();
  }

  /**
   * Programmatic navigation — change the URL and activate the matching MF.
   *
   * WHY pushState (not window.location)?
   * -------------------------------------
   * window.location = '/products' causes a full page reload — the browser
   * fetches the HTML from the server, re-parses everything, and re-executes
   * all JavaScript. This destroys the SPA experience.
   *
   * history.pushState() updates the URL in the address bar WITHOUT a page
   * reload. The browser stays on the same page, and we handle the route
   * change in JavaScript. This is the foundation of all SPA routing.
   *
   * @param {string} path - The URL path to navigate to (e.g., '/products')
   */
  navigate(path) {
    history.pushState(null, '', path);
    this._evaluateRoute();
  }

  /**
   * Core routing logic — match the current URL to a registered MF.
   *
   * THIS IS THE HEART OF SHELL-LEVEL ROUTING:
   * The shell inspects the URL, finds the matching MF, unmounts the current
   * one (if different), and mounts the new one. The MFs themselves have NO
   * say in this process — the shell is in complete control.
   *
   * COMPARE TO APP-LEVEL ROUTING (see app-routing-example.js):
   * In app-level routing, the shell mounts ALL MFs and each one decides
   * internally whether to render based on its own sub-routes. The shell
   * doesn't unmount MFs on route changes — the MFs handle visibility themselves.
   */
  _evaluateRoute() {
    const currentPath = window.location.pathname;
    const container = document.querySelector(this._containerSelector);

    if (!container) {
      console.error(`ShellRouter: Container "${this._containerSelector}" not found in DOM.`);
      return;
    }

    /**
     * ANNOTATION: Route matching — first match wins
     * -----------------------------------------------
     * We iterate through registered routes and pick the first one whose
     * prefix matches the current URL. This means registration ORDER matters
     * if prefixes overlap (e.g., '/products' and '/products/featured').
     *
     * Single-Spa handles this differently — it activates ALL apps whose
     * activeWhen matches, allowing multiple simultaneous MFs. Our simplified
     * router activates only one (the common case for shell-level routing).
     */
    const matchedRoute = this._routes.find((route) =>
      currentPath.startsWith(route.pathPrefix)
    );

    const newMF = matchedRoute ? matchedRoute.microFrontend : null;

    // If the same MF is already active, do nothing (avoid unnecessary unmount/mount)
    if (this._activeMF && newMF && this._activeMF.name === newMF.name) {
      return;
    }

    /**
     * ANNOTATION: Unmount before mount
     * ----------------------------------
     * We ALWAYS unmount the current MF before mounting the new one.
     * This ensures:
     *   1. The container is clean — no residual DOM from the previous MF
     *   2. Event listeners from the old MF are removed
     *   3. The new MF gets a fresh container to render into
     *
     * Single-Spa does the same: it completes ALL unmounts before starting
     * ANY mounts. This is why the 'single-spa:before-mount-routing-event'
     * fires between unmounts and mounts (see Single-Spa/root-config/src/index.js).
     */
    if (this._activeMF) {
      this._activeMF.unmount(container);
      this._activeMF = null;
    }

    if (newMF) {
      newMF.mount(container);
      this._activeMF = newMF;
    }
  }

  /**
   * Returns the currently active micro frontend (useful for debugging/testing).
   * @returns {Object|null} The active MF object, or null if none is active
   */
  getActiveMF() {
    return this._activeMF;
  }
}

// =============================================================================
// USAGE EXAMPLE — How a shell app would use this router
// =============================================================================
//
// This mirrors the structure of Single-Spa/root-config/src/index.js but
// without the Single-Spa framework — pure vanilla JS to show the concept.
//
//   // --- Define micro frontends with mount/unmount lifecycle ---
//
//   const productsMF = {
//     name: 'products',
//     mount(container) {
//       container.innerHTML = '<h1>Products Micro Frontend</h1><p>Browse products...</p>';
//       // In a real app: ReactDOM.render(<ProductsApp />, container);
//     },
//     unmount(container) {
//       container.innerHTML = '';
//       // In a real app: ReactDOM.unmountComponentAtNode(container);
//     },
//   };
//
//   const cartMF = {
//     name: 'cart',
//     mount(container) {
//       container.innerHTML = '<h1>Cart Micro Frontend</h1><p>Your cart items...</p>';
//     },
//     unmount(container) {
//       container.innerHTML = '';
//     },
//   };
//
//   // --- Create the shell router and register MFs ---
//
//   const router = new ShellRouter('#mf-container');
//   router.register('/products', productsMF);
//   router.register('/cart', cartMF);
//   router.start();
//
//   // --- Navigation (from a nav bar click handler) ---
//
//   document.getElementById('nav-products').addEventListener('click', (e) => {
//     e.preventDefault();
//     router.navigate('/products');
//   });
//
//   document.getElementById('nav-cart').addEventListener('click', (e) => {
//     e.preventDefault();
//     router.navigate('/cart');
//   });
//
// KEY OBSERVATION:
// ----------------
// Notice that the micro frontends (productsMF, cartMF) have NO routing logic.
// They don't know what URL activates them. They don't call pushState or listen
// for popstate. The SHELL decides everything. This is the defining characteristic
// of shell-level routing.
//
// COMPARE TO SINGLE-SPA IN THIS PROJECT:
// In Single-Spa/root-config/src/index.js:
//   registerApplication({
//     name: 'app-react-home',
//     app: () => System.import('app-react-home'),
//     activeWhen: ['/home'],           // ← Shell decides the route
//   });
//
// The MF (app-react-home) exports lifecycle hooks but has ZERO routing code.
// The shell's activeWhen determines when it's active. Same concept, same pattern.
//
// =============================================================================

// =============================================================================
// EXPORTS
// =============================================================================

export { ShellRouter };

if (typeof window !== 'undefined') {
  window.MFShellRouter = ShellRouter;
}
