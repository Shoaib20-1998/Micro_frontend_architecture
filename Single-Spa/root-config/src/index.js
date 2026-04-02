import { registerApplication, start, navigateToUrl } from 'single-spa';

// Register Home micro frontend
registerApplication({
  name: 'app-react-home',
  app: () => System.import('app-react-home'),
  activeWhen: ['/home'],
});

// Register Dashboard micro frontend
registerApplication({
  name: 'app-react-dashboard',
  app: () => System.import('app-react-dashboard'),
  activeWhen: ['/dashboard'],
});

// Start single-spa
start();

// Redirect root URL to /home so the page isn't blank
if (location.pathname === '/') {
  navigateToUrl('/home');
}
