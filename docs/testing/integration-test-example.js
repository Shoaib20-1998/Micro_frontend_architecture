/**
 * =============================================================================
 * INTEGRATION TEST EXAMPLE — Testing Communication Between Micro Frontends
 * =============================================================================
 *
 * Framework: Jest (with JSDOM environment)
 * Target:    Cross-micro-frontend communication via event bus and shared store
 *
 * WHY INTEGRATION TESTS IN MICRO FRONTENDS?
 * ------------------------------------------
 * Unit tests prove each micro frontend works alone. But micro frontends don't
 * live alone — they communicate. Integration tests verify that when MF-A
 * publishes an event, MF-B reacts correctly. This is the "contract" between
 * teams.
 *
 * Integration tests sit in the middle of the testing pyramid:
 *   - Slower than unit tests (need multiple components or modules loaded)
 *   - Faster than E2E tests (no browser, no real servers)
 *   - Catch a different class of bugs: serialization mismatches, event name
 *     typos, payload shape disagreements, timing issues
 *
 * WHAT INTEGRATION TESTS COVER:
 * - Event bus: Publisher sends event → subscriber receives correct payload
 * - Shared store: One MF updates state → another MF reads the updated state
 * - Custom events: One MF dispatches a DOM event → another MF handles it
 * - Contract validation: The payload shape matches what both sides expect
 *
 * WHAT INTEGRATION TESTS DO NOT COVER:
 * - Visual layout of the composed application (that's E2E)
 * - Webpack/Module Federation loading mechanics (that's build testing)
 * - Network failures between host and remotes (that's E2E or chaos testing)
 *
 * WHO OWNS INTEGRATION TESTS?
 * ----------------------------
 * This is a key architectural decision. Options:
 *   1. The CONSUMING team writes them (they care about the contract)
 *   2. A shared "platform" team writes them (neutral ground)
 *   3. Both teams collaborate on a shared test suite (contract testing)
 *
 * Option 3 is ideal but requires coordination. In practice, most teams start
 * with option 1 and evolve toward option 3 as the architecture matures.
 *
 * INTERVIEW TIP:
 * "Integration tests for micro frontends verify the communication contracts
 * between independently deployed apps. The key challenge is ownership — who
 * writes and maintains these tests? I'd advocate for contract-based testing
 * where both the publisher and consumer agree on the event schema, and the
 * integration test validates that contract."
 */

// =============================================================================
// TEST SETUP
// =============================================================================

/**
 * ANNOTATION: We import the actual communication modules, not mocks.
 * ------------------------------------------------------------------
 * Integration tests should use real implementations wherever possible.
 * We're testing that the EventBus and SharedStore actually work as the
 * communication bridge between micro frontends. Mocking them would
 * defeat the purpose — we'd just be testing our mocks.
 *
 * The only things we "simulate" are the micro frontend behaviors
 * (publishing events, updating state) since we can't mount full React
 * apps in a Jest environment without significant setup.
 */
import { EventBus } from '../../docs/communication/event-bus.js';
import { SharedStore } from '../../docs/communication/shared-store.js';

// =============================================================================
// SCENARIO 1: Event Bus Communication Between Two Micro Frontends
// =============================================================================

describe('Integration: Event Bus Communication', () => {
  let bus;

  beforeEach(() => {
    /**
     * ANNOTATION: Fresh bus instance per test
     * ----------------------------------------
     * Each test gets its own EventBus to prevent subscriber leaks between
     * tests. In production, all MFs share one bus instance. In tests, we
     * isolate to prevent flaky test interactions.
     *
     * This is a common pattern: production uses singletons, tests use
     * fresh instances. The EventBus class supports both because it's not
     * a singleton by default — the singleton behavior is configured at
     * the application level (window.__EVENT_BUS__), not in the class.
     */
    bus = new EventBus();
  });

  /**
   * TEST 1: Products MF publishes "add to cart" → Cart MF receives it
   * ------------------------------------------------------------------
   * This is the most common integration scenario: one MF triggers an action
   * that another MF needs to react to.
   *
   * WHAT WE'RE TESTING:
   * - The event name contract ('cart:item-added') is consistent
   * - The payload shape matches what the consumer expects
   * - The consumer's callback is invoked with the correct data
   *
   * WHAT COULD GO WRONG IN PRODUCTION:
   * - Team A renames the event from 'cart:item-added' to 'cart:add-item'
   *   without telling Team B → this test catches it
   * - Team A changes the payload from { productId } to { id } → caught
   * - Team A stops dispatching the event entirely → caught
   */
  test('Products MF publishes item-added → Cart MF receives the product', () => {
    // --- SIMULATE: Cart MF subscribes to cart events on mount ---
    const cartReceivedItems = [];
    bus.subscribe('cart:item-added', (payload) => {
      cartReceivedItems.push(payload);
    });

    // --- SIMULATE: Products MF dispatches when user clicks "Add to Cart" ---
    const productPayload = {
      productId: 1,
      name: 'Wireless Headphones',
      price: 79.99,
      quantity: 1,
    };
    bus.publish('cart:item-added', productPayload);

    // --- VERIFY: Cart MF received the exact payload ---
    expect(cartReceivedItems).toHaveLength(1);
    expect(cartReceivedItems[0]).toEqual(productPayload);

    /**
     * ANNOTATION: Why toEqual and not toBe?
     * --------------------------------------
     * toEqual does a deep equality check (compares object contents).
     * toBe checks reference equality (same object in memory).
     *
     * In event-based communication, the publisher creates the payload
     * object and the subscriber receives it. They're the same reference
     * in a synchronous bus, but in async systems (or if the bus clones
     * payloads for safety), they might be different references with the
     * same content. Using toEqual is more robust.
     */
  });

  /**
   * TEST 2: Multiple subscribers receive the same event
   * ---------------------------------------------------
   * In a real app, multiple micro frontends might listen to the same event.
   * Example: When a user logs in, the Nav MF updates the user menu, the
   * Analytics MF tracks the login, and the Notifications MF fetches alerts.
   *
   * This test verifies the broadcast behavior of the event bus.
   */
  test('multiple MFs receive the same event', () => {
    const navReceived = [];
    const analyticsReceived = [];

    // Two different MFs subscribe to the same event
    bus.subscribe('user:logged-in', (data) => navReceived.push(data));
    bus.subscribe('user:logged-in', (data) => analyticsReceived.push(data));

    // Auth MF publishes login event
    const loginPayload = { userId: 'u-42', role: 'admin' };
    bus.publish('user:logged-in', loginPayload);

    // Both MFs should receive the same payload
    expect(navReceived).toEqual([loginPayload]);
    expect(analyticsReceived).toEqual([loginPayload]);
  });

  /**
   * TEST 3: Error in one subscriber doesn't break others
   * ----------------------------------------------------
   * This is the "bulkhead" pattern — one team's buggy handler shouldn't
   * crash another team's micro frontend. The event bus isolates errors
   * per subscriber.
   *
   * WHY THIS IS AN INTEGRATION CONCERN:
   * In unit tests, you test one subscriber at a time. The error isolation
   * behavior only matters when MULTIPLE subscribers from DIFFERENT teams
   * are listening to the same event. That's inherently cross-MF.
   */
  test('error in Cart MF handler does not break Nav MF handler', () => {
    const navReceived = [];

    // Cart MF has a buggy handler that throws
    bus.subscribe('user:logged-in', () => {
      throw new Error('Cart MF bug: cannot read property of undefined');
    });

    // Nav MF has a working handler
    bus.subscribe('user:logged-in', (data) => navReceived.push(data));

    // Suppress console.error for cleaner test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    // Auth MF publishes — should not throw despite Cart's bug
    bus.publish('user:logged-in', { userId: 'u-42' });

    // Nav MF still received the event
    expect(navReceived).toHaveLength(1);
    expect(navReceived[0]).toEqual({ userId: 'u-42' });

    consoleSpy.mockRestore();
  });

  /**
   * TEST 4: Unsubscribe prevents stale callbacks after MF unmount
   * --------------------------------------------------------------
   * When a micro frontend unmounts (user navigates away), it must
   * unsubscribe from the event bus. Otherwise, the bus holds a reference
   * to a callback that targets a detached DOM — causing memory leaks
   * and potential errors.
   *
   * This test simulates the mount → subscribe → unmount → unsubscribe
   * lifecycle and verifies no stale callbacks fire.
   */
  test('unsubscribed MF does not receive events after unmount', () => {
    const received = [];
    const unsubscribe = bus.subscribe('cart:updated', (data) => {
      received.push(data);
    });

    // MF receives event while mounted
    bus.publish('cart:updated', { itemCount: 3 });
    expect(received).toHaveLength(1);

    // MF unmounts and unsubscribes
    unsubscribe();

    // Event published after unmount — should NOT be received
    bus.publish('cart:updated', { itemCount: 5 });
    expect(received).toHaveLength(1); // Still 1, not 2
  });
});

// =============================================================================
// SCENARIO 2: Shared Store Communication Between Two Micro Frontends
// =============================================================================

describe('Integration: Shared Store Communication', () => {
  let store;

  beforeEach(() => {
    /**
     * ANNOTATION: Initialize store with a realistic initial state
     * -----------------------------------------------------------
     * The initial state shape represents the "contract" between all
     * micro frontends that use the store. In production, this shape
     * would be documented and versioned. Changes to it are a breaking
     * change that affects all consumers.
     */
    store = new SharedStore({
      user: null,
      cart: { items: [], total: 0 },
      theme: 'light',
    });
  });

  /**
   * TEST 5: Auth MF updates user → Nav MF reads updated user
   * ---------------------------------------------------------
   * The classic shared state scenario: one MF writes, another reads.
   *
   * WHAT WE'RE TESTING:
   * - setState() in one "MF" is visible via getState() in another "MF"
   * - The state shape is preserved (other fields aren't clobbered)
   * - Subscribers are notified of the change
   */
  test('Auth MF sets user state → Nav MF reads it via getState()', () => {
    // --- SIMULATE: Auth MF logs in the user ---
    store.setState({
      user: { id: 'u-42', name: 'Jane', role: 'admin' },
    });

    // --- SIMULATE: Nav MF reads current state on mount ---
    const state = store.getState();

    expect(state.user).toEqual({ id: 'u-42', name: 'Jane', role: 'admin' });
    // Other state slices should be untouched (shallow merge)
    expect(state.cart).toEqual({ items: [], total: 0 });
    expect(state.theme).toBe('light');
  });

  /**
   * TEST 6: Late-mounting MF gets current state
   * --------------------------------------------
   * This is the key advantage of a store over events. If MF-B mounts
   * AFTER MF-A has already updated the state, MF-B can call getState()
   * to get the current value. With events, MF-B would have missed the
   * update entirely.
   *
   * REAL-WORLD SCENARIO:
   * User logs in (Auth MF sets user state). User then navigates to the
   * Dashboard page (Dashboard MF mounts for the first time). Dashboard
   * calls store.getState().user and gets the logged-in user — even though
   * it wasn't mounted when the login happened.
   */
  test('late-mounting MF reads state set before it subscribed', () => {
    // Auth MF sets user at time T=0
    store.setState({ user: { id: 'u-42', name: 'Jane' } });

    // Dashboard MF mounts at time T=5 and reads state
    // (no subscription needed — just getState)
    const user = store.getState().user;

    expect(user).toEqual({ id: 'u-42', name: 'Jane' });
  });

  /**
   * TEST 7: Subscriber notification on state change
   * ------------------------------------------------
   * Verifies that when one MF updates the store, all subscribed MFs
   * are notified with the new state.
   */
  test('Cart MF is notified when Products MF updates cart state', () => {
    const cartUpdates = [];

    // Cart MF subscribes to store changes
    store.subscribe((newState) => {
      cartUpdates.push(newState.cart);
    });

    // Products MF adds an item to the cart
    store.setState({
      cart: { items: [{ id: 1, name: 'Headphones' }], total: 79.99 },
    });

    expect(cartUpdates).toHaveLength(1);
    expect(cartUpdates[0]).toEqual({
      items: [{ id: 1, name: 'Headphones' }],
      total: 79.99,
    });
  });

  /**
   * TEST 8: Multiple MFs updating different state slices
   * ----------------------------------------------------
   * In a real app, different teams own different state slices. Auth owns
   * `user`, Products owns `cart`, Settings owns `theme`. This test verifies
   * that updates to one slice don't clobber another.
   *
   * WHY THIS IS AN INTEGRATION CONCERN:
   * In unit tests, you test one MF's state updates. The "don't clobber
   * other slices" behavior only matters when multiple MFs write to the
   * same store — that's inherently cross-team.
   */
  test('concurrent updates to different state slices are preserved', () => {
    // Auth MF updates user
    store.setState({ user: { id: 'u-42' } });

    // Settings MF updates theme
    store.setState({ theme: 'dark' });

    // Products MF updates cart
    store.setState({ cart: { items: ['item1'], total: 10 } });

    // All slices should coexist
    const state = store.getState();
    expect(state.user).toEqual({ id: 'u-42' });
    expect(state.theme).toBe('dark');
    expect(state.cart).toEqual({ items: ['item1'], total: 10 });
  });
});

// =============================================================================
// SCENARIO 3: Custom DOM Events Between Micro Frontends
// =============================================================================

describe('Integration: Custom DOM Events', () => {
  /**
   * TEST 9: CustomEvent dispatch and receive across MF boundaries
   * --------------------------------------------------------------
   * Custom DOM events use the browser's native event system. Any micro
   * frontend can dispatch events on `window`, and any other MF can listen.
   *
   * This is the loosest coupling option — no shared instance needed, just
   * agreement on event names and payload shapes.
   */
  test('Products MF dispatches CustomEvent → Cart MF receives it', () => {
    const received = [];

    // Cart MF listens for cart events on window
    const handler = (event) => {
      received.push(event.detail);
    };
    window.addEventListener('cart:item-added', handler);

    // Products MF dispatches when user adds an item
    const event = new CustomEvent('cart:item-added', {
      detail: { productId: 1, name: 'Headphones', price: 79.99 },
    });
    window.dispatchEvent(event);

    // Cart MF received the event with correct payload
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({
      productId: 1,
      name: 'Headphones',
      price: 79.99,
    });

    // Cleanup — always remove listeners to prevent test pollution
    window.removeEventListener('cart:item-added', handler);
  });
});

// =============================================================================
// KEY TAKEAWAYS FOR INTERVIEW PREP
// =============================================================================
//
// 1. Integration tests verify the CONTRACTS between micro frontends — event
//    names, payload shapes, state schemas — not the internal implementation.
//
// 2. Use real implementations (EventBus, SharedStore), not mocks. The point
//    is to test the actual communication path.
//
// 3. Test error isolation: one MF's buggy handler should not break another
//    MF's functionality. This is the "bulkhead" pattern.
//
// 4. Test the late-mount scenario: a MF that mounts after state was set
//    should still be able to read current state (store advantage over events).
//
// 5. Test unsubscribe/cleanup: MFs that unmount must stop receiving events
//    to prevent memory leaks and stale callback errors.
//
// 6. Ownership question: who writes integration tests? Ideally, both teams
//    collaborate on a shared contract test suite. In practice, the consuming
//    team often writes them first.
//
// 7. Integration tests run in CI without real browsers or servers — they're
//    fast enough to run on every commit, unlike E2E tests.
// =============================================================================
