# Routing Strategies for Micro Frontends

This module demonstrates two fundamental routing strategies in micro frontend architectures. Each strategy answers the same question differently: **who decides what to render when the URL changes?**

## The Two Strategies

| File | Strategy | Route Owner | Best For |
|------|----------|-------------|----------|
| `shell-routing-example.js` | Shell-Level Routing | Shell owns all routes | Consistent URL structure, centralized control |
| `app-routing-example.js` | App-Level Routing | Each MF owns its sub-routes | Team autonomy, complex internal navigation |

## How They Work

### Shell-Level Routing

The shell (container app) is the **single router** for the entire application. It inspects the URL, determines which micro frontend should be active, and mounts/unmounts accordingly. Individual MFs have no routing logic — they just render when told to.

```
URL: /products/123

Shell Router evaluates URL
  → "/products" prefix matches Products MF
  → Unmount current MF (if different)
  → Mount Products MF
  → Products MF renders (it doesn't know or care about the URL)
```

This is the pattern used by **Single-Spa** in this project. See `Single-Spa/root-config/src/index.js` where `registerApplication()` uses `activeWhen: ['/home']` — the shell decides when each MF is active.

### App-Level Routing

The shell mounts MFs into designated zones, and each MF runs its **own internal router** to handle navigation within its area. The shell doesn't know about sub-routes — it just provides the stage.

```
URL: /products/123

Shell mounts Products MF into #products-zone (already mounted)
  → Products MF's internal router evaluates URL
  → "/products/123" matches "/:id" sub-route
  → Products MF renders product detail view
  → Cart MF (in #cart-zone) is UNAFFECTED
```

## Comparison Matrix

| Criteria | Shell-Level Routing | App-Level Routing |
|----------|-------------------|-------------------|
| **Route ownership** | Shell owns all routes | Each MF owns its sub-routes |
| **Team autonomy** | Low — route changes require shell updates | High — teams manage their own routes |
| **URL consistency** | High — one team controls URL structure | Variable — each team may use different conventions |
| **Deep linking** | Simple — shell maps URL → MF directly | Complex — each MF must parse its own sub-URLs |
| **Adding new routes** | Requires shell deployment (unless dynamic) | MF team deploys independently |
| **Access control** | Easy — shell gates routes before mounting | Harder — each MF implements its own auth checks |
| **Browser back/forward** | Predictable — shell manages all transitions | Can be confusing if MFs don't coordinate |
| **Multiple MFs on screen** | Possible but shell must manage all of them | Natural — each zone has its own router |
| **Complexity** | Simple for the shell, none for MFs | Simple per MF, but coordination is harder |
| **Framework coupling** | MFs are framework-agnostic (no router needed) | Each MF uses its own routing library |

## Decision Framework

```
Does the shell team need to control the full URL structure?
├── YES → Shell-Level Routing
│         (Single-Spa's activeWhen, centralized route config)
└── NO  → Do MFs have complex internal navigation (wizards, nested views)?
          ├── YES → App-Level Routing
          │         (Each MF runs React Router / Vue Router internally)
          └── NO  → Shell-Level Routing (simpler default)
```

In practice, many production systems use a **hybrid**: the shell handles top-level route prefixes (shell-level), and each MF handles its own sub-routes (app-level). This is what happens in Single-Spa when a MF uses React Router internally — Single-Spa mounts/unmounts based on the prefix, and React Router handles everything under that prefix.

## How This Maps to the Project

| Project Directory | Routing Strategy | Mechanism |
|-------------------|-----------------|-----------|
| `Single-Spa/` | Shell-level | `registerApplication({ activeWhen: ['/home'] })` — shell decides |
| `ModuleFederation/` | Shell-level (implicit) | Host app's `<Route>` components decide which remote to render |
| `Hybrid/` | Shell-level + app-level potential | Shell uses Single-Spa routing; MFs could add internal routers |

---

## Interview Preparation

### Question 1: Compare shell-level routing and app-level routing in micro frontends. When would you choose each?

**Model Answer:**

"These are the two fundamental routing strategies, and they differ in who owns the route decisions.

**Shell-level routing** means the shell (container app) owns all routes. It inspects the URL, determines which micro frontend to mount, and manages transitions. The MFs themselves have no routing logic — they just render when the shell tells them to. This is how Single-Spa works: `registerApplication({ activeWhen: ['/products'] })` — the shell decides that `/products` activates the Products MF.

I'd choose shell-level routing when:
- I need a consistent, predictable URL structure across all MFs
- The shell team needs centralized access control (gate routes by auth before mounting)
- Deep linking needs to be straightforward (one URL → one MF, always)
- MFs are relatively simple and don't need complex internal navigation

**App-level routing** means each MF runs its own internal router and manages its own sub-routes. The shell just mounts MFs into zones and doesn't care about sub-URLs. When the Products MF navigates from `/products/list` to `/products/123`, the Cart MF is completely unaffected — it doesn't unmount, re-render, or lose state.

I'd choose app-level routing when:
- Teams need full autonomy over their URL structure (different teams, different conventions)
- MFs have complex internal navigation (multi-step wizards, nested views, tabs)
- Teams use different routing libraries (React Router in one MF, Vue Router in another)
- I want teams to add new sub-routes without any shell changes

In practice, I'd often combine both: shell-level routing for top-level prefixes (`/products`, `/cart`, `/settings`) and app-level routing within each MF for sub-routes (`/products/123/reviews`). Single-Spa naturally supports this — it mounts/unmounts based on the prefix, and each MF can use React Router internally for its sub-routes."

### Question 2: A team reports that navigating within their micro frontend causes another team's micro frontend to unmount and lose state. How would you diagnose and fix this?

**Model Answer:**

"This is a classic routing isolation failure. The symptom — one MF's navigation causing another MF to unmount — means the routing system is treating the sub-route change as a top-level route change. Here's how I'd diagnose it:

**Step 1: Check the routing strategy.** If the shell uses shell-level routing with exact path matching instead of prefix matching, navigating from `/products` to `/products/123` might cause the shell to think the route changed (no exact match for `/products/123`), unmount the Products MF, and try to find a new match. The fix: use prefix matching (`startsWith('/products')`) instead of exact matching.

**Step 2: Check for overlapping route prefixes.** If the shell has routes for both `/products` and `/products/featured`, navigating to `/products/featured` might match the wrong route depending on evaluation order. The fix: order routes from most specific to least specific, or use a more sophisticated matching algorithm.

**Step 3: Check if the MF is using `window.location` or `history.pushState` directly.** If the MF calls `window.location.href = '/products/123'` instead of `history.pushState()`, it triggers a full page reload — which unmounts everything. The fix: always use `pushState` for SPA navigation.

**Step 4: Check the shell's route change listener.** If the shell listens for `popstate` and re-evaluates ALL routes on every URL change, it might unnecessarily unmount/remount MFs even when the change is within the same prefix. The fix: add a check — if the new URL still matches the same MF's prefix, skip the unmount/mount cycle.

**Step 5: In Single-Spa specifically,** check the `activeWhen` configuration. If `activeWhen` is a function that returns `false` for the new sub-URL, Single-Spa will unmount the app. The fix: ensure `activeWhen` uses prefix matching: `activeWhen: (location) => location.pathname.startsWith('/products')`.

The root cause is almost always that the routing system doesn't distinguish between 'the active MF changed' (requires unmount/mount) and 'the URL changed within the same MF's prefix' (should be handled internally by the MF). The fix is always the same principle: the shell should only unmount when the top-level prefix changes, not on every URL change."

### Question 3: How would you implement deep linking in a micro frontend architecture where each MF manages its own sub-routes?

**Model Answer:**

"Deep linking means a user can bookmark or share a URL like `/products/123/reviews` and land directly on that specific view. In app-level routing, this requires coordination between the shell and the MF:

**On initial page load:**
1. The shell reads the full URL: `/products/123/reviews`
2. The shell matches the prefix `/products` and mounts the Products MF
3. The Products MF's internal router reads the full URL, extracts the sub-path `/123/reviews`, and renders the correct view

The key insight is that both the shell and the MF read `window.location.pathname` independently. The shell uses it to decide which MF to mount; the MF uses it to decide which internal view to render. They don't need to communicate — the URL is the shared contract.

**Challenges and solutions:**

1. **Loading order:** The MF's router must evaluate the URL after the MF is mounted and its DOM container exists. If the router evaluates too early (before mount), it can't render. Solution: call `router.start()` inside the MF's `mount()` lifecycle hook, not at module load time.

2. **Async data loading:** Deep linking to `/products/123` means the MF needs to fetch product 123's data on mount. If the data fetch fails, the MF should show an error state, not a blank screen. Solution: the MF's route handler should handle loading and error states.

3. **URL encoding:** If MFs use different URL conventions (one uses `/products/123`, another uses `/products?id=123`), deep links become inconsistent. Solution: establish a URL convention across teams (path params for resource IDs, query params for filters/pagination).

4. **Server-side routing:** The web server must return the SPA's `index.html` for ALL URL paths, not just the root. Otherwise, navigating directly to `/products/123/reviews` returns a 404 from the server. Solution: configure the server with a catch-all route that serves `index.html` for any path (standard SPA setup).

5. **SEO and social sharing:** If deep links need to work for crawlers and social media previews, you need server-side rendering or pre-rendering for each MF's routes. This is significantly harder with app-level routing because each MF has its own route structure. Solution: use a pre-rendering service that knows about all MFs' routes, or implement SSR at the shell level with route-based code splitting."

---

## Files in This Module

| File | Description |
|------|-------------|
| `shell-routing-example.js` | Shell-level router implementation — the shell owns all routes, mounts/unmounts MFs based on URL prefix. Annotated with comparisons to Single-Spa's `registerApplication()`. |
| `app-routing-example.js` | App-level sub-router implementation — each MF manages its own internal routes within a URL prefix. Demonstrates routing isolation between MFs. |
| `README.md` | This file — comparison matrix, decision framework, interview preparation with model answers. |

Each file is standalone and runnable. Read the inline annotations for deep architectural context.
