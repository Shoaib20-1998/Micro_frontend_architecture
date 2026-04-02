import React from 'react';
import ReactDOM from 'react-dom';
import singleSpaReact from 'single-spa-react';
import App from './App';

const lifecycles = singleSpaReact({
  React,
  ReactDOM,
  rootComponent: App,
  errorBoundary(err, info, props) {
    return React.createElement('div', { style: { padding: '2rem', color: '#c62828' } },
      React.createElement('h2', null, '⚠️ Home App Error'),
      React.createElement('p', null, err.message)
    );
  },
});

export const bootstrap = lifecycles.bootstrap;
export const mount = lifecycles.mount;
export const unmount = lifecycles.unmount;
