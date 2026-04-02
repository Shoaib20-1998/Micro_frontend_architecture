# Module Federation Micro Frontend Architecture

## Table of Contents

- [How Module Federation Works at Runtime](#how-module-federation-works-at-runtime)
- [Shared Dependency Negotiation — Step by Step](#shared-dependency-negotiation--step-by-step)
- [When to Choose Module Federation](#when-to-choose-module-federation)
- [Trade-Offs: Module Federation vs Single-Spa](#trade-offs-module-federation-vs-single-spa)
- [Interview Preparation: Module Federation](#interview-preparation-module-federation)

---

## How Module Federation Works at Runtime

Module Federation is a Webpack 5 feature that lets independently built and deployed applications share code at runtime. No monorepo. No npm publish step. No coordinated builds. Each app is its own webpack build, and they discover and load each other's code when the page loads.

The key insight: Module Federation turns each webpack build into a **container** — a runtime entity that can expose modules to other containers and consume modules from them. This is fundamentally different from npm packages (build-time sharing) or CDN scripts (static sharing). Module Federation sharing is dynamic, version-aware, and negotiated at runtime.

### The Container Interface

When you add `ModuleFederationPlugin` to a webpack config, webpack generates a **container interface** for that build. The container interface is a small JavaScript object with two functions:

```js
// This is what webpack generates inside remoteEntry.js (simplified)
window['remoteProducts'] = {
  get(moduleName) {
    // Returns a Promise that resolves to a module factory
    // e.g., get('./ProductList') → Promise<() => module>
  },
  init(sharedScope) {
    // Receives the host's shared dependency registry
    // Registers this container's shared deps into the scope
    // Enables runtime version negotiation
  }
};
```

Every container — host and remotes alike — gets this interface. The `name` field in your `ModuleFederationPlugin` config determines the global variable name (`window['remoteProducts']`).

### What `remoteEntry.js` Contains

When webpack builds a remote, the `ModuleFederationPlugin` generates a file called `remoteEntry.js` (configurable via the `filename` option). This file is intentionally small — typically 2-5KB — because the host needs to fetch it before it can load any remote modules.

Here's what `remoteEntry.js` does:

1. **Registers the container** on the global scope (`window['remoteProducts']`)
2. **Declares a module map** — a mapping from exposed module names to chunk-loading functions:
   ```js
   // Simplified internal structure
   var moduleMap = {
     './ProductList': () => import('./src_ProductList_js.chunk.js'),
   };
   ```
3. **Provides the `get()` function** — the host calls this to load a specific exposed module
4. **Provides the `init()` function** — the host calls this to pass its shared dependency scope

The actual component code (ProductList, Cart, etc.) is NOT in `remoteEntry.js`. It's in separate chunks that are loaded on demand when `get()` is called. This means the host pays a tiny upfront cost (fetching `remoteEntry.js`) and only downloads the actual component code when it's needed.

### The `get()` Function — Module Loading Flow

When the host does `import('remoteProducts/ProductList')`, here's the complete runtime flow:

```
Step 1: Webpack intercepts the import() call
         ↓
Step 2: Checks if 'remoteProducts' container is loaded
         ↓ (if not loaded)
Step 3: Injects <script src="http://localhost:3001/remoteEntry.js">
         ↓
Step 4: remoteEntry.js executes, registers window['remoteProducts']
         ↓
Step 5: Webpack calls window['remoteProducts'].init(sharedScope)
         → Shared dependencies are negotiated (see next section)
         ↓
Step 6: Webpack calls window['remoteProducts'].get('./ProductList')
         ↓
Step 7: get() triggers a dynamic import for the ProductList chunk
         → The chunk is fetched from http://localhost:3001/src_ProductList_js.chunk.js
         ↓
Step 8: The chunk executes, using shared React (not its own copy)
         ↓
Step 9: get() resolves with a module factory function
         ↓
Step 10: Webpack executes the factory, returns the module exports
          ↓
Step 11: React.lazy() receives the component, renders it
```

From React's perspective, this is just a normal `React.lazy()` dynamic import. The Module Federation machinery is completely transparent — your components don't know they're being loaded from a remote server.

### The `init()` Function — Shared Scope Initialization

The `init()` function is the handshake between containers. When the host loads a remote's `remoteEntry.js`, it calls `init(sharedScope)` before calling `get()`. This passes the host's shared dependency registry to the remote, enabling version negotiation.

```js
// Simplified: what happens when the host calls remoteProducts.init(sharedScope)
function init(sharedScope) {
  // 1. Receive the host's shared scope (contains React 18.2.0, etc.)
  // 2. Register our own shared deps into the scope (if we have newer/different versions)
  // 3. Store the scope reference for later use by get()
  //
  // After init(), when our ProductList chunk loads and needs React,
  // it checks the shared scope first instead of bundling its own copy.
}
```

The `init()` call MUST happen before `get()`. This is why the async boundary pattern (`index.js → import('./bootstrap')`) is critical — it gives webpack's runtime time to call `init()` on all remotes before any component code executes.

### The Async Boundary Pattern

Every app in a Module Federation setup (host AND remotes) uses this pattern:

```js
// index.js — the webpack entry point
import('./bootstrap');  // That's it. One line.

// bootstrap.js — the REAL entry point
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

Why the indirection? The `import('./bootstrap')` creates an **async chunk boundary**. This gives webpack's Module Federation runtime a chance to:

1. Load `remoteEntry.js` files from all declared remotes
2. Call `init(sharedScope)` on each remote container
3. Negotiate which version of shared dependencies to use
4. THEN load `bootstrap.js` with the negotiated shared deps

Without this boundary, `bootstrap.js` would load synchronously, React would be bundled directly into the entry chunk, and shared dependency negotiation would never happen. Result: duplicate React instances, broken hooks, and confused developers.

See `host-app/src/index.js` for the fully annotated implementation.

---

## Shared Dependency Negotiation — Step by Step

Shared dependency negotiation is the mechanism that prevents loading React (or any shared library) multiple times across containers. Here's exactly how it works in our setup with one host and two remotes.

### The Setup

All three apps declare the same shared config:

```js
// In every webpack.config.js (host, remote-products, remote-cart)
shared: {
  react:       { singleton: true, requiredVersion: '^18.0.0' },
  'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
}
```

### Step-by-Step Negotiation

**Step 1 — Host loads and initializes its shared scope**

The host app loads first (it's the page's entry point). Webpack's runtime creates a **shared scope** — an internal registry that tracks which shared dependencies are available and their versions.

```
Shared Scope (after host init):
┌─────────────┬─────────┬────────────┬───────────┐
│ Package     │ Version │ Singleton? │ From      │
├─────────────┼─────────┼────────────┼───────────┤
│ react       │ 18.2.0  │ yes        │ host-app  │
│ react-dom   │ 18.2.0  │ yes        │ host-app  │
└─────────────┴─────────┴────────────┴───────────┘
```

**Step 2 — Host fetches remote-products' `remoteEntry.js`**

When `React.lazy(() => import('remoteProducts/ProductList'))` triggers, webpack fetches `http://localhost:3001/remoteEntry.js`. This is a small file (~2KB) that registers the remote's container interface.

**Step 3 — Host calls `remoteProducts.init(sharedScope)`**

The host passes its shared scope to the remote. The remote's `init()` function checks each of its shared dependencies against the scope:

```
Remote Products checks:
  "I need react ^18.0.0"
  → Shared scope has react 18.2.0
  → 18.2.0 satisfies ^18.0.0? YES
  → singleton: true? YES → MUST use the shared version
  → Decision: REUSE host's React ✓

  "I need react-dom ^18.0.0"
  → Same check, same result
  → Decision: REUSE host's ReactDOM ✓
```

**Step 4 — Host calls `remoteProducts.get('./ProductList')`**

Now the host loads the actual ProductList component. When the ProductList chunk executes, any `import React from 'react'` inside it resolves to the shared scope's React — the same instance the host is using.

**Step 5 — Host fetches remote-cart's `remoteEntry.js`**

Same process repeats for the second remote. The host fetches `http://localhost:3002/remoteEntry.js`.

**Step 6 — Host calls `remoteCart.init(sharedScope)` — same shared scope**

The critical detail: the host passes the **same** shared scope to both remotes. This means all three containers (host + 2 remotes) share a single dependency registry.

```
Shared Scope (final state):
┌─────────────┬─────────┬────────────┬───────────────────────────┐
│ Package     │ Version │ Singleton? │ Used by                   │
├─────────────┼─────────┼────────────┼───────────────────────────┤
│ react       │ 18.2.0  │ yes        │ host, products, cart      │
│ react-dom   │ 18.2.0  │ yes        │ host, products, cart      │
└─────────────┴─────────┴────────────┴───────────────────────────┘
```

Result: **ONE copy of React** loaded across three independently built applications.

### What Happens When Versions Are Compatible

If the host has React 18.2.0 and a remote requires `^18.0.0`:

- `18.2.0` satisfies `^18.0.0` (semver: same major, minor >= 0) → **shared**
- The remote uses the host's React instance
- No additional download needed
- This is the happy path and the most common scenario

### What Happens When Versions Are Incompatible

If the host has React 18.2.0 and a remote requires `^17.0.0`:

- `18.2.0` does NOT satisfy `^17.0.0` (different major version)
- **With `singleton: true` (default behavior):**
  - Webpack logs a console warning: "Unsatisfied version 18.2.0 of shared singleton module react"
  - The remote still uses the host's React 18.2.0 (singleton wins)
  - This may cause runtime errors if the remote relies on React 17-specific APIs
- **With `singleton: true` + `strictVersion: true`:**
  - Webpack throws a runtime error instead of a warning
  - The remote fails to load — caught by the ErrorBoundary
  - Safer, but more disruptive
- **Without `singleton` (version-range mode):**
  - The remote loads its own copy of React 17.x
  - Two React instances coexist — hooks will break if components cross the boundary
  - Only safe for libraries that don't rely on shared module-level state

### Singleton Behavior — Why It Matters for React

React hooks (`useState`, `useEffect`, etc.) store state in a module-level variable inside the React package. If two copies of React exist:

```
Host's React instance:     hooks state = { counter: 5 }
Remote's React instance:   hooks state = { }  ← empty, different object
```

When a remote component calls `useState()`, it writes to the remote's React state. But when React tries to reconcile the component tree, it reads from the host's React state. The mismatch causes the infamous error:

> "Invalid hook call. Hooks can only be called inside the body of a function component."

`singleton: true` prevents this by forcing all containers to use the exact same React instance. It's not optional for React — it's a requirement.

### The `eager` Option

By default, shared dependencies are loaded lazily — they're negotiated and loaded as part of the async boundary. The `eager: true` option changes this:

```js
shared: {
  react: { singleton: true, eager: true, requiredVersion: '^18.0.0' }
}
```

With `eager: true`, the dependency is bundled directly into the host's initial chunk instead of being loaded asynchronously. This means:

- **Advantage:** React is available immediately, no async negotiation delay
- **Disadvantage:** Increases the host's initial bundle size
- **When to use:** For the host's copy of critical dependencies that must be available before any remote loads

Remotes should generally NOT use `eager: true` — they should defer to the host's version via the shared scope.

---

## When to Choose Module Federation

### Good Fit Scenarios

- **Runtime code sharing between same-framework apps.** If all your micro frontends use React (or all use Angular), Module Federation's shared dependency negotiation eliminates duplicate framework loads. This is its killer feature — no other approach handles runtime deduplication as elegantly.

- **Component-level composition.** You need to embed a component from Team A's app inside Team B's page — not just route between separate apps. Module Federation's `import('remote/Component')` pattern makes this as simple as a dynamic import. Single-Spa's model is page-level; Module Federation's is component-level.

- **Independent deployment with shared code.** Teams deploy independently, but they share React, a design system, or utility libraries. Module Federation lets them share at runtime without publishing to npm or coordinating versions manually.

- **Gradual migration from a monolith.** You can start by extracting one component into a remote, consuming it from the monolith-turned-host. No big-bang rewrite — just move components out one at a time.

- **You're already using Webpack 5.** Module Federation is built into Webpack 5. If your build pipeline is already Webpack-based, adoption cost is low — it's a plugin configuration, not a framework migration.

### When Module Federation is NOT the Right Choice

- **Your micro frontends use different frameworks.** Module Federation can technically load Angular components into a React host, but it doesn't provide lifecycle management for cross-framework composition. Single-Spa's adapter libraries handle this much better.

- **You need explicit lifecycle management.** Module Federation has no concept of `bootstrap`, `mount`, or `unmount`. Components are loaded via `React.lazy()` and unmounted by React's normal reconciliation. If you need fine-grained control over when apps initialize and clean up, Single-Spa's lifecycle model is more appropriate.

- **You're not using Webpack.** Module Federation is a Webpack 5 feature. If your build tool is Vite, Rollup, esbuild, or Parcel, you can't use it directly. (Vite has experimental federation support via `vite-plugin-federation`, but it's not as mature.)

- **You need server-side rendering (SSR).** Module Federation's runtime negotiation happens in the browser. SSR support exists but is complex and less battle-tested than client-side federation. If SSR is a hard requirement, evaluate carefully.

---

## Trade-Offs: Module Federation vs Single-Spa

| Dimension | Module Federation | Single-Spa |
|---|---|---|
| **Composition model** | Component-level — `import('remote/Component')` embeds a component anywhere | Page-level — one app per route, activated by URL matching |
| **Code sharing** | Runtime sharing via `shared` config with version negotiation | None built-in — use CDN or import maps for shared libs |
| **Lifecycle management** | None — relies on React's rendering lifecycle (`lazy`, `Suspense`) | Explicit — `bootstrap`, `mount`, `unmount` hooks with state machine |
| **Framework mixing** | Possible but awkward — no adapter layer for cross-framework rendering | First-class — adapters for React, Angular, Vue, Svelte, etc. |
| **Build tool coupling** | Tightly coupled to Webpack 5 | Framework-agnostic — works with any bundler |
| **Error handling** | React Error Boundaries catch failed imports | Built-in error states + `addErrorHandler()` global handler |
| **Module system** | Webpack's native module system | SystemJS + import maps (or native ES modules) |
| **Dependency deduplication** | Automatic via `singleton` + `requiredVersion` negotiation | Manual — configure CDN externals or import map overrides |
| **Learning curve** | Webpack plugin config + async boundary pattern | New concepts: lifecycles, import maps, SystemJS |
| **Production maturity** | Widely adopted, growing ecosystem (Zack Jackson, creator, actively maintains) | Battle-tested at scale (IKEA, Spotify, many large enterprises) |

### When to Use Each

- **Module Federation** when your micro frontends share a framework, you need component-level composition, and you want automatic dependency deduplication.
- **Single-Spa** when you need to compose micro frontends built with different frameworks, you want explicit lifecycle control, or you're not using Webpack.
- **Both (Hybrid)** when you want Single-Spa's orchestration and lifecycle management combined with Module Federation's runtime code sharing. See the `Hybrid/` directory for this approach.

---

## Interview Preparation: Module Federation

### Q1: Explain how Module Federation's runtime loading works. What happens when a host app imports a component from a remote?

**Model Answer:**

Module Federation turns each webpack build into a "container" with a standardized interface. When the host does `import('remoteProducts/ProductList')`, here's what happens at runtime:

First, webpack's runtime checks if the `remoteProducts` container is already loaded. If not, it injects a `<script>` tag for the remote's `remoteEntry.js` — a small manifest file (~2-5KB) that registers the container on the global scope as `window['remoteProducts']`.

Once loaded, the host calls `init(sharedScope)` on the container. This is the shared dependency handshake — the host passes its registry of shared libraries (React, ReactDOM, etc.) to the remote. The remote checks each of its dependencies against the scope: if a compatible version exists and it's marked as singleton, the remote reuses it instead of loading its own copy.

After `init()`, the host calls `get('./ProductList')`. This triggers a dynamic import for the chunk containing the ProductList component. The chunk is fetched from the remote's server, executed using the shared dependencies from the scope, and the resulting module is returned to the host.

From React's perspective, this is transparent — `React.lazy()` receives a component just like any other dynamic import. The Module Federation machinery (container interface, shared scope negotiation, chunk loading) is handled entirely by webpack's runtime.

The critical architectural detail is the async boundary pattern: `index.js` does `import('./bootstrap')` instead of importing React directly. This creates an async chunk boundary that gives webpack's runtime time to negotiate shared dependencies before any application code executes. Without it, React would load synchronously and couldn't be deduplicated across containers.

### Q2: A remote team deploys a breaking change to their exposed component. How does Module Federation handle this, and what safeguards would you put in place?

**Model Answer:**

Module Federation has no built-in contract enforcement — it's a code-sharing mechanism, not a contract system. If the remote team changes their component's props interface or behavior, the host will load the new version at runtime and potentially break.

Here's my defense-in-depth strategy:

**Layer 1 — Error Boundaries.** Every remote import should be wrapped in its own React Error Boundary. If the new version throws during render (e.g., missing required prop), the boundary catches it and shows a fallback UI. The rest of the host keeps working. This is your last line of defense and should always be in place.

**Layer 2 — TypeScript or PropTypes at the boundary.** Define a shared interface (TypeScript types or PropTypes) for each exposed component. The host validates props before passing them to the remote component. This catches shape mismatches early, though it can't catch behavioral changes.

**Layer 3 — Versioned remote entry points.** Instead of always pointing to `remoteEntry.js`, use versioned filenames: `remoteEntry.v2.js`. The host pins to a specific version and only upgrades when the team has tested compatibility. This trades "always latest" for stability.

**Layer 4 — Integration tests in CI.** Run automated tests that compose the host with each remote's latest build. If a remote's change breaks the host, the CI pipeline catches it before production. This is the most reliable safeguard but requires infrastructure investment.

**Layer 5 — Feature flags or canary deploys.** Roll out the new remote version to a small percentage of users first. Monitor error rates and user metrics. If something breaks, roll back the remote without touching the host.

The key insight for the interviewer: Module Federation gives you runtime flexibility at the cost of runtime risk. The safeguards above are organizational and architectural — they're not built into the tool. Teams adopting Module Federation need to invest in these patterns, or they'll discover breaking changes in production.

### Q3: How does Module Federation's shared dependency negotiation prevent duplicate React instances? Walk through the singleton mechanism.

**Model Answer:**

React hooks store state in a module-level variable inside the React package. If two copies of React exist in the browser, hooks in one copy write to a different state store than the other copy reads from. This causes the "Invalid hook call" error — React thinks hooks are being called outside a component, but really they're just calling into the wrong React instance.

Module Federation prevents this with the `singleton: true` shared configuration. Here's the mechanism:

When the host loads, webpack's runtime creates a **shared scope** — an internal registry mapping package names to loaded instances. The host registers its React 18.2.0 in this scope.

When a remote's `remoteEntry.js` is loaded, the host calls `init(sharedScope)`, passing the same scope object. The remote's `init()` function checks: "I need `react` with `requiredVersion: '^18.0.0'`. Is there a compatible version in the scope?" It finds React 18.2.0, which satisfies `^18.0.0`.

Because `singleton: true` is set, the remote MUST use the scope's version — it cannot load its own copy even if it wanted to. When the remote's component chunks later execute and `import React from 'react'`, webpack's runtime intercepts this and returns the shared scope's React instance instead of bundling a separate copy.

The same scope is passed to ALL remotes. So if you have a host and five remotes, all six containers share the exact same React object in memory. One instance, one hooks state store, no conflicts.

If the versions are incompatible (e.g., remote needs `^17.0.0` but scope has `18.2.0`), the behavior depends on `strictVersion`:
- `strictVersion: false` (default): webpack logs a warning and uses the singleton anyway. This may cause runtime errors if the remote relies on removed APIs.
- `strictVersion: true`: webpack throws a runtime error, and the Error Boundary catches it. Safer but more disruptive.

The async boundary pattern (`index.js → import('./bootstrap')`) is what makes this negotiation possible. It creates a pause point where webpack can run `init()` on all remotes before any component code that needs React actually executes.

### Q4: You're designing a micro frontend architecture for a platform with 8 teams, all using React. Would you choose Module Federation or Single-Spa? Justify your decision.

**Model Answer:**

For 8 teams all on React, I'd choose Module Federation as the primary mechanism, with the option to add Single-Spa later if orchestration needs grow. Here's my reasoning:

**Why Module Federation fits:**

First, the "all on React" constraint is the deciding factor. Module Federation's killer feature — runtime shared dependency negotiation — eliminates the biggest performance concern with micro frontends: duplicate framework loads. With 8 remotes, loading React 8 times would be catastrophic for performance. Module Federation's `singleton: true` ensures one copy across all containers.

Second, 8 teams likely need component-level composition, not just page-level routing. Team A's product card might appear on Team B's search results page and Team C's recommendations widget. Module Federation's `import('remote/Component')` pattern makes this natural. Single-Spa's model is "one app per route" — embedding components across apps requires parcels, which are more complex.

Third, all teams share the same build tool (Webpack 5, since they're all React). Module Federation's Webpack coupling isn't a limitation here — it's an advantage, because the shared config can be standardized across all 8 teams via a shared webpack preset package.

**What I'd add on top:**

- A shared webpack config package (`@myorg/webpack-mf-config`) that standardizes `ModuleFederationPlugin` options, especially the `shared` config. Version drift across 8 remotes is the #1 operational risk.
- Error Boundaries around every remote import, with centralized error reporting.
- A lightweight service discovery layer — instead of hardcoding remote URLs in webpack config, fetch them from a configuration service. This decouples deployment URLs from build-time config.
- Integration tests that compose the host with all remotes in CI.

**When I'd reconsider:**

If some teams later adopt Vue or Angular, I'd introduce Single-Spa as an orchestration layer on top of Module Federation (the Hybrid approach). Module Federation handles code sharing; Single-Spa handles cross-framework lifecycle management. But I wouldn't add that complexity upfront when everyone is on React.

### Q5: What are the security implications of Module Federation, and how would you mitigate them?

**Model Answer:**

Module Federation loads and executes JavaScript from remote servers at runtime. This is fundamentally a supply-chain security concern — you're trusting that the code at `http://remote-server/remoteEntry.js` is safe to execute in your application's context.

**Risk 1 — Compromised remote server.** If an attacker gains control of a remote's deployment pipeline or CDN, they can inject malicious code into `remoteEntry.js`. The host will fetch and execute it with full access to the page's DOM, cookies, localStorage, and any authenticated API sessions.

Mitigation: Subresource Integrity (SRI) hashes on remote entry scripts, though this is difficult with Module Federation since chunk hashes change on every build. Alternatively, serve remotes from the same origin or a trusted CDN with strict access controls. Use Content Security Policy (CSP) headers to restrict which origins can serve scripts.

**Risk 2 — Shared scope poisoning.** A malicious remote could manipulate the shared scope during `init()` — for example, replacing the shared React instance with a modified version that exfiltrates data.

Mitigation: This is hard to prevent at the Module Federation level. The best defense is controlling who can deploy remotes (CI/CD pipeline security, code review requirements) and monitoring for unexpected changes in shared scope behavior.

**Risk 3 — Data leakage between remotes.** Since all remotes run in the same browser context, a remote can access `document.cookie`, `localStorage`, and any global state. There's no sandboxing between Module Federation containers.

Mitigation: Don't store sensitive data in globally accessible locations. Use `httpOnly` cookies for authentication tokens (inaccessible to JavaScript). Consider iframe-based isolation for untrusted remotes, though this sacrifices Module Federation's code-sharing benefits.

**Risk 4 — Dependency confusion.** If a remote declares a shared dependency with a name that collides with an internal package, the shared scope might resolve to the wrong package.

Mitigation: Use explicit `requiredVersion` ranges and `strictVersion: true` for critical dependencies. Audit shared scope contents in development.

The bottom line: Module Federation assumes trust between containers. It's designed for micro frontends owned by teams within the same organization, not for loading arbitrary third-party code. If you need to load untrusted code, use iframes with `sandbox` attributes instead.
