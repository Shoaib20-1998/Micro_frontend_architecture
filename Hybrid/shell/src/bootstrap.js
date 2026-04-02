import { registerApplication, start, navigateToUrl } from 'single-spa';
import { loadMFApp } from './mf-loader';

// Register Home micro frontend (loaded via Module Federation from port 4001)
registerApplication({
  name: 'mf-home',
  app: loadMFApp('mfHome', 'singleSpaEntry'),
  activeWhen: ['/home'],
});

// Register Settings micro frontend (loaded via Module Federation from port 4002)
registerApplication({
  name: 'mf-settings',
  app: loadMFApp('mfSettings', 'singleSpaEntry'),
  activeWhen: ['/settings'],
});

// Start single-spa
start();

// Redirect root URL to /home so the page isn't blank
if (location.pathname === '/') {
  navigateToUrl('/home');
}
