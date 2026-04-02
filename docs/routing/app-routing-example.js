/**
 * =============================================================================
 * APP-LEVEL ROUTING — Routing Strategy #2
 * =============================================================================
 *
 * Pattern: Each micro frontend manages its own internal sub-routes. The shell
 * mounts MFs into designated zones, and each MF runs its own router to handle
 * navigation within its area — without affecting other MFs on the page.
 *
 * WHY THIS PATTERN?
 * -----------------
 * App-level routing gives each micro frontend team FULL AUTONOMY over their
 * URL structure and internal navigation. The shell doesn't need to know about
 * sub-routes like '/products/123/reviews' — it just knows "the Products MF
 * lives in this zone." The Products team decides how to handle everything
 * under their prefix.
 *
 * This is the opposite of shell-level routing (see shell-routing-example.js),
 * where the shell controls all route decisions. Here, the shell delegates
 * routing authority to each MF.
 *
 * COUPLING ANALYSIS:
 * ------------------
 * - Coupling level: DECENTRALIZED (each MF owns its routes)
 * - The shell only knows about top-level zones, not sub-routes.
 * - MFs are fully autonomous — they can add, remove, or restructure their
 *   internal routes without any shell changes.
 * - Trade-off: URL consistency across MFs is harder to enforce. Each team
 *   might use different URL conventions (/products/123 vs /products?id=123).
 * - Trade-off: Deep linking requires each MF to handle its own URL parsing.
 *
 * REAL-WORLD EXAMPLES:
 * --------------------
 * - iframe-based micro frontends (each iframe has its own router)
 * - Module Federation with React Router per remote (each remote has <Routes>)
 * - Web Components with internal routing (each component manages its own views)
 *
 * WHEN TO USE:
 * ------------
 * ✅ Teams need full autonomy over their URL structure and navigation
 * ✅ MFs have complex internal navigation (multi-step wizards, nested views)
 * ✅ Teams use different routing libraries (React Router, Vue Router, etc.)
 * ✅ You want to add new sub-routes without touching the shell
 * ⚠️  URL consistency across MFs requires governance (style guides, not code)
 * ⚠️  Browser back/forward behavior can be confusing if MFs don't coordinate
 * ❌ Not ideal when the shell needs to control the full URL structure
 * ❌ Deep linking across MFs requires careful URL namespace management
 *
 * KEY REQUIREMENT (Requirement 7.3):
 * -----------------------------------
 * "When app-level routing is used, the individual micro frontend SHALL manage
 * its own internal navigation WITHOUT AFFECTING other micro frontends."
 *
 * This is the critical constraint. When the Products MF navigates from
 * /products/list to /products/123, the Cart MF must NOT unmount, re-render,
 * or lose state. Each MF's routing is isolated.
 *
 * =============================================================================
 */

// =============================================================================
// IMPLEMENTATION — App-level routing with isolated MF sub-routers
// =============================================================================

/**
 * MicroFrontendSubRouter — A lightweight router for use INSIDE a micro frontend.
 *
 * DESIGN DECISIONS:
 * -----------------
 * 1. Scoped to a URL prefix: This router only handles URLs under its assigned
 *    prefix (e.g., '/products'). It ignores all other URL changes. This is how
 *    isolation is achieved — the Products router doesn't react to '/cart/checkout'.
 *
 * 2. Relative sub-routes: Routes are defined relative to the prefix. If the
 *    prefix is '/products', a sub-route of '/details/:id' matches '/products/details/123'.
 *    This keeps the MF's routing code independent of where the shell mounts it.
 *
 * 3. No interference with other MFs: The router listens for popstate events
 *    but only acts on URLs within its prefix. Other MFs' routers do the same
 *    for their prefixes. Multiple routers coexist peacefully.
 *
 * 4. Simple parameter extraction: Supports ':param' syntax for URL parameters
 *    (e.g., '/details/:id' extracts { id: '123' } from '/details/123').
 *
 * HOW THIS DIFFERS FROM SHELL-LEVEL ROUTING:
 * -------------------------------------------
 * In shell-level routing (ShellRouter), the shell:
 *   - Owns ALL routes
 *   - Mounts/unmounts MFs based on URL
 *   - MFs have NO routing logic
 *
 * In app-level routing (this pattern), the shell:
 *   - Mounts MFs into zones (doesn't unmount on sub-route changes)
 *   - Each MF runs its OWN router for internal navigation
 *   - MFs handle their own sub-routes independently
 *
 * INTERVIEW INSIGHT:
 * "The key difference is WHO decides what to render. In shell-level routing,
 * the shell decides. In app-level routing, each MF decides for itself. The
 * shell just provides the stage; each MF is its own director."
 */
class MicroFrontendSubRouter {
  /**
   * @param {string} prefix - The URL prefix this MF owns (e.g., '/products')
   * @param {HTMLElement} container - The DOM element this MF renders into
   */
  constructor(prefix, container) {
    /**
     * ANNOTATION: URL prefix scoping
     * --------------------------------
     * The prefix defines this MF's "territory" in the URL space. The router
     * ONLY responds to URLs that start with this prefix. This is the mechanism
     * that prevents one MF's routing from affecting another.
     *
     * Example: If prefix is '/products', this router handles:
     *   /products           → matches
     *   /products/123       → matches
     *   /products/123/edit  → matches
     *   /cart               → IGNORED (not our prefix)
     *   /settings           → IGNORED (not our prefix)
     *
     * This scoping is what makes Requirement 7.3 possible: "the individual
     * micro frontend SHALL manage its own internal navigation without
     * affecting other micro frontends."
     */
    this._prefix = prefix;
    this._container = container;
    this._routes = [];
    this._popstateHandler = null;
    this._activeRoute = null;
  }

  /**
   * Register a sub-route within this MF's prefix.
   *
   * WHY RELATIVE PATHS?
   * --------------------
   * Sub-routes are defined relative to the prefix. If the prefix is '/products',
   * registering '/' means "the products index page" (matches '/products' exactly),
   * and registering '/:id' means "a product detail page" (matches '/products/123').
   *
   * This keeps the MF portable — if the shell decides to mount it under
   * '/shop/products' instead of '/products', the MF's internal routing code
   * doesn't change. Only the prefix changes.
   *
   * @param {string} subPath - Relative path within the prefix (e.g., '/', '/:id', '/new')
   * @param {Function} renderFn - Called with (container, params) when this sub-route matches
   */
  addRoute(subPath, renderFn) {
    /**
     * ANNOTATION: Route pattern compilation
     * ---------------------------------------
     * We convert the subPath pattern into a regex for matching. The ':param'
     * syntax is converted to a named capture group.
     *
     * Example: '/:id/reviews' becomes /^\/([^/]+)\/reviews$/
     *
     * This is a simplified version of what React Router, Express, and
     * path-to-regexp do internally. Production routers handle more edge
     * cases (optional params, wildcards, query strings), but this captures
     * the core concept.
     */
    const paramNames = [];
    const regexStr = subPath.replace(/:([^/]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });

    this._routes.push({
      subPath,
      regex: new RegExp(`^${regexStr}$`),
      paramNames,
      renderFn,
    });
  }

  /**
   * Start listening for URL changes and evaluate the current URL.
   *
   * ISOLATION MECHANISM:
   * ---------------------
   * This router listens for the SAME popstate event as every other MF's router.
   * But each router only acts on URLs within its own prefix. When the URL changes
   * from '/products/123' to '/products/456':
   *   - Products router: "That's my prefix! Re-render with id=456."
   *   - Cart router: "Not my prefix. Ignoring."
   *   - Settings router: "Not my prefix. Ignoring."
   *
   * When the URL changes from '/products/123' to '/cart':
   *   - Products router: "Not my prefix anymore. I'll render nothing."
   *     (Or the shell unmounts the Products MF entirely — depends on the shell strategy.)
   *   - Cart router: "That's my prefix! Render the cart index."
   *
   * This is how multiple routers coexist without interfering with each other.
   */
  start() {
    this._popstateHandler = () => {
      this._evaluateRoute();
    };

    window.addEventListener('popstate', this._popstateHandler);

    // Evaluate the current URL immediately
    this._evaluateRoute();
  }

  /**
   * Stop listening for URL changes and clean up.
   *
   * WHY THIS MATTERS:
   * ------------------
   * When a micro frontend is unmounted (e.g., the user navigates to a different
   * top-level section), its sub-router must stop listening for popstate events.
   * Otherwise, the detached router keeps firing on every URL change, potentially
   * trying to render into a container that no longer exists in the DOM.
   *
   * This is the routing equivalent of the memory leak problem described in
   * docs/communication/custom-events.js — listeners that outlive their MF.
   */
  stop() {
    if (this._popstateHandler) {
      window.removeEventListener('popstate', this._popstateHandler);
      this._popstateHandler = null;
    }
    this._activeRoute = null;
  }

  /**
   * Navigate within this MF's prefix.
   *
   * WHY SCOPED NAVIGATION?
   * -----------------------
   * This method prepends the prefix automatically, so the MF's internal code
   * uses relative paths: router.navigate('/123') instead of router.navigate('/products/123').
   *
   * This keeps the MF decoupled from its mount location. If the shell moves
   * the MF from '/products' to '/shop/products', the MF's navigation code
   * doesn't change — only the prefix passed to the constructor changes.
   *
   * @param {string} subPath - Relative path within the prefix (e.g., '/123')
   */
  navigate(subPath) {
    const fullPath = this._prefix + subPath;
    history.pushState(null, '', fullPath);

    /**
     * ANNOTATION: Dispatching a popstate-like event
     * -----------------------------------------------
     * pushState doesn't fire popstate (a common gotcha). We need to notify
     * ALL routers on the page that the URL changed — not just this one.
     *
     * We dispatch a real popstate event so that:
     *   1. This MF's router re-evaluates (handles the new sub-route)
     *   2. Other MFs' routers also re-evaluate (they'll see it's not their
     *      prefix and ignore it — that's the isolation mechanism)
     *   3. The shell router (if using shell-level routing for top-level zones)
     *      also re-evaluates
     *
     * Single-Spa does something similar — it patches pushState to fire
     * custom routing events that trigger re-evaluation.
     */
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  /**
   * Core routing logic — match the current URL against registered sub-routes.
   *
   * ISOLATION IN ACTION:
   * ---------------------
   * Step 1: Check if the current URL starts with our prefix.
   *         If not, this URL change is for a different MF — do nothing.
   *
   * Step 2: Extract the sub-path (everything after the prefix).
   *         Match it against our registered sub-routes.
   *
   * Step 3: If a match is found, call the render function.
   *         If no match, optionally render a 404 within our zone.
   *
   * This two-step process (prefix check → sub-route match) is what makes
   * app-level routing work. Each MF only processes URLs in its namespace.
   */
  _evaluateRoute() {
    const currentPath = window.location.pathname;

    // Step 1: Is this URL within our prefix?
    if (!currentPath.startsWith(this._prefix)) {
      /**
       * ANNOTATION: Not our URL — do nothing
       * --------------------------------------
       * This is the isolation mechanism. When the URL changes to '/cart/checkout',
       * the Products MF's router sees that '/cart/checkout' doesn't start with
       * '/products', so it ignores the change entirely. The Products MF stays
       * mounted (if the shell keeps it mounted) but doesn't re-render.
       *
       * This is how Requirement 7.3 is satisfied: navigating within one MF
       * does NOT affect other MFs.
       */
      return;
    }

    // Step 2: Extract the sub-path (relative to our prefix)
    const subPath = currentPath.slice(this._prefix.length) || '/';

    // Step 3: Find a matching sub-route
    for (const route of this._routes) {
      const match = subPath.match(route.regex);

      if (match) {
        /**
         * ANNOTATION: Parameter extraction
         * ----------------------------------
         * If the route pattern has :param placeholders, the regex capture
         * groups contain the actual values. We zip the param names with
         * the captured values to create a params object.
         *
         * Example: pattern '/:id/reviews', URL '/products/123/reviews'
         *   → subPath = '/123/reviews'
         *   → match = ['/123/reviews', '123']
         *   → params = { id: '123' }
         */
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });

        // Avoid re-rendering if the same route is already active with same params
        const routeKey = route.subPath + ':' + JSON.stringify(params);
        if (this._activeRoute === routeKey) {
          return;
        }
        this._activeRoute = routeKey;

        route.renderFn(this._container, params);
        return;
      }
    }

    /**
     * ANNOTATION: No matching sub-route
     * -----------------------------------
     * If the URL is within our prefix but doesn't match any registered
     * sub-route, we have a "local 404." The MF can handle this however
     * it wants — show a not-found message, redirect to a default sub-route,
     * or do nothing.
     *
     * This is another advantage of app-level routing: each MF handles its
     * own error cases. The shell doesn't need to know about MF-internal
     * 404 scenarios.
     */
    if (this._container) {
      this._container.innerHTML = '<p>Page not found within this section.</p>';
    }
    this._activeRoute = null;
  }

  /**
   * Returns the currently active sub-route key (useful for testing).
   * @returns {string|null}
   */
  getActiveRoute() {
    return this._activeRoute;
  }
}

// =============================================================================
// USAGE EXAMPLE — Multiple MFs with independent sub-routers
// =============================================================================
//
// This demonstrates the key concept: each MF has its OWN router instance,
// and navigating within one MF does NOT affect the other.
//
//   // --- Shell mounts two MFs into separate zones ---
//   // (The shell doesn't manage sub-routes — it just provides containers)
//
//   <div id="products-zone"></div>
//   <div id="cart-zone"></div>
//
//   // --- Products MF: owns everything under /products ---
//
//   const productsRouter = new MicroFrontendSubRouter(
//     '/products',
//     document.getElementById('products-zone')
//   );
//
//   productsRouter.addRoute('/', (container) => {
//     container.innerHTML = '<h2>All Products</h2><ul>...</ul>';
//   });
//
//   productsRouter.addRoute('/:id', (container, params) => {
//     container.innerHTML = `<h2>Product ${params.id}</h2><p>Details...</p>`;
//   });
//
//   productsRouter.addRoute('/:id/reviews', (container, params) => {
//     container.innerHTML = `<h2>Reviews for Product ${params.id}</h2>`;
//   });
//
//   productsRouter.start();
//
//   // --- Cart MF: owns everything under /cart ---
//
//   const cartRouter = new MicroFrontendSubRouter(
//     '/cart',
//     document.getElementById('cart-zone')
//   );
//
//   cartRouter.addRoute('/', (container) => {
//     container.innerHTML = '<h2>Your Cart</h2><p>Items in cart...</p>';
//   });
//
//   cartRouter.addRoute('/checkout', (container) => {
//     container.innerHTML = '<h2>Checkout</h2><form>...</form>';
//   });
//
//   cartRouter.start();
//
//   // --- Navigation within Products MF ---
//
//   productsRouter.navigate('/123');
//   // URL becomes: /products/123
//   // Products zone: renders product detail for ID 123
//   // Cart zone: UNCHANGED (cart router ignores /products/123)
//
//   productsRouter.navigate('/123/reviews');
//   // URL becomes: /products/123/reviews
//   // Products zone: renders reviews for product 123
//   // Cart zone: STILL UNCHANGED
//
//   // --- Navigation within Cart MF ---
//
//   cartRouter.navigate('/checkout');
//   // URL becomes: /cart/checkout
//   // Cart zone: renders checkout form
//   // Products zone: UNCHANGED (products router ignores /cart/checkout)
//
// KEY OBSERVATION:
// ----------------
// Each MF navigates independently. The Products MF going from /products to
// /products/123 does NOT cause the Cart MF to unmount, re-render, or lose
// state. This is the defining characteristic of app-level routing and the
// core of Requirement 7.3.
//
// CLEANUP ON UNMOUNT:
// -------------------
// When the shell unmounts a MF, it should call router.stop() to remove
// the popstate listener. Otherwise, the detached router keeps firing:
//
//   // In the MF's unmount lifecycle hook:
//   export function unmount() {
//     productsRouter.stop();
//     container.innerHTML = '';
//   }
//
// =============================================================================

// =============================================================================
// EXPORTS
// =============================================================================

export { MicroFrontendSubRouter };

if (typeof window !== 'undefined') {
  window.MFSubRouter = MicroFrontendSubRouter;
}
