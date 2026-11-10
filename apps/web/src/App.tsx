import { useCallback, useEffect } from 'react';
import { AppUpdateProvider, UpdateBanner } from './app/AppUpdate.js';
import { navigate, ROUTES, usePath } from './app/router.js';
import { ConnectionStatus, OfflineBanner } from './components/ConnectionStatus.js';
import { BottomNav } from './components/ui/BottomNav.js';
import { AdminPage, isAdminPath } from './features/admin/index.js';
import { OpeningMusic } from './features/audio/OpeningMusic.js';
import { BattleProvider, useBattle } from './features/battle/BattleProvider.js';
import { BattlePage } from './features/battle/pages/BattlePage.js';
import { BattleResultPage } from './features/battle/pages/BattleResultPage.js';
import { CapturePage } from './features/battle/pages/CapturePage.js';
import { CollectionPage } from './features/collection/pages/CollectionPage.js';
import { TeamPage } from './features/collection/pages/TeamPage.js';
import { ExplorationPage, type EncounterStartRequest } from './features/exploration/index.js';
import { LocationPage } from './features/onboarding/pages/LocationPage.js';
import { StarterPage } from './features/onboarding/pages/StarterPage.js';
import { WelcomePage } from './features/onboarding/pages/WelcomePage.js';
import { PlayerProvider, usePlayer } from './features/player/PlayerProvider.js';
import { ProfilePage } from './features/profile/pages/ProfilePage.js';
import { RankingPage } from './features/profile/pages/RankingPage.js';
import { SettingsPage } from './features/profile/pages/SettingsPage.js';

const ONBOARDING_PATHS = new Set<string>([ROUTES.welcome, ROUTES.starter]);

function MapScreen() {
  const { player } = usePlayer();
  const { start, finishedSpawnIds } = useBattle();
  const team = player.team.map((id) => player.creatures.find((creature) => creature.id === id)).filter((creature) => creature !== undefined);

  // Contrato de encontro: a exploração só pede o início; a batalha acontece nas telas próprias.
  const startEncounter = useCallback((request: EncounterStartRequest) => {
    if (team.length === 0) throw new Error('Equipe vazia');
    start(request, team);
    navigate(ROUTES.battle);
  }, [start, team]);

  return (
    <ExplorationPage
      onStartEncounter={startEncounter}
      hiddenSpawnIds={finishedSpawnIds}
      headerAction={<ConnectionStatus />}
      footer={<BottomNav active="map" />}
    />
  );
}

function PlayerRoutes() {
  const path = usePath();
  const { player } = usePlayer();
  const needsOnboarding = !player.onboarded && !ONBOARDING_PATHS.has(path);

  useEffect(() => {
    if (needsOnboarding) navigate(player.googleEmail ? ROUTES.starter : ROUTES.welcome, { replace: true });
    else if (player.onboarded && ONBOARDING_PATHS.has(path)) navigate(ROUTES.map, { replace: true });
  }, [needsOnboarding, player.onboarded, player.googleEmail, path]);

  if (needsOnboarding) return null;

  switch (path) {
    case ROUTES.welcome: return <WelcomePage />;
    case ROUTES.starter: return <StarterPage />;
    case ROUTES.location: return <LocationPage />;
    case ROUTES.collection: return <CollectionPage />;
    case ROUTES.team: return <TeamPage />;
    case ROUTES.profile: return <ProfilePage />;
    case ROUTES.ranking: return <RankingPage />;
    case ROUTES.settings: return <SettingsPage />;
    case ROUTES.battle: return <BattlePage />;
    case ROUTES.capture: return <CapturePage />;
    case ROUTES.battleResult: return <BattleResultPage />;
    default: return <MapScreen />;
  }
}

export default function App() {
  const path = usePath();

  return (
    <AppUpdateProvider>
      <UpdateBanner />
      {isAdminPath(path) ? (
        <AdminPage headerAction={<ConnectionStatus />} />
      ) : (
        <PlayerProvider>
          <BattleProvider>
            <OfflineBanner />
            <OpeningMusic />
            <PlayerRoutes />
          </BattleProvider>
        </PlayerProvider>
      )}
    </AppUpdateProvider>
  );
}
