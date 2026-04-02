/**
 * =============================================================================
 * UNIT TEST EXAMPLE — Testing an Individual Micro Frontend Component
 * =============================================================================
 *
 * Framework: Jest + React Testing Library
 * Target:    A remote micro frontend component (like ProductList)
 *
 * WHY UNIT TESTS IN MICRO FRONTENDS?
 * -----------------------------------
 * Unit tests verify that a single micro frontend works correctly IN ISOLATION.
 * This is the fastest, cheapest, and most reliable layer of the testing pyramid.
 *
 * In a micro frontend architecture, each team owns their MF end-to-end —
 * including its tests. Unit tests run in that team's CI pipeline without
 * needing any other micro frontend to be running. This is the "independent
 * deployment" principle applied to testing.
 *
 * WHAT UNIT TESTS COVER:
 * - Component rendering (does it show the right content?)
 * - User interactions (does clicking a button do the right thing?)
 * - Internal state logic (does the component manage its own state correctly?)
 * - Edge cases (empty data, error states, loading states)
 *
 * WHAT UNIT TESTS DO NOT COVER:
 * - Communication between micro frontends (that's integration testing)
 * - The composed application layout (that's E2E testing)
 * - Webpack/Module Federation configuration (that's build-level testing)
 *
 * TESTING PHILOSOPHY FOR MICRO FRONTENDS:
 * ----------------------------------------
 * React Testing Library encourages testing from the USER's perspective —
 * query by text, role, label — not by implementation details like class names
 * or component internals. This is especially important in micro frontends
 * because the internal implementation can change independently (different
 * team, different release cycle) as long as the user-facing behavior stays
 * the same.
 *
 * INTERVIEW TIP:
 * "Unit tests for micro frontends should test the component in isolation,
 * without any awareness of Module Federation or the host app. If your unit
 * test needs another micro frontend running, it's an integration test, not
 * a unit test. The boundary is clear: unit tests run in one team's CI
 * pipeline with zero external dependencies."
 */

// =============================================================================
// TEST SETUP
// =============================================================================

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * ANNOTATION: Importing the component DIRECTLY, not via Module Federation.
 * -----------------------------------------------------------------------
 * In unit tests, we import the source file directly — no webpack, no
 * remoteEntry.js, no Module Federation runtime. The component is just a
 * React component, and we test it as such.
 *
 * This is a key insight: Module Federation is a DEPLOYMENT concern, not a
 * TESTING concern. Your unit tests should never know or care that the
 * component will eventually be served as a federated remote.
 *
 * If your component has dependencies that are normally shared via MF
 * (like a shared store or event bus), you'd mock those at the module level
 * or inject them via props/context.
 */
import ProductList from '../src/ProductList';

// =============================================================================
// TEST SUITE: ProductList Component
// =============================================================================

describe('ProductList — Remote Micro Frontend Component', () => {
  /**
   * TEST 1: Basic rendering
   * -----------------------
   * The most fundamental test — does the component render without crashing
   * and show the expected content?
   *
   * WHY THIS MATTERS:
   * In micro frontends, a component that crashes on render will trigger the
   * host's ErrorBoundary. A simple render test catches import errors, missing
   * dependencies, and JSX syntax issues before they reach production.
   *
   * TESTING LIBRARY APPROACH:
   * We use `screen.getByText()` to find elements by their visible text.
   * This tests what the USER sees, not what the DOM looks like internally.
   * If the team refactors the HTML structure but keeps the same visible
   * content, this test still passes — which is exactly what we want.
   */
  test('renders the product catalog heading', () => {
    render(<ProductList />);

    expect(screen.getByText(/Product Catalog/i)).toBeInTheDocument();
  });

  /**
   * TEST 2: Renders all product items
   * ----------------------------------
   * Verifies that the component displays the expected number of products.
   *
   * WHY NOT TEST EXACT PRODUCT DATA?
   * We test that products are rendered, not the exact data values. The
   * product data might come from an API in production, and hardcoding
   * expected values makes the test brittle. Instead, we verify the
   * BEHAVIOR (products are displayed) not the DATA (specific product names).
   *
   * However, for a component with static sample data (like our demo),
   * testing specific values is acceptable since the data is part of the
   * component's contract.
   */
  test('renders all sample products', () => {
    render(<ProductList />);

    // These are the products defined in the component's sample data.
    // In a real app, you'd pass products as props or mock the API call.
    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
    expect(screen.getByText('Running Shoes')).toBeInTheDocument();
    expect(screen.getByText('Coffee Maker')).toBeInTheDocument();
    expect(screen.getByText('Backpack')).toBeInTheDocument();
  });

  /**
   * TEST 3: Displays prices correctly
   * ----------------------------------
   * Verifies that prices are formatted and displayed.
   *
   * EDGE CASE AWARENESS:
   * Price formatting is a common source of bugs — locale differences,
   * floating point precision, currency symbols. Testing specific formatted
   * values catches regressions in the display logic.
   */
  test('displays product prices with correct formatting', () => {
    render(<ProductList />);

    expect(screen.getByText('$79.99')).toBeInTheDocument();
    expect(screen.getByText('$129.99')).toBeInTheDocument();
    expect(screen.getByText('$49.99')).toBeInTheDocument();
  });

  /**
   * TEST 4: Displays product categories
   * ------------------------------------
   * Verifies that category metadata is rendered for each product.
   *
   * WHY TEST CATEGORIES SEPARATELY?
   * Categories might be used for filtering, analytics, or styling. Testing
   * them separately from product names ensures the category rendering logic
   * isn't accidentally removed during a refactor.
   */
  test('displays product categories', () => {
    render(<ProductList />);

    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Sports')).toBeInTheDocument();
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(screen.getByText('Travel')).toBeInTheDocument();
  });

  /**
   * TEST 5: Component renders without props (standalone mode)
   * ---------------------------------------------------------
   * Remote components must work both inside the host AND standalone.
   * This test verifies the component doesn't crash when rendered without
   * any props — which is how it runs in standalone development mode.
   *
   * WHY THIS MATTERS FOR MICRO FRONTENDS:
   * During development, the Products team runs their remote app standalone
   * (on localhost:3001). The component must render correctly without the
   * host providing any props or context. This test validates that
   * standalone development experience.
   */
  test('renders correctly without any props (standalone mode)', () => {
    const { container } = render(<ProductList />);

    // The component should render a non-empty container
    expect(container.firstChild).not.toBeNull();
    // Should have product cards (at least one child div with product content)
    expect(container.querySelectorAll('h4').length).toBeGreaterThan(0);
  });
});

// =============================================================================
// ADDITIONAL PATTERNS: Testing Components with External Dependencies
// =============================================================================

/**
 * PATTERN: Testing a component that uses the shared event bus
 * -----------------------------------------------------------
 * If your micro frontend component dispatches events to communicate with
 * other micro frontends, you test the dispatch behavior in unit tests
 * but NOT the receiving side (that's an integration test).
 *
 * Example: A ProductList component that dispatches 'cart:item-added' when
 * the user clicks "Add to Cart".
 */

/*
describe('ProductList — Event Dispatch', () => {
  test('dispatches cart:item-added event when Add to Cart is clicked', () => {
    // ANNOTATION: We spy on window.dispatchEvent to verify the component
    // dispatches the correct event. We do NOT test whether another micro
    // frontend receives it — that's an integration concern.
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    render(<ProductList />);

    // Find and click the first "Add to Cart" button
    const addButton = screen.getAllByText(/Add to Cart/i)[0];
    fireEvent.click(addButton);

    // Verify the event was dispatched with the correct shape
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'cart:item-added',
        detail: expect.objectContaining({
          productId: expect.any(Number),
          name: expect.any(String),
          price: expect.any(Number),
        }),
      })
    );

    dispatchSpy.mockRestore();
  });
});
*/

// =============================================================================
// KEY TAKEAWAYS FOR INTERVIEW PREP
// =============================================================================
//
// 1. Unit tests for micro frontends test components IN ISOLATION — no host,
//    no other micro frontends, no Module Federation runtime.
//
// 2. Import the source file directly, not through the federated module system.
//    Module Federation is a deployment concern, not a testing concern.
//
// 3. Use React Testing Library to test from the user's perspective — query by
//    visible text and roles, not by CSS classes or component internals.
//
// 4. Test that the component works without props (standalone mode) because
//    teams develop their micro frontends independently.
//
// 5. For event-dispatching components, test that the event IS dispatched
//    (unit test) but not that another MF receives it (integration test).
//
// 6. Each team runs their own unit tests in their own CI pipeline. No
//    cross-team dependencies. This is the testing equivalent of
//    "independent deployment."
// =============================================================================
