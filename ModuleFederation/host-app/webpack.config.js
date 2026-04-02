/**
 * ============================================================================
 * WEBPACK CONFIGURATION — MODULE FEDERATION HOST APP
 * ============================================================================
 *
 * This is the webpack config for the HOST application in a Module Federation
 * setup. The host is the "consumer" — it declares which remote applications
 * it wants to pull components from at runtime.
 *
 * KEY CONCEPT: Module Federation lets independently built and deployed webpack
 * bundles share code at runtime. No monorepo required. No npm publish step.
 * Each app is its own webpack build, and they negotiate shared dependencies
 * when the page loads.
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
   * We point to './src/index.js', which does ONLY `import('./bootstrap')`.
   * This is the "async boundary" pattern — see index.js for the full explanation.
   *
   * Why not point directly to bootstrap.js?
   * Because Module Federation needs an async boundary to negotiate shared
   * dependencies BEFORE any application code runs. If we loaded bootstrap.js
   * synchronously, React might load twice (once from host, once from remote).
   */
  entry: './src/index.js',

  mode: 'development',

  /**
   * DEV SERVER
   * ----------
   * The host runs on port 3000. Each remote runs on its own port:
   *   - Host:            http://localhost:3000
   *   - Remote Products: http://localhost:3001
   *   - Remote Cart:     http://localhost:3002
   *
   * In production, these would be separate deployments behind a CDN or
   * reverse proxy. The port numbers are just for local development.
   *
   * historyApiFallback: true — ensures client-side routing works by serving
   * index.html for all 404 routes (needed for React Router, etc.)
   */
  devServer: {
    port: 3000,
    historyApiFallback: true,
    hot: true,
  },

  /**
   * OUTPUT
   * ------
   * publicPath: 'auto' — lets webpack figure out the correct base URL at runtime.
   * This is important for Module Federation because remotes need to resolve
   * chunk URLs relative to where they're actually served from, not where the
   * host is served from.
   */
  output: {
    publicPath: 'auto',
  },

  /**
   * MODULE RULES
   * ------------
   * Standard Babel setup for JSX transformation. Nothing Module Federation-
   * specific here — this is the same config you'd use in any React + Webpack app.
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
     * MODULE FEDERATION PLUGIN — THE CORE OF RUNTIME CODE SHARING
     * ========================================================================
     *
     * This plugin is what makes Module Federation work. It transforms a normal
     * webpack build into a "container" that can expose modules to other builds
     * and/or consume modules from other builds — all at RUNTIME, not build time.
     *
     * Under the hood, it generates a "container interface" — a small JS file
     * (remoteEntry.js) that other apps can load to access exposed modules.
     */
    new ModuleFederationPlugin({
      /**
       * NAME
       * ----
       * A unique identifier for this container. Other apps reference this name
       * when they want to consume modules from this app.
       *
       * For the host, the name is mostly used internally. It matters more for
       * remotes, where the name becomes part of the global scope:
       *   window['hostApp'] — the container's runtime reference
       *
       * Convention: use camelCase, matching the key used in `remotes` config.
       */
      name: 'hostApp',

      /**
       * FILENAME
       * --------
       * The name of the "container entry" file that webpack generates.
       * Other apps load this file to access this container's exposed modules.
       *
       * For the HOST, this is less important (hosts typically consume, not expose).
       * For REMOTES, this is critical — the host's `remotes` config points to
       * this file: 'remoteProducts@http://localhost:3001/remoteEntry.js'
       *
       * Default is 'remoteEntry.js'. You could change it, but there's rarely
       * a reason to. Keep it consistent across all your micro frontends.
       */
      filename: 'remoteEntry.js',

      /**
       * REMOTES
       * -------
       * This is where the host declares which remote containers it wants to
       * consume. Each entry maps a local alias to a remote container's URL.
       *
       * Format: 'localAlias: globalName@URL'
       *   - localAlias:  The name you use in import() statements
       *                   e.g., import('remoteProducts/ProductList')
       *   - globalName:  The `name` field from the remote's MF plugin config
       *   - URL:         Where to fetch the remote's remoteEntry.js
       *
       * AT RUNTIME, here's what happens when you do import('remoteProducts/ProductList'):
       *   1. Webpack checks if 'remoteProducts' container is already loaded
       *   2. If not, it injects a <script> tag for http://localhost:3001/remoteEntry.js
       *   3. That script registers the container on window['remoteProducts']
       *   4. Webpack calls container.get('./ProductList') to get the module
       *   5. The module factory is executed and the component is returned
       *
       * This all happens transparently — your React code just sees a normal
       * dynamic import() that resolves to a component.
       */
      remotes: {
        remoteProducts: 'remoteProducts@http://localhost:3001/remoteEntry.js',
        remoteCart: 'remoteCart@http://localhost:3002/remoteEntry.js',
      },

      /**
       * SHARED
       * ------
       * Declares which dependencies should be shared across all containers
       * (host + remotes) at runtime. This is how Module Federation avoids
       * loading React twice.
       *
       * RUNTIME NEGOTIATION PROCESS:
       *   1. Host loads and registers its version of React (e.g., 18.2.0)
       *   2. Remote loads and checks: "Do I need React? Is a compatible version
       *      already loaded?"
       *   3. If yes → reuse the host's React. If no → load its own copy.
       *
       * OPTIONS EXPLAINED:
       *
       * singleton: true
       *   Forces ALL containers to use the SAME instance of this library.
       *   Critical for React — having two React instances causes the
       *   "Invalid hook call" error because hooks rely on a shared internal
       *   state. If a remote has an incompatible version, webpack logs a
       *   warning but still uses the singleton (unless strictVersion is true).
       *
       * requiredVersion: '^18.0.0'
       *   The semver range this container needs. Used during negotiation:
       *   - If the loaded singleton satisfies this range → use it
       *   - If not and strictVersion is false (default) → use it anyway + warn
       *   - If not and strictVersion is true → throw an error
       *
       * Other options you might see (not used here but good to know):
       *   eager: true     — Load this dep immediately with the host bundle
       *                     instead of waiting for async negotiation.
       *                     Useful for the host's copy of React, but increases
       *                     initial bundle size.
       *   strictVersion:  — If true, throws error on version mismatch instead
       *                     of warning. Use in production if version compat is
       *                     critical.
       */
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
      },
    }),

    /**
     * HTML WEBPACK PLUGIN
     * -------------------
     * Generates the index.html that loads our webpack bundle.
     * Nothing Module Federation-specific here — standard webpack setup.
     */
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
};
