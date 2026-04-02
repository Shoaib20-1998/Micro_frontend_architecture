/**
 * =============================================================================
 * SHARED OBSERVABLE STORE — Inter-Micro-Frontend Communication Pattern #3
 * =============================================================================
 *
 * Pattern: Centralized state with getState(), setState(), subscribe()
 *
 * WHY THIS PATTERN?
 * -----------------
 * Custom events and event buses are great for transient notifications, but they
 * don't answer the question: "What is the current state?" If Micro Frontend B
 * mounts after Micro Frontend A has already updated the cart, B has no way to
 * know the current cart contents using events alone — it missed the event.
 *
 * A shared store solves this by maintaining a single source of truth that any
 * micro frontend can read at any time. Subscribers get notified of changes,
 * but late arrivals can also call getState() to catch up.
 *
 * This is a minimal implementation inspired by Redux and Zustand, stripped down
 * to the essentials for teaching. Production stores would add middleware,
 * selectors, devtools integration, and immutability enforcement.
 *
 * COUPLING ANALYSIS:
 * ------------------
 * - Coupling level: TIGHT (the tightest of the three patterns)
 * - All micro frontends share both the store instance AND the state shape.
 *   If Team A adds a new field to the state, Team B needs to know about it
 *   (or at least not break when it appears).
 * - This is the fundamental trade-off: you get a single source of truth, but
 *   you pay for it with shared schema ownership.
 * - Mitigation strategies:
 *     1. Namespace state by micro frontend: { cart: {...}, user: {...} }
 *     2. Use selectors so each MF only reads the slice it cares about
 *     3. Version the state shape and handle migrations
 *
 * STATE MANAGEMENT TRADE-OFFS:
 * ----------------------------
 * ✅ Single source of truth — no stale data, no event replay needed
 * ✅ Late subscribers get current state immediately via getState()
 * ✅ Predictable — state changes are synchronous and observable
 * ✅ Debuggable — you can snapshot state at any point, add logging middleware
 * ⚠️  Shared schema — all consumers must agree on state shape
 * ⚠️  Tight coupling — changes to state structure can break multiple MFs
 * ⚠️  No built-in access control — any MF can overwrite any state
 * ❌ Scalability ceiling — as state grows, every subscriber is notified of
 *     every change (no built-in selectors). Production stores need selectors.
 * ❌ Concurrency risks — if two MFs call setState() in the same tick with
 *     overlapping keys, last write wins. No conflict resolution.
 *
 * WHEN TO USE IN INTERVIEWS:
 * --------------------------
 * "I'd use a shared store when micro frontends need to read each other's
 * current state — not just react to events. The classic example is user
 * authentication: when the auth MF logs in, the nav MF needs the current
 * user object, not just a 'user logged in' event. The trade-off is tighter
 * coupling around the state shape, which I'd mitigate with namespaced state
 * slices and selector functions."
 */

// =============================================================================
// IMPLEMENTATION
// =============================================================================

/**
 * A minimal observable store for sharing state across micro frontends.
 *
 * DESIGN DECISIONS:
 * -----------------
 * 1. State is a plain object, merged shallowly on setState(). Deep merging
 *    is intentionally omitted — it adds complexity and hides bugs. If you
 *    need to update a nested value, spread it yourself:
 *      store.setState({ cart: { ...store.getState().cart, itemCount: 5 } })
 *
 * 2. Subscribers receive the full new state, not a diff. This keeps the
 *    implementation simple and lets consumers decide what to do with it.
 *    Production stores (Redux, Zustand) add selectors for performance.
 *
 * 3. State is frozen (Object.freeze) after each update to prevent direct
 *    mutation. This catches bugs early — if a consumer tries to mutate
 *    state directly instead of calling setState(), they get a TypeError.
 *
 * 4. setState validates that the input is a plain object. This prevents
 *    accidental misuse like `setState('oops')` or `setState(null)`.
 */
class SharedStore {
  /**
   * @param {Object} initialState - The starting state. Defaults to empty object.
   */
  constructor(initialState = {}) {
    if (!isPlainObject(initialState)) {
      throw new TypeError(
        `SharedStore: initialState must be a plain object, got ${typeof initialState}`
      );
    }

    /**
     * ANNOTATION: Frozen state
     * -------------------------
     * Object.freeze() makes the state object immutable (shallow). This is a
     * safety net — if a micro frontend tries to do `state.user = null` instead
     * of `store.setState({ user: null })`, they'll get a TypeError in strict
     * mode. This catches a whole class of bugs where teams accidentally mutate
     * shared state.
     *
     * Note: freeze is shallow. Nested objects are NOT frozen. For deep
     * immutability, you'd use a library like Immer or deep-freeze. We keep
     * it shallow here for simplicity and performance.
     */
    this._state = Object.freeze({ ...initialState });

    /**
     * ANNOTATION: Set<Function> for subscribers
     * ------------------------------------------
     * Same rationale as EventBus: Set gives us O(1) add/delete and automatic
     * deduplication. A subscriber that accidentally subscribes twice won't
     * get called twice.
     */
    this._subscribers = new Set();
  }

  /**
   * Returns the current state snapshot.
   *
   * WHY THIS MATTERS FOR MICRO FRONTENDS:
   * --------------------------------------
   * Unlike events (which are transient), the store always has a current value.
   * When a micro frontend mounts late (e.g., user navigates to a new page and
   * a new MF loads), it can call getState() to get the current state without
   * needing to replay past events.
   *
   * The returned object is frozen, so consumers can't accidentally mutate it.
   *
   * @returns {Object} Current state (frozen)
   */
  getState() {
    return this._state;
  }

  /**
   * Updates the state by shallow-merging the partial update.
   *
   * SHALLOW MERGE RATIONALE:
   * -------------------------
   * We use Object.assign-style shallow merge (spread operator) rather than
   * deep merge because:
   * 1. It's predictable — you always know exactly what changed
   * 2. It's fast — no recursive traversal
   * 3. It matches React's setState() semantics, which most frontend devs
   *    already understand
   * 4. Deep merge has edge cases with arrays, null values, and class instances
   *    that are hard to get right
   *
   * If you need to update a nested value:
   *   store.setState({
   *     cart: { ...store.getState().cart, itemCount: 5 }
   *   });
   *
   * @param {Object} partialState - Object to shallow-merge into current state
   */
  setState(partialState) {
    if (!isPlainObject(partialState)) {
      throw new TypeError(
        `SharedStore.setState: argument must be a plain object, got ${typeof partialState}`
      );
    }

    /**
     * ANNOTATION: Immutable update pattern
     * -------------------------------------
     * We create a new object every time, rather than mutating the existing one.
     * This means:
     * - Old state references remain valid (useful for debugging, undo, etc.)
     * - Subscribers can compare old vs new state if needed
     * - React components can use reference equality checks for optimization
     */
    const prevState = this._state;
    this._state = Object.freeze({ ...prevState, ...partialState });

    // Notify all subscribers with the new state
    this._notifySubscribers(this._state);
  }

  /**
   * Subscribe to state changes.
   *
   * The callback is called with the new state every time setState() is called.
   * Returns an unsubscribe function (the "disposable" pattern).
   *
   * IMPORTANT FOR MICRO FRONTENDS:
   * Always unsubscribe in your unmount/cleanup hook. A mounted micro frontend
   * that forgets to unsubscribe will:
   * 1. Leak memory (the store holds a reference to the callback)
   * 2. Execute stale callbacks on a detached micro frontend
   * 3. Potentially cause errors if the callback references unmounted DOM
   *
   * @param {Function} listener - Called with new state on every change
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError(
        `SharedStore.subscribe: listener must be a function, got ${typeof listener}`
      );
    }

    this._subscribers.add(listener);

    // Return unsubscribe function (disposable pattern)
    return () => {
      this._subscribers.delete(listener);
    };
  }

  /**
   * Notify all subscribers of a state change.
   *
   * ERROR ISOLATION:
   * Same pattern as EventBus — each subscriber is wrapped in try/catch.
   * One team's buggy subscriber doesn't break another team's state updates.
   *
   * @param {Object} newState - The new state to pass to subscribers
   * @private
   */
  _notifySubscribers(newState) {
    this._subscribers.forEach((listener) => {
      try {
        listener(newState);
      } catch (error) {
        console.error('SharedStore: Error in subscriber:', error);
      }
    });
  }

  /**
   * Returns the number of active subscribers.
   * Useful for debugging and monitoring.
   *
   * @returns {number}
   */
  subscriberCount() {
    return this._subscribers.size;
  }

  /**
   * Resets the store to a new state and notifies subscribers.
   * Useful for testing and for "logout" scenarios where you want to
   * clear all shared state.
   *
   * @param {Object} [newState={}] - The state to reset to
   */
  reset(newState = {}) {
    if (!isPlainObject(newState)) {
      throw new TypeError(
        `SharedStore.reset: argument must be a plain object, got ${typeof newState}`
      );
    }
    this._state = Object.freeze({ ...newState });
    this._notifySubscribers(this._state);
  }
}

// =============================================================================
// HELPER
// =============================================================================

/**
 * Checks if a value is a plain object (not an array, null, Date, etc.).
 *
 * WHY NOT just `typeof val === 'object'`?
 * Because typeof null === 'object', typeof [] === 'object', and
 * typeof new Date() === 'object'. We need to be strict here because
 * setState({ ...state, ...partialState }) would silently break with
 * non-object inputs.
 *
 * @param {*} val
 * @returns {boolean}
 */
function isPlainObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

// =============================================================================
// USAGE EXAMPLE
// =============================================================================
//
// --- Creating and sharing the store: ---
//
//   // Option 1: Global (simple)
//   window.__SHARED_STORE__ = window.__SHARED_STORE__ || new SharedStore({
//     user: null,
//     cart: { items: [], total: 0 },
//     theme: 'light',
//   });
//   const store = window.__SHARED_STORE__;
//
//   // Option 2: Module Federation shared module
//   // In webpack.config.js: shared: { './shared-store': { singleton: true } }
//
// --- In Micro Frontend A (Auth — the writer): ---
//
//   // After successful login
//   store.setState({
//     user: { id: 'u-123', name: 'Jane', role: 'admin' },
//   });
//
// --- In Micro Frontend B (Nav — the reader): ---
//
//   // On mount, read current state AND subscribe to changes
//   const currentUser = store.getState().user;
//   if (currentUser) {
//     renderUserMenu(currentUser);
//   }
//
//   const unsubscribe = store.subscribe((newState) => {
//     renderUserMenu(newState.user);
//   });
//
//   // On unmount
//   unsubscribe();
//
// --- Late mount scenario (why stores beat events): ---
//
//   // MF-A sets user at time T=0
//   store.setState({ user: { name: 'Jane' } });
//
//   // MF-B mounts at time T=5 (missed the setState call)
//   // But it can still read the current state!
//   const user = store.getState().user; // { name: 'Jane' } ✅
//   // With events, MF-B would have no way to know the user is logged in.
//
// =============================================================================

// =============================================================================
// EXPORTS
// =============================================================================

export { SharedStore };

// For non-module environments
if (typeof window !== 'undefined') {
  window.MFSharedStore = SharedStore;
}
