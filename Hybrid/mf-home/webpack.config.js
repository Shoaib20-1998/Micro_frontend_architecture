/**
 * ============================================================================
 * WEBPACK CONFIGURATION — HYBRID HOME MICRO FRONTEND (MF Remote + Single-Spa)
 * ============================================================================
 *
 * CODE ANNOTATION: The DUAL NATURE of this webpack config
 * ---------------------------------------------------------
 * This config serves TWO purposes simultaneously:
 *
 *   1. MODULE FEDERATION REMOTE — exposes modules for the shell to consume
 *      → The shell's webpack.config.js declares:
 *        remotes: { mfHome: 'mfHome@http://localhost:4001/remoteEntry.js' }
 *      → This config generates remoteEntry.js with the exposed modules
 *
 *   2. SINGLE-SPA LIFECYCLE PROVIDER — the exposed module exports lifecycle hooks
 *      → The exposed './singleSpaEntry' module exports { bootstrap, mount, unmount }
 *      → The shell's mf-loader.js does: import('mfHome/singleSpaEntry')
 *      → Single-Spa receives the lifecycle hooks and manages mount/unmount
 *
 * COMPARE TO THE OTHER APPROACHES:
 *
 *   Pure Single-Spa micro frontend (Single-Spa/app-react-home/webpack.config.js):
 *     - Output: libraryTarget: 'system' (SystemJS module format)
 *     - No ModuleFederationPlugin
 *     - Shared deps via externals (react, react-dom excluded from bundle)
 *     - Entry point: the lifecycle hooks file (app-name.js)
 *
 *   Pure Module Federation remote (ModuleFederation/remote-products/webpack.config.js):
 *     - Output: standard webpack (publicPath: 'auto')
 *     - ModuleFederationPlugin exposes COMPONENTS (e.g., './ProductList')
 *     - Shared deps via MF's `shared` config
 *     - Entry point: index.js → bootstrap.js (async boundary for standalone)
 *
 *   Hybrid remote (THIS FILE):
 *     - Output: standard webpack (publicPath: 'auto') — same as pure MF
 *     - ModuleFederationPlugin exposes LIFECYCLE HOOKS (e.g., './singleSpaEntry')
 *     - Shared deps via MF's `shared` config — includes single-spa as singleton!
 *     - Entry point: index.js → bootstrap.js (async boundary for standalone)
 *
 * THE KEY DIFFERENCE: What gets exposed.
 *   Pure MF remote exposes: React components (just UI)
 *   Hybrid remote exposes: single-spa lifecycle entry (UI + lifecycle management)
 *
 * This means the shell can use single-spa's registerApplication() to manage
 * this remote's lifecycle, while Module Federation handles the code loading
 * and dependency sharing. Best of both worlds.
 *
 * ============================================================================
 */

const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  /**
   * ENTRY POINT — Async boundary for standalone mode
   * --------------------------------------------------
   * Same pattern as every Module Federation app: index.js → import('./bootstrap').
   *
   * This entry point is ONLY used when running standalone (npm start on port 4001).
   * When the shell consumes this remote via Module Federation, it only loads
   * remoteEntry.js and the exposed singleSpaEntry module — this index.js and
   * bootstrap.js are never fetched.
   *
   * WHY WE STILL NEED IT:
   * Local development. The Home team needs to run their micro frontend
   * independently to develop and test it. The async boundary ensures shared
   * dependency negotiation works even in standalone mode.
   */
  entry: './src/index.js',

  mode: 'development',

  /**
   * DEV SERVER — Port 4001
   * -----------------------
   * The Hybrid approach uses a different port range from the other approaches:
   *   - Hybrid shell:     port 4000
   *   - Hybrid mf-home:   port 4001 (this app)
   *   - Hybrid mf-settings: port 4002
   *
   * Compare to Module Federation approach:
   *   - MF host:          port 3000
   *   - MF remote-products: port 3001
   *   - MF remote-cart:   port 3002
   *
   * Different port ranges let you run both approaches simultaneously for
   * comparison and learning.
   *
   * The shell's webpack.config.js references this port:
   *   remotes: { mfHome: 'mfHome@http://localhost:4001/remoteEntry.js' }
   *
   * If you change this port, you MUST also update the shell's remotes config.
   */
  devServer: {
    port: 4001,
    historyApiFallback: true,
    hot: true,
    headers: {
      /**
       * CODE ANNOTATION: CORS headers — required for cross-origin MF loading
       * ----------------------------------------------------------------------
       * The shell (port 4000) fetches remoteEntry.js from this server (port 4001).
       * Different ports = different origins. Without CORS headers, the browser
       * blocks the request and Module Federation can't load this remote.
       *
       * In production, you'd restrict this to the shell's origin instead of '*'.
       */
      'Access-Control-Allow-Origin': '*',
    },
  },

  /**
   * OUTPUT
   * ------
   * publicPath: 'auto' — critical for Module Federation remotes.
   *
   * When the shell loads our remoteEntry.js, webpack needs to know the base
   * URL for loading our additional chunks (like the singleSpaEntry chunk).
   * 'auto' tells webpack to figure it out from the script tag's src attribute
   * at runtime.
   *
   * Without this, chunk URLs would be relative to the SHELL's origin
   * (localhost:4000), not our origin (localhost:4001), and chunk loads would 404.
   *
   * COMPARE TO PURE SINGLE-SPA:
   * In the pure Single-Spa approach, we used `libraryTarget: 'system'` to
   * output a SystemJS module. Here, we use standard webpack output because
   * Module Federation handles the module loading — no SystemJS needed.
   */
  output: {
    publicPath: 'auto',
  },

  /**
   * MODULE RULES
   * ------------
   * Standard Babel setup for JSX transformation. Identical to the pure
   * Module Federation remotes and the Hybrid shell.
   *
   * @babel/preset-env:   Transpiles modern JS to browser-compatible JS
   * @babel/preset-react: Transforms JSX syntax into React.createElement() calls
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
     * MODULE FEDERATION PLUGIN — THE DUAL-NATURE CONFIGURATION
     * ========================================================================
     *
     * This is where the Hybrid approach's dual nature is configured. This
     * plugin makes this app a Module Federation REMOTE that exposes a
     * single-spa LIFECYCLE ENTRY.
     *
     * COMPARE TO PURE MF REMOTE (ModuleFederation/remote-products/webpack.config.js):
     *   Pure MF remote exposes:   './ProductList' → a React component
     *   Hybrid remote exposes:    './singleSpaEntry' → single-spa lifecycle hooks
     *
     * The shell's mf-loader.js bridge does:
     *   import('mfHome/singleSpaEntry')
     *
     * This triggers Module Federation to:
     *   1. Fetch remoteEntry.js from http://localhost:4001
     *   2. Call container.get('./singleSpaEntry')
     *   3. Return the module with { bootstrap, mount, unmount }
     *   4. Single-Spa receives these hooks and manages the lifecycle
     *
     * The beauty: Module Federation doesn't know about single-spa, and
     * single-spa doesn't know about Module Federation. This plugin just
     * exposes a module — it doesn't care what's in it. And single-spa just
     * receives lifecycle hooks — it doesn't care how they were loaded.
     */
    new ModuleFederationPlugin({
      /**
       * NAME — Container identifier
       * ----------------------------
       * This MUST match the global variable name the shell expects.
       *
       * The shell's webpack.config.js declares:
       *   remotes: { mfHome: 'mfHome@http://localhost:4001/remoteEntry.js' }
       *
       * The format is: localAlias: 'globalName@url'
       * The 'mfHome' after the colon is the global variable name that our
       * remoteEntry.js registers as: window['mfHome'] = { get, init }
       *
       * This `name` field MUST match that global variable name. If they
       * don't match, the shell can't find our container and the import fails.
       */
      name: 'mfHome',

      /**
       * FILENAME — The container entry file
       * -------------------------------------
       * The file the shell fetches to discover and load our exposed modules.
       * Must match the URL in the shell's remotes config:
       *   'mfHome@http://localhost:4001/remoteEntry.js'
       *                                 ^^^^^^^^^^^^^^
       *
       * remoteEntry.js is intentionally small (~2KB). It contains:
       *   - A module map: { './singleSpaEntry': () => import('./chunk.js') }
       *   - A get(moduleName) function to load exposed modules on demand
       *   - An init(sharedScope) function for shared dependency negotiation
       *
       * The shell loads this first, then calls get('./singleSpaEntry') to
       * load the actual lifecycle hooks only when needed (lazy loading).
       */
      filename: 'remoteEntry.js',

      /**
       * EXPOSES — What this remote provides to the shell
       * --------------------------------------------------
       * THIS IS THE KEY DIFFERENCE from a pure Module Federation remote.
       *
       * Pure MF remote (remote-products) exposes:
       *   exposes: { './ProductList': './src/ProductList' }
       *   → A React COMPONENT. The host renders it with React.lazy().
       *
       * Hybrid remote (this app) exposes:
       *   exposes: { './singleSpaEntry': './src/single-spa-entry' }
       *   → A single-spa LIFECYCLE MODULE. The shell loads it via mf-loader
       *     and single-spa manages its mount/unmount lifecycle.
       *
       * The exposed module (single-spa-entry.js) exports:
       *   { bootstrap, mount, unmount }
       *
       * These are the same lifecycle hooks that a pure Single-Spa micro
       * frontend exports (see Single-Spa/app-react-home/src/app-name.js).
       * The difference is HOW they get loaded:
       *   - Pure Single-Spa: System.import('app-react-home') via SystemJS
       *   - Hybrid: import('mfHome/singleSpaEntry') via Module Federation
       *
       * INTERVIEW INSIGHT: "What does a Hybrid micro frontend expose?"
       * Answer: "It exposes a single-spa lifecycle module via Module Federation's
       * `exposes` config. The module exports bootstrap, mount, and unmount
       * functions — the same interface as any single-spa app. The shell's
       * mf-loader bridge loads this module via MF and passes the lifecycle
       * hooks to single-spa for orchestration."
       */
      exposes: {
        './singleSpaEntry': './src/single-spa-entry',
      },

      /**
       * SHARED — Dependencies shared with the shell and other remotes
       * ---------------------------------------------------------------
       * This is one of the biggest advantages of the Hybrid approach over
       * pure Single-Spa. In pure Single-Spa, shared deps are managed via
       * SystemJS externals and import maps — manual and fragile. Here,
       * Module Federation handles it automatically at runtime.
       *
       * RUNTIME NEGOTIATION (what happens when the shell loads this remote):
       *   1. Shell loads first, registers React 18.x in the shared scope
       *   2. Shell fetches our remoteEntry.js
       *   3. Shell calls our init(sharedScope) — passing its shared scope
       *   4. Our container checks: "I need React ^18.0.0. Compatible version
       *      in shared scope?" → Yes → reuse the shell's React
       *   5. Same for react-dom and single-spa
       *   6. Result: ONE copy of React, ONE copy of single-spa for everyone
       *
       * WHY single-spa IS SHARED:
       * single-spa maintains a global registry of registered applications.
       * If the shell and this remote each had their own copy of single-spa,
       * they'd have separate registries. The shell would register apps in
       * its registry, but the lifecycle hooks in this remote would reference
       * a different registry. Routing would break silently.
       *
       * Sharing single-spa as a singleton ensures everyone uses the same
       * registry, the same routing engine, and the same lifecycle management.
       */
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^18.0.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.0.0',
        },
        'single-spa': {
          singleton: true,
          requiredVersion: '^5.9.0',
        },
      },
    }),

    /**
     * HTML WEBPACK PLUGIN — For standalone mode only
     * ------------------------------------------------
     * Generates index.html so this remote can run independently (npm start).
     * When consumed by the shell, this HTML is never used — the shell has
     * its own HTML and only loads our remoteEntry.js + exposed module chunks.
     *
     * This is the same pattern as the pure MF remotes (remote-products,
     * remote-cart). Every remote should be independently runnable for local
     * development and testing.
     */
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
};
