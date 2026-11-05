import { useState } from 'react';
import { ROUTES } from '../../../app/router.js';
import { TabScreen } from '../../../components/ui/BottomNav.js';
import { BackLink, buttonStyles } from '../../../components/ui/ui.js';
import { useGoogleLink } from '../../auth/useGoogleLink.js';
import { usePlayer } from '../../player/PlayerProvider.js';
import { COURSES, MAX_NAME_LENGTH, type CourseSlug } from '../../player/playerState.js';

export function SettingsPage() {
  const { player, dispatch } = usePlayer();
  const [name, setName] = useState(player.displayName);
  const [course, setCourse] = useState<CourseSlug>(player.course);
  const [saved, setSaved] = useState(false);
  const google = useGoogleLink();

  const trimmed = name.trim();
  const nameValid = trimmed.length >= 1 && trimmed.length <= MAX_NAME_LENGTH;
  const dirty = trimmed !== player.displayName || course !== player.course;
  const canSave = nameValid && dirty;

  const save = () => {
    if (!canSave) return;
    dispatch({ type: 'updateProfile', displayName: trimmed, course });
    setName(trimmed);
    setSaved(true);
  };

  return (
    <TabScreen active="profile" label="Configurações">
      <header className="flex items-center gap-3">
        <BackLink to={ROUTES.profile} label="Voltar ao perfil" />
        <h1 className="m-0 font-display text-[30px] leading-none font-bold">Configurações</h1>
      </header>

      <section aria-labelledby="google-title" className="mt-4 flex flex-col gap-2.5 rounded-[22px] ink-border bg-white px-4 py-3.5">
        <h2 id="google-title" className="m-0 font-display text-[19px] font-semibold">Conta Google</h2>
        {player.googleEmail ? (
          <>
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full ink-border bg-creme font-extrabold">G</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-extrabold">Vinculada</span>
                <span className="block truncate text-[13px] font-bold text-tinta-suave">{player.googleEmail}</span>
              </span>
              <span className="rounded-full border-2 border-tinta bg-verde px-2.5 py-0.5 text-xs font-extrabold">Ativa</span>
            </div>
            <button type="button" disabled={google.busy} onClick={() => void google.unlink()} className={`${buttonStyles.secondary} text-perigo`}>
              {google.busy ? 'Saindo…' : 'Desvincular conta Google'}
            </button>
          </>
        ) : (
          <>
            <p className="m-0 text-sm leading-snug font-bold text-tinta-suave">Vincule para não perder seu progresso se trocar de celular.</p>
            <button
              type="button"
              disabled={google.busy}
              onClick={() => void google.link()}
              className="flex h-[52px] items-center justify-center gap-2.5 rounded-2xl sticker bg-white font-display text-[17px] font-semibold disabled:opacity-60"
            >
              <span aria-hidden="true" className="grid h-[26px] w-[26px] place-items-center rounded-full ink-border text-[13px] font-bold">G</span>
              {google.busy ? 'Conectando ao Google…' : 'Vincular conta Google'}
            </button>
          </>
        )}
        {google.error && <p role="alert" className="m-0 rounded-xl ink-border bg-[#ffd9cf] px-3 py-2 text-xs font-extrabold">{google.error}</p>}
        <p className="m-0 text-xs font-bold text-tinta-suave">Com a conta vinculada, o progresso é salvo no servidor e pode ser recuperado em outro aparelho.</p>
      </section>

      <section className="mt-3.5 flex flex-col gap-2 rounded-[22px] ink-border bg-white px-4 py-3.5">
        <label htmlFor="display-name" className="font-display text-[19px] font-semibold">Nome no jogo</label>
        <input
          id="display-name"
          type="text"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="nickname"
          aria-invalid={!nameValid}
          aria-describedby="display-name-hint"
          onChange={(event) => {
            setName(event.target.value);
            setSaved(false);
          }}
          className={`h-12 rounded-[14px] border-[2.5px] bg-creme px-3.5 text-base font-extrabold outline-none ${nameValid ? 'border-tinta' : 'border-perigo'}`}
        />
        <div id="display-name-hint" className={`flex justify-between text-xs font-extrabold ${nameValid ? 'text-tinta-suave' : 'text-perigo'}`}>
          <span>{nameValid ? 'Aparece no ranking para os outros jogadores.' : 'Digite pelo menos 1 caractere.'}</span>
          <span>{name.length}/{MAX_NAME_LENGTH}</span>
        </div>
      </section>

      <section aria-labelledby="course-title" className="mt-3.5 flex flex-col gap-2.5 rounded-[22px] ink-border bg-white px-4 py-3.5">
        <h2 id="course-title" className="m-0 font-display text-[19px] font-semibold">Curso</h2>
        <div role="radiogroup" aria-labelledby="course-title" className="grid grid-cols-2 gap-2">
          {COURSES.map((item) => {
            const on = item.slug === course;
            return (
              <button
                key={item.slug}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setCourse(item.slug);
                  setSaved(false);
                }}
                className={`flex min-h-12 items-center gap-2 rounded-[14px] px-2.5 py-1.5 text-left text-[13px] leading-tight font-extrabold ${on ? 'sticker-sm bg-amarelo' : 'ink-border bg-white'}`}
              >
                <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-tinta" style={{ background: item.color }} />
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="m-0 text-xs font-bold text-tinta-suave">Usado no ranking “Meu curso”.</p>
      </section>

      <div className="mt-5 flex flex-col gap-2">
        {saved && (
          <p role="status" className="m-0 rounded-[14px] ink-border bg-verde px-3.5 py-2.5 text-center text-[13px] font-extrabold">
            Salvo! Vai para o servidor agora ou, se estiver offline, quando a conexão voltar.
          </p>
        )}
        <button type="button" onClick={save} disabled={!canSave} className={`${buttonStyles.primary} h-[58px]`}>Salvar alterações</button>
      </div>
    </TabScreen>
  );
}
