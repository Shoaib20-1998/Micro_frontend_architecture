/**
 * =============================================================================
 * CSS MODULES — CSS Isolation Technique #1
 * =============================================================================
 *
 * Pattern: Build-time class name scoping via webpack's css-loader
 *
 * WHY CSS MODULES?
 * ----------------
 * CSS Modules solve the global namespace problem of CSS by transforming class
 * names at build time. When you import a `.module.css` file, the bundler
 * rewrites each class name to a unique hash (e.g., `.card` becomes
 * `.card_abc123`). Two micro frontends can both define `.card` and they'll
 * never collide — the bundler guarantees uniqueness.
 *
 * This is the most popular CSS isolation technique in React micro frontends
 * because it requires zero runtime overhead and integrates seamlessly with
 * existing webpack/Vite toolchains.
 *
 * HOW IT PREVENTS STYLE BLEED (Requirement 8.2):
 * -----------------------------------------------
 * Each micro frontend's build pipeline independently hashes class names.
 * Even if MF-A and MF-B both write `.card { background: red }`, the compiled
 * output becomes `.card_x7k2f { background: red }` and `.card_m9p1q { ... }`.
 * The browser sees two completely different selectors — no conflict possible.
 *
 * BROWSER SUPPORT:
 * ----------------
 * CSS Modules are a BUILD-TIME feature, not a browser feature. The browser
 * receives plain CSS with mangled class names. This means:
 * ✅ Works in every browser (it's just regular CSS after compilation)
 * ✅ No polyfills needed
 * ⚠️  Requires a bundler (webpack, Vite, Parcel) — can't use with plain
 *     <script> tag setups
 *
 * PERFORMANCE IMPLICATIONS:
 * -------------------------
 * ✅ Zero runtime cost — all work happens at build time
 * ✅ Styles are statically extractable (can use MiniCssExtractPlugin for
 *    separate .css files, enabling browser caching)
 * ✅ Tree-shakeable — unused styles can be eliminated by the bundler
 * ⚠️  Slightly larger class names in HTML (hashes add ~10 chars per class)
 * ⚠️  Harder to debug in DevTools — you see `.card_x7k2f` not `.card`
 *     (mitigated by `localIdentName` config, shown below)
 *
 * TRADE-OFFS FOR MICRO FRONTENDS:
 * --------------------------------
 * ✅ Strongest isolation guarantee — enforced by the build tool, not convention
 * ✅ Familiar DX — just write normal CSS, import as an object
 * ✅ Works with CSS preprocessors (Sass, Less) out of the box
 * ⚠️  Each micro frontend MUST have its own build pipeline (which they should
 *     anyway in a proper micro frontend setup)
 * ⚠️  Sharing styles across micro frontends requires a shared CSS package
 *     (design tokens, not component styles)
 * ❌ Cannot isolate styles injected by third-party libraries that use global
 *    class names (e.g., Bootstrap's `.btn`)
 *
 * WHEN TO USE IN INTERVIEWS:
 * --------------------------
 * "CSS Modules are my default choice for CSS isolation in micro frontends.
 * They're build-time, zero-runtime-cost, and enforced by tooling rather than
 * convention. The only caveat is that each micro frontend needs its own build
 * pipeline, but that's already a given in any serious micro frontend setup."
 */

// =============================================================================
// WEBPACK CONFIGURATION FOR CSS MODULES
// =============================================================================
//
// This is the webpack config snippet each micro frontend needs to enable
// CSS Modules. In a real project, this lives in each MF's webpack.config.js.

/**
 * ANNOTATION: Why this config matters
 * ------------------------------------
 * The `css-loader` with `modules: true` is what transforms `.card` into
 * `.card_x7k2f`. Without this, CSS is global and will bleed across MFs.
 *
 * The `localIdentName` pattern controls the generated class name format:
 * - `[name]` = the CSS file name (e.g., "ProductCard")
 * - `[local]` = the original class name (e.g., "card")
 * - `[hash:base64:5]` = a 5-char hash for uniqueness
 *
 * In development, use a readable format like `[name]__[local]--[hash:base64:5]`
 * so you can debug in DevTools. In production, use just `[hash:base64:8]` for
 * smaller HTML output.
 */
const webpackCSSModulesConfig = {
  module: {
    rules: [
      {
        test: /\.module\.css$/,
        use: [
          'style-loader',   // Injects CSS into the DOM via <style> tags
          {
            loader: 'css-loader',
            options: {
              modules: {
                /**
                 * ANNOTATION: localIdentName
                 * ---------------------------
                 * This is the template for generated class names.
                 * Development: "[name]__[local]--[hash:base64:5]"
                 *   → "ProductCard__card--x7k2f" (readable in DevTools)
                 * Production: "[hash:base64:8]"
                 *   → "x7k2fM9p" (minimal size)
                 *
                 * The hash is derived from the file path + class name, so it's
                 * deterministic — same input always produces same hash. This is
                 * important for server-side rendering where client and server
                 * must generate matching class names.
                 */
                localIdentName: '[name]__[local]--[hash:base64:5]',
              },
            },
          },
        ],
      },
    ],
  },
};

// =============================================================================
// DEMONSTRATION: Two components with the SAME class name, no conflict
// =============================================================================
//
// This is the core demonstration for Requirement 8.2. Both components define
// a `.card` class, but CSS Modules ensures they compile to different selectors.

/**
 * MICRO FRONTEND A: Product Card
 * ================================
 *
 * File: ProductCard.module.css (in MF-A's codebase)
 * ```css
 * .card {
 *   background: #e3f2fd;
 *   border: 2px solid #1976d2;
 *   padding: 16px;
 *   border-radius: 8px;
 * }
 * .title {
 *   color: #1976d2;
 *   font-size: 18px;
 * }
 * ```
 *
 * After CSS Modules compilation, this becomes:
 * ```css
 * .ProductCard__card--x7k2f {
 *   background: #e3f2fd;
 *   border: 2px solid #1976d2;
 *   padding: 16px;
 *   border-radius: 8px;
 * }
 * .ProductCard__title--a3b1c {
 *   color: #1976d2;
 *   font-size: 18px;
 * }
 * ```
 */

// Simulating what CSS Modules does at build time:
// The import `import styles from './ProductCard.module.css'` returns an object
// mapping original names to hashed names.
const productCardStyles = {
  card: 'ProductCard__card--x7k2f',
  title: 'ProductCard__title--a3b1c',
};

/**
 * ANNOTATION: How the component uses CSS Modules
 * ------------------------------------------------
 * Instead of writing `className="card"` (which would be global and dangerous),
 * you write `className={styles.card}`. The bundler replaces `styles.card` with
 * the hashed class name at build time.
 *
 * This is the key insight: CSS Modules don't change how CSS works — they change
 * how you REFERENCE CSS classes. The CSS itself is still global in the browser,
 * but the class names are unique so collisions are impossible.
 */
function ProductCard({ name, price }) {
  return `
    <div class="${productCardStyles.card}">
      <h3 class="${productCardStyles.title}">${name}</h3>
      <p>$${price}</p>
    </div>
  `;
}

/**
 * MICRO FRONTEND B: User Profile Card
 * =====================================
 *
 * File: UserCard.module.css (in MF-B's codebase — completely separate build)
 * ```css
 * .card {
 *   background: #fce4ec;
 *   border: 2px solid #c62828;
 *   padding: 20px;
 *   border-radius: 12px;
 * }
 * .title {
 *   color: #c62828;
 *   font-size: 20px;
 * }
 * ```
 *
 * After CSS Modules compilation (different build, different hashes):
 * ```css
 * .UserCard__card--m9p1q {
 *   background: #fce4ec;
 *   border: 2px solid #c62828;
 *   padding: 20px;
 *   border-radius: 12px;
 * }
 * .UserCard__title--z8y2x {
 *   color: #c62828;
 *   font-size: 20px;
 * }
 * ```
 *
 * CRITICAL OBSERVATION:
 * Both MFs define `.card` and `.title`, but the compiled output uses completely
 * different selectors. MF-A's blue card and MF-B's red card coexist on the
 * same page without any interference.
 */
const userCardStyles = {
  card: 'UserCard__card--m9p1q',
  title: 'UserCard__title--z8y2x',
};

function UserCard({ username, role }) {
  return `
    <div class="${userCardStyles.card}">
      <h3 class="${userCardStyles.title}">${username}</h3>
      <p>${role}</p>
    </div>
  `;
}

// =============================================================================
// DEMONSTRATION: Both components on the same page — no conflict
// =============================================================================

/**
 * ANNOTATION: The proof of isolation
 * ------------------------------------
 * When both components render on the same page, the DOM looks like:
 *
 * <div class="ProductCard__card--x7k2f">    ← blue background
 *   <h3 class="ProductCard__title--a3b1c">Laptop</h3>
 *   <p>$999</p>
 * </div>
 * <div class="UserCard__card--m9p1q">       ← red background
 *   <h3 class="UserCard__title--z8y2x">Alice</h3>
 *   <p>Admin</p>
 * </div>
 *
 * The browser applies styles based on the hashed selectors. There is zero
 * possibility of `.card` from MF-A affecting MF-B because the selector
 * `.ProductCard__card--x7k2f` simply doesn't match `.UserCard__card--m9p1q`.
 */
function renderBothCards() {
  const container = document.createElement('div');
  container.innerHTML = `
    <h2>CSS Modules Isolation Demo</h2>
    <p>Both components define .card and .title — but they don't conflict:</p>
    ${ProductCard({ name: 'Laptop', price: 999 })}
    ${UserCard({ username: 'Alice', role: 'Admin' })}
  `;
  return container;
}

// =============================================================================
// COMMON PITFALLS AND INTERVIEW GOTCHAS
// =============================================================================
//
// 1. GLOBAL STYLES ESCAPE HATCH:
//    CSS Modules support `:global(.className)` to opt out of scoping.
//    This is useful for styling third-party components, but it breaks isolation.
//    In a micro frontend context, NEVER use :global unless you own the global
//    stylesheet (e.g., in the shell app for reset/normalize styles).
//
// 2. COMPOSITION (composes):
//    CSS Modules support `composes: card from './shared.module.css'` for style
//    reuse. In micro frontends, this only works WITHIN a single MF's build.
//    Cross-MF composition requires a shared npm package with design tokens.
//
// 3. DYNAMIC CLASS NAMES:
//    You can't do `styles['card-' + variant]` reliably because the bundler
//    needs to statically analyze which classes are used. Use explicit mappings:
//    `const variantMap = { primary: styles.primary, secondary: styles.secondary }`
//
// 4. SERVER-SIDE RENDERING:
//    CSS Modules work with SSR, but you need `isomorphic-style-loader` instead
//    of `style-loader` to collect styles on the server. Each micro frontend's
//    SSR setup must handle this independently.
//
// =============================================================================

// =============================================================================
// EXPORTS
// =============================================================================

export {
  webpackCSSModulesConfig,
  ProductCard,
  UserCard,
  renderBothCards,
  productCardStyles,
  userCardStyles,
};
