/**
 * =============================================================================
 * WEBPACK CONFIGURATION — Home Micro Frontend (app-react-home)
 * =============================================================================
 *
 * CODE ANNOTATION: How is this different from the root-config's webpack config?
 * ------------------------------------------------------------------------------
 * The root-config's webpack config builds the orchestrator — the code that
 * registers and manages micro frontends. THIS webpack config builds an actual
 * micro frontend — a self-contained React application that exports lifecycle
 * hooks for single-spa to call.
 *
 * Key differences from the root-config:
 *   1. This config includes Babel for JSX transformation (the root-config
 *      has no React code, so it doesn't need Babel)
 *   2. This config marks react and react-dom as externals (loaded via SystemJS
 *      from the import map, not bundled)
 *   3. This config does NOT use HtmlWebpackPlugin (no HTML template needed —
 *      the root-config owns the HTML page)
 *   4. The output filename matches what the import map expects
 *
 * CODE ANNOTATION: The micro frontend build contract
 * ----------------------------------------------------
 * For a micro frontend to work with single-spa, its webpack output must:
 *   1. Be a SystemJS module (libraryTarget: 'system')
 *   2. Export lifecycle hooks (bootstrap, mount, unmount) as named exports
 *   3. NOT include shared dependencies like React (they come from the import map)
 *   4. Be served at the URL specified in the root-config's import map
 *
 * =============================================================================
 */

const path = require('path');

module.exports = {
  /**
   * CODE ANNOTATION: Entry point — the lifecycle hooks file
   * --------------------------------------------------------
   * The entry point is NOT the React component — it's the file that exports
   * the single-spa lifecycle hooks. This is a crucial distinction:
   *
   *   - root.component.js = the React UI (what the user sees)
   *   - app-name.js = the lifecycle adapter (what single-spa interacts with)
   *
   * Single-spa never imports root.component.js directly. It imports this
   * entry point, which exports { bootstrap, mount, unmount }. The mount()
   * hook is what eventually renders root.component.js into the DOM.
   */
  entry: './src/app-name.js',

  output: {
    /**
     * CODE ANNOTATION: Output filename must match the import map
     * -----------------------------------------------------------
     * The root-config's import map has:
     *   "app-react-home": "http://localhost:8081/app-react-home.js"
     *
     * So this webpack config MUST output a file named 'app-react-home.js'.
     * If these don't match, SystemJS won't find the module and the micro
     * frontend won't load. This is a common source of bugs in single-spa
     * setups — always verify the filename matches the import map entry.
     */
    filename: 'app-react-home.js',
    path: path.resolve(__dirname, 'dist'),

    /**
     * CODE ANNOTATION: libraryTarget: 'system' — the SystemJS contract
     * ------------------------------------------------------------------
     * This tells webpack to wrap the output in a System.register() call,
     * which is the format SystemJS understands. When the root-config calls
     * System.import('app-react-home'), SystemJS:
     *   1. Fetches http://localhost:8081/app-react-home.js
     *   2. Finds the System.register() wrapper
     *   3. Resolves the module's dependencies (react, react-dom)
     *   4. Executes the module and returns its exports
     *
     * The exports are the lifecycle hooks: { bootstrap, mount, unmount }
     * which single-spa then calls at the appropriate times.
     */
    libraryTarget: 'system',

    clean: true,
  },

  module: {
    rules: [
      {
        /**
         * CODE ANNOTATION: Babel loader for JSX
         * ---------------------------------------
         * Unlike the root-config (which has no React code), this micro
         * frontend uses JSX syntax in its components. Babel transforms
         * JSX into React.createElement() calls that the browser can execute.
         *
         * @babel/preset-env: Transpiles modern JS to browser-compatible JS
         * @babel/preset-react: Transforms JSX syntax into React function calls
         *
         * We exclude node_modules because those packages are already
         * pre-compiled and re-transpiling them would slow the build.
         */
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

  /**
   * CODE ANNOTATION: Externals — shared dependencies loaded via SystemJS
   * ---------------------------------------------------------------------
   * This is one of the most important settings for micro frontend architecture.
   * We tell webpack: "Do NOT bundle react and react-dom into this micro
   * frontend's output. They will be available at runtime via SystemJS."
   *
   * WHY THIS MATTERS:
   *   - Without externals, each micro frontend would bundle its own copy of
   *     React (~40KB minified). With 5 micro frontends, that's 200KB of
   *     duplicate React code.
   *   - More critically, React must be a SINGLETON. If two micro frontends
   *     each have their own React instance, hooks won't work across boundaries,
   *     context won't propagate, and you'll get the infamous "Invalid hook call"
   *     error.
   *   - The import map in the root-config's index.ejs provides React from a
   *     CDN, ensuring all micro frontends share the exact same React instance.
   *
   * INTERVIEW INSIGHT: "How do you handle shared dependencies in Single-Spa?"
   * Answer: Mark them as externals in each micro frontend's webpack config and
   * provide them via the SystemJS import map. This ensures singleton behavior
   * and eliminates bundle duplication. The trade-off is that you lose the
   * ability to have different React versions per micro frontend (which is
   * rarely needed and usually a bad idea anyway).
   */
  externals: ['react', 'react-dom'],

  devServer: {
    /**
     * CODE ANNOTATION: Dev server port — must match the import map
     * --------------------------------------------------------------
     * This micro frontend runs on port 8081. The import map in the
     * root-config points to http://localhost:8081/app-react-home.js.
     * If these ports don't match, the root-config can't load this app.
     *
     * In production, you wouldn't use dev servers — each micro frontend
     * would be deployed to a CDN or static file server, and the import
     * map would point to those production URLs.
     */
    port: 8081,

    /**
     * CODE ANNOTATION: CORS headers — required for cross-origin loading
     * -------------------------------------------------------------------
     * The root-config (port 9000) loads this micro frontend (port 8081).
     * Different ports = different origins in the browser's Same-Origin Policy.
     * Without Access-Control-Allow-Origin: *, the browser would block the
     * request and the micro frontend would fail to load.
     *
     * In production, you'd restrict this to specific allowed origins
     * instead of using the wildcard '*'.
     */
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },

  resolve: {
    /**
     * CODE ANNOTATION: File extensions to resolve
     * ---------------------------------------------
     * Tells webpack to try these extensions when resolving imports.
     * This lets us write `import Root from './root.component'` instead
     * of `import Root from './root.component.js'`.
     */
    extensions: ['.js', '.jsx'],
  },
};
