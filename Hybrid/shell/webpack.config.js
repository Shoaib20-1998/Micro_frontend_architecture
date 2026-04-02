/**
 * ============================================================================
 * WEBPACK CONFIGURATION — HYBRID SHELL (Single-Spa + Module Federation)
 * ============================================================================
 *
 * CODE ANNOTATION: Why this config is special
 * ---------------------------------------------
 * This webpack config is the heart of the Hybrid approach. It combines TWO
 * micro frontend strategies in a single build:
 *
 *   1. SINGLE-SPA — for lifecycle orchestration and routing
 *      → Decides WHEN each micro frontend mounts/unmounts based on the URL
 *      → Manages the bootstrap → mount → unmount lifecycle
 *
 *   2. MODULE FEDERATION — for runtime code loading
 *      → Decides HOW micro frontend code gets loaded (dynamic import from remotes)
 *      → Handles shared dependency negotiation (one copy of React for everyone)
 *
 * COMPARE THIS TO THE OTHER APPROACHES:
 *
 *   Single-Spa alone (see Single-Spa/root-config/webpack.config.js):
 *     - Uses SystemJS to load micro frontend bundles
 *     - Requires import maps in the HTML to map app names to URLs
 *     - No built-in dependency sharing — each app bundles its own React
 *     - Output format: libraryTarget: 'system'
 *
 *   Module Federation alone (see ModuleFederation/host-app/webpack.config.js):
 *     - Uses ModuleFederationPlugin to load remote components
 *     - Great dependency sharing via the `shared` config
 *     - No lifecycle management — components just render, no mount/unmount hooks
 *     - No URL-based routing built in
 *
 *   Hybrid (this file):
 *     - Uses ModuleFederationPlugin for code loading AND dependency sharing
 *     - Uses single-spa's registerApplication() for lifecycle + routing
 *     - The mf-loader.js bridge connects the two: it loads MF remotes and
 *       returns single-spa lifecycle objects
 *     - Output format: standard webpack (NOT SystemJS) because MF handles loading
 *
 * WHEN TO USE THE HYBRID APPROACH:
 *   ✅ You want clean lifecycle management (mount/unmount/error handling)
 *   ✅ You want efficient dependency sharing (no duplicate React)
 *   ✅ You're migrating from a monolith and want incremental adoption
 *   ✅ Your micro frontends need to be independently deployed
 *   ❌ Overkill for small apps with 2-3 pages
 *   ❌ Adds complexity — two systems to understand and debug
 *
 * ============================================================================
 */

const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  /**
   * ENTRY POINT
   * -----------
   * Just like the Module Federation host app, we use the async boundary pattern.
   * index.js does `import('./bootstrap')` which creates the async chunk boundary
   * that Module Federation needs to negotiate shared dependencies.
   *
   * DIFFERENCE FROM SINGLE-SPA ALONE:
   * In the pure Single-Spa setup, the entry point directly imports single-spa
   * and calls registerApplication(). No async boundary needed because SystemJS
   * handles module loading.
   *
   * In the Hybrid setup, we NEED the async boundary because Module Federation's
   * shared dependency negotiation must happen before any React code runs.
   * The registerApplication() calls happen inside bootstrap.js, after the
   * async boundary.
   */
  entry: './src/index.js',

  mode: 'development',

  /**
   * DEV SERVER
   * ----------
   * The Hybrid shell runs on port 4000. The MF remotes run on:
   *   - mf-home:     http://localhost:4001
   *   - mf-settings: http://localhost:4002
   *
   * We use different ports from the Module Federation approach (3000-3002)
   * so both setups can run simultaneously without conflicts.
   *
   * historyApiFallback is critical here because single-spa uses client-side
   * routing. Without it, navigating to /home or /settings would 404.
   */
  devServer: {
    port: 4000,
    historyApiFallback: true,
    hot: true,
    headers: {
      /**
       * CODE ANNOTATION: CORS headers
       * ------------------------------
       * Module Federation loads remote code cross-origin (different ports).
       * Without CORS headers, the browser blocks remoteEntry.js fetches.
       *
       * In the pure Single-Spa approach, SystemJS handles cross-origin loading
       * via <script> tags (which aren't subject to CORS). Module Federation
       * uses fetch/dynamic import, which IS subject to CORS — so we need this.
       */
      'Access-Control-Allow-Origin': '*',
    },
  },

  /**
   * OUTPUT
   * ------
   * publicPath: 'auto' — lets webpack resolve chunk URLs at runtime.
   *
   * CRITICAL DIFFERENCE FROM SINGLE-SPA ALONE:
   * In the pure Single-Spa setup, we used `libraryTarget: 'system'` to output
   * a SystemJS module. Here, we use standard webpack output because Module
   * Federation handles the module loading — we don't need SystemJS at all.
   *
   * This is one of the key advantages of the Hybrid approach: you get rid of
   * SystemJS entirely. Module Federation's runtime is built into webpack, so
   * there's no external module loader to configure, no import maps to maintain,
   * and no CDN dependency for the module system itself.
   */
  output: {
    publicPath: 'auto',
  },

  /**
   * MODULE RULES
   * ------------
   * Standard Babel setup for JSX. Same as the Module Federation host app.
   * Nothing Hybrid-specific here.
   */
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
    ],
  },

  plugins: [
    /**
     * ========================================================================
     * MODULE FEDERATION PLUGIN — THE "HOW" OF CODE LOADING
     * ========================================================================
     *
     * In the Hybrid approach, Module Federation handles HOW micro frontend
     * code gets loaded. Single-Spa handles WHEN it gets mounted/unmounted.
     *
     * This is the same ModuleFederationPlugin you saw in the pure Module
     * Federation host app (ModuleFederation/host-app/webpack.config.js),
     * but here it works in tandem with single-spa's lifecycle management.
     *
     * THE KEY INSIGHT:
     * Module Federation doesn't care about lifecycles — it just loads code.
     * Single-Spa doesn't care about how code is loaded — it just manages
     * lifecycles. The mf-loader.js bridge connects them:
     *
     *   URL changes → single-spa routing → mf-loader → Module Federation
     *                                                    → loads remote code
     *                                                    → returns lifecycle hooks
     *                                      → single-spa calls mount()
     *                                      → React renders
     */
    new ModuleFederationPlugin({
      /**
       * NAME
       * ----
       * Unique identifier for this container. Since the shell is primarily
       * a consumer (host), this name is used internally by webpack's runtime.
       */
      name: 'hybridShell',

      /**
       * REMOTES
       * -------
       * Declares which Module Federation remotes this shell can consume.
       * Each remote is a separate micro frontend that:
       *   1. Runs its own webpack dev server
       *   2. Exposes modules via ModuleFederationPlugin's `exposes` config
       *   3. Exports single-spa lifecycle hooks (bootstrap, mount, unmount)
       *
       * Format: 'localAlias: globalName@remoteEntryURL'
       *
       * HOW THIS CONNECTS TO SINGLE-SPA:
       * In src/index.js, we call registerApplication() with our mf-loader
       * bridge. When single-spa decides it's time to mount an app, the
       * mf-loader calls import('mfHome/singleSpaEntry'), which triggers
       * Module Federation to:
       *   1. Fetch http://localhost:4001/remoteEntry.js (if not already loaded)
       *   2. Call container.get('./singleSpaEntry') on the remote
       *   3. Return the module, which exports { bootstrap, mount, unmount }
       *   4. Single-Spa then calls these lifecycle hooks as usual
       *
       * COMPARE TO PURE SINGLE-SPA:
       * In the pure Single-Spa setup, we'd use System.import('app-name')
       * which resolves via an import map in the HTML. Here, webpack's MF
       * runtime handles the resolution — no import maps needed.
       */
      remotes: {
        mfHome: 'mfHome@http://localhost:4001/remoteEntry.js',
        mfSettings: 'mfSettings@http://localhost:4002/remoteEntry.js',
      },

      /**
       * SHARED
       * ------
       * Dependencies shared across the shell and all remotes at runtime.
       *
       * This is one of the BIGGEST ADVANTAGES of the Hybrid approach over
       * pure Single-Spa:
       *
       *   Pure Single-Spa: Each micro frontend bundles its own React.
       *     If you have 5 micro frontends, you might load React 5 times.
       *     You can work around this with SystemJS externals, but it's manual
       *     and fragile.
       *
       *   Hybrid (Module Federation): React is declared as a singleton shared
       *     dependency. The first container to load React "wins", and all other
       *     containers reuse that same instance. Zero duplication, zero config
       *     beyond this `shared` block.
       *
       * We also share single-spa itself as a singleton. This is critical because
       * single-spa maintains a global registry of apps — if each micro frontend
       * had its own copy, they'd have separate registries and routing would break.
       */
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
        'single-spa': { singleton: true, requiredVersion: '^5.9.0' },
      },
    }),

    /**
     * HTML WEBPACK PLUGIN
     * -------------------
     * Generates the HTML page that loads the shell. We use a custom template
     * (public/index.html) that includes navigation links for the micro frontends.
     *
     * DIFFERENCE FROM SINGLE-SPA ALONE:
     * In the pure Single-Spa setup, we used an EJS template with SystemJS
     * script tags and import maps. Here, we use a plain HTML template because
     * Module Federation handles module loading — no SystemJS needed.
     */
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
};
