import { useRegisterSW } from 'virtual:pwa-register/react';
import { ConnectionStatus } from './components/ConnectionStatus.js';
import { ExplorationPage } from './features/exploration/index.js';

export default function App() {
  useRegisterSW({ immediate: true });

  return <ExplorationPage headerAction={<ConnectionStatus />} />;
}
