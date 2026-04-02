/**
 * =============================================================================
 * CUSTOM BROWSER EVENTS — Inter-Micro-Frontend Communication Pattern #1
 * =============================================================================
 *
 * Pattern: Dispatch/Listen using the native CustomEvent API
 *
 * WHY THIS PATTERN?
 * -----------------
 * Custom browser events are the most "micro-frontend native" communication
 * mechanism because they use the platform itself — no shared libraries, no
 * shared references, no framework coupling. Any code running in the same
 * browsing context can dispatch and listen for events on `window` or any
 * shared DOM node.
 *
 * COUPLING ANALYSIS:
 * ------------------
 * - Coupling level: LOOSE (the loosest of the three patterns in this module)
 * - Producer and consumer only share an event name string and a payload shape.
 * - Neither side needs a reference to the other, or even knowledge that the
 *   other exists. This is true decoupling — the browser is the mediator.
 * - Trade-off: because there's no registry, you can dispatch an event that
 *   nobody listens to, and you'll never know. Debugging "why didn't my event
 *   arrive?" can be painful in production.
 *
 * PRODUCTION-SCALE TRADE-OFFS:
 * ----------------------------
 * ✅ Zero dependencies — works in any browser, any framework, any bundler
 * ✅ No shared runtime — micro frontends can be deployed independently
 * ✅ Familiar API — every frontend developer knows addEventListener
 * ⚠️  No delivery guarantees — fire-and-forget; if no listener is attached, the
 *     event is silently lost
 * ⚠️  No backpressure — a fast producer can overwhelm a slow consumer
 * ⚠️  Debugging is hard — events don't show up in network tabs; you need
 *     browser DevTools "Event Listeners" panel or manual logging
 * ⚠️  Namespace collisions — two teams might accidentally use the same event
 *     name. Convention: use "appName:action" format (e.g., "cart:item-added")
 * ❌ No replay — late subscribers miss events that already fired
 * ❌ No type safety — payload shape is a gentleman's agreement
 *
 * WHEN TO USE IN INTERVIEWS:
 * --------------------------
 * "Custom events are my go-to for simple, one-way notifications between micro
 * frontends that don't need acknowledgment — like 'user logged in' or 'cart
 * updated'. They're zero-dependency and framework-agnostic, which keeps teams
 * autonomous. But for anything requiring guaranteed delivery or complex state
 * sync, I'd reach for a shared store or event bus."
 */

// =============================================================================
// IMPLEMENTATION
// =============================================================================

/**
 * Dispatches a custom event on the window object.
 *
 * WHY window?
 * -----------
 * We dispatch on `window` because it's the one DOM node guaranteed to be
 * accessible to all micro frontends regardless of their mount point. You could
 * dispatch on a shared container element, but `window` is the convention.
 *
 * WHY CustomEvent (not Event)?
 * ----------------------------
 * `CustomEvent` supports a `detail` property for passing arbitrary data.
 * Plain `Event` has no standard way to attach a payload. The `detail` property
 * is read-only after construction, which prevents accidental mutation by
 * listeners — a subtle but important safety feature.
 *
 * @param {string} eventName - Namespaced event name (e.g., "cart:item-added")
 * @param {*} payload - Data to send with the event (accessible via event.detail)
 */
function dispatchMFEvent(eventName, payload) {
  /**
   * ANNOTATION: bubbles and composed
   * ---------------------------------
   * `bubbles: true` — allows the event to bubble up the DOM tree. Not strictly
   * necessary when dispatching on `window` (there's nowhere to bubble to), but
   * it's good practice if you ever switch to dispatching on a container element.
   *
   * `composed: true` — allows the event to cross Shadow DOM boundaries. Critical
   * if any micro frontend uses Shadow DOM for CSS isolation (see our CSS
   * isolation module). Without this, Shadow DOM encapsulated listeners won't
   * receive the event.
   */
  const event = new CustomEvent(eventName, {
    detail: payload,
    bubbles: true,
    composed: true,
  });

  window.dispatchEvent(event);
}

/**
 * Registers a listener for a custom micro-frontend event.
 *
 * WHY RETURN AN UNSUBSCRIBE FUNCTION?
 * ------------------------------------
 * This is the "disposable" pattern. Instead of forcing the consumer to keep a
 * reference to the callback and call `removeEventListener` manually, we return
 * a cleanup function. This pattern:
 * - Prevents memory leaks (especially in single-spa where micro frontends
 *   mount and unmount frequently — forgetting to remove a listener means it
 *   fires on a detached micro frontend)
 * - Aligns with React's useEffect cleanup pattern
 * - Makes the API composable — you can collect unsubscribe functions and call
 *   them all in an unmount hook
 *
 * @param {string} eventName - The event name to listen for
 * @param {Function} callback - Called with the event's detail payload
 * @returns {Function} Unsubscribe function — call it to remove the listener
 */
function onMFEvent(eventName, callback) {
  /**
   * ANNOTATION: Wrapper function
   * ----------------------------
   * We wrap the user's callback so we can extract `event.detail` for them.
   * This keeps the consumer's code clean — they get the payload directly
   * instead of having to dig into the event object. It also creates a stable
   * reference we can use for removeEventListener.
   */
  const handler = (event) => {
    callback(event.detail);
  };

  window.addEventListener(eventName, handler);

  // Return the cleanup function (the "disposable" pattern)
  return () => {
    window.removeEventListener(eventName, handler);
  };
}

// =============================================================================
// USAGE EXAMPLE
// =============================================================================
//
// --- In Micro Frontend A (the producer): ---
//
//   // User adds an item to the cart
//   dispatchMFEvent('cart:item-added', {
//     productId: 'abc-123',
//     quantity: 2,
//     price: 29.99,
//   });
//
// --- In Micro Frontend B (the consumer): ---
//
//   // On mount, start listening for cart updates
//   const unsubscribe = onMFEvent('cart:item-added', (payload) => {
//     console.log(`Product ${payload.productId} added, qty: ${payload.quantity}`);
//     updateCartBadge(payload);
//   });
//
//   // On unmount, clean up the listener to prevent memory leaks
//   // (critical in single-spa where micro frontends mount/unmount frequently)
//   unsubscribe();
//
// --- In a React micro frontend (useEffect pattern): ---
//
//   useEffect(() => {
//     const unsubscribe = onMFEvent('cart:item-added', (payload) => {
//       setCartCount(prev => prev + payload.quantity);
//     });
//     return unsubscribe; // Cleanup on unmount
//   }, []);
//
// =============================================================================

// =============================================================================
// EXPORTS
// =============================================================================
// Using named exports so consumers can tree-shake if using a bundler,
// but also attaching to `window` for script-tag usage in non-bundled setups.

export { dispatchMFEvent, onMFEvent };

// For non-module environments (e.g., loaded via <script> tag)
if (typeof window !== 'undefined') {
  window.MFCustomEvents = { dispatchMFEvent, onMFEvent };
}
