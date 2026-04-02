/**
 * =============================================================================
 * SHADOW DOM — CSS Isolation Technique #2
 * =============================================================================
 *
 * Pattern: Browser-native style encapsulation using the Shadow DOM API
 *
 * WHY SHADOW DOM?
 * ---------------
 * Shadow DOM creates a completely separate DOM tree attached to a host element.
 * Styles defined inside a shadow root are SCOPED to that shadow tree — they
 * cannot leak out, and external styles cannot leak in (with some exceptions).
 * This is the strongest isolation mechanism available in the browser because
 * it's enforced by the rendering engine itself, not by naming conventions or
 * build tools.
 *
 * For micro frontends, this means each MF can render inside its own shadow
 * root and be completely immune to style conflicts from other MFs or the
 * shell app.
 *
 * HOW IT PREVENTS STYLE BLEED (Requirement 8.2):
 * -----------------------------------------------
 * The browser's style resolution algorithm treats shadow boundaries as hard
 * walls. A selector like `.card` in the light DOM will NEVER match an element
 * with class `.card` inside a shadow root, and vice versa. This is not a
 * convention — it's a browser specification enforced at the engine level.
 *
 * BROWSER SUPPORT:
 * ----------------
 * ✅ Chrome 53+ (2016) — full support
 * ✅ Firefox 63+ (2018) — full support
 * ✅ Safari 10+ (2016) — full support
 * ✅ Edge 79+ (Chromium-based, 2020) — full support
 * ❌ IE 11 — no support, no polyfill that fully works
 * ⚠️  Polyfills exist (ShadyDOM, ShadyCSS) but they're imperfect — they
 *     approximate scoping via class name rewriting, which defeats the purpose
 *
 * BOTTOM LINE: If you don't need IE 11 support (and in 2024+, you shouldn't),
 * Shadow DOM is universally supported. Check caniuse.com/shadowdomv1 for the
 * latest data.
 *
 * PERFORMANCE IMPLICATIONS:
 * -------------------------
 * ✅ Style scoping is handled by the browser engine — very fast
 * ✅ No build-time processing needed
 * ⚠️  Each shadow root creates its own style scope, meaning shared styles
 *     (like a design system) must be duplicated into each shadow root. This
 *     increases memory usage and can slow initial render if styles are large.
 * ⚠️  CSS custom properties (variables) DO cross shadow boundaries — this is
 *     the intended mechanism for theming. But it means you can't use Shadow
 *     DOM to isolate CSS variable names.
 * ⚠️  Some CSS features behave differently inside Shadow DOM:
 *     - `@font-face` must be declared in the light DOM (fonts don't scope)
 *     - `:host` selector replaces element selectors for the shadow host
 *     - `::slotted()` is needed to style distributed children
 *
 * TRADE-OFFS FOR MICRO FRONTENDS:
 * --------------------------------
 * ✅ Strongest isolation — browser-enforced, not convention-based
 * ✅ No build tooling required — works with plain <script> tags
 * ✅ Framework-agnostic — works with React, Vue, Angular, vanilla JS
 * ⚠️  React has historically had poor Shadow DOM support (event delegation
 *     issues). React 19 improves this, but it's still not seamless.
 * ⚠️  Style duplication — each shadow root needs its own copy of shared styles
 * ⚠️  Debugging is harder — DevTools show shadow trees collapsed by default
 * ❌ Third-party libraries that assume global DOM access may break inside
 *    Shadow DOM (e.g., modals that append to document.body)
 * ❌ Cannot use global CSS frameworks (Bootstrap, Tailwind) without injecting
 *    them into each shadow root
 *
 * WHEN TO USE IN INTERVIEWS:
 * --------------------------
 * "Shadow DOM gives the strongest CSS isolation because it's browser-enforced.
 * I'd use it when micro frontends are built by completely independent teams
 * who can't coordinate on naming conventions, or when we need to embed a
 * micro frontend into a third-party page where we have zero control over
 * existing styles. The main trade-off is style duplication and React
 * compatibility quirks."
 */

// =============================================================================
// IMPLEMENTATION: Shadow DOM Encapsulated Micro Frontend Component
// =============================================================================

/**
 * Creates a micro frontend component encapsulated in Shadow DOM.
 *
 * ANNOTATION: attachShadow({ mode: 'open' }) vs { mode: 'closed' }
 * ------------------------------------------------------------------
 * - `mode: 'open'` — the shadow root is accessible via `element.shadowRoot`.
 *   This is what you want 99% of the time. It allows DevTools inspection and
 *   lets the shell app reach into the shadow tree if absolutely necessary.
 *
 * - `mode: 'closed'` — the shadow root is NOT accessible from outside.
 *   `element.shadowRoot` returns `null`. This sounds more secure, but it's
 *   mostly security theater — determined code can still access it via
 *   `Element.prototype.attachShadow` override. Use 'open' unless you have
 *   a specific reason not to.
 *
 * For micro frontends, 'open' is the right choice because:
 * 1. The shell app may need to communicate with the MF's DOM (e.g., focus management)
 * 2. DevTools debugging is much easier
 * 3. Testing frameworks can access the shadow tree
 *
 * @param {HTMLElement} hostElement - The element to attach the shadow root to
 * @param {string} appName - Name of the micro frontend (used in styles)
 * @param {Object} options - Configuration for the component
 * @param {string} options.title - Title to display
 * @param {string} options.bgColor - Background color for the card
 * @param {string} options.borderColor - Border color for the card
 * @returns {ShadowRoot} The created shadow root
 */
function createShadowMF(hostElement, appName, { title, bgColor, borderColor }) {
  /**
   * ANNOTATION: Creating the shadow root
   * --------------------------------------
   * This is the moment isolation begins. Once attachShadow() is called,
   * everything inside this shadow root is in its own style scope. External
   * CSS cannot reach in, and internal CSS cannot leak out.
   *
   * IMPORTANT: You can only call attachShadow() once per element. Calling it
   * again throws a DOMException. In a micro frontend lifecycle, you'd call
   * this in the `mount` hook and remove the host element in `unmount`.
   */
  const shadow = hostElement.attachShadow({ mode: 'open' });

  /**
   * ANNOTATION: Styles inside the shadow root
   * -------------------------------------------
   * These styles are SCOPED to this shadow root. Even though we use generic
   * class names like `.card` and `.title`, they will NEVER affect elements
   * outside this shadow root, and external `.card` styles will NEVER affect
   * elements inside.
   *
   * Notice we use `:host` to style the shadow host element itself. This is
   * the Shadow DOM equivalent of styling the container — you can't use the
   * host element's tag name or class from inside the shadow root.
   *
   * CSS CUSTOM PROPERTIES (VARIABLES) CROSS THE BOUNDARY:
   * If the shell app defines `--brand-color: blue`, we can use it inside
   * the shadow root via `var(--brand-color)`. This is the intended theming
   * mechanism — it lets the shell control the theme while the MF controls
   * its own layout and component styles.
   */
  const styles = `
    <style>
      /* :host styles the shadow host element from inside the shadow tree */
      :host {
        display: block;
        margin: 10px 0;
      }

      /*
       * These class names are generic ON PURPOSE to demonstrate isolation.
       * In a real app, you'd still use descriptive names, but Shadow DOM
       * means you don't NEED prefixes or BEM — the scoping is automatic.
       */
      .card {
        background: ${bgColor};
        border: 2px solid ${borderColor};
        padding: 16px;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
      }

      .title {
        color: ${borderColor};
        font-size: 18px;
        margin: 0 0 8px 0;
      }

      .info {
        color: #333;
        font-size: 14px;
      }

      /*
       * ANNOTATION: Theming via CSS custom properties
       * This demonstrates how the shell can theme shadow DOM components
       * without breaking encapsulation. The variable --mf-accent-color
       * would be set by the shell app's global stylesheet.
       */
      .accent {
        color: var(--mf-accent-color, ${borderColor});
        font-weight: bold;
      }
    </style>
  `;

  /**
   * ANNOTATION: innerHTML inside shadow root
   * ------------------------------------------
   * Setting innerHTML on the shadow root is safe from a style perspective —
   * the styles we inject are scoped. From a security perspective, you should
   * still sanitize any user-provided content to prevent XSS, just like in
   * the light DOM.
   */
  shadow.innerHTML = `
    ${styles}
    <div class="card">
      <h3 class="title">${title}</h3>
      <p class="info">This component is rendered inside Shadow DOM.</p>
      <p class="info">App: <span class="accent">${appName}</span></p>
      <p class="info">External .card styles cannot affect this component.</p>
    </div>
  `;

  return shadow;
}

// =============================================================================
// DEMONSTRATION: Two MFs with same class names, zero conflict
// =============================================================================

/**
 * ANNOTATION: The proof of isolation
 * ------------------------------------
 * Both micro frontends use `.card`, `.title`, and `.info` class names.
 * Because each renders inside its own shadow root, the styles are completely
 * independent. The blue MF stays blue, the red MF stays red, even though
 * they use identical selectors.
 *
 * We also inject a GLOBAL `.card` style in the light DOM to prove that
 * external styles don't leak into the shadow roots.
 */
function demonstrateShadowDOMIsolation() {
  const container = document.createElement('div');

  /**
   * ANNOTATION: Global style that would cause havoc without Shadow DOM
   * -------------------------------------------------------------------
   * This global `.card` style sets a green background. Without Shadow DOM,
   * this would override both micro frontends' card styles. With Shadow DOM,
   * it only affects elements in the light DOM — the shadow roots are immune.
   */
  const globalStyle = document.createElement('style');
  globalStyle.textContent = `
    .card {
      background: #c8e6c9 !important;
      border: 3px dashed green !important;
    }
  `;
  container.appendChild(globalStyle);

  // A light DOM card to show the global style DOES apply outside shadow roots
  const lightDOMCard = document.createElement('div');
  lightDOMCard.className = 'card';
  lightDOMCard.innerHTML = `
    <h3>Light DOM Card</h3>
    <p>This card IS affected by the global .card style (green background).</p>
  `;
  container.appendChild(lightDOMCard);

  // Micro Frontend A — inside Shadow DOM (blue theme)
  const mfAHost = document.createElement('div');
  mfAHost.id = 'mf-products';
  container.appendChild(mfAHost);
  createShadowMF(mfAHost, 'Products MF', {
    title: 'Product Card',
    bgColor: '#e3f2fd',
    borderColor: '#1976d2',
  });

  // Micro Frontend B — inside Shadow DOM (red theme)
  const mfBHost = document.createElement('div');
  mfBHost.id = 'mf-user-profile';
  container.appendChild(mfBHost);
  createShadowMF(mfBHost, 'User Profile MF', {
    title: 'User Card',
    bgColor: '#fce4ec',
    borderColor: '#c62828',
  });

  /**
   * RESULT:
   * - Light DOM card: green background (global style applies)
   * - Products MF card: blue background (shadow DOM blocks global style)
   * - User Profile MF card: red background (shadow DOM blocks global style)
   *
   * This proves Shadow DOM isolation works in both directions:
   * 1. External styles don't leak IN (global .card doesn't affect shadow cards)
   * 2. Internal styles don't leak OUT (shadow .card doesn't affect light DOM)
   */

  return container;
}

// =============================================================================
// ADVANCED: Adoptable Stylesheets (Modern Alternative)
// =============================================================================
//
// ANNOTATION: CSSStyleSheet constructor + adoptedStyleSheets
// -----------------------------------------------------------
// Modern browsers support constructable stylesheets, which let you create a
// CSSStyleSheet object in JS and share it across multiple shadow roots. This
// solves the style duplication problem:
//
//   const shared = new CSSStyleSheet();
//   shared.replaceSync('.btn { padding: 8px 16px; border-radius: 4px; }');
//
//   // Both shadow roots share the SAME stylesheet object (no duplication)
//   shadowRootA.adoptedStyleSheets = [shared, localStylesA];
//   shadowRootB.adoptedStyleSheets = [shared, localStylesB];
//
// Browser support: Chrome 73+, Firefox 101+, Safari 16.4+
// This is the future of Shadow DOM styling, but adoption is still catching up.
//
// For micro frontends, this means the shell app could provide a shared design
// system stylesheet that all shadow-DOM-based MFs adopt, eliminating the
// duplication trade-off while keeping full isolation.
// =============================================================================

// =============================================================================
// COMMON PITFALLS AND INTERVIEW GOTCHAS
// =============================================================================
//
// 1. REACT EVENT DELEGATION:
//    React attaches event listeners to the root container, not individual
//    elements. Events inside Shadow DOM don't bubble to the light DOM root
//    by default (they're retargeted at the shadow boundary). React 17+ uses
//    the root container instead of document, which helps, but you may still
//    hit issues with event.target being the shadow host instead of the actual
//    clicked element. React 19 has better Shadow DOM support.
//
// 2. FORM ELEMENTS:
//    Form elements inside Shadow DOM don't participate in the outer form's
//    submission. If your MF contains a form that's part of a larger page form,
//    Shadow DOM will break that relationship. Use the ElementInternals API
//    (form-associated custom elements) to work around this.
//
// 3. FOCUS MANAGEMENT:
//    Focus navigation (Tab key) works across shadow boundaries, but
//    `document.activeElement` returns the shadow host, not the focused element
//    inside. Use `shadowRoot.activeElement` to get the actual focused element.
//
// 4. THIRD-PARTY LIBRARIES:
//    Libraries that create portals (modals, tooltips, dropdowns) by appending
//    to document.body will render OUTSIDE the shadow root, losing all scoped
//    styles. You need to configure these libraries to append to the shadow
//    root instead, or use a different approach for overlays.
//
// 5. CSS @font-face:
//    Font declarations must be in the light DOM — they don't work inside
//    Shadow DOM. Declare fonts globally and reference them inside shadow roots.
//
// =============================================================================

// =============================================================================
// EXPORTS
// =============================================================================

export { createShadowMF, demonstrateShadowDOMIsolation };
