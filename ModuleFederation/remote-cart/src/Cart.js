/**
 * ============================================================================
 * CART — THE EXPOSED REMOTE COMPONENT
 * ============================================================================
 *
 * This is the component that the host app imports at runtime via:
 *   import('remoteCart/Cart')
 *
 * Just like remote-products' ProductList, this is a plain React component.
 * Nothing in the code makes it "remote" — that's entirely a webpack config
 * concern. The component doesn't know or care whether it's running standalone
 * or inside the host.
 *
 * WHY THIS SECOND REMOTE COMPONENT MATTERS FOR LEARNING:
 *
 * With two remotes, you can observe the full multi-remote pattern:
 *
 *   1. INDEPENDENT LOADING: The host loads ProductList and Cart from
 *      different servers (ports 3001 and 3002). Each remote's remoteEntry.js
 *      is fetched separately. If one remote is down, the other still works.
 *
 *   2. SHARED DEPENDENCY EFFICIENCY: Both remotes share the host's React
 *      instance. Open the Network tab — you'll see React loaded ONCE by
 *      the host, then reused by both remotes via the shared scope.
 *
 *   3. INDEPENDENT FAILURE: If you stop the Cart remote (kill port 3002),
 *      the host's ErrorBoundary catches the failure and shows a fallback.
 *      The Products section continues working normally.
 *
 *   4. INDEPENDENT DEPLOYMENT: In production, the Cart team could deploy
 *      a new version of this component without the Products team or the
 *      host team doing anything. The host fetches the latest remoteEntry.js
 *      on each page load.
 *
 * INTERVIEW TIP:
 * "The real value of Module Federation shows up with multiple remotes.
 * A single remote is just a fancy code-split. Multiple remotes demonstrate
 * independent deployment, independent failure, and shared dependency
 * efficiency — the core benefits of micro frontend architecture."
 */

import React from 'react';

/**
 * SAMPLE CART DATA
 * ----------------
 * Static data for demonstration purposes. In a real micro frontend, the
 * Cart team would own the entire data layer: API calls, state management,
 * optimistic updates, etc.
 *
 * The host doesn't pass cart data as props — the Cart micro frontend is
 * self-contained. If the host needs to communicate with the Cart (e.g.,
 * "add this product to cart"), that's a cross-micro-frontend communication
 * problem. See docs/communication/ for patterns (custom events, event bus,
 * shared store).
 */
const sampleCartItems = [
  { id: 1, name: 'Wireless Headphones', price: 79.99, quantity: 1 },
  { id: 2, name: 'Running Shoes', price: 129.99, quantity: 2 },
];

/**
 * CART COMPONENT
 * --------------
 * Renders a shopping cart with item list and total calculation.
 *
 * DESIGN DECISIONS (same rationale as ProductList):
 *
 * 1. Default export: The host does `import('remoteCart/Cart')` and gets
 *    this component as the default export. Consistent with ProductList.
 *
 * 2. Inline styles: Avoids CSS isolation issues between remotes. In a real
 *    setup, each team would choose their own styling strategy (CSS Modules,
 *    styled-components, etc.) — see docs/css-isolation/ for trade-offs.
 *
 * 3. Self-contained: No props required from the host. The Cart team owns
 *    the component end-to-end. This maximizes team autonomy — the host
 *    team doesn't need to understand the Cart's internal data model.
 */
function Cart() {
  const total = sampleCartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ marginTop: 0 }}>🛒 Shopping Cart</h3>
      <p style={{ color: '#666', fontSize: '14px' }}>
        This component is served from the <strong>remote-cart</strong> app
        (port 3002) and loaded at runtime by the host via Module Federation.
        It demonstrates multi-remote consumption — the host loads this
        alongside the ProductList from a completely separate remote.
      </p>

      {sampleCartItems.length === 0 ? (
        <p style={{ color: '#999', fontStyle: 'italic' }}>Your cart is empty.</p>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Item</th>
                <th style={{ padding: '8px' }}>Price</th>
                <th style={{ padding: '8px' }}>Qty</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {sampleCartItems.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '8px' }}>{item.name}</td>
                  <td style={{ padding: '8px' }}>${item.price.toFixed(2)}</td>
                  <td style={{ padding: '8px' }}>{item.quantity}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#e8f5e9',
              borderRadius: '8px',
              textAlign: 'right',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#2e7d32',
            }}
          >
            Total: ${total.toFixed(2)}
          </div>
        </>
      )}
    </div>
  );
}

export default Cart;
