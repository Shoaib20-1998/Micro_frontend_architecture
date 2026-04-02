/**
 * ============================================================================
 * APP.JS — HYBRID SETTINGS MICRO FRONTEND (React Component)
 * ============================================================================
 *
 * CODE ANNOTATION: The SECOND hybrid micro frontend — proving the pattern scales
 * ---------------------------------------------------------------------------------
 * This is the main React component for the Settings micro frontend. It renders
 * the Settings page UI — the actual content the user sees.
 *
 * WHY THIS SECOND MF MATTERS FOR LEARNING:
 *
 * The mf-home micro frontend introduced the Hybrid pattern. This mf-settings
 * micro frontend PROVES that the pattern is repeatable and scalable. Notice:
 *
 *   - The file structure is IDENTICAL to mf-home (same 7 files)
 *   - The webpack config is IDENTICAL except for name and port
 *   - The single-spa-entry.js is IDENTICAL except for error boundary text
 *   - The bootstrap.js and index.js are IDENTICAL (pure boilerplate)
 *   - Only THIS FILE (App.js) has genuinely different content
 *
 * This means adding a new micro frontend to the Hybrid architecture is:
 *   1. Copy the template (mf-home or mf-settings)
 *   2. Change name + port in webpack.config.js
 *   3. Write your actual UI in App.js
 *   4. Register in the shell (one line in webpack remotes + one registerApplication)
 *
 * That's it. The architecture doesn't get more complex as you add more MFs.
 * The 10th micro frontend is as easy to add as the 2nd.
 *
 * COMPARE TO mf-home/src/App.js:
 * mf-home's App.js explains the dual nature and loading flow in detail.
 * This App.js focuses on the SCALABILITY story — how the pattern repeats.
 * Both components are used in the same two contexts (standalone + integrated).
 *
 * ============================================================================
 */

import React from 'react';

/**
 * CODE ANNOTATION: Same props interface as mf-home
 * ---------------------------------------------------
 * When rendered via single-spa (integrated mode), this component receives
 * single-spa props: name, singleSpa, mountParcel, and any customProps.
 * When rendered standalone (bootstrap.js), it receives no special props.
 *
 * The props interface is part of the repeatable pattern — every hybrid MF's
 * App component receives the same single-spa props shape.
 */
export default function App(props) {
  return (
    <section style={{ padding: '2rem' }}>
      <h1>⚙️ Settings Micro Frontend (Hybrid)</h1>
      <p>
        This is the <strong>Settings</strong> micro frontend — the <em>second</em>{' '}
        hybrid micro frontend in this architecture. It proves that the Hybrid
        pattern is a <strong>repeatable recipe</strong>, not a one-off trick.
      </p>

      {/*
        CODE ANNOTATION: Settings-themed content
        ------------------------------------------
        In a real application, this would contain actual settings UI: user
        preferences, notification toggles, theme selection, etc. For this
        learning project, we render educational content about scalability.
      */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1.25rem',
        backgroundColor: '#f3e5f5',
        borderRadius: '8px',
        border: '1px solid #ce93d8',
      }}>
        <h3 style={{ marginTop: 0 }}>📐 The Repeatable Recipe</h3>
        <p style={{ marginBottom: '0.75rem' }}>
          Adding this second micro frontend required exactly these steps:
        </p>
        <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>
            <strong>Copy mf-home's file structure</strong> — same 7 files,
            same directory layout. The structure IS the pattern.
          </li>
          <li>
            <strong>Change 2 values in webpack.config.js</strong> —{' '}
            <code>name: 'mfSettings'</code> and <code>port: 4002</code>.
            Everything else (exposes key, shared config, babel setup) stays identical.
          </li>
          <li>
            <strong>Write the actual UI</strong> — this App.js is the only file
            with genuinely unique content. The rest is boilerplate.
          </li>
          <li>
            <strong>Register in the shell</strong> — add one line to the shell's
            webpack <code>remotes</code> config and one{' '}
            <code>registerApplication()</code> call. The <code>mf-loader</code>{' '}
            bridge is generic — it works with any hybrid MF.
          </li>
        </ol>
      </div>

      <div style={{
        marginTop: '1.25rem',
        padding: '1.25rem',
        backgroundColor: '#e8eaf6',
        borderRadius: '8px',
        border: '1px solid #9fa8da',
      }}>
        <h3 style={{ marginTop: 0 }}>🔀 Same Dual Nature as mf-home</h3>
        <p style={{ marginBottom: '0.75rem' }}>
          This micro frontend has the exact same dual nature:
        </p>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>
            <strong>Module Federation remote</strong> — code loaded at runtime
            via <code>remoteEntry.js</code> on port 4002. The shell fetches it
            dynamically, just like it fetches mf-home from port 4001.
          </li>
          <li>
            <strong>Single-spa application</strong> — exports{' '}
            <code>bootstrap</code>, <code>mount</code>, <code>unmount</code>{' '}
            lifecycle hooks. Single-spa calls these when you navigate to{' '}
            <code>/settings</code>.
          </li>
        </ul>
        <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#3949ab' }}>
          The loading flow is identical to mf-home's — just replace "mfHome" with
          "mfSettings" and "port 4001" with "port 4002" in every step.
        </p>
      </div>

      {/* Settings-themed mock UI to make this feel like a real settings page */}
      <div style={{
        marginTop: '1.25rem',
        padding: '1.25rem',
        backgroundColor: '#fafafa',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
      }}>
        <h3 style={{ marginTop: 0 }}>🎛️ Sample Settings (Mock UI)</h3>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
          In a real app, these would be functional controls. Here they demonstrate
          that this MF renders real UI content, not just documentation.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" defaultChecked /> Enable notifications
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" /> Dark mode
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" defaultChecked /> Auto-save preferences
          </label>
        </div>
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
        <strong>💡 Interview Insight:</strong> "The Hybrid pattern scales linearly.
        Adding the Nth micro frontend is the same effort as adding the 2nd — copy
        the template, change the name and port, write your UI, register in the shell.
        The mf-loader bridge, shared dependency config, and lifecycle management are
        all generic. Teams can work independently on their MFs without coordinating
        webpack configs or shared dependency versions."
      </div>
    </section>
  );
}
