# Comprehensive Interview Preparation Guide — Micro Frontend Architecture

> **Purpose:** This is the consolidated interview prep resource for the entire micro frontend deep dive. It synthesizes the decision frameworks, scenario-based questions, and quick-reference material from all three approaches (Single-Spa, Module Federation, Hybrid) and every cross-cutting module (communication, CSS isolation, routing, shared dependencies, testing). Use this as your final review before a senior-level frontend architecture interview.
>
> **How to use this guide:**
> - Start with the [Decision Matrix](#decision-matrix) to internalize the trade-offs between approaches
> - Work through the [Scenario-Based Questions](#scenario-based-interview-questions) — these simulate real interview pressure where you must choose an approach and defend it
> - Use the [Quick-Reference Cheat Sheet](#quick-reference-cheat-sheet) for last-minute review of key concepts, commands, and config patterns
>
> **Prerequisites:** This guide assumes you've worked through the approach-specific READMEs ([Single-Spa](../../Single-Spa/README.md), [Module Federation](../../ModuleFederation/README.md), [Hybrid](../../Hybrid/README.md)) and the cross-cutting modules ([Communication](../communication/README.md), [CSS Isolation](../css-isolation/README.md), [Routing](../routing/README.md), [Shared Dependencies](../shared-deps/README.md), [Testing](../testing/README.md)). Each contains deeper interview questions specific to that topic.

---

## Table of Contents

- [Decision Matrix](#decision-matrix)
- [How to Use the Decision Matrix in an Interview](#how-to-use-the-decision-matrix-in-an-interview)
- [Scenario-Based Interview Questions](#scenario-based-interview-questions)
- [Quick-Reference Cheat Sheet](#quick-reference-cheat-sheet)

---

## Decision Matrix

This matrix compares Single-Spa, Module Federation, and the Hybrid approach across the criteria that matter most in production. Memorize the trade-offs — interviewers expect you to reason through these, not just recite features.

| Criteria | Single-Spa | Module Federation | Hybrid (Single-Spa + MF) |
|---|---|---|---|
| **Setup Complexity** | Moderate — SystemJS, import maps, lifecycle hooks are new concepts but well-documented | Moderate — webpack plugin config, async boundary pattern, shared config | Higher — two systems to configure (single-spa registration + MF plugin), plus the mf-loader bridge |
| **Team Size Sweet Spot** | 3-15 teams, especially with mixed frameworks | 3-15 teams, all on the same framework | 5+ teams, especially during monolith migration or when lifecycle control matters |
| **Deployment Independence** | Full — each MF is a separate bundle at its own URL; update the import map to deploy | Full — each remote builds and deploys independently; host fetches latest `remoteEntry.js` | Full — each MF remote deploys independently; shell routes to latest version via MF runtime |
| **Shared State / Communication** | No built-in mechanism — use custom events, event bus, or shared store (see `docs/communication/`) | No built-in mechanism — same patterns apply, but shared modules can be federated as singletons | No built-in mechanism — same patterns, but single-spa's `customProps` can inject shared instances |
| **Build Tooling Coupling** | Framework-agnostic — works with webpack, Vite, Rollup, Parcel, or any bundler | Tightly coupled to Webpack 5 — MF is a webpack plugin | Tightly coupled to Webpack 5 — inherits MF's webpack dependency |
| **Runtime Code Sharing** | None built-in — use CDN externals or import map overrides to avoid duplication | Automatic — `shared` config with `singleton: true` deduplicates at runtime via shared scope negotiation | Automatic — inherits MF's sharing mechanism, plus shares `single-spa` itself as a singleton |
| **Composition Model** | Page-level — one app per route, activated by URL matching (`activeWhen`) | Component-level — `import('remote/Component')` embeds components anywhere | Page-level with MF loading — single-spa routes to pages, MF loads the code |
| **Lifecycle Management** | Explicit — `bootstrap`, `mount`, `unmount` hooks with state machine and global error handler | Implicit — React's `lazy()`, `Suspense`, and Error Boundaries handle loading/rendering/cleanup | Explicit — inherits single-spa's full lifecycle model with MF's code loading |
| **Framework Mixing** | First-class — adapters for React, Angular, Vue, Svelte (`single-spa-react`, etc.) | Possible but awkward — no adapter layer for cross-framework rendering | First-class — inherits single-spa's adapter ecosystem |
| **Error Handling** | Orchestration-level — `addErrorHandler()` catches all lifecycle and loading failures centrally | Component-level — React Error Boundaries catch failed imports per-component | Three layers — component (single-spa-react errorBoundary), orchestration (`addErrorHandler`), loading (MF import rejection) |
| **Learning Curve** | Moderate — lifecycles, SystemJS, import maps | Moderate — webpack plugin options, async boundary, shared scope | Steeper — must understand both systems plus the bridge pattern |
| **Production Maturity** | Battle-tested at scale (IKEA, Spotify, many enterprises) | Widely adopted, growing ecosystem (Zack Jackson actively maintains) | Less common as a named pattern, but both underlying tools are production-proven |

### When to Choose Each Approach — Decision Flowchart

```
Do your micro frontends use DIFFERENT frameworks (React + Angular + Vue)?
├── YES → Do you need runtime code sharing between them?
│         ├── YES → Hybrid (single-spa adapters for framework mixing + MF for sharing)
│         └── NO  → Single-Spa (simplest multi-framework orchestration)
└── NO (all same framework) →
    Do you need explicit lifecycle management (cleanup verification, centralized error handling)?
    ├── YES → Do you need runtime dependency sharing?
    │         ├── YES → Hybrid (lifecycle control + dependency sharing)
    │         └── NO  → Single-Spa (lifecycle control, simpler config)
    └── NO →
        Do you need component-level composition (embed Team A's widget in Team B's page)?
        ├── YES → Module Federation (import-based composition)
        └── NO  → Module Federation (simplest same-framework setup)
```

---

## How to Use the Decision Matrix in an Interview

Interviewers don't want you to memorize a table. They want to see you **reason through trade-offs** given constraints. Here's the framework:

1. **Identify the constraints** — What frameworks are in use? How many teams? Is this a greenfield or migration? What's the team's webpack expertise?
2. **Eliminate approaches that don't fit** — Mixed frameworks? Module Federation alone is out. Not using webpack? Both MF and Hybrid are out.
3. **Compare remaining options on the criteria that matter most** for the specific scenario — deployment independence, code sharing, error handling, composition model.
4. **State your recommendation and the primary trade-off** — "I'd choose X because of Y, accepting the trade-off of Z."

This framework works for any scenario question. Practice it until it's automatic.

---

## Scenario-Based Interview Questions

These questions simulate real interview scenarios. Each requires you to choose an approach, justify it with architectural reasoning, and acknowledge trade-offs. There are no trick questions — multiple answers can be correct if well-reasoned.

### Scenario 1: E-Commerce Platform — 8 Teams, All React, Greenfield

**Situation:** You're the lead architect for a new e-commerce platform. Eight teams will build micro frontends: Product Catalog, Search, Cart, Checkout, User Account, Recommendations, Reviews, and Admin Dashboard. All teams use React 18 with Webpack 5. There's no legacy code.

**Question:** Which micro frontend approach do you recommend, and why?

**Model Answer:**

I'd choose **Module Federation** as the primary mechanism, with the option to layer Single-Spa on top later if orchestration needs grow.

The "all React, all Webpack 5" constraint is the deciding factor. Module Federation's killer feature — runtime shared dependency negotiation with `singleton: true` — eliminates the biggest performance risk: loading React 8 times. With 8 remotes, that's ~320KB of duplicate React without sharing.

Component-level composition is likely needed. The Recommendations team's widget will appear on the Product Catalog page, the Cart summary will appear in the header across all pages, and the Reviews component will embed in the Product detail view. Module Federation's `import('remote/Component')` makes this natural. Single-Spa's page-level model would require parcels for cross-page embedding, which is more complex.

I'd add a shared webpack config package (`@platform/webpack-mf-config`) to standardize the `shared` config across all 8 teams — version drift is the #1 operational risk at this scale. Error Boundaries around every remote import, with centralized error reporting. Integration tests that compose the host with all remotes in CI.

The trade-off I'm accepting: no explicit lifecycle management. If we later need fine-grained control over mount/unmount (cleanup verification, controlled initialization order), we'd add Single-Spa as an orchestration layer — the Hybrid approach. But I wouldn't add that complexity upfront when React's own lifecycle (`lazy`, `Suspense`, Error Boundaries) handles the common cases.

---

### Scenario 2: Financial Services — Legacy Angular Monolith, Incremental Migration

**Situation:** A financial services company has a 300K-line Angular 12 monolith. They want to migrate to React incrementally over 18 months without freezing feature development. The monolith has 6 teams contributing to it. New features should be built in React.

**Question:** How would you architect this migration?

**Model Answer:**

I'd use the **Hybrid approach** with the strangler fig migration pattern.

Single-Spa is required because we're mixing Angular and React on the same page. Single-Spa's `single-spa-angular` adapter wraps the existing monolith with lifecycle hooks, and `single-spa-react` handles the new micro frontends. Module Federation alone can't manage cross-framework lifecycles.

Module Federation is required because as we extract React micro frontends, we need runtime dependency sharing. Without it, each new React MF bundles its own React — wasteful and error-prone (duplicate React instances break hooks).

The migration phases:
1. **Week 1-2:** Set up the Hybrid shell. Wrap the Angular monolith as a single-spa app that handles ALL routes. Users notice nothing.
2. **Week 3-6:** Extract the first feature (e.g., Settings page) as a Hybrid React MF. The shell routes `/settings` to the new MF, everything else to the monolith.
3. **Week 6-10:** Extract 2-3 more features. Establish cross-cutting patterns: authentication sharing (shared store), event contracts, design system tokens.
4. **Ongoing:** Teams extract features at their own pace. The monolith shrinks. Each extraction follows the repeatable Hybrid recipe.
5. **Eventually:** Deregister the monolith. Migration complete.

The key principle: never freeze feature development. The monolith keeps receiving features in Angular while new features are built as React MFs. Users never notice the migration — the URL `/reports` might serve Angular today and React tomorrow.

Trade-off: the Hybrid approach has the highest configuration complexity. But for a migration of this scale, the alternative — a big-bang rewrite — is far riskier. The Hybrid approach lets us migrate incrementally and reversibly.

---

### Scenario 3: Media Company — Micro Frontends Embedded in Third-Party Sites

**Situation:** A media company builds embeddable widgets (video player, comment section, article recommendations) that third-party publishers embed on their sites. Each widget is developed by a different team. The widgets must work on any website without breaking the host page's styles or JavaScript.

**Question:** Which approach and what isolation strategies would you use?

**Model Answer:**

I'd use **Single-Spa** for orchestration with **Shadow DOM** for CSS isolation and **iframe sandboxing** as a fallback for untrusted environments.

Module Federation is a poor fit here because it assumes trust between containers — remotes execute in the same JavaScript context as the host, with full access to cookies, localStorage, and the DOM. On third-party sites, we can't trust the host environment, and the host can't trust our widgets.

Single-Spa gives us explicit lifecycle management: each widget bootstraps, mounts into a designated container, and unmounts cleanly. The `unmount` hook guarantees we leave no residual DOM, event listeners, or global state on the publisher's page.

For CSS isolation, Shadow DOM is the only option that provides browser-enforced style encapsulation. CSS Modules and BEM conventions can't protect against the publisher's global styles (tag selectors, `!important` overrides). Shadow DOM creates a hard boundary — the publisher's CSS cannot leak into our widgets, and our styles cannot affect their page.

For JavaScript isolation in high-security scenarios (e.g., widgets handling payment data), I'd use iframes with `sandbox` attributes. This sacrifices the seamless integration of Shadow DOM but provides process-level isolation.

Communication between our widgets would use Custom Events with `composed: true` (so events cross Shadow DOM boundaries). No shared store — we can't guarantee the publisher's page won't interfere with a global store.

Trade-off: Shadow DOM has React compatibility quirks (event delegation, portal rendering) and requires duplicating shared styles in each shadow root. But for third-party embedding, the isolation guarantee outweighs the inconvenience.

---

### Scenario 4: Startup — Small Team, Moving Fast, Considering Micro Frontends

**Situation:** A startup with 4 frontend developers is building a SaaS dashboard. The CTO read about micro frontends and wants to adopt them for "future scalability." The app has 3 main sections: Analytics, Settings, and User Management.

**Question:** Would you recommend micro frontends? If not, what would you suggest instead?

**Model Answer:**

I would **not** recommend micro frontends for this team. The operational overhead would slow them down, not speed them up.

Micro frontends solve an organizational scaling problem — when multiple independent teams need to deploy independently without coordinating. With 4 developers, you don't have that problem. You have one team, one codebase, one deploy pipeline. The coordination cost is a 5-minute standup, not a deploy queue.

The overhead of micro frontends for a 4-person team:
- 3 separate build pipelines to maintain instead of 1
- Orchestration configuration (Single-Spa or Module Federation) that every developer must understand
- Cross-app communication patterns for features that could just share a React context
- 3x the CI/CD infrastructure, monitoring dashboards, and deployment targets
- Debugging across micro frontend boundaries instead of stepping through one codebase

What I'd recommend instead:
1. **A well-structured monolith** with clear module boundaries. Use a `features/` directory structure where each section (Analytics, Settings, User Management) is a self-contained module with its own components, hooks, and routes.
2. **Code splitting** with `React.lazy()` and route-based chunking. This gives you the performance benefits of loading code on demand without the operational complexity.
3. **A clear module boundary convention** — each feature module exports a route component and nothing else. No cross-feature imports. This makes future extraction to micro frontends straightforward if the team grows.

The key insight for the interviewer: micro frontends are an organizational pattern, not a technical one. Adopt them when team independence is more valuable than the simplicity of a monolith. For 4 developers, the monolith wins.

---

### Scenario 5: Healthcare Platform — Strict Compliance, Independent Deployment Required

**Situation:** A healthcare platform has 5 teams building: Patient Records, Scheduling, Billing, Lab Results, and Messaging. Each module has different compliance requirements (HIPAA). Teams must deploy independently because each module goes through separate compliance review cycles. All teams use React. The platform must have centralized audit logging of all module loads and unloads.

**Question:** Which approach gives you the deployment independence and audit capabilities you need?

**Model Answer:**

I'd choose the **Hybrid approach** — Single-Spa for orchestration with Module Federation for code loading.

The centralized audit logging requirement is the deciding factor. Single-Spa's lifecycle hooks give us explicit, observable mount/unmount events for every module. We can hook into `addErrorHandler()` and single-spa's routing events (`single-spa:before-mount-routing-event`, `single-spa:routing-event`) to log exactly when each module loads, mounts, unmounts, and errors — with timestamps, user context, and module versions. This audit trail is essential for HIPAA compliance.

With pure Module Federation, module loading is implicit — `React.lazy()` loads components as React needs them. There's no centralized hook to observe all loads and unloads. You'd have to instrument each Error Boundary individually, which is fragile across 5 teams.

Module Federation handles the deployment independence requirement. Each team builds and deploys their remote independently. The shell fetches the latest `remoteEntry.js` at runtime — no rebuild needed when Billing deploys a new version. Shared dependencies (React, the audit logging library) are singletons, so compliance-critical shared code is consistent across all modules.

For the compliance review cycle: each team's CI pipeline includes their compliance checks. The shell's CI pipeline runs integration tests that compose all modules together. A module can't reach production without passing both its own compliance review and the composed integration tests.

Trade-off: the Hybrid approach's configuration complexity is higher, but for a healthcare platform where auditability and controlled lifecycle management are regulatory requirements, the complexity is justified.

---

### Scenario 6: Platform Team — Designing a Shared Component Library for Micro Frontends

**Situation:** You're on the platform team at a company with 10 micro frontends. Each team needs access to a shared design system (buttons, forms, modals, data tables). The design system is actively developed — new components ship weekly. Teams should get updates without rebuilding their micro frontends.

**Question:** How would you distribute the design system across micro frontends?

**Model Answer:**

I'd use **Module Federation** to expose the design system as a federated remote, with version pinning for stability.

The design system becomes its own Module Federation remote — a standalone webpack build that exposes every component: `exposes: { './Button': './src/Button', './Modal': './src/Modal', ... }`. Each micro frontend declares it as a remote in their webpack config.

When a team's micro frontend loads, Module Federation fetches the design system's `remoteEntry.js` and loads only the components that team actually uses. New components ship by deploying the design system remote — no micro frontend rebuild needed.

For version stability, I'd use versioned remote entry URLs: `designSystem@https://cdn.example.com/design-system/v2.3/remoteEntry.js`. Teams pin to a specific version and upgrade on their own schedule. This prevents a breaking change in the design system from cascading to all 10 micro frontends simultaneously.

For the design system's CSS, I'd use CSS Modules internally (build-time scoping) and expose CSS custom properties (design tokens) for theming. Each micro frontend inherits the tokens, ensuring visual consistency without tight CSS coupling.

The alternative — publishing the design system as an npm package — requires every team to rebuild and redeploy when the package updates. With 10 teams and weekly releases, that's 10 rebuilds per week. Module Federation eliminates this by sharing at runtime.

Trade-off: runtime loading means a network request for the design system on every page load. I'd mitigate this with aggressive caching (`Cache-Control: max-age=31536000` on versioned URLs) and preloading (`<link rel="preload">` for the design system's `remoteEntry.js`).

---

### Scenario 7: Performance-Critical Application — Sub-Second Load Time Required

**Situation:** A news website needs sub-second initial page load (LCP < 1s). The page has a header (navigation + user menu), article content, sidebar (related articles), and footer. Different teams own each section. The site gets 50M monthly page views.

**Question:** How would you architect micro frontends without sacrificing performance?

**Model Answer:**

I'd use **Module Federation** with aggressive performance optimization, and I'd challenge whether every section truly needs to be a separate micro frontend.

First, the architecture: the article content is the critical path — it must render in < 1s. The header, sidebar, and footer are secondary. I'd structure this as:

- **Host app** renders the article content directly (not a remote) — zero MF overhead on the critical path
- **Header** is a Module Federation remote loaded with `eager: true` (pre-bundled with the host, renders immediately)
- **Sidebar** is a Module Federation remote loaded lazily after the article renders (below the fold, not LCP-critical)
- **Footer** is a Module Federation remote loaded lazily on scroll (intersection observer trigger)

Performance optimizations:
1. **Preload critical remotes:** `<link rel="preload" href="header-remote/remoteEntry.js" as="script">` in the HTML head
2. **Singleton sharing:** React loads once for all remotes — `singleton: true, eager: true` on the host
3. **Skeleton loaders:** Reserve space for each remote's container with CSS `min-height` to prevent layout shifts (CLS)
4. **CDN caching:** Versioned `remoteEntry.js` URLs with long cache TTLs. Content-hash chunk filenames for immutable caching.
5. **Bundle budgets:** Each remote has a JavaScript budget (e.g., header < 30KB, sidebar < 50KB). CI fails if a remote exceeds its budget.

I'd measure with Core Web Vitals: LCP for the article content, CLS for layout stability as remotes load, and INP for interaction responsiveness. Each team is responsible for their remote's performance within its budget.

Trade-off: making the article content part of the host (not a remote) means the content team can't deploy independently from the host. For a news site where article content is the core product, this coupling is acceptable — the content team and host team are likely the same team or closely coordinated.

---

### Scenario 8: Micro Frontend Communication — Choosing the Right Pattern

**Situation:** You have three micro frontends: Products (browse and search), Cart (manages items), and Checkout (payment flow). When a user adds a product to the cart, the Cart MF needs to update. When the cart total changes, the Checkout MF needs to reflect the new total. The Cart icon in the header (part of the shell) needs to show the item count.

**Question:** Which communication pattern(s) would you use, and why?

**Model Answer:**

I'd use a **combination of a shared store and custom events**, choosing the pattern based on the communication need.

**Shared store for cart state** — The cart contents (items, quantities, total) are shared state that multiple MFs need to read at different times. The Cart MF writes to the store. The Checkout MF reads the current total when it mounts (late-subscriber support via `getState()`). The shell's header reads the item count. A shared observable store is the right fit because:
- The Checkout MF might mount after items are already in the cart — it needs `getState()` to catch up
- The header needs to reflect the current count at all times — it subscribes to changes
- The state shape is well-defined and owned by the Cart team

**Custom events for transient notifications** — When a product is added to the cart, the Products MF dispatches a `cart:item-added` custom event. This triggers a brief animation in the header (cart icon bounce) and an analytics event. Custom events are the right fit because:
- The animation is fire-and-forget — if no one is listening, nothing breaks
- The Products MF shouldn't know or care about the header's animation logic
- Analytics events are inherently fire-and-forget

I would NOT use the event bus here because the communication patterns are simple enough for native custom events and a shared store. The event bus adds value when you need error isolation across many subscribers or middleware (logging, rate limiting) — overkill for this scenario.

The state flow:
```
Products MF → dispatches CustomEvent('cart:item-added', { productId, quantity })
            → calls cartStore.setState({ items: [...current, newItem] })

Cart MF     → subscribes to cartStore, re-renders on change

Checkout MF → on mount: cartStore.getState() for current total
            → subscribes to cartStore for live updates

Shell Header → subscribes to cartStore, shows item count badge
```

Trade-off: the shared store creates coupling around the cart state shape. If the Cart team changes the shape, the Checkout MF and shell header break. I'd mitigate this with selector functions (`getCartTotal()`, `getCartItemCount()`) that act as a stable API over the raw state.

---

### Scenario 9: Debugging a Production Issue — Micro Frontend Fails to Load

**Situation:** Users report that the Dashboard micro frontend shows a blank white area instead of content. Other micro frontends (Home, Settings) work fine. The Dashboard team says their standalone app works correctly. This started after a deployment yesterday.

**Question:** Walk through your debugging process.

**Model Answer:**

I'd work through a systematic checklist, starting from the most common causes:

**1. Check the Network tab.** Filter for the Dashboard's `remoteEntry.js` (Module Federation) or bundle URL (Single-Spa). If it's a 404, the deployment changed the URL or filename. If it's a CORS error, the remote's server isn't sending the right headers. If it's a timeout, the remote's server is down or slow.

**2. Check the Console for errors.** Module Federation logs specific errors: "Container initialization failed" (shared dep mismatch), "Module not found" (exposed module name changed), or "Loading script failed" (network issue). Single-Spa logs lifecycle errors with the app name.

**3. Check if the exposed module interface changed.** If the Dashboard team renamed their exposed module (e.g., from `./Dashboard` to `./DashboardApp`) or changed the exports, the host's import will fail. Compare the current webpack config's `exposes` with what the host expects in its `remotes` config.

**4. Check shared dependency versions.** If yesterday's deployment upgraded React in the Dashboard remote but the host is on an older version, `singleton: true` forces the Dashboard to use the host's React. If the Dashboard's code uses APIs from the newer React, it crashes silently. Check the console for "Unsatisfied version" warnings.

**5. Check the Error Boundary.** If the Dashboard component throws during render (not during loading), the Error Boundary should show a fallback UI — not a blank white area. A blank area suggests the Error Boundary itself is broken, or there's no Error Boundary wrapping the Dashboard import. Check the host's `App.js`.

**6. Check the async boundary.** If the Dashboard team removed or changed their `index.js → import('./bootstrap')` pattern, shared dependency negotiation might fail silently, causing duplicate React instances and the "Invalid hook call" error.

**7. Reproduce locally.** Run the host and Dashboard remote locally, pointing the host's remote config to the deployed Dashboard URL. This isolates whether the issue is in the Dashboard's code or the deployment infrastructure.

The most likely cause (in my experience): the deployment changed a URL, filename, or exposed module name. The fix is usually a one-line config change. The lesson: add health checks that verify each remote's `remoteEntry.js` is accessible and returns the expected container interface.

---

### Scenario 10: Architecture Review — Evaluating an Existing Micro Frontend Setup

**Situation:** You join a company that already has micro frontends. They use Module Federation with 6 remotes. You notice: no Error Boundaries around remote imports, shared dependencies configured inconsistently across remotes, no integration tests, and each team uses a different React version (17.0.2, 18.0.0, 18.2.0). The app crashes intermittently with "Invalid hook call" errors.

**Question:** What's your remediation plan?

**Model Answer:**

The "Invalid hook call" errors are almost certainly caused by multiple React instances — the inconsistent shared configs and version spread confirm this. Here's my prioritized remediation plan:

**Priority 1 (This week) — Fix the React singleton crisis.**
Standardize the `shared` config across ALL 6 remotes and the host. Every container must have:
```js
shared: {
  react: { singleton: true, requiredVersion: '^18.0.0' },
  'react-dom': { singleton: true, requiredVersion: '^18.0.0' }
}
```
Upgrade the React 17 remote to React 18. With `singleton: true`, the host's React wins — the React 17 remote is already using React 18 at runtime (causing the crashes). Making the upgrade explicit fixes the version mismatch.

**Priority 2 (This sprint) — Add Error Boundaries.**
Wrap every remote import in the host's `App.js` with an Error Boundary + Suspense. This prevents one remote's failure from white-screening the entire app. Each boundary shows a fallback UI and reports the error to the monitoring system.

**Priority 3 (Next sprint) — Create a shared webpack config package.**
Build `@myorg/webpack-mf-config` that exports the standardized `ModuleFederationPlugin` options. All teams import it instead of configuring MF independently. This prevents config drift — the #1 cause of the current issues.

**Priority 4 (Next sprint) — Add integration tests.**
Create a CI pipeline that composes the host with all 6 remotes and runs smoke tests: each remote loads, renders, and doesn't throw. Run this on every deployment of any remote. This catches breaking changes before they reach production.

**Priority 5 (Ongoing) — Establish governance.**
- Quarterly dependency upgrade cadence for shared dependencies
- CI lint rule that validates each remote's `shared` config matches the standard
- Runtime monitoring that detects duplicate library instances and alerts the platform team

The root cause isn't technical — it's organizational. Six teams configured Module Federation independently without a shared standard. The fix is both technical (shared config package, integration tests) and process (governance, upgrade cadence).

---

### Scenario 11: Choosing a CSS Isolation Strategy for a Multi-Team Platform

**Situation:** Your platform has 8 micro frontends built by different teams. Two teams report CSS conflicts — their `.card` and `.header` classes are overriding each other. The platform uses Module Federation. Some teams use CSS-in-JS (styled-components), others use plain CSS files.

**Question:** How would you standardize CSS isolation across the platform?

**Model Answer:**

I'd standardize on **CSS Modules** as the default, with an escape hatch to **Shadow DOM** for components that need absolute isolation.

CSS Modules are the right default because they work at build time with zero runtime cost, integrate naturally with webpack (which all teams already use for Module Federation), and require minimal code changes — rename `.css` files to `.module.css` and change `className="card"` to `className={styles.card}`. The build tool guarantees uniqueness by appending hashes to class names.

For the teams using styled-components: styled-components already provides scoped styles (unique class names generated at runtime). No change needed — their styles won't conflict with CSS Modules or other styled-components.

For the teams using plain CSS: migrate to CSS Modules. This is the smallest change — same CSS syntax, just a different import pattern. Add a webpack rule that treats `.module.css` files with `css-loader` modules enabled.

For the immediate conflict fix: audit both teams' CSS for unprefixed class names and tag selectors (`h3 { }`, `div { }`) that leak globally. These are the most common culprits. Add a stylelint rule that rejects tag selectors and unprefixed class names in CI.

I'd reserve Shadow DOM for specific cases: components embedded in third-party pages, or components that must be immune to any global CSS (including `!important` overrides from other teams). Shadow DOM's trade-offs (style duplication, React event delegation quirks) make it too heavy for the default case.

Trade-off: CSS Modules don't protect against tag selectors or `!important` from other MFs. The stylelint rules in CI are the defense against those. For most teams, this is sufficient — the remaining edge cases are rare enough to handle case-by-case with Shadow DOM.

---

### Scenario 12: Testing Strategy for a Critical User Journey Across Micro Frontends

**Situation:** Your e-commerce platform has a critical user journey: browse products → add to cart → proceed to checkout → complete payment. This journey crosses 4 micro frontends (Products, Cart, Checkout, Payment). Each team has their own unit tests, but there are no cross-MF tests. A recent deployment broke the "add to cart" flow because the Products team changed the event payload shape.

**Question:** How would you prevent this from happening again?

**Model Answer:**

The root cause is a **contract violation** — the Products team changed the `cart:item-added` event payload without updating the Cart team's consumer. Unit tests can't catch this because each team tests in isolation.

My prevention strategy has three layers:

**Layer 1 — Contract tests (run on every commit).** Define the event contract in a shared schema:
```js
// contracts/cart-events.schema.js
export const cartItemAddedSchema = {
  productId: 'string (required)',
  quantity: 'number (required)',
  price: 'number (required)'
};
```
Both the Products team (publisher) and Cart team (consumer) write tests against this schema. If the Products team changes the payload, their contract test fails in their own CI pipeline — before the change reaches production.

**Layer 2 — Integration tests (run on every commit).** Test the actual communication path: create a real EventBus (or SharedStore), simulate the Products MF publishing `cart:item-added`, and assert the Cart MF's handler receives the expected payload. These tests use real implementations, not mocks, and run in Jest without a browser.

**Layer 3 — E2E smoke tests (run on every deployment).** A Cypress test that executes the critical journey: visit the products page, click "Add to Cart," verify the cart updates, proceed to checkout, verify the total. This runs against the composed application with all MFs running. If any contract breaks, this test catches it.

For governance: the event contract schemas live in a shared package that both teams depend on. Changing a schema requires a PR that both teams review. This creates a coordination point — but for critical cross-MF contracts, that coordination is necessary.

The trade-off: contract tests add maintenance overhead. But the cost of a broken checkout flow in production (lost revenue, customer trust) far outweighs the cost of maintaining a few schema files and integration tests.

---
## Quick-Reference Cheat Sheet

Use this section for last-minute review. It covers the key concepts, commands, and configuration patterns for each approach and cross-cutting concern.

---

### Single-Spa — Key Concepts

| Concept | What It Is | Why It Matters |
|---------|-----------|----------------|
| **Root Config** | The shell app that registers and orchestrates all micro frontends | Entry point of the architecture — owns routing and lifecycle management |
| **Lifecycle Hooks** | `bootstrap` (once), `mount` (each activation), `unmount` (each deactivation) | The contract between the shell and each MF — must return Promises |
| **`activeWhen`** | URL matching condition that determines when an app is active | Controls which MF renders for which route — supports strings, arrays, and functions |
| **SystemJS** | Module loader that resolves import maps to URLs at runtime | How Single-Spa loads MF bundles — replaced by Module Federation in the Hybrid approach |
| **Import Map** | JSON mapping of module names to URLs in the HTML template | Decouples logical module names from deployment URLs — update the map to deploy |
| **`addErrorHandler`** | Global error handler for all lifecycle and loading failures | Centralized error handling — catches errors from ALL registered apps |

**Single-Spa Registration Pattern:**
```js
import { registerApplication, start } from 'single-spa';

registerApplication({
  name: 'app-react-home',
  app: () => System.import('app-react-home'),
  activeWhen: ['/home'],
  customProps: { domElement: '#app-container' },
});

start(); // Triggers initial route evaluation
```

**Single-Spa Lifecycle Hooks (in each micro frontend):**
```js
import singleSpaReact from 'single-spa-react';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './root.component';

const lifecycles = singleSpaReact({
  React, ReactDOM,
  rootComponent: App,
  errorBoundary(err) {
    return <div>Error: {err.message}</div>;
  },
});

export const bootstrap = lifecycles.bootstrap;
export const mount = lifecycles.mount;
export const unmount = lifecycles.unmount;
```

---

### Module Federation — Key Concepts

| Concept | What It Is | Why It Matters |
|---------|-----------|----------------|
| **Host** | The app that consumes remote modules | Entry point — declares which remotes it imports from |
| **Remote** | An app that exposes modules for consumption | Independently deployed — host fetches its code at runtime |
| **`remoteEntry.js`** | Small manifest file generated by webpack for each remote | Contains the container interface (`get`, `init`) — the handshake entry point |
| **Shared Scope** | Runtime registry of shared dependencies and their versions | Enables deduplication — all containers negotiate through this single registry |
| **`singleton: true`** | Forces one copy of a dependency across all containers | Required for React (hooks break with duplicates) and any stateful library |
| **Async Boundary** | `index.js → import('./bootstrap')` pattern | Creates a pause for shared dep negotiation before app code executes |
| **`eager: true`** | Bundles the dependency in the initial chunk (skips negotiation) | Use only on the host for critical-path deps — remotes should never use this |

**Module Federation Host Config:**
```js
// host-app/webpack.config.js
new ModuleFederationPlugin({
  name: 'hostApp',
  remotes: {
    remoteProducts: 'remoteProducts@http://localhost:3001/remoteEntry.js',
    remoteCart: 'remoteCart@http://localhost:3002/remoteEntry.js',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
  },
})
```

**Module Federation Remote Config:**
```js
// remote-products/webpack.config.js
new ModuleFederationPlugin({
  name: 'remoteProducts',
  filename: 'remoteEntry.js',
  exposes: {
    './ProductList': './src/ProductList',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
  },
})
```

**Consuming a Remote Component:**
```js
// In the host app
const ProductList = React.lazy(() => import('remoteProducts/ProductList'));

function App() {
  return (
    <ErrorBoundary fallback={<div>Products unavailable</div>}>
      <React.Suspense fallback={<div>Loading products...</div>}>
        <ProductList />
      </React.Suspense>
    </ErrorBoundary>
  );
}
```

---

### Hybrid Approach — Key Concepts

| Concept | What It Is | Why It Matters |
|---------|-----------|----------------|
| **mf-loader Bridge** | Function that loads MF remotes via Module Federation and returns single-spa lifecycle objects | The glue between the two systems — three lines of code that connect orchestration to code loading |
| **Dual Nature** | Each MF is both an MF remote (exposes modules) and a single-spa app (exports lifecycle hooks) | Enables lifecycle management AND runtime code sharing simultaneously |
| **Shared `single-spa`** | `single-spa` itself is shared as a singleton via Module Federation | Required — shell and remotes must share one single-spa registry, or routing breaks |
| **No SystemJS** | Module Federation replaces SystemJS as the module loading mechanism | Eliminates import maps and the SystemJS runtime dependency |

**The mf-loader Bridge:**
```js
// shell/src/mf-loader.js
export function loadMFApp(remoteName, modulePath) {
  return async () => {
    const module = await import(`${remoteName}/${modulePath}`);
    return module; // { bootstrap, mount, unmount }
  };
}
```

**Hybrid Registration Pattern:**
```js
// shell/src/bootstrap.js
import { registerApplication, start, addErrorHandler } from 'single-spa';
import { loadMFApp } from './mf-loader';

registerApplication({
  name: 'mf-home',
  app: loadMFApp('mfHome', 'singleSpaEntry'),  // MF loading
  activeWhen: ['/home'],                         // single-spa routing
  customProps: { domElement: '#micro-frontend-container' },
});

start();
```

**Hybrid Shared Config (includes single-spa):**
```js
// shell/webpack.config.js
shared: {
  react: { singleton: true, requiredVersion: '^18.0.0' },
  'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
  'single-spa': { singleton: true, requiredVersion: '^5.9.0' },  // Hybrid-specific
}
```

---

### Communication Patterns — Quick Reference

| Pattern | API | Coupling | Late Subscriber Support | Error Isolation |
|---------|-----|---------|------------------------|-----------------|
| **Custom Events** | `dispatchEvent(new CustomEvent(name, { detail }))` / `addEventListener(name, handler)` | Loosest | ❌ | N/A |
| **Event Bus** | `bus.publish(event, data)` / `bus.subscribe(event, callback)` | Moderate | ❌ | ✅ Per-subscriber |
| **Shared Store** | `store.setState(partial)` / `store.subscribe(listener)` / `store.getState()` | Tightest | ✅ via `getState()` | ✅ Per-subscriber |

**Rule of thumb:** Use the loosest coupling that meets your needs. Custom events for notifications, shared store for state that late-mounting MFs need to read.

---

### CSS Isolation — Quick Reference

| Technique | How It Works | Protects Against | Doesn't Protect Against |
|-----------|-------------|-----------------|------------------------|
| **CSS Modules** | Build-time hash on class names (`.card` → `.Card__card--x7k2f`) | Class name collisions | Tag selectors, `!important` |
| **Shadow DOM** | Browser-enforced boundary via `attachShadow({ mode: 'open' })` | Everything (class names, tags, `!important`) | CSS custom properties (by design) |
| **BEM + Prefixes** | Naming convention (`.mf-products-card__title--bold`) | Class name collisions (if followed) | Tag selectors, `!important`, human error |

**Default choice:** CSS Modules (strong isolation, zero runtime cost, works with webpack).

---

### Shared Dependencies — Quick Reference

| Strategy | Config | When to Use |
|----------|--------|-------------|
| **Singleton** | `{ singleton: true, requiredVersion: '^18.0.0' }` | React, ReactDOM, single-spa — any library with internal state |
| **Version Range** | `{ requiredVersion: '^4.17.0' }` (no singleton) | lodash, axios — stateless utilities where duplicates are safe |
| **Eager** | `{ singleton: true, eager: true }` | Host's React when first-paint performance matters — never on remotes |

**Common pitfalls to remember:**
1. Missing `singleton: true` for React → "Invalid hook call" error
2. `eager: true` on a remote → bypasses sharing, loads its own copy
3. Missing async boundary (`index.js → import('./bootstrap')`) → sharing never happens
4. Inconsistent `shared` config across containers → intermittent duplicate instances

---

### Testing Strategy — Quick Reference

| Level | Tool | What It Tests | Run When | Owned By |
|-------|------|--------------|----------|----------|
| **Unit** | Jest + React Testing Library | Single MF component in isolation | Every commit | Each team |
| **Integration** | Jest (no browser) | Communication contracts (events, store, schemas) | Every commit | Consuming team or platform team |
| **E2E** | Cypress / Playwright | Composed app with all MFs running | Every deploy (smoke) / Nightly (full) | Platform / QA team |

**Key insight:** Unit tests stay within one MF. Integration tests cross the communication layer. E2E tests validate the composed whole.

---

### Key Terms for Interview Conversations

| Term | One-Line Definition |
|------|-------------------|
| **Strangler Fig** | Migration pattern — wrap the monolith, extract features one by one, retire the monolith when empty |
| **Async Boundary** | `import('./bootstrap')` pattern that enables Module Federation's shared dep negotiation |
| **Container Interface** | The `{ get, init }` object that Module Federation generates in `remoteEntry.js` |
| **Shared Scope** | Runtime registry where all MF containers negotiate which version of shared deps to use |
| **Import Map** | JSON mapping of logical module names to URLs — used by SystemJS in Single-Spa |
| **Parcel** | Single-Spa concept for mounting an app inside another app (component-level, not route-level) |
| **Error Boundary** | React component that catches rendering errors in its subtree and shows fallback UI |
| **Design Tokens** | Shared values (colors, spacing, typography) that ensure visual consistency across MFs |
| **Contract Test** | Test that verifies the interface between two MFs (event names, payload shapes, exposed modules) |
| **Canary Deploy** | Rolling out a new version to a small percentage of users before full deployment |

---

## Further Reading

Each approach and cross-cutting module has its own detailed interview questions. This guide covers the consolidated, cross-approach scenarios. For deeper dives:

- **Micro frontend fundamentals & Single-Spa specifics:** [Single-Spa/README.md](../../Single-Spa/README.md) — 10 interview questions covering lifecycle internals, SystemJS alternatives, and migration strategies
- **Module Federation internals:** [ModuleFederation/README.md](../../ModuleFederation/README.md) — 5 interview questions covering runtime loading, breaking changes, singleton mechanics, architecture decisions, and security
- **Hybrid architecture:** [Hybrid/README.md](../../Hybrid/README.md) — 6 interview questions covering the bridge pattern, migration phasing, failure modes, and approach comparison
- **Communication patterns:** [docs/communication/README.md](../communication/README.md) — 5 interview questions on event buses, shared stores, and debugging cross-MF communication
- **CSS isolation:** [docs/css-isolation/README.md](../css-isolation/README.md) — 3 interview questions on CSS Modules, Shadow DOM, and diagnosing style conflicts
- **Routing strategies:** [docs/routing/README.md](../routing/README.md) — 3 interview questions on shell-level vs app-level routing and deep linking
- **Shared dependencies:** [docs/shared-deps/README.md](../shared-deps/README.md) — 4 interview questions on runtime negotiation, the async boundary, and debugging duplicate instances
- **Testing strategies:** [docs/testing/README.md](../testing/README.md) — 4 interview questions on the testing pyramid, E2E challenges, and contract testing
