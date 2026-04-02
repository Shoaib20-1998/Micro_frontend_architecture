/**
 * ============================================================================
 * PRODUCT LIST — THE EXPOSED REMOTE COMPONENT
 * ============================================================================
 *
 * This is the component that the host app imports at runtime via:
 *   import('remoteProducts/ProductList')
 *
 * From the host's perspective, this is just a React component. It doesn't
 * know or care that it was loaded from a different webpack build on a
 * different server. That's the beauty of Module Federation — the consumption
 * API is identical to a normal dynamic import.
 *
 * WHAT MAKES THIS A "REMOTE" COMPONENT:
 * Nothing in the code itself. The "remote" behavior is entirely configured
 * in webpack.config.js via the `exposes` option. This file is a plain React
 * component — you could copy it into any React project and it would work.
 *
 * Module Federation's power is that it separates the DEPLOYMENT boundary
 * (this component lives in a different build/server) from the DEVELOPMENT
 * experience (it's just a normal import).
 *
 * INTERVIEW TIP:
 * "Remote components are just regular React components. Module Federation
 * handles the runtime loading transparently. The component doesn't need
 * any special API or wrapper — the webpack plugin does all the work at
 * the build/runtime level."
 */

import React from 'react';

/**
 * SAMPLE PRODUCT DATA
 * -------------------
 * In a real micro frontend, this data would come from an API call, a state
 * management library, or props passed down from the host. We're using static
 * data here to keep the focus on the Module Federation architecture, not
 * data fetching patterns.
 *
 * In production, the Products team would own this entire remote — including
 * its data layer, API calls, and state management. The host doesn't need
 * to know how the data is fetched. That's the "team autonomy" principle
 * of micro frontends.
 */
const sampleProducts = [
  { id: 1, name: 'Wireless Headphones', price: 79.99, category: 'Electronics' },
  { id: 2, name: 'Running Shoes', price: 129.99, category: 'Sports' },
  { id: 3, name: 'Coffee Maker', price: 49.99, category: 'Kitchen' },
  { id: 4, name: 'Backpack', price: 59.99, category: 'Travel' },
];

/**
 * PRODUCT LIST COMPONENT
 * ----------------------
 * A straightforward React component that renders a list of products.
 *
 * KEY DESIGN DECISIONS:
 *
 * 1. Default export: Module Federation's `exposes` config maps to this file,
 *    and the host does `import('remoteProducts/ProductList')`. The default
 *    export is what gets resolved. You could also use named exports, but
 *    the host would need to destructure: `const { ProductList } = await import(...)`.
 *
 * 2. Inline styles: We use inline styles here to avoid CSS isolation issues.
 *    In a real micro frontend, you'd use CSS Modules, styled-components, or
 *    another scoping strategy (see docs/css-isolation/ for a deep dive).
 *    Inline styles are the simplest way to guarantee zero style bleed.
 *
 * 3. No external dependencies: This component only uses React. Keeping remote
 *    components lightweight minimizes the shared dependency surface area.
 *    Every dependency you add is another thing to negotiate at runtime.
 */
function ProductList() {
  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ marginTop: 0 }}>🛍️ Product Catalog</h3>
      <p style={{ color: '#666', fontSize: '14px' }}>
        This component is served from the <strong>remote-products</strong> app
        (port 3001) and loaded at runtime by the host via Module Federation.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {sampleProducts.map((product) => (
          <div
            key={product.id}
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: '#fafafa',
            }}
          >
            <h4 style={{ margin: '0 0 8px 0' }}>{product.name}</h4>
            <p style={{ margin: '0 0 4px 0', color: '#888', fontSize: '12px' }}>
              {product.category}
            </p>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#2e7d32' }}>
              ${product.price.toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProductList;
