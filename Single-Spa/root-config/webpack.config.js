/**
 * =============================================================================
 * WEBPACK CONFIGURATION — Single-Spa Root Config (Shell App)
 * =============================================================================
 *
 * CODE ANNOTATION: Why does the root-config need its own webpack config?
 * -----------------------------------------------------------------------
 * The root-config is the orchestrator of the entire micro frontend architecture.
 * Unlike a traditional SPA where webpack bundles everything into one app, here
 * webpack only bundles the root-config's own code — the registration logic and
 * the HTML template. The actual micro frontends are loaded at RUNTIME via
 * SystemJS, not at build time. This is the fundamental shift in thinking:
 * build-time bundling → runtime composition.
 *
 * CODE ANNOTATION: Why SystemJS modules?
 * -----------------------------------------------------------------------
 * Single-Spa uses SystemJS as its module loader because browsers don't natively
 * support the dynamic module loading pattern that micro frontends require.
 * SystemJS provides:
 *   1. A way to load ES modules dynamically via `System.import()`
 *   2. Import maps — a JSON mapping of module names to URLs (like a package.json
 *      for the browser)
 *   3. Cross-origin module loading — micro frontends can be served from different
 *      servers/ports
 *
 * Native ES modules (import/export) can't do this because:
 *   - They require static import paths known at build time
 *   - They don't support import maps in all browsers yet
 *   - They can't easily handle cross-origin module resolution
 *
 * =============================================================================
 */

const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  /**
   * CODE ANNOTATION: Entry point
   * ----------------------------
   * This is the root-config's own JavaScript — it contains the
   * `registerApplication()` calls that tell single-spa which micro frontends
   * exist and when to activate them. This is the ONLY code that gets bundled
   * by this webpack config.
   */
  entry: './src/index.js',

  output: {
    /**
     * CODE ANNOTATION: Output filename
     * ---------------------------------
     * The root-config's bundle. This file contains ONLY the orchestration
     * logic (registerApplication calls + single-spa start). The micro
     * frontends themselves are NOT in this bundle — they're loaded at
     * runtime via SystemJS.
     */
    filename: 'root-config.js',
    path: path.resolve(__dirname, 'dist'),

    /**
     * CODE ANNOTATION: libraryTarget — why 'system'?
     * ------------------------------------------------
     * We output the root-config as a SystemJS module so it can participate
     * in the same module system as the micro frontends. When the HTML page
     * loads, SystemJS will:
     *   1. Read the import map to know where modules live
     *   2. Load root-config.js as a SystemJS module
     *   3. Execute it, which registers the micro frontends
     *   4. Call `start()`, which activates the correct app based on the URL
     *
     * If we used a different module format (e.g., 'umd' or 'commonjs'),
     * the root-config couldn't use `System.import()` to load micro frontends.
     */
    libraryTarget: 'system',

    /**
     * CODE ANNOTATION: Clean output directory
     * ----------------------------------------
     * Removes old build artifacts before each build. Important in micro
     * frontend setups because stale files with old hashes can cause
     * SystemJS to load outdated code.
     */
    clean: true,
  },

  /**
   * CODE ANNOTATION: Externals — what NOT to bundle
   * -------------------------------------------------
   * This is critical for micro frontend architecture. We tell webpack:
   * "Don't bundle single-spa into the root-config bundle. Instead, assume
   * it will be available at runtime via SystemJS."
   *
   * Why? Because single-spa needs to be a SINGLETON — one instance shared
   * across the shell and all micro frontends. If each app bundled its own
   * copy of single-spa, they'd have separate registries and routing would
   * break.
   *
   * The import map in index.ejs tells SystemJS where to find single-spa
   * at runtime (from a CDN).
   */
  externals: ['single-spa'],

  devServer: {
    /**
     * CODE ANNOTATION: Dev server port
     * ---------------------------------
     * The root-config runs on port 9000. Each micro frontend runs on its
     * own port (e.g., Home on 8081, Dashboard on 8082). This simulates
     * a production setup where each micro frontend is deployed independently
     * to different servers/CDNs.
     *
     * In production, you'd replace these localhost URLs in the import map
     * with real CDN URLs.
     */
    port: 9000,

    /**
     * CODE ANNOTATION: historyApiFallback
     * ------------------------------------
     * This is essential for single-page application routing. Without it,
     * navigating to /home or /dashboard would result in a 404 from the
     * dev server because those paths don't correspond to real files.
     *
     * With historyApiFallback enabled, the dev server returns index.html
     * for any path, letting single-spa's client-side routing take over.
     */
    historyApiFallback: true,

    /**
     * CODE ANNOTATION: CORS headers
     * ------------------------------
     * Micro frontends are loaded cross-origin (different ports in dev,
     * different domains in production). Without these headers, the browser
     * would block SystemJS from loading micro frontend bundles due to
     * the Same-Origin Policy.
     */
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },

  plugins: [
    /**
     * CODE ANNOTATION: HtmlWebpackPlugin with EJS template
     * ------------------------------------------------------
     * We use an EJS template (index.ejs) instead of a plain HTML file
     * because we need to:
     *   1. Inject the SystemJS import map (module name → URL mapping)
     *   2. Include the SystemJS library from CDN
     *   3. Add the initial System.import() call to boot the root-config
     *
     * The template is the "entry point" of the entire micro frontend
     * architecture — it's the first thing the browser loads.
     */
    new HtmlWebpackPlugin({
      template: './index.html',
      /**
       * CODE ANNOTATION: inject: false
       * --------------------------------
       * We disable automatic script injection because we're loading the
       * root-config via SystemJS (System.import()), not via a regular
       * <script> tag. The EJS template handles loading manually.
       */
      inject: false,
    }),
  ],
};
