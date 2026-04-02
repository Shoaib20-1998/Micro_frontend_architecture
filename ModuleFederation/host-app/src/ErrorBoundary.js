/**
 * ============================================================================
 * ERROR BOUNDARY — FALLBACK UI FOR FAILED REMOTE LOADS
 * ============================================================================
 *
 * In a Module Federation setup, remote components are loaded over the network
 * at runtime. Networks fail. Servers go down. Deploys break things. This
 * Error Boundary catches those failures and shows a fallback UI instead of
 * crashing the entire host application.
 *
 * WHY ERROR BOUNDARIES MATTER FOR MICRO FRONTENDS:
 *
 * Without an Error Boundary, if Remote Products is down:
 *   1. React.lazy(() => import('remoteProducts/ProductList')) rejects
 *   2. The rejected promise throws during render
 *   3. React has no error boundary to catch it
 *   4. THE ENTIRE HOST APP CRASHES — not just the products section
 *
 * With an Error Boundary wrapping each remote:
 *   1. Same failure happens
 *   2. Error Boundary catches it via componentDidCatch()
 *   3. Only the products section shows a fallback message
 *   4. The rest of the host app (including Cart) keeps working
 *
 * This is the "blast radius" concept — Error Boundaries limit the blast
 * radius of a failure to just the affected micro frontend.
 *
 * IMPORTANT: Error Boundaries MUST be class components. React does not
 * (as of React 18) support error boundaries as function components.
 * There's no hooks equivalent of componentDidCatch / getDerivedStateFromError.
 *
 * INTERVIEW TIP:
 * "In a Module Federation architecture, each remote import should be wrapped
 * in its own Error Boundary. This ensures that one remote's failure doesn't
 * take down the entire host application — it's about controlling the blast
 * radius of failures."
 */

import React from 'react';

/**
 * ErrorBoundary — A reusable component for catching render-time errors.
 *
 * Props:
 *   - fallback (ReactNode, optional): Custom UI to show when an error occurs.
 *       If omitted, a default fallback with a retry button is rendered.
 *   - onError (function, optional): Callback invoked with (error, errorInfo)
 *       when an error is caught. Useful for plugging in external logging.
 *   - name (string, optional): A label for this boundary, used in log messages
 *       so you can tell which remote failed in a multi-remote setup.
 *
 * REUSABILITY NOTE:
 * This component is intentionally generic. It doesn't know anything about
 * Module Federation or remotes — it just catches errors and shows fallback UI.
 * That makes it reusable across any part of the app, not just remote imports.
 * The micro-frontend-specific context comes from the annotations in App.js
 * where we actually use it.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };

    /**
     * Bind the retry handler in the constructor.
     * When the user clicks "Retry", we clear the error state, which causes
     * React to re-render the children. If the children include a React.lazy()
     * import, React will re-attempt the dynamic import() call.
     *
     * WHY THIS WORKS:
     * React.lazy() caches successful imports but does NOT cache failures.
     * So when we reset the error boundary and React re-renders the lazy
     * component, it fires a fresh import() request to the remote. If the
     * remote has come back online, the component loads successfully.
     *
     * INTERVIEW TIP:
     * "React.lazy doesn't cache failed imports, so resetting an Error
     * Boundary effectively retries the remote load. This is a simple but
     * effective resilience pattern for Module Federation — no extra retry
     * libraries needed."
     */
    this.handleRetry = this.handleRetry.bind(this);
  }

  /**
   * getDerivedStateFromError — called during the "render" phase.
   * Updates state so the next render shows the fallback UI.
   *
   * This is a static method — it doesn't have access to `this`.
   * It receives the error that was thrown and returns a state update.
   *
   * WHY STATIC?
   * React calls this during rendering, before the component instance is
   * fully available. Making it static ensures no side effects happen during
   * the render phase — side effects belong in componentDidCatch.
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /**
   * componentDidCatch — called during the "commit" phase.
   * Use this for side effects like logging the error to a monitoring service.
   *
   * In production, you'd send this to Sentry, DataDog, etc.
   * For this learning example, we log to console and call the optional
   * onError prop if provided.
   *
   * The `errorInfo` parameter contains the component stack trace,
   * which is invaluable for debugging which component in which remote failed.
   *
   * MICRO FRONTEND LOGGING TIP:
   * In a real micro frontend setup, you'd want to include metadata about
   * WHICH remote failed (name, URL, version) in your error reports. The
   * `name` prop on this ErrorBoundary helps with that.
   */
  componentDidCatch(error, errorInfo) {
    const boundaryName = this.props.name || 'unknown';
    console.error(
      `[ErrorBoundary:${boundaryName}] A remote micro frontend failed to load:`,
      error,
      errorInfo
    );

    // Call the optional onError callback for external logging integrations
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * handleRetry — Resets the error state so React re-renders the children.
   *
   * This is the key to the retry pattern:
   *   1. User clicks "Try Again"
   *   2. We set hasError back to false
   *   3. React re-renders this component's children
   *   4. The React.lazy() child fires a new import() request
   *   5. If the remote is back online, the component loads successfully
   *   6. If it's still down, the error boundary catches the failure again
   *
   * This creates a simple retry loop without any external retry logic.
   */
  handleRetry() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      /**
       * FALLBACK RENDERING STRATEGY:
       *
       * We support two modes:
       *   1. Custom fallback via props — the parent decides what to show.
       *      This is useful when different remotes need different fallback UIs.
       *   2. Default fallback — a generic "unavailable" message with a retry
       *      button. Good enough for most cases.
       *
       * The custom fallback can be a React element OR a render function.
       * If it's a function, we pass the error and retry handler so the
       * custom fallback can display error details or offer retry.
       */
      if (this.props.fallback) {
        // If fallback is a function, call it with error info and retry handler
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback({
            error: this.state.error,
            retry: this.handleRetry,
          });
        }
        return this.props.fallback;
      }

      /**
       * DEFAULT FALLBACK UI
       * -------------------
       * Shows a user-friendly message and a retry button.
       * The message avoids technical jargon — end users don't care about
       * "Module Federation" or "remoteEntry.js". They just need to know
       * something didn't load and they can try again.
       */
      return (
        <div style={{
          padding: '20px',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          backgroundColor: '#fafafa',
          textAlign: 'center',
        }}>
          <h3>⚠️ This section is temporarily unavailable</h3>
          <p>The remote micro frontend failed to load. This could be because:</p>
          <ul style={{ textAlign: 'left', display: 'inline-block' }}>
            <li>The remote server is down or unreachable</li>
            <li>A new deployment introduced a breaking change</li>
            <li>Network connectivity issues</li>
          </ul>
          <p>The rest of the application continues to work normally.</p>
          {/**
           * RETRY BUTTON
           * ------------
           * Clicking this resets the error boundary, which causes React to
           * re-attempt rendering the children (and thus re-attempt the
           * dynamic import). This is a simple resilience pattern that works
           * because React.lazy() does NOT cache failed imports.
           *
           * In production, you might add:
           *   - Exponential backoff (don't hammer a failing server)
           *   - A retry counter (give up after N attempts)
           *   - A "last attempted" timestamp
           * But for learning purposes, a simple retry is enough to
           * demonstrate the pattern.
           */}
          <button
            onClick={this.handleRetry}
            style={{
              marginTop: '10px',
              padding: '8px 20px',
              fontSize: '14px',
              cursor: 'pointer',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            🔄 Try Again
          </button>
        </div>
      );
    }

    /**
     * NO ERROR — render children normally.
     * The children are typically a <Suspense> wrapping a React.lazy() component.
     */
    return this.props.children;
  }
}

export default ErrorBoundary;
