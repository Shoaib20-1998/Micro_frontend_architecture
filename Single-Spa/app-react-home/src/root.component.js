/**
 * =============================================================================
 * ROOT COMPONENT — Home Micro Frontend
 * =============================================================================
 *
 * CODE ANNOTATION: What is a "root component" in single-spa?
 * -----------------------------------------------------------
 * In single-spa, each micro frontend has a root component — the top-level
 * React component that gets mounted into the DOM when the app activates.
 * Think of it as the `<App />` component in a normal React app, but with
 * one key difference: it doesn't own the HTML page or the `<div id="root">`.
 * The shell (root-config) owns the page and provides a container element.
 *
 * This component receives `props` from single-spa, which include:
 *   - Any `customProps` passed during registerApplication() in the root-config
 *   - Built-in single-spa props like `name`, `mountParcel`, `singleSpa`
 *
 * CODE ANNOTATION: Why keep this component simple?
 * --------------------------------------------------
 * In a real production app, this root component would set up providers
 * (React Router, Redux, Theme, etc.) and render the app's route tree.
 * For this learning example, we keep it minimal to focus on the micro
 * frontend architecture — how the component gets loaded, mounted, and
 * unmounted by single-spa — rather than the React internals.
 *
 * =============================================================================
 */

import React from 'react';

/**
 * CODE ANNOTATION: The root component receives single-spa props
 * ---------------------------------------------------------------
 * When single-spa calls mount(), it passes props to the React component.
 * These props include everything from `customProps` in registerApplication()
 * plus single-spa internals. Destructuring `name` here shows that the
 * micro frontend knows its own identity — useful for logging, analytics,
 * or conditional behavior.
 */
export default function Root(props) {
  return (
    <section style={{ padding: '2rem' }}>
      <h1>🏠 Home Micro Frontend</h1>
      <p>
        This is the <strong>Home</strong> micro frontend, loaded and managed by
        single-spa. It was dynamically imported via SystemJS when you navigated
        to <code>/home</code>.
      </p>

      {/*
        CODE ANNOTATION: Demonstrating lifecycle awareness
        ---------------------------------------------------
        This section helps the learner verify that the micro frontend is
        actually being mounted/unmounted by single-spa. When you navigate
        away from /home and back, React re-renders this component fresh
        (because single-spa unmounts and re-mounts the entire app).
      */}
      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        backgroundColor: '#e8f5e9',
        borderRadius: '8px',
        border: '1px solid #a5d6a7',
      }}>
        <h3>How this works:</h3>
        <ol>
          <li>The root-config registered this app with <code>activeWhen: ['/home']</code></li>
          <li>When you navigated to <code>/home</code>, single-spa called <code>bootstrap()</code> then <code>mount()</code></li>
          <li>The <code>mount()</code> hook used <code>ReactDOM.render()</code> to render this component</li>
          <li>When you navigate away, single-spa will call <code>unmount()</code> to clean up</li>
        </ol>
      </div>
    </section>
  );
}
