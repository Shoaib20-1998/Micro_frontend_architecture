# CSS Isolation and Styling Strategies for Micro Frontends

## Why CSS Isolation Matters

When multiple micro frontends run on the same page, they share a single global CSS scope. Without isolation, a `.card` class defined by the Products team will collide with a `.card` class defined by the Profile team. In production, this leads to broken layouts, invisible elements, and debugging nightmares that only appear when specific MFs are loaded together.

CSS isolation is not optional in micro frontend architecture — it's a foundational requirement.

## Three Techniques Demonstrated

This module demonstrates three CSS isolation approaches, each with different trade-offs:

| Technique | Enforcement | Tooling Required | Isolation Strength | Runtime Cost |
|-----------|-------------|------------------|--------------------|--------------|
| **CSS Modules** | Build-time (automatic) | Webpack/Vite with css-loader | Strong | Zero |
| **Shadow DOM** | Browser-native (automatic) | None | Strongest | Low (style duplication) |
| **BEM + App Prefixes** | Convention (manual) | None (optional linting) | Moderate | Zero |

## Technique 1: CSS Modules (`css-modules-example.js`)

CSS Modules transform class names at build time by appending a unique hash. Two MFs can both define `.card`, and the compiled output becomes `.ProductCard__card--x7k2f` and `.UserCard__card--m9p1q` — completely different selectors.

**How it works:**
1. You write normal CSS in a `.module.css` file
2. Webpack's `css-loader` with `modules: true` rewrites each class name to include a hash
3. You import the CSS file as a JavaScript object: `import styles from './Card.module.css'`
4. You reference classes via the object: `className={styles.card}`
5. The browser receives plain CSS with unique selectors — no runtime magic

**Best for:** Teams with a webpack/Vite build pipeline who want strong isolation with zero runtime cost and familiar CSS authoring.

See `css-modules-example.js` for annotated code showing two components with identical class names coexisting without conflict.

## Technique 2: Shadow DOM (`shadow-dom-example.js`)

Shadow DOM creates a browser-enforced boundary around a DOM subtree. Styles inside a shadow root cannot leak out, and external styles cannot leak in. This is the strongest isolation available because it's enforced by the browser's rendering engine.

**How it works:**
1. Create a shadow root: `element.attachShadow({ mode: 'open' })`
2. Add styles and markup inside the shadow root
3. The browser's style resolution treats the shadow boundary as a hard wall
4. CSS custom properties (variables) are the only thing that crosses the boundary — this is the intended theming mechanism

**Best for:** Teams that need absolute isolation (e.g., embedding MFs in third-party pages) and don't rely heavily on React's event system or global CSS frameworks.

See `shadow-dom-example.js` for a working demo with two shadow-DOM-encapsulated components and a global style that proves the isolation works.

## Technique 3: BEM + App Prefixes (`bem-prefix-example.js`)

BEM (Block Element Modifier) with app prefixes is a naming convention where every class name starts with the micro frontend's name: `.mf-products-card__title--bold`. This makes collisions unlikely because selectors are namespaced.

**How it works:**
1. Each team agrees on a unique app prefix (e.g., `mf-products`, `mf-profile`)
2. All CSS classes follow the pattern: `.{prefix}-{block}__{element}--{modifier}`
3. Teams enforce the convention via stylelint rules and code review
4. The browser sees normal CSS — no special APIs or build transforms

**Best for:** Teams without a build pipeline, legacy codebases that can't adopt CSS Modules or Shadow DOM, or as a quick-start approach before migrating to stronger isolation.

See `bem-prefix-example.js` for annotated code including a BEM helper utility and linting configuration.

## Comparison Matrix

| Criteria | CSS Modules | Shadow DOM | BEM + Prefixes |
|----------|-------------|------------|----------------|
| **Isolation guarantee** | Strong (build-enforced) | Strongest (browser-enforced) | Moderate (convention) |
| **Protects against tag selectors** | No | Yes | No |
| **Protects against `!important`** | No | Yes | No |
| **Third-party CSS isolation** | Partial | Full | None |
| **Build tooling required** | Yes (webpack/Vite) | No | No |
| **Runtime overhead** | None | Low (style duplication) | None |
| **React compatibility** | Excellent | Improving (React 19+) | Excellent |
| **SSR support** | Yes (with isomorphic-style-loader) | Limited | Yes |
| **Debugging experience** | Moderate (hashed names) | Harder (collapsed trees) | Best (readable names) |
| **Team coordination needed** | Low | Low | High |
| **Theming support** | Via CSS variables or shared packages | Via CSS custom properties | Via CSS variables |
| **Learning curve** | Low | Medium | Low |

## Decision Framework

```
Do you have a build pipeline (webpack/Vite)?
├── YES → Do you need absolute isolation (third-party embedding)?
│         ├── YES → Shadow DOM
│         └── NO  → CSS Modules (recommended default)
└── NO  → BEM + App Prefixes (with linting enforcement)
```

In practice, many teams use a **hybrid approach**:
- CSS Modules for component-level styles (the default)
- Shadow DOM for components that must be embedded in unknown environments
- BEM prefixes for global utility classes and legacy code


## Interview Preparation

### Question 1: How would you prevent CSS conflicts between independently developed micro frontends?

**Model Answer:**

"There are three main approaches, and I'd choose based on the team's constraints:

**CSS Modules** are my default recommendation. They work at build time — webpack's css-loader rewrites class names to include a unique hash, so `.card` becomes `.ProductCard__card--x7k2f`. Two MFs can both define `.card` and they'll never collide. The key advantage is zero runtime cost and strong enforcement — the build tool guarantees uniqueness, so developers can't accidentally break isolation. The trade-off is that you need a bundler, and it doesn't protect against tag selectors or `!important` from other MFs.

**Shadow DOM** provides the strongest isolation because it's browser-enforced. Styles inside a shadow root literally cannot affect elements outside it, and vice versa. I'd use this when embedding a micro frontend into a third-party page where I have no control over existing styles. The trade-offs are style duplication (each shadow root needs its own copy of shared styles), React compatibility quirks with event delegation, and the fact that CSS custom properties still cross the boundary.

**BEM with app prefixes** is the simplest approach — just a naming convention like `.mf-products-card__title`. It requires no tooling but relies on team discipline. I'd use this for legacy codebases or teams without a build pipeline, and I'd pair it with stylelint rules to enforce the prefix convention in CI.

In practice, I'd combine CSS Modules as the default with Shadow DOM for components that need absolute isolation, and BEM prefixes for any global utility classes."

### Question 2: A team reports that their micro frontend's styles are being overridden by another team's CSS. How would you diagnose and fix this?

**Model Answer:**

"First, I'd diagnose the root cause by checking what isolation technique is in use:

**If they're using BEM/prefixes:** I'd check if someone wrote an unprefixed class name or a tag selector (like `h3 { color: red }`) that's leaking across MFs. I'd search for selectors without the app prefix and add stylelint rules to prevent this in CI. For the immediate fix, I'd add the prefix to the offending selectors.

**If they're using CSS Modules:** The collision is likely from a non-module CSS file (a global import like `import './globals.css'` instead of `import styles from './globals.module.css'`), or from a third-party library injecting global styles. I'd audit the imports and ensure all CSS files use the `.module.css` extension. For third-party CSS, I'd scope it with a wrapper class or move to Shadow DOM for that component.

**If they're using Shadow DOM:** This shouldn't happen unless someone is using CSS custom properties that cross the boundary, or the styles are being injected into the light DOM instead of the shadow root. I'd check that all style injection happens inside `attachShadow()`.

**General debugging steps:**
1. Open DevTools, inspect the affected element, and look at the 'Computed' styles tab to see which rule is winning
2. Check the specificity — a more specific selector from another MF will override a less specific one
3. Look for `!important` declarations, which override everything regardless of specificity
4. Check if the styles come from a shared dependency (like a CSS framework) that both MFs load

For the long-term fix, I'd establish a CSS isolation standard for the organization — typically CSS Modules as the default, with linting rules that reject global CSS imports and tag selectors."

### Question 3: What are the trade-offs of using Shadow DOM for CSS isolation in a React-based micro frontend architecture?

**Model Answer:**

"Shadow DOM gives the strongest CSS isolation available — it's browser-enforced, not convention-based. But in a React architecture, there are specific trade-offs to consider:

**Event delegation issues:** React uses event delegation, attaching listeners to the root container rather than individual elements. Events inside Shadow DOM are retargeted at the shadow boundary — `event.target` becomes the shadow host element, not the actual clicked element inside. React 17+ improved this by using the root container instead of `document`, and React 19 has better Shadow DOM support, but you may still hit edge cases with synthetic events.

**Style duplication:** Every shadow root needs its own copy of shared styles. If you have a design system with 50KB of CSS, and 10 micro frontends each in their own shadow root, that's 500KB of duplicated CSS in memory. Constructable Stylesheets (`adoptedStyleSheets`) solve this by letting shadow roots share a single `CSSStyleSheet` object, but browser support only became universal in 2023.

**Third-party library compatibility:** Libraries that create portals (modals, tooltips, dropdowns) by appending to `document.body` will render outside the shadow root, losing all scoped styles. You need to configure these libraries to render inside the shadow root, which isn't always possible.

**Form participation:** Form elements inside Shadow DOM don't participate in outer form submission. If your MF contains form fields that are part of a larger page form, you need the `ElementInternals` API (form-associated custom elements).

**Debugging complexity:** DevTools show shadow trees collapsed by default, making inspection less intuitive. `document.activeElement` returns the shadow host, not the focused element inside — you need `shadowRoot.activeElement`.

Despite these trade-offs, I'd still choose Shadow DOM when I need absolute isolation — like embedding a micro frontend in a third-party page or when teams can't coordinate on naming conventions. For internal micro frontends in a React app, CSS Modules are usually the better default."

## Files in This Module

| File | Description |
|------|-------------|
| `css-modules-example.js` | CSS Modules pattern with webpack config, two components with same class names, build-time isolation demo |
| `shadow-dom-example.js` | Shadow DOM encapsulation with working `attachShadow()` demo, browser support notes, theming via CSS variables |
| `bem-prefix-example.js` | BEM naming convention with app prefixes, helper utility, stylelint enforcement config |
| `README.md` | This file — comparison matrix, decision framework, interview preparation |
