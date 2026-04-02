/**
 * ============================================================================
 * WEBPACK CONFIGURATION — HYBRID SETTINGS MICRO FRONTEND (MF Remote + Single-Spa)
 * ============================================================================
 *
 * CODE ANNOTATION: Why this file looks almost identical to mf-home's webpack config
 * -----------------------------------------------------------------------------------
 * This is INTENTIONAL and is the whole point of the Hybrid pattern's scalability.
 *
 * Adding a new micro frontend to the Hybrid architecture is a REPEATABLE RECIPE:
 *   1. Copy the webpack config from an existing hybrid MF (like mf-home)
 *   2. Change THREE things:
 *      a. ModuleFederationPlugin `name` → 'mfSettings' (must match shell's remotes key)
 *      b. devServer `port` → 4002 (unique port for this remote)
 *      c. The exposed module path (same './singleSpaEntry' key, same file structure)
 *   3. Done. The shell already knows how to load it (via mf-loader.js).
 *
 * SCALING THE HYBRID PATTERN:
 * Compare this to adding a new micro frontend in each approach:
 *
 *   Pure Single-Spa:
 *     - Create new app with SystemJS output format
 *     - Add import map entry in root-config's index.ejs
 *     - Add registerApplication() call in root-config's index.js
 *     - Manage shared deps via externals (manual, fragile)
 *
 *   Pure Module Federation:
 *     - Create new remote with MF plugin config
 *     - Add remote entry in host's webpack.config.js remotes
 *     - Add React.lazy() import in host's App.js
 *     - No lifecycle management — just component rendering
 *
 *   Hybrid (THIS APPROACH):
 *     - Create new remote with MF plugin config (same as pure MF) ← THIS FILE
 *     - Add single-spa-entry.js exporting lifecycle hooks (same as pure Single-Spa)
 *     - Add remote entry in shell's webpack.config.js remotes
 *     - Add registerApplication() call in shell's index.js (uses mf-loader bridge)
 *     - Shared deps managed automatically by MF runtime
 *
 *   The Hybrid approach has slightly more files per MF (the single-spa-entry.js),
 *   but gains lifecycle management AND automatic dependency sharing. The trade-off
 *   is worth it for production systems with many micro frontends.
 *
 * INTERVIEW INSIGHT: "How hard is it to add a new micro frontend to a Hybrid setup?"
 * Answer: "It's a repeatable pattern. You create a new MF remote that exposes a
 * single-spa lifecycle module, add it to the shell's remotes config and register
 * it with single-spa. The mf-loader bridge is generic — it works with any remote
 * that follows the pattern. Adding the 10th MF is as easy as adding the 2nd."
 *
 * ============================================================================
 */

const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  /**
   * ENTRY POINT — Async boundary for standalone mode
   * --------------------------------------------------
   * Same pattern as mf-home/src/index.js. This entry point is ONLY used
   * when running standalone (npm start on port 4002). When the shell
   * consumes this remote, it only loads remoteEntry.js and the exposed
   * singleSpaEntry module — this entry point is never fetched.
   */
  entry: './src/index.js',

  mode: 'development',

  /**
   * DEV SERVER — Port 4002
   * -----------------------
   * CODE ANNOTATION: The port allocation strategy for the Hybrid approach
   *
   * Each micro frontend gets its own port:
   *   - Hybrid shell:       port 4000 (the orchestrator)
   *   - Hybrid mf-home:     port 4001 (first MF)
   *   - Hybrid mf-settings: port 4002 (THIS — second MF)
   *   - (future mf-profile: port 4003, mf-admin: port 4004, etc.)
   *
   * SCALING OBSERVATION:
   * As you add more micro frontends, you just increment the port number.
   * In production, each MF would be deployed to its own URL (e.g.,
   * https://cdn.example.com/mf-settings/remoteEntry.js) and ports
   * wouldn't matter. The port-per-MF pattern is purely for local dev.
   *
   * The shell's webpack.config.js references this port:
   *   remotes: { mfSettings: 'mfSettings@http://localhost:4002/remoteEntry.js' }
   *
   * If you change this port, you MUST also update the shell's remotes config.
   */
  devServer: {
    port: 4002,
    historyApiFallback: true,
    hot: true,
    headers: {
      /**
       * CODE ANNOTATION: CORS headers — same requirement as mf-home
       * --------------------------------------------------------------
       * The shell (port 4000) fetches remoteEntry.js from this server (port 4002).
       * Different ports = different origins = CORS required.
       *
       * Every MF remote in the Hybrid setup needs this header. It's part of
       * the repeatable recipe for adding new micro frontends.
       */
      'Access-Control-Allow-Origin': '*',
    },
  },

  /**
   * OUTPUT — publicPath: 'auto'
   * ----------------------------
   * Same as mf-home. Module Federation remotes MUST use 'auto' so webpack
   * can resolve chunk URLs relative to the remote's origin (port 4002),
   * not the shell's origin (port 4000).
   */
  output: {
    publicPath: 'auto',
  },

  /**
   * MODULE RULES — Standard Babel setup for JSX
   * ---------------------------------------------
   * Identical across all Hybrid micro frontends. This is another part of
   * the repeatable recipe — same Babel config, same presets, same loader.
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
     * MODULE FEDERATION PLUGIN — SECOND HYBRID REMOTE
     * ========================================================================
     *
     * CODE ANNOTATION: Spot the differences from mf-home's config
     * --------------------------------------------------------------
     * Compare this to Hybrid/mf-home/webpack.config.js's MF plugin config.
     * There are exactly TWO differences:
     *
     *   1. name: 'mfSettings' (was 'mfHome')
     *   2. That's it. The filename, exposes key, and shared config are IDENTICAL.
     *
     * This is the power of the Hybrid pattern — the MF plugin config is a
     * template. Every new micro frontend uses the same structure. The only
     * thing that changes is the container name (which must match the shell's
     * remotes config).
     *
     * The shell's webpack.config.js declares:
     *   remotes: {
     *     mfHome:     'mfHome@http://localhost:4001/remoteEntry.js',
     *     mfSettings: 'mfSettings@http://localhost:4002/remoteEntry.js',
     *   }
     *
     * Adding a third MF? Just add another line to remotes and create a new
     * remote following this same template.
     */
    new ModuleFederationPlugin({
      /**
       * NAME — 'mfSettings'
       * ---------------------
       * This MUST match the shell's remotes key:
       *   remotes: { mfSettings: 'mfSettings@http://localhost:4002/remoteEntry.js' }
       *
       * The name becomes a global variable: window['mfSettings'] = { get, init }
       * The shell uses this global to discover and load our exposed modules.
       *
       * NAMING CONVENTION:
       * We use camelCase prefixed with 'mf' (mfHome, mfSettings, mfProfile...).
       * This makes it easy to identify Module Federation containers in the
       * global scope and avoids collisions with other global variables.
       */
      name: 'mfSettings',

      /**
       * FILENAME — remoteEntry.js
       * --------------------------
       * Same filename as mf-home. Every MF remote uses 'remoteEntry.js' by
       * convention. The shell distinguishes between remotes by their URL
       * (different ports/domains), not by filename.
       */
      filename: 'remoteEntry.js',

      /**
       * EXPOSES — Same key, same pattern as mf-home
       * ----------------------------------------------
       * We expose './singleSpaEntry' — the single-spa lifecycle module.
       * This is the SAME expose key as mf-home. The shell's mf-loader.js
       * uses a generic pattern:
       *
       *   import(`${remoteName}/singleSpaEntry`)
       *
       * Because every hybrid MF exposes the same key ('./singleSpaEntry'),
       * the mf-loader bridge doesn't need to know anything specific about
       * each MF. It's a generic loader that works with ANY hybrid remote.
       *
       * This is a CONVENTION, not a technical requirement. You could expose
       * it as './lifecycleEntry' or './app' — but using a consistent key
       * across all MFs keeps the mf-loader simple and predictable.
       */
      exposes: {
        './singleSpaEntry': './src/single-spa-entry',
      },

      /**
       * SHARED — Identical to mf-home's shared config
       * ------------------------------------------------
       * Every hybrid MF shares the same three singletons:
       *   - react: the UI framework (one copy for all MFs)
       *   - react-dom: the DOM renderer (one copy for all MFs)
       *   - single-spa: the lifecycle orchestrator (one registry for all MFs)
       *
       * SCALING OBSERVATION:
       * As you add more micro frontends, the shared dependency negotiation
       * becomes MORE valuable, not less. With 10 MFs, Module Federation
       * ensures there's still only ONE copy of React loaded. Without MF's
       * sharing (like in pure Single-Spa with SystemJS), you'd need to
       * manually manage externals and import maps for every shared library.
       *
       * The shared config is part of the repeatable recipe — copy it
       * unchanged to every new hybrid MF.
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
     * Same as mf-home. Generates index.html so this remote can run
     * independently on port 4002 for local development.
     */
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
};
