/**
 * ============================================================================
 * APP.JS — HYBRID HOME MICRO FRONTEND (React Component)
 * ============================================================================
 *
 * CODE ANNOTATION: What is this component?
 * ------------------------------------------
 * This is the main React component for the Home micro frontend. It renders
 * the Home page UI — the actual content the user sees.
 *
 * This component is used in TWO contexts:
 *
 *   1. STANDALONE MODE (npm start on port 4001):
 *      bootstrap.js → ReactDOM.createRoot() → renders <App />
 *      The component renders into a plain <div id="root"> in the standalone HTML.
 *
 *   2. CONSUMED BY HYBRID SHELL:
 *      single-spa-entry.js → singleSpaReact({ rootComponent: App }) → lifecycle hooks
 *      The component renders into the shell's #micro-frontend-container div
 *      when single-spa calls mount().
 *
 * The component itself doesn't know or care which context it's in. It's just
 * a React component. The "micro frontend" behavior is handled by the entry
 * points (bootstrap.js for standalone, single-spa-entry.js for integrated).
 *
 * COMPARE TO OTHER APPROACHES:
 *
 *   Pure Single-Spa (Single-Spa/app-react-home/src/root.component.js):
 *     - Called "root component" in single-spa terminology
 *     - Receives single-spa props (name, mountParcel, singleSpa)
 *     - Only used via single-spa lifecycle hooks
 *
 *   Pure MF Remote (ModuleFederation/remote-products/src/App.js):
 *     - Standalone wrapper that imports the exposed component (ProductList)
 *     - Only used in standalone mode — the host imports ProductList directly
 *
 *   Hybrid (this file):
 *     - Used in BOTH standalone and integrated modes
 *     - In standalone: rendered directly by bootstrap.js
 *     - In integrated: wrapped by single-spa-entry.js and rendered by single-spa
 *     - Receives single-spa props when in integrated mode (via singleSpaReact)
 *
 * ============================================================================
 */

import React from 'react';

/**
 * CODE ANNOTATION: The App component receives props from single-spa
 * -------------------------------------------------------------------
 * When this component is rendered via single-spa (integrated mode), it
 * receives single-spa props:
 *   - name: 'mf-home' (the registered app name)
 *   - singleSpa: the single-spa instance
 *   - mountParcel: function to mount sub-applications
 *   - domElement: '#micro-frontend-container' (from customProps)
 *
 * When rendered standalone (bootstrap.js), it receives no special props.
 *
 * We don't destructure or use these props in this simple example, but in
 * a production app you might use `name` for logging, `mountParcel` for
 * embedding other micro frontends, or custom props for configuration.
 */
export default function App(props) {
  return (
    <section style={{ padding: '2rem' }}>
      <h1>🏠 Home Micro Frontend (Hybrid)</h1>
      <p>
        This is the <strong>Home</strong> micro frontend running in the
        Hybrid architecture. It has a <em>dual nature</em> — it's both a
        Module Federation remote and a single-spa application.
      </p>

      {/*
        CODE ANNOTATION: Explaining the dual nature to the learner
        -----------------------------------------------------------
        This informational section helps the developer understand what's
        happening behind the scenes when they see this component rendered.
      */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1.25rem',
        backgroundColor: '#e3f2fd',
        borderRadius: '8px',
        border: '1px solid #90caf9',
      }}>
        <h3 style={{ marginTop: 0 }}>🔀 Dual Nature — How This Works</h3>
        <p style={{ marginBottom: '0.75rem' }}>
          This micro frontend is simultaneously:
        </p>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>
            <strong>A Module Federation remote</strong> — its code is loaded at
            runtime via <code>remoteEntry.js</code> on port 4001. The shell
            never bundles this code; it fetches it dynamically.
          </li>
          <li>
            <strong>A single-spa application</strong> — it exports{' '}
            <code>bootstrap</code>, <code>mount</code>, and <code>unmount</code>{' '}
            lifecycle hooks. The shell's single-spa orchestrator calls these
            hooks to control when this app renders and cleans up.
          </li>
        </ul>
      </div>

      <div style={{
        marginTop: '1.25rem',
        padding: '1.25rem',
        backgroundColor: '#e8f5e9',
        borderRadius: '8px',
        border: '1px solid #a5d6a7',
      }}>
        <h3 style={{ marginTop: 0 }}>⚙️ The Loading Flow</h3>
        <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>You navigated to <code>/home</code></li>
          <li>Single-Spa matched the URL to this app's <code>activeWhen: ['/home']</code></li>
          <li>Single-Spa called the <code>mf-loader</code> bridge function</li>
          <li>The bridge did <code>import('mfHome/singleSpaEntry')</code></li>
          <li>Module Federation fetched <code>remoteEntry.js</code> from port 4001</li>
          <li>Module Federation loaded the <code>singleSpaEntry</code> module</li>
          <li>Single-Spa received <code>{'{ bootstrap, mount, unmount }'}</code> lifecycle hooks</li>
          <li>Single-Spa called <code>bootstrap()</code> then <code>mount()</code></li>
          <li>This React component rendered into the DOM 🎉</li>
        </ol>
      </div>

      <div style={{
        marginTop: '1.25rem',
        padding: '1rem',
        backgroundColor: '#fff3e0',
        borderRadius: '8px',
        border: '1px solid #ffcc80',
        fontSize: '0.9rem',
        color: '#e65100',
      }}>
        <strong>💡 Interview Insight:</strong> "The Hybrid approach separates
        concerns cleanly — Module Federation handles <em>how</em> code is loaded
        (runtime imports, dependency sharing), while single-spa handles <em>when</em>
        {' '}code runs (lifecycle management, URL-based activation). The bridge
        function (mf-loader.js) is the thin adapter that connects them."
      </div>
    </section>
  );
}
