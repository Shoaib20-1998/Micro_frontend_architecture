/**
 * =============================================================================
 * BEM WITH APP PREFIXES — CSS Isolation Technique #3
 * =============================================================================
 *
 * Pattern: Convention-based naming using BEM methodology + micro frontend
 *          app prefixes to prevent class name collisions
 *
 * WHY BEM + APP PREFIXES?
 * -----------------------
 * BEM (Block Element Modifier) is a CSS naming convention that structures
 * class names as: `.block__element--modifier`. When combined with an app
 * prefix (e.g., `.mf-products__card--active`), it creates a namespace that
 * makes accidental collisions extremely unlikely.
 *
 * This is the simplest isolation technique — no build tools, no browser APIs,
 * just a naming agreement between teams. It's the "social contract" approach
 * to CSS isolation.
 *
 * HOW IT PREVENTS STYLE BLEED (Requirement 8.2):
 * -----------------------------------------------
 * By prefixing every class name with the micro frontend's name, two MFs
 * that both want a "card" component end up with:
 * - MF-A: `.mf-products__card` (products team's card)
 * - MF-B: `.mf-profile__card` (profile team's card)
 *
 * These are different selectors, so they don't conflict. But this relies
 * entirely on teams following the convention — there's no enforcement.
 *
 * BROWSER SUPPORT:
 * ----------------
 * ✅ Every browser ever made — it's just CSS class names
 * ✅ No polyfills, no build tools, no special APIs
 * ✅ Works with any framework, any bundler, any setup
 * ✅ Works with server-side rendering out of the box
 *
 * PERFORMANCE IMPLICATIONS:
 * -------------------------
 * ✅ Zero runtime overhead — it's just longer class name strings
 * ✅ No build-time processing needed
 * ✅ CSS selectors with class names are fast (browser optimized)
 * ⚠️  Longer class names = slightly larger HTML/CSS files (negligible)
 * ⚠️  Verbose class names can make JSX/templates harder to read
 *
 * TRADE-OFFS FOR MICRO FRONTENDS:
 * --------------------------------
 * ✅ Zero tooling required — works everywhere, always
 * ✅ Easy to understand — any developer can read and follow the convention
 * ✅ Easy to debug — class names in DevTools are descriptive and meaningful
 * ✅ Works with any CSS methodology (can combine with Tailwind, utility classes)
 * ✅ No framework compatibility issues (unlike Shadow DOM + React)
 * ⚠️  Convention-based, not enforced — a developer can forget the prefix
 * ⚠️  Requires team coordination — all teams must agree on the naming scheme
 * ⚠️  No protection against third-party library styles (Bootstrap's `.btn`
 *     will still affect your elements)
 * ❌ Weakest isolation — relies on human discipline, not tooling
 * ❌ Doesn't protect against `*` selectors, tag selectors, or `!important`
 *    from other MFs or the shell
 * ❌ Refactoring app names means renaming every class (tedious and error-prone)
 *
 * WHEN TO USE IN INTERVIEWS:
 * --------------------------
 * "BEM with app prefixes is my fallback when we can't use CSS Modules or
 * Shadow DOM — maybe the team doesn't have a build pipeline, or they're
 * integrating legacy code that can't be refactored. It's the lowest-barrier
 * approach, but I'd always pair it with a linting rule (like stylelint) to
 * enforce the prefix convention. For greenfield micro frontends, I'd prefer
 * CSS Modules for the build-time guarantee."
 */

// =============================================================================
// THE BEM + APP PREFIX NAMING CONVENTION
// =============================================================================
//
// Standard BEM:     .block__element--modifier
// With app prefix:  .appName-block__element--modifier
//
// Examples:
//   .mf-products-card              → Block (the card component in products MF)
//   .mf-products-card__title       → Element (title inside the card)
//   .mf-products-card__title--bold → Modifier (bold variant of the title)
//   .mf-products-card--featured    → Block modifier (featured variant of card)
//
// The prefix `mf-products-` is the namespace. As long as every team uses
// their own prefix, class names won't collide.
// =============================================================================

// =============================================================================
// IMPLEMENTATION: BEM Helper Utility
// =============================================================================

/**
 * Creates a BEM class name generator scoped to a micro frontend.
 *
 * ANNOTATION: Why a helper function?
 * ------------------------------------
 * Manually typing `mf-products-card__title--bold` everywhere is error-prone
 * and tedious. This helper enforces the convention programmatically:
 * - Ensures the app prefix is always included
 * - Validates the BEM structure
 * - Makes refactoring easier (change the prefix in one place)
 *
 * In a real project, you'd put this in a shared utility package that all
 * micro frontends import. The prefix would come from the MF's config.
 *
 * @param {string} appPrefix - The micro frontend's namespace (e.g., 'mf-products')
 * @returns {Function} A function that generates BEM class names
 */
function createBEMHelper(appPrefix) {
  /**
   * Generates a BEM class name with the app prefix.
   *
   * @param {string} block - The block name (e.g., 'card')
   * @param {string} [element] - Optional element name (e.g., 'title')
   * @param {string} [modifier] - Optional modifier (e.g., 'active')
   * @returns {string} The full BEM class name
   *
   * Usage:
   *   const bem = createBEMHelper('mf-products');
   *   bem('card')                    → 'mf-products-card'
   *   bem('card', 'title')           → 'mf-products-card__title'
   *   bem('card', 'title', 'bold')   → 'mf-products-card__title--bold'
   *   bem('card', null, 'featured')  → 'mf-products-card--featured'
   */
  return function bem(block, element, modifier) {
    let className = `${appPrefix}-${block}`;

    if (element) {
      className += `__${element}`;
    }

    if (modifier) {
      className += `--${modifier}`;
    }

    return className;
  };
}

// =============================================================================
// DEMONSTRATION: Two MFs with same logical component, no conflict
// =============================================================================

/**
 * MICRO FRONTEND A: Products Team
 *
 * CSS (would be in a separate .css file in a real project):
 * ```css
 * .mf-products-card {
 *   background: #e3f2fd;
 *   border: 2px solid #1976d2;
 *   padding: 16px;
 *   border-radius: 8px;
 * }
 * .mf-products-card__title {
 *   color: #1976d2;
 *   font-size: 18px;
 *   margin: 0 0 8px 0;
 * }
 * .mf-products-card__price {
 *   color: #333;
 *   font-weight: bold;
 * }
 * .mf-products-card--featured {
 *   border-width: 3px;
 *   box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
 * }
 * ```
 */
const productsBEM = createBEMHelper('mf-products');

function ProductCard({ name, price, featured }) {
  /**
   * ANNOTATION: Using the BEM helper
   * ----------------------------------
   * Instead of hardcoding class names, we use the helper to ensure the
   * prefix is always correct. This also makes it easy to find all classes
   * belonging to this MF by searching for 'mf-products-'.
   */
  const cardClass = featured
    ? `${productsBEM('card')} ${productsBEM('card', null, 'featured')}`
    : productsBEM('card');

  return `
    <div class="${cardClass}">
      <h3 class="${productsBEM('card', 'title')}">${name}</h3>
      <p class="${productsBEM('card', 'price')}">$${price}</p>
    </div>
  `;
}

/**
 * MICRO FRONTEND B: User Profile Team
 *
 * CSS (separate .css file):
 * ```css
 * .mf-profile-card {
 *   background: #fce4ec;
 *   border: 2px solid #c62828;
 *   padding: 20px;
 *   border-radius: 12px;
 * }
 * .mf-profile-card__title {
 *   color: #c62828;
 *   font-size: 20px;
 *   margin: 0 0 8px 0;
 * }
 * .mf-profile-card__role {
 *   color: #666;
 *   font-style: italic;
 * }
 * .mf-profile-card--admin {
 *   border-color: #ff6f00;
 *   background: #fff3e0;
 * }
 * ```
 */
const profileBEM = createBEMHelper('mf-profile');

function UserProfileCard({ username, role, isAdmin }) {
  const cardClass = isAdmin
    ? `${profileBEM('card')} ${profileBEM('card', null, 'admin')}`
    : profileBEM('card');

  return `
    <div class="${cardClass}">
      <h3 class="${profileBEM('card', 'title')}">${username}</h3>
      <p class="${profileBEM('card', 'role')}">${role}</p>
    </div>
  `;
}

// =============================================================================
// DEMONSTRATION: Both components on the same page
// =============================================================================

/**
 * ANNOTATION: The proof of isolation (convention-based)
 * ------------------------------------------------------
 * When both components render on the same page, the DOM looks like:
 *
 * <div class="mf-products-card mf-products-card--featured">
 *   <h3 class="mf-products-card__title">Laptop</h3>
 *   <p class="mf-products-card__price">$999</p>
 * </div>
 * <div class="mf-profile-card mf-profile-card--admin">
 *   <h3 class="mf-profile-card__title">Alice</h3>
 *   <p class="mf-profile-card__role">Admin</p>
 * </div>
 *
 * The selectors are completely different because of the app prefix.
 * `.mf-products-card` and `.mf-profile-card` will never match each other.
 *
 * BUT — and this is the critical interview point — nothing PREVENTS a
 * developer from writing `.card { background: green }` without the prefix.
 * That global style would affect BOTH components. BEM is a convention,
 * not an enforcement mechanism.
 */
function renderBothCards() {
  const container = document.createElement('div');

  // Inject the CSS for both MFs (in a real app, these would be separate files)
  const styles = document.createElement('style');
  styles.textContent = `
    /* Products MF styles — note the mf-products- prefix on every class */
    .mf-products-card {
      background: #e3f2fd;
      border: 2px solid #1976d2;
      padding: 16px;
      border-radius: 8px;
      margin: 10px 0;
      font-family: system-ui, sans-serif;
    }
    .mf-products-card__title {
      color: #1976d2;
      font-size: 18px;
      margin: 0 0 8px 0;
    }
    .mf-products-card__price {
      color: #333;
      font-weight: bold;
    }
    .mf-products-card--featured {
      border-width: 3px;
      box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
    }

    /* Profile MF styles — note the mf-profile- prefix on every class */
    .mf-profile-card {
      background: #fce4ec;
      border: 2px solid #c62828;
      padding: 20px;
      border-radius: 12px;
      margin: 10px 0;
      font-family: system-ui, sans-serif;
    }
    .mf-profile-card__title {
      color: #c62828;
      font-size: 20px;
      margin: 0 0 8px 0;
    }
    .mf-profile-card__role {
      color: #666;
      font-style: italic;
    }
    .mf-profile-card--admin {
      border-color: #ff6f00;
      background: #fff3e0;
    }
  `;
  container.appendChild(styles);

  container.innerHTML += `
    <h2>BEM + App Prefix Isolation Demo</h2>
    <p>Both components represent "cards" but use different prefixes:</p>
    ${ProductCard({ name: 'Laptop', price: 999, featured: true })}
    ${UserProfileCard({ username: 'Alice', role: 'Admin', isAdmin: true })}
  `;

  return container;
}

// =============================================================================
// ENFORCEMENT: Linting Rules for BEM Conventions
// =============================================================================
//
// ANNOTATION: Making conventions enforceable
// -------------------------------------------
// The biggest weakness of BEM is that it's a convention. Here's how to
// strengthen it with tooling:
//
// 1. STYLELINT PLUGIN:
//    Use `stylelint-selector-bem-pattern` to enforce BEM naming:
//    ```json
//    {
//      "plugins": ["stylelint-selector-bem-pattern"],
//      "rules": {
//        "plugin/selector-bem-pattern": {
//          "componentName": "^mf-[a-z]+-[a-z]+$",
//          "componentSelectors": {
//            "initial": "^\\.{componentName}(?:__[a-z]+)?(?:--[a-z]+)?$"
//          }
//        }
//      }
//    }
//    ```
//    This rejects any class that doesn't start with `mf-<appname>-`.
//
// 2. CI/CD CHECK:
//    Run stylelint in your CI pipeline. If a developer writes `.card` without
//    the prefix, the build fails. This turns a convention into an enforcement.
//
// 3. CODE REVIEW CHECKLIST:
//    Add "CSS classes use app prefix" to your PR review checklist.
//    Automated checks catch most issues, but human review catches edge cases
//    like inline styles or dynamically generated class names.
//
// =============================================================================

// =============================================================================
// COMMON PITFALLS AND INTERVIEW GOTCHAS
// =============================================================================
//
// 1. TAG SELECTORS BYPASS BEM:
//    If any MF writes `h3 { color: red }` (a tag selector), it affects ALL
//    h3 elements on the page, regardless of BEM prefixes. BEM only protects
//    class-based selectors. Solution: lint rules that forbid tag selectors.
//
// 2. !important WARS:
//    If MF-A uses `!important` on a shared element (like body or a shell
//    container), BEM can't protect against it. This is a governance problem,
//    not a technical one.
//
// 3. THIRD-PARTY CSS:
//    Libraries like Bootstrap use unprefixed classes (`.btn`, `.container`).
//    If two MFs use different versions of Bootstrap, their styles WILL
//    conflict. Solution: scope third-party CSS with a wrapper class or use
//    CSS Modules/Shadow DOM for those components.
//
// 4. SPECIFICITY ISSUES:
//    BEM keeps specificity flat (single class selectors), which is good.
//    But if the shell app uses higher-specificity selectors (IDs, nested
//    selectors), they'll override BEM classes. Keep the shell's CSS minimal.
//
// 5. NAMING COLLISIONS ACROSS TEAMS:
//    Two teams might independently choose the same app prefix. Solution:
//    maintain a central registry of app prefixes (a simple JSON file in a
//    shared repo) and validate against it in CI.
//
// =============================================================================

// =============================================================================
// EXPORTS
// =============================================================================

export {
  createBEMHelper,
  ProductCard,
  UserProfileCard,
  renderBothCards,
  productsBEM,
  profileBEM,
};
