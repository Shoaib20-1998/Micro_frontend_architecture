/**
 * =============================================================================
 * EVENT BUS (PUB/SUB) — Inter-Micro-Frontend Communication Pattern #2
 * =============================================================================
 *
 * Pattern: Publish/Subscribe via a shared EventBus instance
 *
 * WHY THIS PATTERN?
 * -----------------
 * The event bus sits between custom browser events (Pattern #1) and a shared
 * store (Pattern #3) on the coupling spectrum. It gives you more control than
 * raw CustomEvents — you get a subscriber registry, error isolation per
 * subscriber, and the ability to add middleware (logging, filtering) — without
 * the overhead of managing shared state.
 *
 * The key difference from CustomEvent: the bus is a JavaScript object, not the
 * DOM. This means it works in non-browser environments (Node.js, Web Workers,
 * SSR) and doesn't depend on the DOM event propagation model.
 *
 * COUPLING ANALYSIS:
 * ------------------
 * - Coupling level: MODERATE
 * - All micro frontends must share a reference to the same EventBus instance.
 *   This is the critical coupling point — how do they get that reference?
 *   Options:
 *     1. Attach to `window` (simple, but pollutes global scope)
 *     2. Expose via Module Federation shared module (clean, but ties to MF)
 *     3. Import from a shared npm package (versioning headaches)
 * - Producers and consumers still only share event name strings and payload
 *   shapes, but they now also share the bus instance itself.
 *
 * SCALABILITY TRADE-OFFS:
 * -----------------------
 * ✅ Error isolation — one subscriber throwing doesn't kill other subscribers
 * ✅ Introspectable — you can log all events, count subscribers, add middleware
 * ✅ Framework-agnostic — pure JavaScript, no DOM dependency
 * ✅ Testable — easy to create isolated bus instances for unit tests
 * ⚠️  Shared instance required — all micro frontends must reference the same bus
 * ⚠️  Memory management — subscribers must unsubscribe on unmount, or the bus
 *     holds references to detached micro frontend callbacks (memory leak)
 * ⚠️  No persistence — events are transient; late subscribers miss past events
 *     (unlike a store which always has current state)
 * ❌ Single point of failure — if the bus instance is garbage collected or
 *     replaced, all communication breaks
 * ❌ Ordering guarantees are synchronous only — if you need async ordering,
 *     you need a more sophisticated message queue
 *
 * WHEN TO USE IN INTERVIEWS:
 * --------------------------
 * "I'd use an event bus when I need more control than raw CustomEvents — like
 * error isolation per subscriber, event logging for debugging, or when I'm
 * running outside the DOM (Web Workers, SSR). The trade-off is that all micro
 * frontends need a shared reference to the bus instance, which introduces a
 * coordination point. For simple notifications, CustomEvents are lighter. For
 * shared state, a store is more appropriate."
 */

// =============================================================================
// IMPLEMENTATION
// =============================================================================

/**
 * A minimal pub/sub event bus for inter-micro-frontend communication.
 *
 * DESIGN DECISIONS:
 * -----------------
 * 1. Using a Map<string, Set<Function>> instead of a plain object because:
 *    - Map keys can be any type (future-proofing for Symbol-based events)
 *    - Set automatically deduplicates — subscribing the same callback twice
 *      is a no-op, preventing accidental double-firing
 *    - Set.delete() is O(1) vs Array.splice() which is O(n)
 *
 * 2. Error isolation in publish(): each subscriber callback is wrapped in
 *    try/catch. If subscriber A throws, subscriber B still gets called.
 *    This is critical in micro frontends where one team's buggy handler
 *    shouldn't break another team's functionality.
 *
 * 3. The class is not a singleton by default. You choose how to share it:
 *    - `window.__EVENT_BUS__` for global access
 *    - Module Federation shared module for scoped access
 *    - Dependency injection for testability
 */
class EventBus {
  constructor() {
    /**
     * ANNOTATION: Why a Map of Sets?
     * --------------------------------
     * Map<eventName, Set<callback>>
     *
     * - Map: O(1) lookup by event name, no prototype pollution risk
     *   (unlike plain objects where someone could subscribe to "__proto__")
     * - Set: O(1) add/delete, automatic deduplication of callbacks
     *
     * In a production system with dozens of micro frontends, the subscriber
     * count per event can grow large. Set operations stay constant-time
     * regardless of subscriber count.
     */
    this._subscribers = new Map();
  }

  /**
   * Subscribe to an event.
   *
   * WHY RETURN AN UNSUBSCRIBE FUNCTION?
   * ------------------------------------
   * Same "disposable" pattern as custom-events.js. The caller doesn't need to
   * keep a reference to their callback or remember the event name — they just
   * call the returned function. This is especially important in React where
   * useEffect cleanup functions are the standard pattern:
   *
   *   useEffect(() => {
   *     const unsub = bus.subscribe('cart:updated', handler);
   *     return unsub; // cleanup on unmount
   *   }, []);
   *
   * @param {string} event - Event name to subscribe to
   * @param {Function} callback - Function called when the event is published
   * @returns {Function} Unsubscribe function
   */
  subscribe(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError(
        `EventBus.subscribe: callback must be a function, got ${typeof callback}`
      );
    }

    if (!this._subscribers.has(event)) {
      this._subscribers.set(event, new Set());
    }

    this._subscribers.get(event).add(callback);

    /**
     * ANNOTATION: Closure-based unsubscribe
     * --------------------------------------
     * The returned function closes over `event` and `callback`, so the
     * consumer doesn't need to track them. This is a common pattern in
     * observable/reactive libraries (RxJS, MobX, Redux).
     */
    return () => {
      this.unsubscribe(event, callback);
    };
  }

  /**
   * Publish an event to all subscribers.
   *
   * ERROR ISOLATION:
   * ----------------
   * Each subscriber is called inside a try/catch. If subscriber A throws,
   * subscriber B still receives the event. The error is logged to console
   * but does not propagate to the publisher.
   *
   * WHY THIS MATTERS IN MICRO FRONTENDS:
   * Team A's buggy event handler should never break Team B's micro frontend.
   * In a monolith, a thrown error in an event handler might be acceptable
   * because one team owns all the code. In micro frontends, you can't assume
   * that — each subscriber might be maintained by a different team.
   *
   * @param {string} event - Event name to publish
   * @param {*} data - Payload to send to all subscribers
   */
  publish(event, data) {
    const subscribers = this._subscribers.get(event);

    if (!subscribers || subscribers.size === 0) {
      /**
       * ANNOTATION: Silent no-op on no subscribers
       * -------------------------------------------
       * This is a deliberate design choice. In a pub/sub system, the publisher
       * shouldn't care whether anyone is listening. This enables:
       * - Micro frontends to publish events before consumers are mounted
       * - Gradual adoption — you can add publishers before adding subscribers
       *
       * Trade-off: makes debugging harder. If you're wondering "why isn't my
       * event being received?", add logging here during development:
       *   console.warn(`EventBus: No subscribers for "${event}"`);
       */
      return;
    }

    /**
     * ANNOTATION: Iterating over a snapshot
     * --------------------------------------
     * We iterate the Set directly. If a subscriber unsubscribes during
     * iteration (e.g., a "once" pattern), Set iteration handles this safely
     * in modern JS engines — the deleted element won't be visited if it
     * hasn't been reached yet.
     */
    subscribers.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        /**
         * ANNOTATION: Error isolation boundary
         * ------------------------------------
         * We catch and log rather than re-throw. This is the micro-frontend
         * equivalent of a bulkhead pattern in microservices — one failing
         * component doesn't cascade to others.
         */
        console.error(
          `EventBus: Error in subscriber for "${event}":`,
          error
        );
      }
    });
  }

  /**
   * Unsubscribe a specific callback from an event.
   *
   * @param {string} event - Event name
   * @param {Function} callback - The exact callback reference to remove
   */
  unsubscribe(event, callback) {
    const subscribers = this._subscribers.get(event);
    if (subscribers) {
      subscribers.delete(callback);

      /**
       * ANNOTATION: Cleanup empty Sets
       * --------------------------------
       * If the last subscriber for an event is removed, we delete the Set
       * from the Map entirely. This prevents the Map from growing unbounded
       * over the lifetime of a long-running SPA — a subtle memory leak that
       * wouldn't show up in short test runs but matters in production.
       */
      if (subscribers.size === 0) {
        this._subscribers.delete(event);
      }
    }
  }

  /**
   * Remove ALL subscribers for a specific event, or ALL subscribers entirely.
   *
   * WHY THIS EXISTS:
   * ----------------
   * Useful for testing (reset between tests) and for "nuclear" cleanup when
   * a micro frontend is being completely torn down. In single-spa, you might
   * call this in the `unmount` lifecycle hook as a safety net.
   *
   * @param {string} [event] - If provided, clears only that event's subscribers.
   *                           If omitted, clears everything.
   */
  clear(event) {
    if (event) {
      this._subscribers.delete(event);
    } else {
      this._subscribers.clear();
    }
  }

  /**
   * Returns the number of subscribers for a given event.
   * Useful for debugging and monitoring in development.
   *
   * @param {string} event - Event name
   * @returns {number} Number of active subscribers
   */
  subscriberCount(event) {
    const subscribers = this._subscribers.get(event);
    return subscribers ? subscribers.size : 0;
  }
}

// =============================================================================
// USAGE EXAMPLE
// =============================================================================
//
// --- Creating and sharing the bus: ---
//
//   // Option 1: Global (simple, works everywhere)
//   window.__EVENT_BUS__ = window.__EVENT_BUS__ || new EventBus();
//   const bus = window.__EVENT_BUS__;
//
//   // Option 2: Module Federation shared module (cleaner)
//   // In webpack.config.js: shared: { './event-bus': { singleton: true } }
//   import { bus } from 'shared/event-bus';
//
// --- In Micro Frontend A (publisher): ---
//
//   bus.publish('cart:item-added', {
//     productId: 'abc-123',
//     quantity: 2,
//     price: 29.99,
//   });
//
// --- In Micro Frontend B (subscriber): ---
//
//   const unsubscribe = bus.subscribe('cart:item-added', (payload) => {
//     console.log(`Product ${payload.productId} added`);
//     updateCartBadge(payload);
//   });
//
//   // On unmount — CRITICAL to prevent memory leaks
//   unsubscribe();
//
// --- Error isolation demo: ---
//
//   bus.subscribe('test', () => { throw new Error('I broke!'); });
//   bus.subscribe('test', (data) => { console.log('I still work:', data); });
//   bus.publish('test', { value: 42 });
//   // Output:
//   //   EventBus: Error in subscriber for "test": Error: I broke!
//   //   I still work: { value: 42 }
//
// =============================================================================

// =============================================================================
// EXPORTS
// =============================================================================

export { EventBus };

// Convenience: create a default shared instance on window for non-module usage
if (typeof window !== 'undefined') {
  window.__EVENT_BUS__ = window.__EVENT_BUS__ || new EventBus();
  window.MFEventBus = EventBus;
}
