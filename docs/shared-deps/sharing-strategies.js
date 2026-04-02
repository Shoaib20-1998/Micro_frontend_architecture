/**
 * ============================================================================
 * SHARED DEPENDENCY MANAGEMENT — THREE STRATEGIES COMPARED
 * ============================================================================
 *
 * CODE ANNOTATION: Why shared dependency management matters
 * -----------------------------------------------------------
 * In a micro frontend architecture, multiple independently built apps run on
 * the same page. Without shared dependency management, EACH app bundles its
 * own copy of React, ReactDOM, lodash, etc. With 5 micro frontends, you'd
 * load React 5 times — wasting bandwidth, memory, and causing subtle bugs
 * (React hooks break when two copies coexist).
 *
 * Module Federation's `shared` config solves this by negotiating dependencies
 * at RUNTIME. When the page loads, containers compare what they need vs.
 * what's already loaded, and decide whether to reuse or load a fresh copy.
 *
 * This file demonstrates THREE sharing strategies:
 *   1. Singleton Sharing — one copy, period. Host's version wins.
 *   2. Version Range Sharing — compatible versions share, incompatible get their own copy.
 *   3. Eager Loading — load immediately with the host, skip runtime negotiation.
 *
 * Each strategy has different trade-offs around correctness, performance, and
 * failure modes. Understanding these trade-offs is critical for senior-level
 * interviews — interviewers want to hear you reason about WHEN to use each.
 *
 * REFERENCE: These strategies are used in the actual project configs:
 *   - ModuleFederation/host-app/webpack.config.js (singleton for React)
 *   - ModuleFederation/remote-products/webpack.config.js (singleton for React)
 *   - Hybrid/shell/webpack.config.js (singleton for React + single-spa)
 *
 * ============================================================================
 */

// =============================================================================
// STRATEGY 1: SINGLETON SHARING
// =============================================================================

/**
 * CODE ANNOTATION: What "singleton" means at runtime
 * ----------------------------------------------------
 * Singleton sharing forces ALL containers (host + every remote) to use the
 * EXACT SAME instance of a library. There is only one copy in memory, and
 * every container references it.
 *
 * This is NOT the same as "only download once." Even without singleton, Module
 * Federation might reuse a compatible version. Singleton goes further — it
 * GUARANTEES one instance, even if versions are technically incompatible.
 *
 * WHEN TO USE:
 *   ✅ Libraries with internal module-level state (React, Angular, Vue)
 *   ✅ Libraries where two copies cause runtime errors (React hooks)
 *   ✅ Libraries that maintain a global registry (single-spa, Redux store)
 *
 * WHEN NOT TO USE:
 *   ❌ Utility libraries with no internal state (lodash, date-fns)
 *   ❌ Libraries where different versions have incompatible APIs
 *   ❌ When you WANT isolated copies (e.g., different MFs need different
 *      major versions of a charting library)
 */
const singletonStrategy = {
  name: 'hostApp',
  filename: 'remoteEntry.js',
  remotes: {
    remoteProducts: 'remoteProducts@http://localhost:3001/remoteEntry.js',
    remoteCart: 'remoteCart@http://localhost:3002/remoteEntry.js',
  },
  shared: {
    /**
     * CODE ANNOTATION: React as a singleton — the most common pattern
     * -----------------------------------------------------------------
     * React MUST be a singleton because React hooks store state in a
     * module-level variable inside the React package. If two copies of
     * React exist on the page:
     *
     *   - Host's React has its own hooks state array
     *   - Remote's React has a DIFFERENT hooks state array
     *   - When a remote component calls useState(), it writes to the
     *     remote's state array
     *   - But React's reconciler (from the host) reads from the HOST's
     *     state array
     *   - Result: "Invalid hook call" error — the most confusing error
     *     in micro frontend development
     *
     * singleton: true prevents this by ensuring ONE React instance.
     *
     * RUNTIME BEHAVIOR:
     *   1. Host loads first, registers React 18.2.0 in the shared scope
     *   2. Remote loads, checks shared scope: "React available? Yes."
     *   3. Remote checks: "Is it singleton? Yes → use it, regardless of
     *      my requiredVersion."
     *   4. If the host's version doesn't satisfy requiredVersion:
     *      - strictVersion: false (default) → use it anyway + console warning
     *      - strictVersion: true → throw a runtime error
     *
     * REFERENCE: See this pattern in action:
     *   ModuleFederation/host-app/webpack.config.js → shared config
     *   Hybrid/shell/webpack.config.js → shared config (also singletons single-spa)
     */
    react: {
      singleton: true,
      requiredVersion: '^18.0.0',
    },
    'react-dom': {
      singleton: true,
      requiredVersion: '^18.0.0',
    },

    /**
     * CODE ANNOTATION: single-spa as a singleton — often overlooked
     * ---------------------------------------------------------------
     * single-spa maintains a GLOBAL REGISTRY of registered applications.
     * If the shell and a remote each have their own copy of single-spa,
     * they'd have separate registries:
     *
     *   - Shell registers apps in Registry A
     *   - Remote's lifecycle hooks reference Registry B
     *   - Routing events fire on Registry A, but the remote listens on B
     *   - Result: MFs never mount, and there are no error messages to debug
     *
     * This is a sneaky bug because it fails SILENTLY. Always share
     * single-spa as a singleton in Hybrid setups.
     *
     * REFERENCE: See Hybrid/shell/webpack.config.js → shared config
     */
    'single-spa': {
      singleton: true,
      requiredVersion: '^5.9.0',
    },
  },
};

// =============================================================================
// STRATEGY 2: VERSION RANGE SHARING
// =============================================================================

/**
 * CODE ANNOTATION: What "version range" sharing means at runtime
 * ----------------------------------------------------------------
 * Version range sharing is the DEFAULT behavior when you don't set
 * `singleton: true`. Module Federation compares the loaded version against
 * each container's requiredVersion using semver:
 *
 *   - If compatible → reuse the loaded copy (no extra download)
 *   - If incompatible → load a separate copy for that container
 *
 * This is MORE FLEXIBLE than singleton because it allows multiple versions
 * to coexist when necessary, but MORE EFFICIENT than no sharing because
 * compatible versions are deduplicated.
 *
 * WHEN TO USE:
 *   ✅ Utility libraries (lodash, moment, date-fns, axios)
 *   ✅ Libraries where minor version differences don't cause runtime issues
 *   ✅ When different teams upgrade at different speeds
 *
 * WHEN NOT TO USE:
 *   ❌ Libraries with internal state that must be shared (React, Vue)
 *   ❌ When you need guaranteed deduplication (use singleton instead)
 *
 * TRADE-OFF:
 *   Version range sharing can result in MULTIPLE copies of a library on the
 *   page if versions are incompatible. This increases bundle size but avoids
 *   the runtime errors that singleton would cause with incompatible versions.
 */
const versionRangeStrategy = {
  name: 'hostApp',
  filename: 'remoteEntry.js',
  remotes: {
    remoteProducts: 'remoteProducts@http://localhost:3001/remoteEntry.js',
    remoteCart: 'remoteCart@http://localhost:3002/remoteEntry.js',
  },
  shared: {
    /**
     * CODE ANNOTATION: lodash with version range — the flexible approach
     * --------------------------------------------------------------------
     * No `singleton: true` here. lodash is a pure utility library with no
     * internal state, so multiple copies don't cause runtime errors — they
     * just waste memory.
     *
     * RUNTIME BEHAVIOR — COMPATIBLE VERSIONS:
     *   Host declares: lodash requiredVersion '^4.17.0'
     *   Host loads lodash 4.17.21
     *   Remote declares: lodash requiredVersion '^4.17.15'
     *   Remote checks: "Is 4.17.21 compatible with ^4.17.15?" → YES
     *   Result: Remote reuses host's lodash. ONE copy loaded.
     *
     * RUNTIME BEHAVIOR — INCOMPATIBLE VERSIONS:
     *   Host declares: lodash requiredVersion '^4.17.0'
     *   Host loads lodash 4.17.21
     *   Remote declares: lodash requiredVersion '^3.10.0'
     *   Remote checks: "Is 4.17.21 compatible with ^3.10.0?" → NO (major mismatch)
     *   Result: Remote loads its OWN lodash 3.x. TWO copies on the page.
     *
     * This is the SAFE default — no crashes, but potential duplication.
     * Monitor your bundle analyzer to catch unexpected duplicates.
     */
    lodash: {
      requiredVersion: '^4.17.0',
    },

    /**
     * CODE ANNOTATION: axios with version range
     * --------------------------------------------
     * axios is another good candidate for version range sharing. It's a
     * stateless HTTP client — two copies work fine, they just waste bytes.
     *
     * However, if you've configured axios with global interceptors (for auth
     * tokens, error handling), those interceptors are per-instance. If a
     * remote loads its own axios copy, it won't have the host's interceptors.
     *
     * PRODUCTION TIP: If you rely on shared axios interceptors, consider
     * making axios a singleton. If each MF configures its own interceptors,
     * version range is fine.
     */
    axios: {
      requiredVersion: '^1.0.0',
    },

    /**
     * CODE ANNOTATION: Mixing strategies in the same config
     * -------------------------------------------------------
     * You can (and should) mix singleton and version-range strategies in
     * the same shared config. Use singleton for stateful libraries, version
     * range for stateless utilities.
     *
     * React is singleton (hooks break with duplicates).
     * lodash is version-range (duplicates waste memory but don't crash).
     *
     * This is the recommended production pattern.
     */
    react: {
      singleton: true,
      requiredVersion: '^18.0.0',
    },
    'react-dom': {
      singleton: true,
      requiredVersion: '^18.0.0',
    },
  },
};

// =============================================================================
// STRATEGY 3: EAGER LOADING
// =============================================================================

/**
 * CODE ANNOTATION: What "eager" loading means at runtime
 * --------------------------------------------------------
 * By default, shared dependencies are loaded LAZILY — they're fetched during
 * the async negotiation phase (the import('./bootstrap') boundary). The host
 * and remotes compare versions and decide who provides what.
 *
 * With `eager: true`, the dependency is bundled DIRECTLY into the host's
 * initial chunk. It loads immediately with the page, BEFORE any negotiation.
 *
 * WHEN TO USE:
 *   ✅ The host app's copy of critical libraries (React, ReactDOM)
 *   ✅ When you want to eliminate the negotiation delay for the host
 *   ✅ When the host MUST render immediately (SSR hydration, above-the-fold)
 *
 * WHEN NOT TO USE:
 *   ❌ On remotes — eager loading on a remote defeats the purpose of sharing
 *      because the remote bundles its own copy regardless of what's available
 *   ❌ For large libraries that aren't needed immediately
 *   ❌ When initial bundle size is a concern (eager increases the host's bundle)
 *
 * CRITICAL WARNING:
 *   If you set eager: true on a remote, that remote will ALWAYS bundle its
 *   own copy of the library, even if the host already has a compatible version.
 *   This defeats the purpose of sharing. Only use eager on the HOST.
 *
 * TRADE-OFF:
 *   Eager loading trades BUNDLE SIZE for SPEED. The host's initial JS bundle
 *   is larger (includes React), but there's no async negotiation delay before
 *   the first render. For most apps, the lazy default is fine. Use eager when
 *   first-paint performance is critical.
 */
const eagerLoadingStrategy = {
  name: 'hostApp',
  filename: 'remoteEntry.js',
  remotes: {
    remoteProducts: 'remoteProducts@http://localhost:3001/remoteEntry.js',
    remoteCart: 'remoteCart@http://localhost:3002/remoteEntry.js',
  },
  shared: {
    /**
     * CODE ANNOTATION: Eager React on the host — skip the negotiation wait
     * ----------------------------------------------------------------------
     * With eager: true, React is included in the host's main bundle. When
     * the page loads:
     *
     *   1. Host's main chunk loads → React is ALREADY available (no async fetch)
     *   2. Host renders immediately using the bundled React
     *   3. Remotes load later, check shared scope: "React 18.x available? Yes."
     *   4. Remotes reuse the host's eagerly-loaded React
     *
     * WITHOUT eager (default lazy behavior):
     *   1. Host's main chunk loads → React is NOT in the bundle
     *   2. Async boundary triggers: import('./bootstrap')
     *   3. Webpack negotiates shared deps, fetches React as a separate chunk
     *   4. React loads → host renders
     *   5. Remotes load later, reuse the same React
     *
     * The difference: eager skips step 2-3, so the host renders faster.
     * The cost: the host's initial bundle is ~40KB larger (React's size).
     *
     * INTERVIEW TIP: "When would you use eager loading for shared deps?"
     * Answer: "Only on the host, and only for libraries critical to the
     * first render. It trades bundle size for render speed by eliminating
     * the async negotiation step. I'd use it for React/ReactDOM on the host
     * if first-paint performance is a priority, but never on remotes."
     */
    react: {
      singleton: true,
      eager: true,
      requiredVersion: '^18.0.0',
    },
    'react-dom': {
      singleton: true,
      eager: true,
      requiredVersion: '^18.0.0',
    },

    /**
     * CODE ANNOTATION: Non-eager shared deps alongside eager ones
     * --------------------------------------------------------------
     * You can mix eager and non-eager in the same config. Critical deps
     * (React) load eagerly; less critical deps (lodash) load lazily.
     *
     * This is the recommended pattern: eager for what you need to render
     * the shell, lazy for everything else.
     */
    lodash: {
      requiredVersion: '^4.17.0',
      // No eager: true → loaded lazily during negotiation
      // This is fine because lodash isn't needed for the initial render
    },
  },
};

// =============================================================================
// STRATEGY COMPARISON: SIDE-BY-SIDE
// =============================================================================

/**
 * CODE ANNOTATION: Quick reference — when to use each strategy
 * ---------------------------------------------------------------
 *
 * ┌─────────────────┬──────────────┬────────────────┬──────────────┐
 * │ Criteria         │ Singleton    │ Version Range  │ Eager        │
 * ├─────────────────┼──────────────┼────────────────┼──────────────┤
 * │ Copies loaded   │ Always 1     │ 1 if compat,   │ 1 (bundled   │
 * │                 │              │ N if not        │ with host)   │
 * ├─────────────────┼──────────────┼────────────────┼──────────────┤
 * │ Version conflict│ Host wins    │ Each gets own   │ Host wins    │
 * │ resolution      │ (warn/error) │ copy            │ (bundled)    │
 * ├─────────────────┼──────────────┼────────────────┼──────────────┤
 * │ Bundle size     │ Smallest     │ Varies          │ Larger host  │
 * │ impact          │ (one copy)   │ (may duplicate) │ bundle       │
 * ├─────────────────┼──────────────┼────────────────┼──────────────┤
 * │ Runtime safety  │ Risk: wrong  │ Safe: each gets │ Safe: host   │
 * │                 │ version used │ what it needs   │ always has it│
 * ├─────────────────┼──────────────┼────────────────┼──────────────┤
 * │ Best for        │ React, Vue,  │ lodash, axios,  │ Host's React │
 * │                 │ Angular,     │ date-fns,       │ when first-  │
 * │                 │ single-spa   │ utility libs    │ paint matters│
 * ├─────────────────┼──────────────┼────────────────┼──────────────┤
 * │ Async boundary  │ Required     │ Required        │ NOT required │
 * │ needed?         │              │                 │ for eager dep│
 * └─────────────────┴──────────────┴────────────────┴──────────────┘
 *
 * PRODUCTION RECOMMENDATION:
 *   - React, ReactDOM, Vue, Angular → singleton: true
 *   - single-spa (in Hybrid setups) → singleton: true
 *   - Utility libraries → version range (default, no singleton flag)
 *   - Host's React/ReactDOM → consider eager: true if first-paint matters
 *   - Remote's deps → NEVER eager (defeats sharing purpose)
 */

// =============================================================================
// VERSION CONFLICT RESOLUTION — WHAT ACTUALLY HAPPENS AT RUNTIME
// =============================================================================

/**
 * CODE ANNOTATION: Step-by-step runtime negotiation
 * ---------------------------------------------------
 * Understanding the negotiation process is essential for debugging shared
 * dependency issues in production. Here's exactly what happens:
 *
 * SCENARIO: Host has React 18.2.0, Remote A wants ^18.0.0, Remote B wants ^17.0.0
 *
 * Step 1: Host loads, registers its deps in the "shared scope"
 *   sharedScope = {
 *     react: {
 *       '18.2.0': { loaded: true, from: 'hostApp', eager: false }
 *     }
 *   }
 *
 * Step 2: Remote A loads, calls init(sharedScope)
 *   Remote A needs: react ^18.0.0
 *   Available: react 18.2.0
 *   Check: semver.satisfies('18.2.0', '^18.0.0') → true
 *   Decision: REUSE host's React ✓
 *   (If singleton: true, would reuse regardless of version check)
 *
 * Step 3: Remote B loads, calls init(sharedScope)
 *   Remote B needs: react ^17.0.0
 *   Available: react 18.2.0
 *   Check: semver.satisfies('18.2.0', '^17.0.0') → false (major mismatch)
 *
 *   NOW THE STRATEGY MATTERS:
 *
 *   If singleton: true (React):
 *     → Remote B uses 18.2.0 ANYWAY (singleton forces one copy)
 *     → If strictVersion: false → console.warn("Unsatisfied version...")
 *     → If strictVersion: true → throw Error("Unsatisfied version...")
 *     → Remote B's code might break if it uses React 17-only APIs
 *
 *   If singleton: false (version range, e.g., lodash):
 *     → Remote B loads its OWN copy of the library (17.x)
 *     → Two copies on the page, but both work correctly
 *     → Bundle size increases, but no runtime errors
 *
 * INTERVIEW INSIGHT: "What happens when two MFs need different major versions
 * of a shared singleton dependency?"
 * Answer: "The singleton forces one version — the first one loaded (usually
 * the host's). The other MF gets a console warning (or error with strictVersion).
 * This is why version alignment across teams is critical for singleton deps.
 * For non-singleton deps, each MF gets its own copy — safe but heavier."
 */

// =============================================================================
// THE ASYNC BOUNDARY PATTERN — WHY import('./bootstrap') EXISTS
// =============================================================================

/**
 * CODE ANNOTATION: The async boundary is the foundation of shared dep negotiation
 * ---------------------------------------------------------------------------------
 * Every Module Federation app in this project uses this pattern:
 *
 *   // index.js (the entry point)
 *   import('./bootstrap');
 *
 *   // bootstrap.js (the real app)
 *   import React from 'react';
 *   import ReactDOM from 'react-dom';
 *   // ... render the app
 *
 * WHY THIS EXISTS:
 * Module Federation negotiates shared deps ASYNCHRONOUSLY. When the host loads,
 * it needs to:
 *   1. Fetch remoteEntry.js from each remote
 *   2. Call init(sharedScope) on each remote's container
 *   3. Compare versions and decide who provides what
 *   4. THEN load the actual application code
 *
 * If index.js directly imported React (synchronously), React would load
 * BEFORE negotiation happens. The host would bundle its own React, and
 * remotes would also bundle their own — no sharing at all.
 *
 * The dynamic import('./bootstrap') creates an async chunk boundary. Webpack
 * knows that everything inside bootstrap.js (including React) should be loaded
 * AFTER the shared scope is initialized. This gives Module Federation time to
 * negotiate before any shared library code executes.
 *
 * REFERENCE: See this pattern in every app in the project:
 *   ModuleFederation/host-app/src/index.js → import('./bootstrap')
 *   ModuleFederation/remote-products/src/index.js → import('./bootstrap')
 *   Hybrid/shell/src/index.js → import('./bootstrap')
 *   Hybrid/mf-home/src/index.js → import('./bootstrap')
 *
 * EXCEPTION: If you use eager: true for a dependency, that dep is bundled
 * in the initial chunk and doesn't need the async boundary. But you still
 * need the boundary for any NON-eager shared deps.
 *
 * INTERVIEW TIP: "Why do Module Federation apps have an index.js that just
 * does import('./bootstrap')?"
 * Answer: "It creates an async chunk boundary so webpack can negotiate shared
 * dependencies before any application code runs. Without it, each app would
 * bundle its own copy of shared libraries, defeating the purpose of sharing."
 */

// =============================================================================
// ADVANCED: strictVersion AND VERSION PINNING
// =============================================================================

/**
 * CODE ANNOTATION: strictVersion — when warnings aren't enough
 * ---------------------------------------------------------------
 * By default, singleton sharing with a version mismatch produces a
 * console.warn(). The app still runs, using the available version.
 *
 * In production, you might want HARD FAILURES instead of silent warnings
 * that nobody reads in the console. That's what strictVersion does.
 */
const strictVersionExample = {
  shared: {
    react: {
      singleton: true,
      strictVersion: true, // ← THROWS instead of warning on mismatch
      requiredVersion: '^18.0.0',
    },
    /**
     * CODE ANNOTATION: When to use strictVersion
     * ---------------------------------------------
     * strictVersion: true means "if the available version doesn't satisfy
     * my requiredVersion, CRASH instead of using it anyway."
     *
     * USE WHEN:
     *   ✅ You'd rather fail loudly than run with a wrong version
     *   ✅ Your CI/CD pipeline catches runtime errors (integration tests)
     *   ✅ Version mismatches cause subtle, hard-to-debug issues
     *
     * AVOID WHEN:
     *   ❌ You want graceful degradation (better to show something than crash)
     *   ❌ Teams upgrade at different speeds (strict blocks independent deploys)
     *   ❌ You don't have integration tests that catch the error
     *
     * PRODUCTION PATTERN:
     *   Development: strictVersion: true (catch mismatches early)
     *   Production: strictVersion: false (graceful degradation)
     *
     * You can toggle this with an environment variable:
     *   strictVersion: process.env.NODE_ENV === 'development'
     */
  },
};

// =============================================================================
// EXPORTS — For reference and testing
// =============================================================================

/**
 * CODE ANNOTATION: These exports let you inspect the strategies programmatically
 * ---------------------------------------------------------------------------------
 * In a real project, you wouldn't export webpack configs like this. These
 * exports exist so the strategies can be referenced from tests and the README.
 */
module.exports = {
  singletonStrategy,
  versionRangeStrategy,
  eagerLoadingStrategy,
  strictVersionExample,
};
