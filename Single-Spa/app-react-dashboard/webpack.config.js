/**
 * =============================================================================
 * WEBPACK CONFIGURATION — Dashboard Micro Frontend (app-react-dashboard)
 * =============================================================================
 *
 * CODE ANNOTATION: Why does this look almost identical to app-react-home's config?
 * ----------------------------------------------------------------------------------
 * That's the point! In a micro frontend architecture, each micro frontend is an
 * independent application with its own build pipeline. The webpack configs are
 * similar because they follow the same CONTRACT that single-spa requires:
 *
 *   1. Output as a SystemJS module (libraryTarget: 'system')
 *   2. Mark shared deps as externals (react, react-dom)
 *   3. Serve at the URL the import map expects
 *
 * The only differences between this config and app-react-home's are:
 *   - Output filename: 'app-react-dashboard.js' (matches the import map entry)
 *   - Dev server port: 8082 (each micro frontend needs its own port)
 *
 * CODE ANNOTATION: Multi-app orchestration — what having a SECOND app teaches us
 * ---------------------------------------------------------------------------------
 * With just one micro frontend, you can't observe orchestration. You need at
 * least two apps to see:
 *
 *   1. ROUTING DECISIONS: Single-spa evaluates ALL registered apps' activeWhen
 *      conditions on every URL change. With two apps, you see that navigating
 *      to /dashboard mounts this app AND unmounts app-react-home (if it was
 *      mounted). This is the core of single-spa's orchestration.
 *
 *   2. SHARED DOM CONTAINER: Both apps render into the same container element
 *      (#micro-frontend-container). Single-spa ensures only one app occupies
 *      the container at a time by calling unmount() on the outgoing app before
 *      calling mount() on the incoming app.
 *
 *   3. INDEPENDENT BUILDS: Each app has its own webpack config, its own
 *      node_modules, its own dev server. They can be built and deployed
 *      independently. This is the "independent deployment" principle in action.
 *
 *   4. LIFECYCLE ISOLATION: An error in this dashboard app doesn't affect the
 *      home app. Each app manages its own error boundaries and cleanup.
 *
 * =============================================================================
 */

const path = require('path');

module.exports = {
  /**
   * CODE ANNOTATION: Same entry point pattern as app-react-home
   * -------------------------------------------------------------
   * The entry is the lifecycle hooks file (app-name.js), NOT the React
   * component. Single-spa imports this file to get { bootstrap, mount, unmount }.
   */
  entry: './src/app-name.js',

  output: {
    /**
     * CODE ANNOTATION: Filename must match the import map in root-config
     * -------------------------------------------------------------------
     * The root-config's index.ejs has:
     *   "app-react-dashboard": "http://localhost:8082/app-react-dashboard.js"
     *
     * This filename is the link between the root-config's registerApplication()
     * call and this micro frontend's built output. If you change this filename,
     * you MUST update the import map to match.
     */
    filename: 'app-react-dashboard.js',
    path: path.resolve(__dirname, 'dist'),

    /**
     * CODE ANNOTATION: SystemJS module format — the universal contract
     * -----------------------------------------------------------------
     * Every micro frontend in a single-spa setup outputs SystemJS modules.
     * This is what makes the architecture framework-agnostic: whether your
     * micro frontend is React, Angular, or Vue, the output is always a
     * SystemJS module that exports { bootstrap, mount, unmount }.
     *
     * The root-config doesn't know or care that this is a React app.
     * It just calls System.import('app-react-dashboard'), gets back the
     * lifecycle hooks, and manages them.
     */
    libraryTarget: 'system',

    clean: true,
  },

  module: {
    rules: [
      {
        /**
         * CODE ANNOTATION: Babel config — identical across all React micro frontends
         * ---------------------------------------------------------------------------
         * Each React micro frontend needs the same Babel setup for JSX. In a real
         * production setup, you might extract this into a shared babel config package
         * to avoid duplication. But for learning purposes, having it explicit in each
         * config makes the build pipeline self-documenting.
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
   * CODE ANNOTATION: Externals — why EVERY micro frontend must declare these
   * -------------------------------------------------------------------------
   * Both app-react-home and app-react-dashboard mark react and react-dom as
   * externals. This is critical for multi-app orchestration because:
   *
   *   1. SINGLETON REQUIREMENT: React must be a single instance across all
   *      micro frontends. If this dashboard app bundled its own React and
   *      the home app bundled a different copy, React hooks would break,
   *      context wouldn't propagate, and you'd get cryptic errors.
   *
   *   2. SHARED IMPORT MAP: The root-config's import map provides React
   *      from a CDN. When SystemJS loads this dashboard app and encounters
   *      `import React from 'react'`, it resolves 'react' through the
   *      import map — getting the SAME React instance that app-react-home
   *      uses. This is how single-spa achieves shared dependencies.
   *
   *   3. BUNDLE SIZE: Without externals, each micro frontend would include
   *      ~40KB of React. With 10 micro frontends, that's 400KB of duplicate
   *      code. Externals eliminate this entirely.
   *
   * INTERVIEW INSIGHT: "What happens if one micro frontend forgets to
   * externalize React?"
   * Answer: That app bundles its own React copy. It might work in isolation,
   * but when composed with other apps, you get two React instances. Hooks
   * break, state doesn't share, and you see "Invalid hook call" errors.
   * This is one of the most common bugs in single-spa setups.
   */
  externals: ['react', 'react-dom'],

  devServer: {
    /**
     * CODE ANNOTATION: Port 8082 — each micro frontend gets its own port
     * --------------------------------------------------------------------
     * Port allocation in our single-spa setup:
     *   - Root-config (shell): port 9000
     *   - app-react-home:      port 8081
     *   - app-react-dashboard: port 8082
     *
     * Each micro frontend runs its own webpack-dev-server on a unique port.
     * The root-config's import map maps app names to these URLs. In production,
     * each app would be deployed to its own URL (e.g., CDN path or subdomain).
     *
     * This port-per-app pattern mirrors the production deployment model:
     * each micro frontend is an independent service with its own endpoint.
     */
    port: 8082,

    /**
     * CODE ANNOTATION: CORS — required for cross-origin module loading
     * ------------------------------------------------------------------
     * The root-config on port 9000 fetches this app from port 8082.
     * Without CORS headers, the browser blocks the request. This is the
     * same CORS requirement as app-react-home — every micro frontend
     * served from a different origin needs these headers.
     */
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },

  resolve: {
    extensions: ['.js', '.jsx'],
  },
};
