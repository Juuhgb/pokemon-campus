import { useRegisterSW } from 'virtual:pwa-register/react';
import { ConnectionStatus } from './components/ConnectionStatus.js';
import { AdminPage, isAdminPath } from './features/admin/index.js';
import { ExplorationPage } from './features/exploration/index.js';

export default function App() {
  useRegisterSW({ immediate: true });

  if (isAdminPath(window.location.pathname)) return <AdminPage headerAction={<ConnectionStatus />} />;
  return <ExplorationPage headerAction={<ConnectionStatus />} />;
}
