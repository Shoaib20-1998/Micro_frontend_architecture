/**
 * =============================================================================
 * E2E TEST EXAMPLE — Testing the Composed Micro Frontend Application
 * =============================================================================
 *
 * Framework: Cypress
 * Target:    The fully composed application (host + all remotes running)
 *
 * WHY E2E TESTS IN MICRO FRONTENDS?
 * -----------------------------------
 * Unit tests verify individual MFs. Integration tests verify communication
 * contracts. But neither answers the question: "Does the whole thing actually
 * work when assembled in a real browser?"
 *
 * E2E tests are the only layer that catches:
 * - Module Federation loading failures (remoteEntry.js not found, CORS issues)
 * - CSS conflicts between independently built micro frontends
 * - Routing conflicts between the shell and micro frontend routers
 * - Shared dependency version mismatches at runtime
 * - Layout/composition issues (overlapping MFs, broken grid)
 *
 * THE COST OF E2E TESTS:
 * ----------------------
 * E2E tests are the most expensive layer of the testing pyramid:
 *   - SLOW: Need all services running (host + every remote)
 *   - FLAKY: Network timing, server startup order, browser quirks
 *   - EXPENSIVE: Require real browser environments in CI
 *   - HARD TO DEBUG: Failures could be in any layer (network, webpack, React)
 *
 * Because of this cost, E2E tests should be:
 *   - FEW in number (test critical user journeys, not every edge case)
 *   - STABLE (use data-testid attributes, avoid timing-dependent assertions)
 *   - RUN LESS OFTEN (nightly or pre-release, not on every commit)
 *
 * MICRO FRONTEND E2E CHALLENGES:
 * ------------------------------
 * 1. STARTUP ORCHESTRATION: You need to start the host AND all remotes before
 *    tests run. In CI, this means a docker-compose or a script that starts
 *    all dev servers and waits for them to be healthy.
 *
 * 2. INDEPENDENT DEPLOYMENTS: If Team A deploys a new version of their remote
 *    while E2E tests are running against the old version, tests may fail
 *    intermittently. Solution: pin versions in E2E test environments.
 *
 * 3. TEST DATA: Each MF might have its own data source. E2E tests need a
 *    consistent data setup across all MFs. Solution: shared test fixtures
 *    or a test data API.
 *
 * INTERVIEW TIP:
 * "E2E tests for micro frontends are essential but expensive. I'd keep them
 * focused on critical user journeys — login, checkout, navigation between
 * MFs. The biggest challenge is environment orchestration: you need all
 * micro frontends running simultaneously, which means your CI pipeline
 * needs to handle multi-service startup. I'd use docker-compose for
 * consistency and run E2E tests nightly rather than on every commit."
 */

// =============================================================================
// CYPRESS E2E TEST SUITE
// =============================================================================

/**
 * ANNOTATION: Cypress test structure
 * -----------------------------------
 * Cypress uses Mocha-style describe/it blocks. The key difference from Jest:
 * - Cypress commands are ASYNCHRONOUS but CHAINABLE (no async/await)
 * - cy.visit(), cy.get(), cy.contains() are queued and retried automatically
 * - Assertions use .should() which retries until the assertion passes or
 *   times out (default 4 seconds)
 *
 * This retry behavior is crucial for micro frontend E2E tests because
 * remote components load asynchronously via Module Federation. A component
 * might not be in the DOM immediately after page load — Cypress's built-in
 * retry handles this gracefully.
 */

describe('Module Federation Composed Application', () => {
  /**
   * ANNOTATION: beforeEach vs before
   * ---------------------------------
   * We use beforeEach to visit the page before every test. This ensures
   * each test starts with a clean page state. In micro frontends, leftover
   * state from a previous test (mounted MFs, event listeners, shared store
   * data) can cause flaky failures.
   *
   * The host app runs on port 3000 in our Module Federation setup.
   * Remotes run on 3001 (Products) and 3002 (Cart).
   * All three must be running before these tests execute.
   */
  beforeEach(() => {
    /**
     * ANNOTATION: cy.visit() and base URL
     * ------------------------------------
     * In a real CI setup, you'd configure the baseUrl in cypress.config.js:
     *   e2e: { baseUrl: 'http://localhost:3000' }
     *
     * Then cy.visit('/') is enough. We use the full URL here for clarity.
     *
     * TIMEOUT CONSIDERATION:
     * The first visit is the slowest because:
     * 1. The host app loads its own bundle
     * 2. Module Federation fetches remoteEntry.js from each remote
     * 3. Shared dependencies are negotiated
     * 4. Remote components are loaded and rendered
     *
     * You may need to increase the default timeout for the first visit:
     *   cy.visit('/', { timeout: 15000 })
     */
    cy.visit('http://localhost:3000');
  });

  // ===========================================================================
  // TEST GROUP 1: Host Application Loads Successfully
  // ===========================================================================

  describe('Host Application Shell', () => {
    /**
     * TEST 1: Host app renders its own content
     * -----------------------------------------
     * The most basic E2E test — does the host app load and render?
     * This catches webpack build failures, HTML template issues, and
     * bootstrap.js async boundary problems.
     */
    it('should display the host app header', () => {
      cy.contains('Module Federation Host App').should('be.visible');
    });

    /**
     * TEST 2: Host app shows section headings for each remote
     * --------------------------------------------------------
     * The host defines sections for each remote component. These headings
     * are part of the HOST's code, not the remotes. If they're missing,
     * the host's App.js has a problem.
     */
    it('should display section headings for Products and Cart', () => {
      cy.contains('Products').should('be.visible');
      cy.contains('Cart').should('be.visible');
    });
  });

  // ===========================================================================
  // TEST GROUP 2: Remote Components Load via Module Federation
  // ===========================================================================

  describe('Remote Component Loading', () => {
    /**
     * TEST 3: Products remote loads and renders
     * ------------------------------------------
     * This is the critical E2E test for Module Federation. It verifies:
     * 1. The host can reach the Products remote (network)
     * 2. remoteEntry.js loads successfully (Module Federation runtime)
     * 3. The ProductList component renders (React)
     *
     * If this test fails, check:
     * - Is remote-products running on port 3001?
     * - Does the webpack config expose './ProductList'?
     * - Are shared dependencies (React) compatible?
     *
     * ANNOTATION: cy.contains() with timeout
     * ----------------------------------------
     * Remote components load asynchronously. The default Cypress timeout
     * (4s) might not be enough if the remote is slow to respond. We use
     * a custom timeout to account for Module Federation's loading sequence:
     *   fetch remoteEntry.js → negotiate shared deps → load component
     */
    it('should load and display the ProductList from remote-products', () => {
      cy.contains('Product Catalog', { timeout: 10000 }).should('be.visible');

      // Verify actual product data rendered (not just the heading)
      cy.contains('Wireless Headphones').should('be.visible');
      cy.contains('$79.99').should('be.visible');
    });

    /**
     * TEST 4: Cart remote loads and renders
     * --------------------------------------
     * Same pattern as Products — verify the second remote loads independently.
     * Both remotes loading proves that the host can consume multiple
     * federated modules simultaneously.
     */
    it('should load and display the Cart from remote-cart', () => {
      cy.contains('Shopping Cart', { timeout: 10000 }).should('be.visible');
    });

    /**
     * TEST 5: Both remotes coexist on the same page
     * -----------------------------------------------
     * This test verifies that both remotes render simultaneously without
     * interfering with each other. Common issues this catches:
     * - CSS class name collisions between remotes
     * - Global variable conflicts
     * - Shared dependency version mismatches causing one remote to crash
     */
    it('should display both remote components simultaneously', () => {
      cy.contains('Product Catalog', { timeout: 10000 }).should('be.visible');
      cy.contains('Shopping Cart', { timeout: 10000 }).should('be.visible');

      /**
       * ANNOTATION: Verifying no error boundaries triggered
       * ----------------------------------------------------
       * If a remote fails to load, the ErrorBoundary shows a fallback.
       * We check that the fallback text is NOT present, which means both
       * remotes loaded successfully.
       *
       * This is a "negative assertion" — we're testing that something
       * DIDN'T happen. Use .should('not.exist') rather than
       * .should('not.be.visible') because the element shouldn't be in
       * the DOM at all, not just hidden.
       */
      cy.contains('temporarily unavailable').should('not.exist');
    });
  });

  // ===========================================================================
  // TEST GROUP 3: Error Boundary Fallback (Remote Unavailable)
  // ===========================================================================

  describe('Error Boundary Behavior', () => {
    /**
     * TEST 6: Fallback UI when a remote is down
     * -------------------------------------------
     * This test requires the Products remote to be STOPPED before running.
     * In CI, you'd have a separate test suite or a setup step that kills
     * the remote server.
     *
     * ANNOTATION: Testing failure scenarios in E2E
     * ----------------------------------------------
     * Testing "remote is down" in E2E is tricky because you need to
     * control the remote server's availability. Approaches:
     *
     * 1. STOP THE SERVER: Kill the remote process before this test.
     *    Pro: Tests real failure. Con: Affects other tests.
     *
     * 2. NETWORK INTERCEPTION: Use cy.intercept() to block remoteEntry.js.
     *    Pro: No server changes. Con: Doesn't test real network failure.
     *
     * 3. WRONG PORT: Point the host to a non-existent port.
     *    Pro: Deterministic. Con: Requires config change.
     *
     * We demonstrate approach 2 (network interception) because it's the
     * most practical for CI pipelines.
     */
    it('should show fallback UI when Products remote is unreachable', () => {
      /**
       * cy.intercept() — Cypress's network interception layer.
       * We intercept the request for the Products remote's remoteEntry.js
       * and force it to fail. This simulates the remote being down without
       * actually stopping the server.
       *
       * WHY INTERCEPT remoteEntry.js?
       * This is the first file Module Federation fetches from a remote.
       * If it fails, the entire remote is unavailable. The host's
       * ErrorBoundary should catch the resulting import() rejection
       * and show the fallback UI.
       */
      cy.intercept('GET', '**/remoteEntry.js', {
        statusCode: 500,
        body: 'Server Error',
      }).as('remoteEntryFail');

      // Reload the page so the intercept takes effect
      cy.visit('http://localhost:3000');

      // The ErrorBoundary should render the fallback UI
      cy.contains('unavailable', { timeout: 10000 }).should('be.visible');

      /**
       * ANNOTATION: Retry button test
       * ------------------------------
       * After the fallback is shown, the user should be able to retry.
       * We remove the intercept (simulating the remote coming back online)
       * and click the retry button.
       *
       * Note: This test is inherently flaky because it depends on timing.
       * In a real CI pipeline, you'd either skip the retry test or use
       * a more deterministic approach (like a test flag that controls
       * whether the remote responds).
       */
    });
  });

  // ===========================================================================
  // TEST GROUP 4: Cross-Micro-Frontend User Journey
  // ===========================================================================

  describe('Cross-MF User Journey', () => {
    /**
     * TEST 7: User browses products and interacts with cart
     * ------------------------------------------------------
     * This is a "critical user journey" test — the kind of E2E test that
     * provides the most value. It simulates a real user flow that crosses
     * micro frontend boundaries.
     *
     * WHY JOURNEY TESTS OVER GRANULAR TESTS:
     * Instead of testing every button and every state change, we test the
     * complete user flow. This catches integration issues (event bus
     * misconfiguration, state sync problems) while keeping the test count
     * low. One journey test replaces dozens of granular E2E tests.
     *
     * INTERVIEW TIP:
     * "For E2E tests in micro frontends, I focus on critical user journeys
     * that cross MF boundaries — like 'browse products → add to cart →
     * checkout'. These journeys exercise the communication layer between
     * MFs and catch integration issues that unit and integration tests miss.
     * I keep the number of E2E tests small and run them nightly."
     */
    it('should allow browsing products and viewing cart', () => {
      // Step 1: Verify products are visible (Products MF loaded)
      cy.contains('Product Catalog', { timeout: 10000 }).should('be.visible');
      cy.contains('Wireless Headphones').should('be.visible');

      // Step 2: Verify cart section is visible (Cart MF loaded)
      cy.contains('Shopping Cart', { timeout: 10000 }).should('be.visible');

      /**
       * ANNOTATION: What we're NOT testing here
       * -----------------------------------------
       * We're not testing the "add to cart" flow because our demo
       * components don't implement it. In a real app, this test would:
       *
       *   1. Click "Add to Cart" on a product (Products MF)
       *   2. Verify the cart updates (Cart MF)
       *   3. This crosses the MF boundary via event bus or shared store
       *
       * The test would look like:
       *   cy.get('[data-testid="add-to-cart-1"]').click();
       *   cy.get('[data-testid="cart-count"]').should('contain', '1');
       *
       * Note the use of data-testid attributes — these are stable selectors
       * that don't break when CSS classes or text content changes. Both
       * teams (Products and Cart) agree on these test IDs as part of their
       * integration contract.
       */
    });
  });
});

// =============================================================================
// BONUS: Cypress Configuration for Micro Frontend E2E
// =============================================================================

/**
 * ANNOTATION: cypress.config.js example for micro frontend projects
 * ------------------------------------------------------------------
 * This configuration handles the unique challenges of E2E testing
 * micro frontends: longer timeouts, multi-server setup, and
 * network interception.
 *
 * // cypress.config.js
 * const { defineConfig } = require('cypress');
 *
 * module.exports = defineConfig({
 *   e2e: {
 *     // The host app URL — this is the entry point for all E2E tests
 *     baseUrl: 'http://localhost:3000',
 *
 *     // Longer default timeout because Module Federation adds loading time:
 *     // host bundle → remoteEntry.js → shared dep negotiation → component
 *     defaultCommandTimeout: 10000,
 *
 *     // Page load timeout — first load is slowest due to MF initialization
 *     pageLoadTimeout: 30000,
 *
 *     // Retry failed tests — MF E2E tests can be flaky due to network timing
 *     retries: {
 *       runMode: 2,    // Retry twice in CI (cypress run)
 *       openMode: 0,   // No retries in interactive mode (cypress open)
 *     },
 *
 *     // Video recording — useful for debugging flaky MF tests
 *     video: true,
 *
 *     // Screenshot on failure — captures the state of all loaded MFs
 *     screenshotOnRunFailure: true,
 *   },
 * });
 *
 * CI PIPELINE SETUP:
 * ------------------
 * In CI, you need all services running before Cypress starts. Example:
 *
 * # docker-compose.test.yml
 * services:
 *   host-app:
 *     build: ./ModuleFederation/host-app
 *     ports: ["3000:3000"]
 *   remote-products:
 *     build: ./ModuleFederation/remote-products
 *     ports: ["3001:3001"]
 *   remote-cart:
 *     build: ./ModuleFederation/remote-cart
 *     ports: ["3002:3002"]
 *   cypress:
 *     image: cypress/included:latest
 *     depends_on: [host-app, remote-products, remote-cart]
 *     environment:
 *       - CYPRESS_baseUrl=http://host-app:3000
 *
 * Or use `wait-on` to wait for all servers before running Cypress:
 *   npx wait-on http://localhost:3000 http://localhost:3001 http://localhost:3002
 *   npx cypress run
 */

// =============================================================================
// KEY TAKEAWAYS FOR INTERVIEW PREP
// =============================================================================
//
// 1. E2E tests for micro frontends require ALL services running — host and
//    every remote. This is the biggest operational challenge.
//
// 2. Use longer timeouts than normal SPAs because Module Federation adds
//    loading steps: fetch remoteEntry.js → negotiate shared deps → load module.
//
// 3. Test CRITICAL USER JOURNEYS that cross MF boundaries, not every feature.
//    Keep E2E test count low — they're expensive to run and maintain.
//
// 4. Use cy.intercept() to simulate remote failures without stopping servers.
//    This tests ErrorBoundary fallback behavior deterministically.
//
// 5. Use data-testid attributes as stable selectors. Both the publishing and
//    consuming teams should agree on test IDs as part of their contract.
//
// 6. Run E2E tests NIGHTLY or PRE-RELEASE, not on every commit. They're too
//    slow and flaky for the fast feedback loop of CI.
//
// 7. In CI, use docker-compose or wait-on scripts to orchestrate multi-service
//    startup. The startup order matters: remotes must be ready before the host
//    tries to fetch their remoteEntry.js.
// =============================================================================
