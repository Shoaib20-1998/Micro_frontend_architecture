/**
 * ============================================================================
 * WEBPACK CONFIGURATION — MODULE FEDERATION REMOTE APP (CART)
 * ============================================================================
 *
 * This is the webpack config for the SECOND remote in our Module Federation
 * setup. If you've already read remote-products/webpack.config.js, you'll
 * notice this is structurally identical — and that's the point.
 *
 * WHY A SECOND REMOTE MATTERS:
 * A single remote doesn't prove much. The real power of Module Federation
 * shows up when a host consumes MULTIPLE remotes simultaneously:
 *
 *   1. Each remote is built and deployed independently
 *   2. Each remote has its own team, repo, and CI/CD pipeline
 *   3. The host composes them at runtime without rebuilding
 *   4. Shared dependencies (React) are loaded ONCE across all three apps
 *
 * This second remote demonstrates that the pattern scales. The host's
 * webpack config simply adds another entry to its `remotes` object:
 *   remotes: {
 *     remoteProducts: 'remoteProducts@http://localhost:3001/remoteEntry.js',
 *     remoteCart:     'remoteCart@http://localhost:3002/remoteEntry.js',
 *   }
 *
 * Adding a third, fourth, or tenth remote follows the exact same pattern.
 * The host never needs to know about the remote's internals — just its
 * container name and URL.
 *
 * INTERVIEW TIP:
 * "Module Federation scales horizontally. Adding a new micro frontend is
 * just a new entry in the host's `remotes` config and a new remote build
 * with its own `exposes` config. There's no central registry or build
 * coordination required."
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
   * Same async boundary pattern as every other app in this setup:
   * index.js → import('./bootstrap') → React renders.
   *
   * This pattern is IDENTICAL across host and all remotes. Consistency
   * matters — when every app follows the same entry pattern, onboarding
   * new developers is easier and debugging shared dep issues is predictable.
   */
  entry: './src/index.js',

  mode: 'development',

  /**
   * DEV SERVER
   * ----------
   * This remote runs on port 3002. The host's `remotes` config points to:
   *   'remoteCart@http://localhost:3002/remoteEntry.js'
   *
   * Port assignment convention for this project:
   *   - Host:            3000
   *   - Remote Products: 3001
   *   - Remote Cart:     3002
   *
   * MULTI-REMOTE DEVELOPMENT WORKFLOW:
   * To run the full setup locally, you start three terminals:
   *   Terminal 1: cd remote-products && npm start  → port 3001
   *   Terminal 2: cd remote-cart && npm start      → port 3002
   *   Terminal 3: cd host-app && npm start         → port 3000
   *
   * The host will fetch remoteEntry.js from each remote on page load.
   * If a remote isn't running, the host's ErrorBoundary shows a fallback
   * instead of crashing — that's the "independent failure" principle.
   *
   * ORDER DOESN'T MATTER: You can start the host before the remotes.
   * The host fetches remoteEntry.js lazily (when React.lazy triggers),
   * not eagerly on page load. If a remote starts later, refreshing the
   * host page will pick it up.
   */
  devServer: {
    port: 3002,
    historyApiFallback: true,
    hot: true,
  },

  /**
   * OUTPUT
   * ------
   * publicPath: 'auto' — same as remote-products. Lets webpack resolve
   * chunk URLs relative to where this remote is actually served from.
   *
   * Without 'auto', when the host loads our chunks, the URLs would be
   * relative to localhost:3000 (the host) instead of localhost:3002 (us),
   * causing 404s for every chunk after remoteEntry.js.
   */
  output: {
    publicPath: 'auto',
  },

  /**
   * MODULE RULES
   * ------------
   * Standard Babel setup for JSX. Identical across all apps in this setup.
   *
   * MULTI-REMOTE CONSISTENCY NOTE:
   * In a real organization, you'd likely share this config via a shared
   * webpack preset package (e.g., @myorg/webpack-config-mf). That way,
   * all remotes use the same Babel version, same presets, and same
   * loader config. Drift between remote configs is a common source of
   * subtle bugs in production micro frontend setups.
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
     * MODULE FEDERATION PLUGIN — REMOTE CONFIGURATION (CART)
     * ========================================================================
     *
     * This config mirrors remote-products, but with a different container
     * name and different exposed modules. That's the pattern:
     *
     *   - Every remote has the SAME plugin structure
     *   - Only `name`, `exposes`, and port differ between remotes
     *   - `shared` config should be CONSISTENT across all containers
     *
     * WHY SHARED CONFIG CONSISTENCY MATTERS:
     * If remote-products declares `react: { singleton: true }` but
     * remote-cart doesn't, the cart might load its own React copy.
     * Now you have two React instances — hooks break, state is split,
     * and debugging is a nightmare. Keep shared configs aligned.
     *
     * In production, enforce this with a shared config package or a
     * lint rule that validates ModuleFederationPlugin options.
     */
    new ModuleFederationPlugin({
      /**
       * NAME
       * ----
       * 'remoteCart' — must match the key in the host's `remotes` config:
       *   remotes: { remoteCart: 'remoteCart@http://localhost:3002/remoteEntry.js' }
       *
       * At runtime, our remoteEntry.js registers as window['remoteCart'].
       * The host's webpack runtime looks up this global to access our
       * container interface.
       *
       * NAMING ACROSS MULTIPLE REMOTES:
       * Each remote MUST have a unique name. If two remotes used the same
       * name, the second one would overwrite the first on the window object,
       * and the host would only see one of them. Use descriptive names that
       * reflect the team or domain: remoteProducts, remoteCart, remoteAuth, etc.
       */
      name: 'remoteCart',

      /**
       * FILENAME
       * --------
       * Same convention as all other remotes: 'remoteEntry.js'.
       * The host fetches this file to discover our exposed modules.
       *
       * CONSISTENCY TIP: Keep this the same across all remotes. If one
       * remote uses 'remoteEntry.js' and another uses 'container.js',
       * it creates unnecessary cognitive overhead for the host team.
       */
      filename: 'remoteEntry.js',

      /**
       * EXPOSES
       * -------
       * This remote exposes a Cart component. The host imports it as:
       *   import('remoteCart/Cart')
       *
       * MULTI-REMOTE PATTERN:
       * Each remote exposes modules from its own domain:
       *   - remoteProducts exposes: './ProductList' → product catalog UI
       *   - remoteCart exposes:     './Cart'        → shopping cart UI
       *
       * The host composes these into a single page. Each team owns their
       * exposed component end-to-end: data fetching, state, styling, tests.
       * The host team only needs to know the import path and the component's
       * props interface (if any).
       *
       * VERSIONING CONSIDERATION:
       * What if the Cart team wants to change their component's props?
       * This is the "contract" problem in micro frontends. Options:
       *   1. Semantic versioning of the remote (breaking change = major bump)
       *   2. Props validation with PropTypes or TypeScript at the boundary
       *   3. Feature flags to gradually roll out breaking changes
       * Module Federation doesn't solve this — it's an organizational concern.
       */
      exposes: {
        './Cart': './src/Cart',
      },

      /**
       * SHARED
       * ------
       * IDENTICAL to remote-products and the host. This is intentional.
       *
       * RUNTIME NEGOTIATION FOR THE SECOND REMOTE:
       * When the host loads both remotes, here's the full negotiation flow:
       *
       *   1. Host loads first, registers React 18.x in the shared scope
       *   2. Host fetches remoteProducts/remoteEntry.js
       *   3. Host calls remoteProducts.init(sharedScope)
       *   4. remoteProducts checks: "React ^18.0.0 needed, 18.x available" → reuse ✓
       *   5. Host fetches remoteCart/remoteEntry.js
       *   6. Host calls remoteCart.init(sharedScope) — SAME shared scope
       *   7. remoteCart checks: "React ^18.0.0 needed, 18.x available" → reuse ✓
       *
       * Result: ONE copy of React shared across host + 2 remotes.
       * Without singleton: true, each remote might load its own React,
       * tripling memory usage and breaking hooks.
       *
       * The shared scope is the mechanism that makes multi-remote setups
       * efficient. It's essentially a runtime dependency registry.
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
     * For standalone mode only. When consumed by the host, this HTML is
     * never fetched — the host only loads remoteEntry.js + component chunks.
     */
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
};
