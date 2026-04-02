/**
 * ============================================================================
 * WEBPACK CONFIGURATION — MODULE FEDERATION REMOTE APP (PRODUCTS)
 * ============================================================================
 *
 * This is the webpack config for a REMOTE application in a Module Federation
 * setup. A remote is the "provider" — it declares which modules it wants to
 * EXPOSE for other apps (the host) to consume at runtime.
 *
 * KEY DIFFERENCE FROM THE HOST:
 *   - Host uses `remotes` to declare what it CONSUMES
 *   - Remote uses `exposes` to declare what it PROVIDES
 *   - Both use `shared` to negotiate common dependencies at runtime
 *
 * This remote exposes a ProductList component. The host app imports it as:
 *   import('remoteProducts/ProductList')
 *
 * That import path is resolved at RUNTIME:
 *   1. 'remoteProducts' → the host's `remotes` config maps this to our URL
 *   2. '/ProductList'   → our `exposes` config maps this to './src/ProductList'
 *
 * This file is heavily annotated for learning purposes.
 * ============================================================================
 */

const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  /**
   * ENTRY POINT
   * -----------
   * Same async boundary pattern as the host: index.js → import('./bootstrap').
   *
   * WHY REMOTES ALSO NEED THE ASYNC BOUNDARY:
   * Even though this app is a remote, it can also run STANDALONE (for local
   * development and testing). When running standalone, it still needs the
   * async boundary so that shared dependency negotiation works correctly.
   *
   * If this remote is loaded BY the host, the host's async boundary handles
   * negotiation. But when running standalone, this entry point is what
   * triggers the negotiation for its own shared deps.
   */
  entry: './src/index.js',

  mode: 'development',

  /**
   * DEV SERVER
   * ----------
   * This remote runs on port 3001. The host app's `remotes` config points to:
   *   'remoteProducts@http://localhost:3001/remoteEntry.js'
   *
   * Port assignment convention for this project:
   *   - Host:            3000
   *   - Remote Products: 3001
   *   - Remote Cart:     3002
   *
   * In production, each remote would be deployed to its own URL (e.g., a CDN
   * or separate service). The port numbers are just for local development.
   *
   * CORS headers: In production, you'd need to configure CORS headers on the
   * remote's server so the host can fetch remoteEntry.js cross-origin.
   * webpack-dev-server handles this automatically in development.
   */
  devServer: {
    port: 3001,
    historyApiFallback: true,
    hot: true,
  },

  /**
   * OUTPUT
   * ------
   * publicPath: 'auto' — critical for remotes. When the host loads our
   * remoteEntry.js, webpack needs to know the base URL for loading our
   * additional chunks. 'auto' tells webpack to figure it out from the
   * script tag's src attribute at runtime.
   *
   * Without this, chunk URLs would be relative to the HOST's origin
   * (localhost:3000), not our origin (localhost:3001), and all chunk
   * loads would 404.
   */
  output: {
    publicPath: 'auto',
  },

  /**
   * MODULE RULES
   * ------------
   * Standard Babel setup for JSX. Identical to the host — nothing
   * Module Federation-specific here.
   *
   * In a real project, you might have different Babel configs per remote
   * (e.g., one remote uses TypeScript, another uses Flow). Module Federation
   * doesn't care about your build pipeline — it only cares about the
   * runtime container interface.
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
     * MODULE FEDERATION PLUGIN — REMOTE CONFIGURATION
     * ========================================================================
     *
     * This is the remote-side configuration of Module Federation. While the
     * host declares what it CONSUMES, this remote declares what it EXPOSES.
     *
     * When webpack builds this app, the ModuleFederationPlugin generates:
     *   1. remoteEntry.js — a small (~2KB) file that acts as the "manifest"
     *      for this container. It lists all exposed modules and provides a
     *      `get(moduleName)` function to load them on demand.
     *   2. Separate chunks for each exposed module — loaded lazily when the
     *      host actually calls `get('./ProductList')`.
     *
     * The host never downloads our entire bundle — only remoteEntry.js and
     * the specific chunks for the modules it imports. This is key for
     * performance in production.
     */
    new ModuleFederationPlugin({
      /**
       * NAME
       * ----
       * A unique identifier for this container. This MUST match the key used
       * in the host's `remotes` config.
       *
       * The host declares:
       *   remotes: { remoteProducts: 'remoteProducts@http://localhost:3001/remoteEntry.js' }
       *
       * The first 'remoteProducts' is the local alias (used in import paths).
       * The second 'remoteProducts' (after the colon) is the global variable
       * name — it must match THIS `name` field.
       *
       * At runtime, our remoteEntry.js registers itself as:
       *   window['remoteProducts'] = { get: ..., init: ... }
       *
       * The host's webpack runtime looks up window['remoteProducts'] to
       * access our container interface.
       *
       * NAMING CONVENTION: Use camelCase. The name becomes a global variable,
       * so avoid hyphens or special characters.
       */
      name: 'remoteProducts',

      /**
       * FILENAME
       * --------
       * The output filename for the container entry file. This is the file
       * the host fetches to discover and load our exposed modules.
       *
       * The host's remotes config points to this exact file:
       *   'remoteProducts@http://localhost:3001/remoteEntry.js'
       *                                         ^^^^^^^^^^^^^^
       *
       * WHAT'S INSIDE remoteEntry.js:
       *   - A module map: { './ProductList': () => import('./src_ProductList_js.chunk.js') }
       *   - A `get(moduleName)` function that loads the requested module chunk
       *   - An `init(sharedScope)` function for shared dependency negotiation
       *
       * The file is intentionally small (~2KB) so the host can load it quickly
       * to discover what's available, without downloading the actual component code.
       *
       * DEFAULT: 'remoteEntry.js'. Stick with the convention unless you have
       * a specific reason to change it (e.g., versioned filenames for caching).
       */
      filename: 'remoteEntry.js',

      /**
       * EXPOSES
       * -------
       * Declares which modules from this app are available for other containers
       * (the host) to import at runtime.
       *
       * Format: { 'exposedName': 'internalPath' }
       *   - exposedName:  The name the host uses in its import() statement.
       *                   The host does: import('remoteProducts/ProductList')
       *                   The '/ProductList' part maps to './ProductList' here.
       *   - internalPath: The actual file path within this project.
       *                   './src/ProductList' → resolves to src/ProductList.js
       *
       * WHAT HAPPENS AT RUNTIME:
       *   1. Host calls: import('remoteProducts/ProductList')
       *   2. Webpack runtime calls: window['remoteProducts'].get('./ProductList')
       *   3. Our container loads the chunk containing ProductList.js
       *   4. The module factory is executed and the component is returned
       *   5. Host receives the component as if it were a normal dynamic import
       *
       * You can expose multiple modules:
       *   exposes: {
       *     './ProductList': './src/ProductList',
       *     './ProductDetail': './src/ProductDetail',
       *     './utils': './src/shared/utils',
       *   }
       *
       * SECURITY NOTE: Only expose what you intend to be public. Anything
       * listed here is accessible to any app that knows your remoteEntry URL.
       */
      exposes: {
        './ProductList': './src/ProductList',
      },

      /**
       * SHARED
       * ------
       * Declares dependencies that should be shared with other containers at
       * runtime. This is how Module Federation avoids loading React twice.
       *
       * RUNTIME NEGOTIATION (from the remote's perspective):
       *   1. Host loads first and registers its React 18.2.0 in the shared scope
       *   2. Our remoteEntry.js is fetched by the host
       *   3. Host calls our init(sharedScope) — passing its shared scope to us
       *   4. Our container checks: "I need React ^18.0.0. Is a compatible
       *      version already in the shared scope?"
       *   5. Yes → reuse the host's React. No separate download needed.
       *   6. If no compatible version exists → load our own copy as fallback.
       *
       * singleton: true
       *   CRITICAL for React. Forces all containers to use the SAME React
       *   instance. Without this, the host and remote could each load their
       *   own React, causing the "Invalid hook call" error.
       *
       *   Why hooks break with duplicate React:
       *   React hooks store state in a module-level variable inside React.
       *   If two copies of React exist, hooks in remote components write to
       *   a different state store than the one the host's React reads from.
       *   Result: "Hooks can only be called inside the body of a function
       *   component" — even though you ARE in a function component.
       *
       * requiredVersion: '^18.0.0'
       *   The semver range this remote needs. During negotiation:
       *   - If the host's React satisfies '^18.0.0' → share it (most common)
       *   - If not and strictVersion is false → share anyway + console warning
       *   - If not and strictVersion is true → throw an error at runtime
       *
       *   Using a range (^18.0.0) instead of an exact version (18.2.0) gives
       *   flexibility — the host can upgrade to 18.3.0 without breaking us.
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
      },
    }),

    /**
     * HTML WEBPACK PLUGIN
     * -------------------
     * Generates index.html for STANDALONE mode. When this remote runs on its
     * own (npm start), it needs an HTML page to mount into.
     *
     * When consumed by the host, this HTML is never used — the host has its
     * own HTML and only loads our remoteEntry.js + component chunks.
     */
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
};
