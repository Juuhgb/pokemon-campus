import { useCallback, useEffect, useState } from 'react';
import { usePlayer } from '../player/PlayerProvider.js';
import {
  completeGoogleRedirect,
  googleAuthErrorMessage,
  hasPendingGoogleRedirect,
  signInWithGoogle,
  signOutGoogle,
  type GoogleAccount,
} from './googleAuth.js';

export interface GoogleLink {
  busy: boolean;
  error: string | null;
  /** Abre o login do Google. Retorna true quando a conta foi vinculada. */
  link: () => Promise<boolean>;
  unlink: () => Promise<void>;
}

/** Liga o login real do Google (Firebase Authentication) ao perfil do jogador. */
export function useGoogleLink(onLinked?: (account: GoogleAccount) => void): GoogleLink {
  const { dispatch } = usePlayer();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((account: GoogleAccount) => {
    dispatch({ type: 'linkGoogle', email: account.email, uid: account.uid, displayName: account.displayName });
    onLinked?.(account);
  }, [dispatch, onLinked]);

  // Conclui o login quando o navegador voltou de um redirecionamento do Google.
  useEffect(() => {
    if (!hasPendingGoogleRedirect()) return;
    let cancelled = false;
    setBusy(true);
    completeGoogleRedirect()
      .then((account) => {
        if (!cancelled && account) apply(account);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(googleAuthErrorMessage(reason));
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const link = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const account = await signInWithGoogle();
      if (!account) return false; // seguiu para redirecionamento
      apply(account);
      return true;
    } catch (reason) {
      setError(googleAuthErrorMessage(reason));
      return false;
    } finally {
      setBusy(false);
    }
  }, [apply]);

  const unlink = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await signOutGoogle();
    } catch {
      // Mesmo sem rede, desvincula localmente.
    } finally {
      dispatch({ type: 'unlinkGoogle' });
      setBusy(false);
    }
  }, [dispatch]);

  return { busy, error, link, unlink };
}
