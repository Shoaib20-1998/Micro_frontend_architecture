# Inter-Micro-Frontend Communication Patterns

This module demonstrates three communication patterns for micro frontends, progressing from loosest to tightest coupling. Each pattern is implemented as a standalone, framework-agnostic JavaScript module with heavy inline annotations explaining the "why" behind every decision.

## The Three Patterns

| File | Pattern | Coupling | Best For |
|------|---------|----------|----------|
| `custom-events.js` | Custom Browser Events | Loose | One-way notifications, fire-and-forget |
| `event-bus.js` | Pub/Sub Event Bus | Moderate | Controlled messaging with error isolation |
| `shared-store.js` | Observable Shared Store | Tight | Shared state that late arrivals need to read |

## Pattern Comparison Matrix

| Criteria | Custom Events | Event Bus | Shared Store |
|----------|--------------|-----------|--------------|
| **Coupling** | Loose — only share event name string | Moderate — share bus instance + event names | Tight — share store instance + state shape |
| **Dependencies** | None (browser-native) | Shared JS object | Shared JS object |
| **Late subscriber support** | ❌ Missed events are lost | ❌ Missed events are lost | ✅ `getState()` returns current state |
| **Error isolation** | N/A (browser handles it) | ✅ Per-subscriber try/catch | ✅ Per-subscriber try/catch |
| **Debugging** | Hard — no built-in logging | Medium — can add middleware/logging | Easy — state is inspectable at any time |
| **Framework dependency** | None | None | None |
| **Works in Web Workers** | ❌ No DOM in workers | ✅ Pure JS | ✅ Pure JS |
| **Works with Shadow DOM** | ✅ With `composed: true` | ✅ No DOM dependency | ✅ No DOM dependency |
| **Scalability** | High — no shared runtime | Medium — single bus instance | Low-Medium — all changes notify all subscribers |
| **Type safety** | ❌ Payload is untyped | ❌ Payload is untyped | ❌ State shape is untyped (add TS for safety) |
| **Delivery guarantee** | None (fire-and-forget) | Synchronous delivery to current subscribers | Synchronous notification to current subscribers |
| **Persistence** | None | None | State persists in memory until page unload |

## When to Use Each Pattern

### Custom Events
Use when micro frontends need to send **one-way notifications** without caring if anyone is listening. Examples:
- "User logged out" — broadcast to all MFs
- "Theme changed" — any MF can react
- Analytics events — fire and forget

### Event Bus
Use when you need **more control** than raw events — error isolation, subscriber counting, logging middleware — but don't need shared state. Examples:
- Cross-MF feature flags toggled at runtime
- Coordinated UI updates (e.g., "sidebar collapsed" → other MFs adjust layout)
- Communication between MFs that load/unload frequently

### Shared Store
Use when micro frontends need to **read each other's current state**, not just react to changes. Examples:
- User authentication state (logged-in user object)
- Shopping cart contents shared between product and checkout MFs
- Global configuration (locale, permissions, feature flags)

## Architecture Decision: How to Share the Instance

The event bus and shared store both require micro frontends to reference the **same instance**. Here are the three main strategies:

### 1. Window Global (Simplest)
```js
// In shell app or a shared bootstrap script
window.__EVENT_BUS__ = window.__EVENT_BUS__ || new EventBus();
window.__SHARED_STORE__ = window.__SHARED_STORE__ || new SharedStore({ user: null });

// In any micro frontend
const bus = window.__EVENT_BUS__;
const store = window.__SHARED_STORE__;
```
**Pros:** Zero setup, works with any loading mechanism.
**Cons:** Pollutes global scope, no encapsulation, hard to test.

### 2. Module Federation Shared Module (Recommended for MF setups)
```js
// webpack.config.js (in each micro frontend)
shared: {
  './communication/event-bus': { singleton: true, eager: true },
  './communication/shared-store': { singleton: true, eager: true },
}
```
**Pros:** Scoped sharing, version management, singleton guarantee.
**Cons:** Tied to Module Federation, requires webpack config coordination.

### 3. Dependency Injection via Shell (Most Testable)
```js
// Shell app passes instances to micro frontends via props/context
registerApplication({
  name: 'mf-cart',
  app: () => System.import('mf-cart'),
  activeWhen: '/cart',
  customProps: {
    eventBus: sharedBus,
    store: sharedStore,
  },
});

// In the micro frontend's mount hook
export function mount(props) {
  const { eventBus, store } = props;
  // Use injected instances — easy to mock in tests
}
```
**Pros:** Explicit dependencies, easy to test with mocks, no globals.
**Cons:** Requires shell to know about communication infrastructure.

---

## Interview Preparation

### Question 1: How would you implement communication between micro frontends that are built by different teams?

**Model Answer:**

"I'd evaluate three patterns based on the use case:

For **simple notifications** where the sender doesn't care if anyone is listening — like 'user logged out' or 'theme changed' — I'd use **custom browser events**. They're zero-dependency, framework-agnostic, and the loosest coupling possible. The trade-off is no delivery guarantee and no way for late-mounting MFs to catch up.

For **coordinated messaging** where I need error isolation and observability — like feature flag changes that multiple MFs react to — I'd use a **shared event bus**. It gives me per-subscriber error isolation (one team's bug doesn't break another team's handler), subscriber counting for debugging, and the ability to add logging middleware. The coupling cost is that all MFs need a reference to the same bus instance.

For **shared state** where MFs need to read current values, not just react to changes — like authentication state or a shopping cart — I'd use a **shared observable store**. Late-mounting MFs can call `getState()` to catch up, which events can't do. The trade-off is tighter coupling around the state shape — all teams need to agree on the schema.

In practice, I'd often use a combination: a shared store for critical shared state (auth, cart) and custom events for transient notifications (analytics, UI hints)."

### Question 2: What are the risks of using a shared global state store across micro frontends, and how would you mitigate them?

**Model Answer:**

"The main risks are:

1. **Schema coupling** — all MFs depend on the state shape. If Team A renames `user.name` to `user.displayName`, Team B's MF breaks. I'd mitigate this by namespacing state by domain (`{ auth: {...}, cart: {...} }`) and having each team own their namespace. Cross-namespace reads go through selector functions that act as a stable API.

2. **Uncontrolled writes** — any MF can overwrite any state. There's no access control. I'd mitigate this with a convention: each namespace has one 'owner' MF that writes to it, and others only read. For enforcement, you could wrap setState with a permissions check, but convention usually suffices.

3. **Performance at scale** — every `setState()` notifies every subscriber, even if the change is irrelevant to them. I'd add selector-based subscriptions: `store.subscribe(state => state.cart, callback)` so callbacks only fire when their slice changes. Libraries like Zustand do this well.

4. **Memory leaks** — subscribers that don't unsubscribe on unmount hold references to detached MF code. I'd enforce the disposable pattern (subscribe returns unsubscribe) and add monitoring: log a warning if subscriber count grows beyond a threshold.

5. **Concurrency** — two MFs calling setState in the same tick with overlapping keys means last-write-wins. For critical state, I'd use a reducer pattern (like Redux) where updates are serialized through a single function."

### Question 3: Custom events vs. a shared event bus — when would you choose one over the other?

**Model Answer:**

"Custom browser events are my default for cross-MF communication because they have **zero coupling** — no shared instance, no shared library, just a string event name and a payload convention. They work across any framework, any bundler, and even across Shadow DOM boundaries with `composed: true`.

I'd switch to an event bus when I need:

- **Error isolation**: If subscriber A throws, subscriber B still gets the event. With raw DOM events, an error in one listener can break propagation depending on how it's handled.
- **Observability**: The bus can log every event, count subscribers, and add middleware. DOM events require browser DevTools to inspect.
- **Non-DOM environments**: If I need communication in a Web Worker or during SSR, DOM events aren't available. The bus is pure JS.
- **Subscriber management**: The bus gives me `subscriberCount()` and `clear()` for debugging and cleanup. DOM events don't expose their listener count.

The cost of the bus is that all MFs need a shared reference to the same instance. If I'm using Module Federation, I'd share it as a singleton module. If not, I'd attach it to `window` as a last resort.

Rule of thumb: if the communication is simple and one-directional, use custom events. If you need any kind of control, visibility, or error handling around the messaging, use a bus."

### Question 4: How would you debug a scenario where one micro frontend dispatches an event but another doesn't receive it?

**Model Answer:**

"I'd work through a systematic checklist:

1. **Event name mismatch** — the most common cause. Check for typos, casing differences, or namespace inconsistencies. I'd enforce a shared constants file or TypeScript enum for event names.

2. **Timing issue** — the listener wasn't registered when the event fired. This happens when MF-B mounts after MF-A dispatches. I'd check mount order and consider switching to a shared store if the consumer needs to catch up on missed events.

3. **Wrong target** — the event was dispatched on a DOM element that's not an ancestor of the listener's element. This is why I dispatch on `window` — it's the universal ancestor. If using Shadow DOM, check that `composed: true` is set.

4. **Listener was removed** — the consumer unsubscribed (intentionally or via a React re-render that recreated the effect without the dependency). I'd add a `subscriberCount()` check or temporary logging.

5. **Error in listener** — the listener received the event but threw before completing its work. Check the console for errors. With an event bus, errors are caught and logged per-subscriber.

For prevention, I'd add development-mode logging middleware to the event bus that logs every publish and subscribe call with timestamps. In production, I'd use structured logging that can be queried in your observability platform."

### Question 5: If you were designing a micro frontend communication layer from scratch for a large organization (20+ micro frontends), what would you build?

**Model Answer:**

"At that scale, I'd build a **layered communication architecture**:

**Layer 1 — Shared Store** for critical cross-cutting state: authentication, user preferences, feature flags, permissions. This is the state that almost every MF needs. I'd use a Redux-like store with namespaced slices, selector-based subscriptions for performance, and strict ownership rules (one team owns each slice).

**Layer 2 — Event Bus** for domain events that multiple MFs react to: 'order placed', 'cart updated', 'notification received'. I'd add schema validation on publish (reject events that don't match the expected shape), dead-letter logging for events with no subscribers, and a middleware pipeline for cross-cutting concerns (logging, analytics, rate limiting).

**Layer 3 — Direct imports** via Module Federation for tightly coupled components that are really shared UI (design system components, utility functions). These aren't communication — they're shared code.

I'd avoid custom browser events at this scale because they're too hard to debug without tooling. The event bus gives me the observability I need.

For governance, I'd maintain a central event catalog (a markdown file or a simple registry service) that documents every event name, its payload schema, its owner team, and its consumers. This prevents namespace collisions and makes it easy for new teams to discover what events are available."

---

## Files in This Module

- **`custom-events.js`** — Dispatch/listen pattern using the native `CustomEvent` API. Loosest coupling, zero dependencies, but no delivery guarantees.
- **`event-bus.js`** — Pub/sub `EventBus` class with `subscribe()`, `publish()`, `unsubscribe()`. Error isolation per subscriber, introspectable, but requires shared instance.
- **`shared-store.js`** — Observable `SharedStore` with `getState()`, `setState()`, `subscribe()`. Single source of truth with late-subscriber support, but tightest coupling around state shape.

Each file is standalone and runnable. Read the inline annotations for deep architectural context.
