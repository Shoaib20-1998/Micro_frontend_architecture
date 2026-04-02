# Shared Dependency Management in Micro Frontends

This module explains how micro frontends share libraries at runtime using Module Federation's `shared` config. It covers three strategies (singleton, version range, eager loading), version conflict resolution, common production pitfalls, and interview preparation.

## Why Shared Dependencies Matter

When multiple micro frontends run on the same page, each is an independently built webpack bundle. Without sharing, every MF bundles its own copy of React, ReactDOM, lodash, etc. The consequences:

| Problem | Impact | Example |
|---------|--------|---------|
| **Bundle bloat** | 5 MFs × 40KB React = 200KB of duplicate React | Users download React 5 times |
| **Memory waste** | Each copy occupies separate memory | 5 React instances in the heap |
| **Runtime errors** | Stateful libraries break with duplicates | React hooks "Invalid hook call" error |
| **Inconsistent behavior** | Different versions produce different output | MF-A uses lodash 4.17, MF-B uses 3.10 — `_.get()` behaves differently |

Module Federation's `shared` config solves this by negotiating dependencies at runtime. Containers compare what they need vs. what's already loaded, and decide whether to reuse or load a fresh copy.

## The Three Sharing Strategies

| Strategy | Config | Copies Loaded | Conflict Resolution | Best For |
|----------|--------|---------------|---------------------|----------|
| **Singleton** | `singleton: true` | Always 1 | Host's version wins (warn or error) | React, Vue, Angular, single-spa |
| **Version Range** | Default (no singleton) | 1 if compatible, N if not | Each gets its own copy | lodash, axios, date-fns |
| **Eager** | `eager: true` | 1 (bundled with host) | Host's version is pre-loaded | Host's React when first-paint matters |

See `sharing-strategies.js` for annotated config examples of each strategy.

## How Runtime Negotiation Works

Understanding the negotiation process is essential for debugging. Here's the step-by-step flow when a page with Module Federation loads:

### Step 1: Host Initializes the Shared Scope

The host app loads first. Webpack's Module Federation runtime creates a "shared scope" — a registry of available shared libraries:

```
sharedScope = {
  react: {
    '18.2.0': { loaded: true, from: 'hostApp' }
  },
  'react-dom': {
    '18.2.0': { loaded: true, from: 'hostApp' }
  }
}
```

### Step 2: Remote Entry Files Load

When the host imports a remote component (e.g., `import('remoteProducts/ProductList')`), webpack fetches the remote's `remoteEntry.js`. This small file (~2KB) contains the remote's container interface.

### Step 3: Shared Scope Initialization

The host calls `remoteContainer.init(sharedScope)`, passing its shared scope to the remote. The remote now knows what's available.

### Step 4: Version Negotiation

When the remote's code needs React, webpack checks:

```
Remote needs: react ^18.0.0
Available in shared scope: react 18.2.0

Is 18.2.0 compatible with ^18.0.0?
  → YES → Reuse the host's React (no download)
  → NO  → Depends on strategy:
           singleton: true  → Use it anyway (warn or error)
           singleton: false → Load own copy (separate download)
```

### Step 5: Multiple Remotes Share the Same Scope

When a second remote loads, it goes through the same process with the SAME shared scope. The scope now contains the host's deps, and the second remote reuses them too:

```
Host loads React 18.2.0 → shared scope
Remote A checks → compatible → reuses ✓
Remote B checks → compatible → reuses ✓
Result: ONE copy of React for 3 apps
```

This is the flow used in the project's Module Federation setup. See:
- `ModuleFederation/host-app/webpack.config.js` — host declares shared deps
- `ModuleFederation/remote-products/webpack.config.js` — remote negotiates
- `ModuleFederation/remote-cart/webpack.config.js` — second remote negotiates

## Version Conflict Resolution

### Scenario: Compatible Versions (Happy Path)

```
Host:     react requiredVersion '^18.0.0', has 18.2.0
Remote A: react requiredVersion '^18.0.0'
Remote B: react requiredVersion '^18.1.0'
```

All three are compatible with 18.2.0. Result: **one copy shared by all**.

### Scenario: Incompatible Versions with Singleton

```
Host:     react { singleton: true, requiredVersion: '^18.0.0' }, has 18.2.0
Remote C: react { singleton: true, requiredVersion: '^17.0.0' }
```

Remote C needs React 17, but singleton forces one copy. Result:
- `strictVersion: false` (default) → Remote C uses React 18.2.0 + **console warning**
- `strictVersion: true` → **Runtime error** — app crashes

This is the most dangerous scenario. Remote C's code might use React 17-only APIs that don't exist in 18, causing subtle runtime bugs.

### Scenario: Incompatible Versions without Singleton

```
Host:     lodash { requiredVersion: '^4.17.0' }, has 4.17.21
Remote D: lodash { requiredVersion: '^3.10.0' }
```

No singleton flag. Remote D's required version is incompatible. Result: **Remote D loads its own lodash 3.x**. Two copies on the page, but both work correctly.

### Resolution Summary

| Situation | Singleton | Non-Singleton |
|-----------|-----------|---------------|
| Versions compatible | One copy shared | One copy shared |
| Versions incompatible, strictVersion: false | One copy, console warning | Separate copies loaded |
| Versions incompatible, strictVersion: true | Runtime error (crash) | Separate copies loaded |

## The Async Boundary Pattern

Every Module Federation app in this project uses this entry pattern:

```js
// index.js — the webpack entry point
import('./bootstrap');

// bootstrap.js — the actual application
import React from 'react';
import ReactDOM from 'react-dom';
ReactDOM.render(<App />, document.getElementById('root'));
```

The `import('./bootstrap')` creates an async chunk boundary. This gives Module Federation time to negotiate shared dependencies BEFORE any application code (like React) loads.

Without this boundary, React would load synchronously with the entry chunk, before negotiation happens. Each app would bundle its own React — no sharing.

**Exception:** If a dependency uses `eager: true`, it's bundled in the initial chunk and doesn't need the async boundary. But you still need the boundary for any non-eager shared deps.

Reference: See this pattern in `ModuleFederation/host-app/src/index.js`, `Hybrid/shell/src/index.js`, and every remote in the project.

## Common Production Pitfalls

### Pitfall 1: Forgetting `singleton: true` for React

**Symptom:** "Invalid hook call" error in remote components.

**Cause:** Two copies of React on the page. Hooks store state in a module-level variable inside React. Two React instances = two separate state stores. The host's reconciler reads from one store, but the remote's hooks write to another.

**Fix:** Add `singleton: true` to React and ReactDOM in EVERY container's shared config. Consistency across all MFs is critical.

### Pitfall 2: Using `eager: true` on Remotes

**Symptom:** Shared dependencies are duplicated despite correct shared config.

**Cause:** `eager: true` bundles the dependency into the remote's initial chunk. The remote loads its own copy before negotiation happens, bypassing the shared scope entirely.

**Fix:** Only use `eager: true` on the HOST. Remotes should always use the default lazy loading so they can reuse the host's deps.

### Pitfall 3: Missing the Async Boundary

**Symptom:** Shared dependencies are never shared — each app loads its own copy.

**Cause:** The entry point imports React synchronously (no `import('./bootstrap')` pattern). Webpack bundles React into the entry chunk, which loads before the shared scope is initialized.

**Fix:** Use the async boundary pattern: `index.js` does only `import('./bootstrap')`, and `bootstrap.js` contains the actual app code.

### Pitfall 4: Inconsistent `shared` Config Across Containers

**Symptom:** Some remotes share deps correctly, others don't. Intermittent "Invalid hook call" errors.

**Cause:** One remote declares `react: { singleton: true }` but another remote doesn't include React in its `shared` config at all. The second remote bundles its own React.

**Fix:** Keep the `shared` config IDENTICAL across all containers. In production, enforce this with a shared webpack config package (e.g., `@myorg/webpack-mf-shared`) or a CI lint rule.

### Pitfall 5: Version Drift Across Teams

**Symptom:** Console warnings about unsatisfied versions. Subtle UI bugs in some MFs.

**Cause:** Teams upgrade dependencies at different speeds. Host is on React 18.3, but a remote still declares `requiredVersion: '^18.0.0'` with React 18.1 in its package.json. The remote uses the host's 18.3, which might have breaking changes.

**Fix:** Establish a dependency upgrade cadence. Use `requiredVersion` ranges that are wide enough to tolerate minor differences but narrow enough to catch major mismatches. Run integration tests that load all MFs together.

### Pitfall 6: Not Sharing single-spa in Hybrid Setups

**Symptom:** Micro frontends register with single-spa but never mount. No error messages.

**Cause:** The shell and remotes each have their own copy of single-spa, with separate application registries. The shell registers apps in Registry A, but lifecycle hooks in remotes reference Registry B.

**Fix:** Add `'single-spa': { singleton: true }` to the shared config. See `Hybrid/shell/webpack.config.js` for the correct pattern.

---

## Interview Preparation

### Question 1: How does Module Federation handle shared dependencies at runtime, and what happens when two micro frontends need different versions of the same library?

**Model Answer:**

"Module Federation negotiates shared dependencies at runtime through a shared scope mechanism. When the host app loads, it registers its dependencies — including their versions — in a shared scope object. When a remote loads, the host calls `init(sharedScope)` on the remote's container, passing the available dependencies.

The remote then checks each of its required dependencies against the shared scope using semver comparison. If a compatible version is available, the remote reuses it — no additional download. If no compatible version exists, the behavior depends on the sharing strategy:

For **singleton** dependencies like React, only one copy is allowed. The first version loaded (usually the host's) wins. If the remote's `requiredVersion` doesn't match, webpack either logs a warning (default) or throws an error (`strictVersion: true`). This is necessary for libraries with internal state — React hooks break with duplicate instances because they store state in a module-level variable.

For **non-singleton** dependencies like lodash, incompatible versions result in the remote loading its own copy. You get two copies on the page, which wastes memory but avoids runtime errors. This is the safe default for stateless utility libraries.

The key architectural decision is choosing which strategy for each dependency. I'd use singleton for anything with internal state (React, Vue, Angular, state management libraries) and version range for stateless utilities. In production, I'd enforce consistent `shared` configs across all containers using a shared webpack config package, and run integration tests that load all MFs together to catch version conflicts early."

### Question 2: What is the async boundary pattern in Module Federation, and why is it required?

**Model Answer:**

"The async boundary is the `import('./bootstrap')` pattern you see in every Module Federation app's entry point. The entry file — `index.js` — contains only a dynamic import to `bootstrap.js`, which holds the actual application code.

This exists because Module Federation negotiates shared dependencies asynchronously. When the page loads, webpack needs to:
1. Load the host's entry chunk
2. Fetch `remoteEntry.js` from each remote
3. Call `init(sharedScope)` on each remote container
4. Compare versions and decide who provides each shared dependency
5. Only THEN load the application code that uses those dependencies

If the entry point imported React synchronously — `import React from 'react'` — React would be bundled into the initial chunk and load before negotiation happens. Each app would have its own React, defeating the purpose of sharing.

The dynamic `import('./bootstrap')` creates a webpack async chunk boundary. Everything inside `bootstrap.js` (including React imports) becomes a separate chunk that loads AFTER the shared scope is initialized. This gives Module Federation time to negotiate before any shared library code executes.

There's one exception: dependencies with `eager: true` are bundled into the initial chunk intentionally. They skip negotiation because they're meant to be available immediately. But you still need the async boundary for any non-eager shared deps.

This is one of the most common pitfalls in Module Federation setups — forgetting the async boundary means shared deps are never actually shared, and you get duplicate libraries with no error message to explain why."

### Question 3: You're architecting a micro frontend platform for 10 teams. How would you design the shared dependency strategy?

**Model Answer:**

"I'd design a three-tier sharing strategy based on dependency characteristics:

**Tier 1 — Singleton (framework core):** React, ReactDOM, and any framework-level libraries (single-spa in a Hybrid setup, a shared design system). These MUST be singletons because they have internal state that breaks with duplicates. I'd pin these to a specific major version range (`^18.0.0`) and establish a quarterly upgrade cadence where all teams upgrade together. This is the one area where team autonomy takes a back seat to platform stability.

**Tier 2 — Version range (shared utilities):** Libraries like lodash, axios, date-fns, moment. These are stateless, so duplicates don't cause crashes — just wasted bytes. I'd use version range sharing (the default, no singleton flag) so compatible versions are deduplicated automatically, but incompatible versions get their own copy safely. Teams can upgrade these independently.

**Tier 3 — Not shared (domain-specific):** Libraries used by only one or two MFs (a specific charting library, a PDF generator). No point sharing these — they'd just add to the negotiation overhead. Let each MF bundle its own copy.

For governance, I'd create a shared webpack config package (`@platform/webpack-mf-config`) that all teams import. It contains the `shared` config for Tier 1 and Tier 2 dependencies, ensuring consistency. Teams can extend it for their own deps but can't override the singleton settings for Tier 1.

For monitoring, I'd add a build-time check that compares each MF's actual dependency versions against the platform's expected ranges. If a team's React version drifts outside the range, the CI pipeline warns them. I'd also add runtime monitoring — a small script that checks `window` for duplicate library instances and reports to our observability platform.

The biggest risk at this scale is version drift in Tier 1 dependencies. If one team falls behind on React upgrades, their MF might get a version that doesn't satisfy `requiredVersion`, triggering warnings or errors. The quarterly upgrade cadence and CI checks mitigate this, but it requires organizational discipline — which is honestly the hardest part of micro frontend architecture."

### Question 4: A developer reports that React loads twice on the page despite `singleton: true` in the shared config. How would you debug this?

**Model Answer:**

"I'd work through a systematic checklist:

**1. Check ALL containers' shared configs.** The most common cause is one container missing React from its `shared` config entirely. If Remote C doesn't declare React as shared, it bundles its own copy regardless of what the host offers. Every container — host and all remotes — must include React in its `shared` config with `singleton: true`.

**2. Check for `eager: true` on a remote.** If a remote sets `eager: true` for React, it bundles React into its initial chunk, bypassing the shared scope negotiation. The remote loads its own React before it even checks what's available. Only the host should use `eager: true`.

**3. Check the async boundary.** If a remote's entry point imports React synchronously (no `import('./bootstrap')` pattern), React gets bundled into the entry chunk and loads before negotiation. The fix is the standard async boundary pattern.

**4. Check the webpack build output.** Run `webpack --stats` and look for React in the chunk list. If React appears in multiple chunks across different containers, you can trace which container is bundling it.

**5. Check the browser's Network tab.** Filter for 'react' in the network requests. If you see React being fetched from multiple origins (different ports or CDN paths), multiple copies are loading. The shared scope should prevent this — if it's happening, negotiation failed.

**6. Check the runtime shared scope.** In the browser console, you can inspect `__webpack_share_scopes__` (the internal shared scope object). It shows which versions are registered and which containers provided them. If React appears with multiple versions, you have a version mismatch that singleton couldn't resolve.

**7. Check for non-webpack React.** If any `<script>` tag in the HTML loads React from a CDN (outside of webpack), that's a separate copy that Module Federation doesn't know about. Remove CDN React and let Module Federation handle it.

In my experience, the cause is almost always #1 (inconsistent shared configs) or #2 (eager on a remote). A shared webpack config package that all teams import prevents both issues."

---

## Files in This Module

| File | Description |
|------|-------------|
| `sharing-strategies.js` | Annotated config examples showing singleton, version range, and eager loading strategies. Includes side-by-side comparison table and runtime negotiation walkthrough. |
| `README.md` | This file — version conflict resolution, async boundary pattern, common pitfalls, and interview preparation with model answers. |

Each file is standalone and readable. See the inline annotations in `sharing-strategies.js` for deep technical context on each strategy.
