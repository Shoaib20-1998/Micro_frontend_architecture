/**
 * =============================================================================
 * ROOT COMPONENT — Dashboard Micro Frontend
 * =============================================================================
 *
 * CODE ANNOTATION: The second micro frontend — proving orchestration works
 * -------------------------------------------------------------------------
 * This component exists to demonstrate that single-spa can manage MULTIPLE
 * independent React applications on the same page. The home app and this
 * dashboard app are completely separate codebases with separate builds,
 * separate dependencies, and separate dev servers. Yet they seamlessly
 * share the same HTML page and DOM container, orchestrated by single-spa.
 *
 * What having TWO micro frontends proves:
 *
 *   1. ROUTING WORKS: Navigate to /home → see the home app. Navigate to
 *      /dashboard → see this dashboard app. Single-spa handles the switch.
 *
 *   2. LIFECYCLE ISOLATION: Each app has its own bootstrap/mount/unmount
 *      cycle. Mounting the dashboard doesn't affect the home app's state.
 *
 *   3. DOM CLEANUP: When you navigate from /home to /dashboard, the home
 *      app's DOM is completely removed before the dashboard renders. No
 *      leftover elements, no style conflicts, no event listener leaks.
 *
 *   4. INDEPENDENT DEPLOYMENT: In production, you could update and deploy
 *      this dashboard app without touching the home app or the shell.
 *      The import map just points to the new version's URL.
 *
 * CODE ANNOTATION: Same component pattern, different content
 * ------------------------------------------------------------
 * Notice this component follows the exact same pattern as app-react-home's
 * root.component.js: a simple functional component that receives single-spa
 * props. The framework integration (lifecycle hooks, SystemJS loading, DOM
 * mounting) is handled entirely by app-name.js and single-spa-react. This
 * component is just plain React — it doesn't need to know it's running
 * inside a micro frontend architecture.
 *
 * =============================================================================
 */

import React from 'react';

/**
 * CODE ANNOTATION: Dashboard UI — visually distinct from the Home app
 * ---------------------------------------------------------------------
 * We use different colors and content so you can clearly see the transition
 * when navigating between /home and /dashboard. Watch the DOM: when you
 * switch routes, the entire content of #micro-frontend-container changes
 * because single-spa unmounts one app and mounts the other.
 */
export default function Root(props) {
  return (
    <section style={{ padding: '2rem' }}>
      <h1>📊 Dashboard Micro Frontend</h1>
      <p>
        This is the <strong>Dashboard</strong> micro frontend, the second app
        orchestrated by single-spa. It was dynamically imported via SystemJS
        when you navigated to <code>/dashboard</code>.
      </p>

      {/*
        CODE ANNOTATION: Multi-app orchestration explained visually
        -------------------------------------------------------------
        This section helps the learner understand what's happening behind
        the scenes when they navigate between the home and dashboard apps.
        The key insight is that single-spa is managing TWO independent
        React applications, mounting and unmounting them based on the URL.
      */}
      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        backgroundColor: '#e3f2fd',
        borderRadius: '8px',
        border: '1px solid #90caf9',
      }}>
        <h3>Multi-App Orchestration in Action:</h3>
        <ol>
          <li>
            The root-config registered <strong>two</strong> apps:
            <code> app-react-home</code> (on <code>/home</code>) and
            <code> app-react-dashboard</code> (on <code>/dashboard</code>)
          </li>
          <li>
            Single-spa evaluates <strong>both</strong> apps' <code>activeWhen</code> conditions
            on every URL change
          </li>
          <li>
            When you navigated to <code>/dashboard</code>, single-spa unmounted the
            previous app (if any) and mounted this one
          </li>
          <li>
            Both apps share the same DOM container — single-spa ensures only one
            occupies it at a time
          </li>
        </ol>
      </div>

      {/*
        CODE ANNOTATION: Dashboard-specific content
        ----------------------------------------------
        In a real app, this would contain actual dashboard widgets, charts,
        and data. For learning purposes, we show sample metrics to make the
        dashboard feel distinct from the home page.
      */}
      <div style={{
        marginTop: '1rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
      }}>
        <div style={{
          padding: '1rem',
          backgroundColor: '#fff3e0',
          borderRadius: '8px',
          border: '1px solid #ffcc80',
          textAlign: 'center',
        }}>
          <h4>📈 Active Users</h4>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0' }}>1,247</p>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Sample metric</p>
        </div>
        <div style={{
          padding: '1rem',
          backgroundColor: '#f3e5f5',
          borderRadius: '8px',
          border: '1px solid #ce93d8',
          textAlign: 'center',
        }}>
          <h4>⚡ Response Time</h4>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0' }}>42ms</p>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Sample metric</p>
        </div>
        <div style={{
          padding: '1rem',
          backgroundColor: '#e8f5e9',
          borderRadius: '8px',
          border: '1px solid #a5d6a7',
          textAlign: 'center',
        }}>
          <h4>✅ Uptime</h4>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0' }}>99.9%</p>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Sample metric</p>
        </div>
      </div>

      {/*
        CODE ANNOTATION: Try it — navigate between apps
        --------------------------------------------------
        This prompt encourages the learner to actually test the orchestration
        by navigating back and forth. Each navigation triggers the full
        lifecycle cycle: unmount the current app → mount the new app.
        Open the browser DevTools console to see single-spa's lifecycle
        events in action.
      */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        backgroundColor: '#fce4ec',
        borderRadius: '8px',
        border: '1px solid #ef9a9a',
      }}>
        <h3>🔬 Try It Yourself:</h3>
        <p>
          Navigate to <code>/home</code> and back to <code>/dashboard</code>.
          Watch the DOM in DevTools — you'll see the entire content of the
          container element swap out. That's single-spa unmounting one app
          and mounting the other. No page reload, no iframe — just clean
          lifecycle management.
        </p>
      </div>
    </section>
  );
}
