import { useCallback, useEffect, type ReactNode } from 'react';
import { AppUpdateProvider, UpdateBanner } from './app/AppUpdate.js';
import { navigate, ROUTES, usePath } from './app/router.js';
import { ConnectionStatus, OfflineBanner } from './components/ConnectionStatus.js';
import { BottomNav } from './components/ui/BottomNav.js';
import { AdminPage, isAdminPath } from './features/admin/index.js';
import { OpeningMusic } from './features/audio/OpeningMusic.js';
import { FirstVisitInstallGuide } from './features/install/FirstVisitInstallGuide.js';
import { BattleProvider, useBattle } from './features/battle/BattleProvider.js';
import { BattlePage } from './features/battle/pages/BattlePage.js';
import { BattleResultPage } from './features/battle/pages/BattleResultPage.js';
import { CapturePage } from './features/battle/pages/CapturePage.js';
import { CollectionPage } from './features/collection/pages/CollectionPage.js';
import { TeamPage } from './features/collection/pages/TeamPage.js';
import { ExplorationPage, type EncounterStartRequest } from './features/exploration/index.js';
import { LocationPage } from './features/onboarding/pages/LocationPage.js';
import { CoursePage } from './features/onboarding/pages/CoursePage.js';
import { StarterPage } from './features/onboarding/pages/StarterPage.js';
import { WelcomePage } from './features/onboarding/pages/WelcomePage.js';
import { PlayerProvider, usePlayer } from './features/player/PlayerProvider.js';
import { ProfilePage } from './features/profile/pages/ProfilePage.js';
import { HistoryPage } from './features/profile/pages/HistoryPage.js';
import { RankingPage } from './features/profile/pages/RankingPage.js';
import { SettingsPage } from './features/profile/pages/SettingsPage.js';

const ONBOARDING_PATHS = new Set<string>([ROUTES.welcome, ROUTES.course, ROUTES.starter]);
const BATTLE_PATHS = new Set<string>([ROUTES.battle, ROUTES.capture, ROUTES.battleResult]);

/** A batalha em andamento fica salva no aparelho, separada por conta. */
function GameBattleProvider({ children }: { children: ReactNode }) {
  const { player } = usePlayer();
  return <BattleProvider persistAs={player.googleUid ?? null}>{children}</BattleProvider>;
}

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

  // Batalha que ficou aberta (o app fechou no meio): volta para ela até terminar.
  const { battle } = useBattle();
  const resumeTo = battle && player.onboarded && !BATTLE_PATHS.has(path)
    ? (battle.status === 'active' ? ROUTES.battle : ROUTES.battleResult)
    : null;
  useEffect(() => {
    if (resumeTo) navigate(resumeTo, { replace: true });
  }, [resumeTo]);

  useEffect(() => {
    // Primeiro acesso: login → curso (uma vez) → Pokémon inicial.
    if (needsOnboarding) navigate(!player.googleEmail ? ROUTES.welcome : player.courseChosen ? ROUTES.starter : ROUTES.course, { replace: true });
    else if (player.onboarded && ONBOARDING_PATHS.has(path)) navigate(ROUTES.map, { replace: true });
    // Não pula o curso indo direto para a escolha do inicial.
    else if (path === ROUTES.starter && player.googleEmail && !player.courseChosen) navigate(ROUTES.course, { replace: true });
  }, [needsOnboarding, player.onboarded, player.googleEmail, player.courseChosen, path]);

  if (needsOnboarding) return null;

  switch (path) {
    case ROUTES.welcome: return <WelcomePage />;
    case ROUTES.course: return <CoursePage />;
    case ROUTES.starter: return <StarterPage />;
    case ROUTES.location: return <LocationPage />;
    case ROUTES.collection: return <CollectionPage />;
    case ROUTES.team: return <TeamPage />;
    case ROUTES.profile: return <ProfilePage />;
    case ROUTES.ranking: return <RankingPage />;
    case ROUTES.history: return <HistoryPage />;
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
          <GameBattleProvider>
            <OfflineBanner />
            <OpeningMusic />
            <FirstVisitInstallGuide />
            <PlayerRoutes />
          </GameBattleProvider>
        </PlayerProvider>
      )}
    </AppUpdateProvider>
  );
}
