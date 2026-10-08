import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createGame, currentBoard, DEFAULT_CONFIG, isWon, type Config, type GameMode } from './game';
import BoardView from './BoardView';
import ControlDialog from './ControlDialog';
import Dialog from './Dialog';
import GameHistory from './GameHistory';
import { useGameSession } from './useGameSession';
import PwaPanel from './PwaPanel';
import { usePwa } from './pwa';
import { useCompactLayout } from './useCompactLayout';
import { defaultControl, CONTROL_HINTS, CONTROL_LABELS, type ControlMode } from './controls';
import { formatElapsed } from './useGameTimer';

type IconName = 'arrow' | 'undo' | 'redo' | 'restart' | 'settings' | 'check' | 'spark' | 'info' | 'pause' | 'play' | 'menu';
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    menu: 'M4 6h16M4 12h16M4 18h16',
    pause: 'M8 5v14M16 5v14',
    play: 'm8 4 12 8-12 8Z',
    arrow: 'M4 12h16m-6-6 6 6-6 6',
    undo: 'M8 4 3 9l5 5M3 9h10a7 7 0 0 1 0 14',
    redo: 'm16 4 5 5-5 5m5-5H11a7 7 0 0 0 0 14',
    restart: 'M3 10a9 9 0 1 1 1.5 7M3 4v6h6',
    settings: 'M4 7h16M4 17h16M9 4v6m6 4v6',
    check: 'm5 12 4 4L19 6',
    spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z',
    info: 'M12 11v6m0-10v.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function countLabel(count: number, few: string, many: string) {
  return `${count} ${count < 5 ? few : many}`;
}


function SettingsForm({ config, onChange, onStart, onBack, modal = false, onApplication, applicationLabel, onHistory }: {
  config: Config; onChange: (config: Config) => void; onStart: () => void; onBack?: () => void; modal?: boolean; onApplication: () => void; applicationLabel: string; onHistory: () => void;
}) {
  return <form className={modal ? 'dialog-form' : undefined} onSubmit={event => { event.preventDefault(); onStart(); }}>
    <div className={modal ? 'dialog-body settings-fields' : 'settings-fields'}>
        <fieldset><legend>Количество стержней</legend><div className="rod-options">{[3, 4, 5, 6].map(rods => <label key={rods} className={config.rods === rods ? 'option checked' : 'option'}><input type="radio" name="rods" value={rods} checked={config.rods === rods} onChange={() => onChange({ ...config, rods })} /><span>{rods}</span></label>)}</div></fieldset>
        <div className="disk-setting"><div className="field-label"><label htmlFor="disks">Количество дисков</label><output htmlFor="disks">{config.disks}</output></div><input id="disks" type="range" min="3" max="10" value={config.disks} onChange={event => onChange({ ...config, disks: Number(event.target.value) })} style={{ '--range-progress': `${(config.disks - 3) / 7 * 100}%` } as CSSProperties} /><div className="range-labels"><span>3 · Попроще</span><span>10 · Посложнее</span></div></div>
        <fieldset className="mode-setting" aria-describedby="mode-description">
          <legend>Режим игры</legend>
          <div className="rod-options">
            {(['classic', 'hardcore'] as const).map(mode => <label key={mode} className={`option ${config.mode === mode ? 'checked' : ''}`}>
              <input type="radio" name="mode" value={mode} checked={config.mode === mode} onChange={() => onChange({ ...config, mode })} />
              <span>{mode === 'classic' ? 'Обычный' : 'Хардкор'}</span>
            </label>)}
          </div>
          <p id="mode-description" className="mode-description">{config.mode === 'hardcore' ? 'Диски можно переносить только на соседний стержень.' : 'Переносите диски на любой подходящий стержень.'}</p>
        </fieldset>
      {!modal && <p className="settings-hint"><Icon name="info" /><span>Больше дисков — больше шагов.<br />Больше стержней — больше свободы.</span></p>}
      <button type="button" className="button history-entry" onClick={event => { event.currentTarget.focus(); onHistory(); }}>История игр</button>
      <button type="button" className="button pwa-entry" onClick={event => { event.currentTarget.focus(); onApplication(); }}>{applicationLabel}</button>
    </div>
    <div className={modal ? 'dialog-footer' : undefined}>
      <button className="button button-primary start-button" type="submit">Начать игру <Icon name="arrow" /></button>
      {onBack && <button type="button" className="button back-button" onClick={onBack}>Назад к игре</button>}
    </div>
  </form>;
}

function Settings({ config, onChange, hasGame, onStart, onBack, hidePreview, onApplication, applicationLabel, onHistory }: {
  config: Config; onChange: (config: Config) => void; hasGame: boolean; hidePreview: boolean; onStart: () => void; onBack: () => void; onApplication: () => void; applicationLabel: string; onHistory: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <><div className="setup-layout">
    <section className="preview-card">
      <div className="card-heading"><span className="eyebrow">Всё начинается с первого хода</span><span className="preview-tag">Начальная позиция</span></div>
      {!hidePreview && <BoardView config={config} board={currentBoard(createGame(config))} />}
      <div className="preview-note"><span className="note-line" /><span>С первого стержня — на последний</span><Icon name="arrow" /></div>
    </section>
    <section className="settings-card" aria-labelledby="settings-title">
      <div className="settings-icon"><Icon name="settings" /></div>
      <h2 id="settings-title" ref={heading} tabIndex={-1}>Ваша головоломка</h2>
      <p className="muted settings-description">Выберите сложность и найдите свой путь к решению.</p>
      <SettingsForm onHistory={onHistory} onApplication={onApplication} applicationLabel={applicationLabel} config={config} onChange={onChange} onStart={onStart} onBack={hasGame ? onBack : undefined} />
    </section>
  </div><Rules mode={config.mode} /></>;
}

function Rules({ mode, control = 'tap' }: { mode: GameMode; control?: ControlMode }) {
  return <section className="rules" aria-label="Как играть">
    <div className="rule"><span className="rule-index">01</span><div><h3>Выберите диск</h3><p>{CONTROL_HINTS[control]}</p></div></div>
    <div className="rule"><span className="rule-index">02</span><div><h3>Найдите ему место</h3><p>{mode === 'hardcore' ? 'Переносите диск на соседний стержень: пустой или с диском большего размера.' : 'Переносите диск на пустой стержень или на стержень с диском большего размера.'}</p></div></div>
    <div className="rule"><span className="rule-index">03</span><div><h3>Соберите пирамидку</h3><p>Перенесите все диски на последний стержень. В своём темпе.</p></div></div>
  </section>;
}

type Panel = 'settings' | 'controls' | 'menu' | 'rules' | 'application' | 'update' | 'history' | 'welcome' | 'storage' | null;
const PANEL_TITLES = { settings: 'Ваша головоломка', controls: 'Управление', menu: 'Меню партии', rules: 'Как играть', application: 'Приложение', update: 'Обновить приложение?', history: 'История игр', welcome: 'Ваша последняя партия', storage: 'Сохранение партии' };

export default function App() {
  const compact = useCompactLayout();
  const pwa = usePwa();
  const applicationLabel = pwa.installed ? 'Приложение' : 'Установить приложение';
  const [pwaReturn, setPwaReturn] = useState<Panel>(null);
  const [panel, setPanel] = useState<Panel>('settings');
  const saved = useGameSession(panel === null);
  const { game, dispatch, control, setControl, hasGame, elapsed, session: timerSession } = saved;
  const [historyReturn, setHistoryReturn] = useState<Panel>(null);
  const [draft, setDraft] = useState<Config>(DEFAULT_CONFIG);
  const [controlDraft, setControlDraft] = useState<ControlMode>('drag');
  const [newGameControls, setNewGameControls] = useState(true);
  const [fromMenu, setFromMenu] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const pauseButton = useRef<HTMLButtonElement>(null);
  const [pausedFieldHeight, setPausedFieldHeight] = useState<number>();
  const gameHeading = useRef<HTMLHeadingElement>(null);
  const won = isWon(game);
  const elapsedLabel = formatElapsed(elapsed);
  const future = game.history.length - 1 - game.cursor;
  const desktopSettings = !compact && (panel === 'settings' || panel === 'controls' && newGameControls || (panel === 'application' || panel === 'update') && pwaReturn === 'settings' || panel === 'history' && historyReturn === 'settings');
  const modal = panel !== null && (compact || panel !== 'settings');

  const bootHandled = useRef(false);
  useEffect(() => {
    if (!saved.loading && !bootHandled.current) { bootHandled.current = true; if (saved.latest) setPanel('welcome'); }
  }, [saved.loading, saved.latest]);
  useEffect(() => { if (saved.conflict || saved.incompatible) setPanel('storage'); }, [saved.conflict, saved.incompatible]);

  useEffect(() => {
    if (hasGame && !panel) gameHeading.current?.focus({ preventScroll: true });
  }, [hasGame, panel, timerSession]);

  useEffect(() => {
    if (!hasGame || panel || game.paused || won) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable], dialog, [role="dialog"]')) return;
      if (event.key === 'Escape') dispatch({ type: 'clearSelection' });
      else if (/^[1-6]$/.test(event.key) && Number(event.key) <= game.config.rods) {
        event.preventDefault(); dispatch({ type: 'select', rod: Number(event.key) - 1 });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hasGame, panel, game.paused, game.config.rods, won]);

  function openPanel(next: Exclude<Panel, null>, viaMenu = false) {
    if (!panel) setPausedFieldHeight(fieldRef.current?.getBoundingClientRect().height);
    dispatch({ type: 'clearSelection' });
    setFromMenu(viaMenu);
    if (next === 'settings') setDraft(hasGame ? game.config : draft);
    if (next === 'controls') { setNewGameControls(false); setControlDraft(control); }
    setPanel(next);
  }
  function openApplication() {
    setPwaReturn(panel === 'settings' || panel === 'menu' ? panel : null);
    openPanel('application', fromMenu || panel === 'menu');
  }
  function openHistory() {
    setHistoryReturn(panel); openPanel('history', panel === 'menu' || fromMenu);
  }
  function resumeSaved() { setPanel(saved.resume() ? null : 'storage'); }
  function chooseNewControls() {
    setNewGameControls(true);
    setControlDraft(defaultControl(draft.mode));
    setPanel('controls');
  }
  function closePanel() {
    if (panel === 'history') { setPanel(hasGame ? null : saved.latest ? 'welcome' : 'settings'); return; }
    if (panel === 'settings' && !hasGame && saved.latest) { setPanel('welcome'); return; }
    if (panel === 'update') { setPanel('application'); return; }
    if (panel === 'application' && pwaReturn === 'settings') { setPanel('settings'); return; }
    setPanel(panel === 'controls' && newGameControls ? 'settings' : null);
  }
  function togglePause() {
    if (game.paused) {
      dispatch({ type: 'resume' }); pauseButton.current?.focus();
    } else {
      setPausedFieldHeight(fieldRef.current?.getBoundingClientRect().height);
      dispatch({ type: 'pause' });
    }
  }
  function startGame(config: Config, nextControl = control) {
    setPanel(saved.start(config, nextControl) ? null : 'storage');
  }

  const fullMessage = panel ? 'Время остановлено.' : game.paused ? 'Время остановлено. Продолжите игру, когда будете готовы.' : won
    ? `Пирамидка собрана! Количество ходов: ${game.cursor}. Время: ${elapsedLabel}. Можно начать заново или вернуться к любому ходу.`
    : game.error ?? (game.selected !== null ? `Выбран диск ${currentBoard(game)[game.selected].at(-1)}. Нажмите на стержень, куда хотите его переместить.` : CONTROL_HINTS[control]);
  const shortError = game.error?.includes('Большой диск') ? 'Большой диск нельзя класть на маленький.'
    : game.error?.includes('соседний') ? 'Можно переносить только к соседу.'
    : game.error?.includes('нет дисков') ? 'Здесь нет дисков.' : 'Выберите стержень на поле.';
  const compactMessage = panel || game.paused ? 'Время остановлено.' : won ? 'Пирамидка собрана!'
    : game.error ? shortError : game.selected !== null ? `Диск ${currentBoard(game)[game.selected].at(-1)}: выберите цель.`
    : control === 'swipe' ? 'Смахните к соседнему стержню.' : control === 'drag' ? 'Перетащите верхний диск.' : 'Нажмите на стержень с дисками.';
  const pauseControl = <button ref={pauseButton} type="button" className="button pause-button" disabled={won} aria-pressed={game.paused} onClick={togglePause}>
    <Icon name={game.paused ? 'play' : 'pause'} /><span>{game.paused ? 'Продолжить' : 'Пауза'}</span>
  </button>;

  if (saved.loading) return <div className={`app-shell ${compact ? 'compact-app' : ''}`}><main className="save-loading" role="status">Загружаем сохранение…</main></div>;

  const saveNotice = saved.error && <div className="save-notice" role="alert"><span>{saved.error}</span><button type="button" className="button" onClick={() => { if (saved.conflict || saved.incompatible) setPanel('storage'); else void saved.flush().catch(() => {}); }}> {saved.conflict || saved.incompatible ? 'Открыть' : 'Повторить сохранение'}</button></div>;

  return <div className={`app-shell ${compact ? 'compact-app' : ''}`}>
    <header className="site-header"><a href="./" className="brand" aria-label="Пирамидки — на главную"><img src={`${import.meta.env.BASE_URL}favicon.svg`} width="38" height="38" alt="" /><span>пирамидки<span className="brand-dot">.</span></span></a><span className="header-caption">Маленькие шаги. Большое решение.</span><span className="header-badge"><span /> Время подумать</span></header>
    <main>
      <section className="intro"><div><p className="eyebrow"><span className="tiny-star">✳</span> Классическая головоломка</p><h1>Всё сложится<span className="title-dot">.</span></h1><p className="intro-description">Несколько дисков и одно простое правило.<br className="desktop-break" /> Перенесите пирамидку — ход за ходом.</p></div><div className="intro-aside"><span className="orbit-mark" aria-hidden="true">↗</span><p>Не спешите.<br />Здесь важен каждый ход.</p></div></section>
      {desktopSettings && saveNotice}
      {desktopSettings ? <Settings onHistory={openHistory} onApplication={openApplication} applicationLabel={applicationLabel} config={draft} onChange={setDraft} hasGame={hasGame || !!saved.latest} onBack={() => setPanel(saved.latest && !hasGame ? 'welcome' : null)} hidePreview={modal} onStart={chooseNewControls} /> : hasGame ?
        <section className={`game-card ${won ? 'game-won' : ''}`} aria-labelledby="game-title">
          <div className="game-heading">
            <div className="game-title-block">
              {!compact && <div className="eyebrow">{won ? 'Отличная работа' : 'Ваша партия'}</div>}
              <h2 id="game-title" className={compact ? 'visually-hidden' : undefined} tabIndex={-1} ref={gameHeading} data-return-focus={!compact ? '' : undefined}>{won ? 'Всё получилось!' : 'Ход за ходом'}</h2>
              <span className={`mode-badge ${game.config.mode === 'hardcore' ? 'mode-hardcore' : ''}`}>{game.config.mode === 'hardcore' ? compact ? 'Хардкор' : 'Хардкор · Только соседи' : compact ? 'Обычный' : 'Обычный режим'}</span>
            </div>
            <div className="game-meta">
              {!compact && <span className="config-summary">{countLabel(game.config.rods, 'стержня', 'стержней')} · {countLabel(game.config.disks, 'диска', 'дисков')}</span>}
              <div className="timer-controls">
                <div className="move-count game-timer"><strong role="timer" aria-label="Время партии" aria-live="off">{elapsedLabel}</strong><span>Время</span></div>
                {!compact && pauseControl}
              </div>
              <div className="move-count"><strong className="move-value">{game.cursor}</strong><span>Ходов</span></div>
              {!compact && <><button type="button" className="button control-button" onClick={() => openPanel('controls')}>Управление</button>
                <button type="button" className="button button-settings" aria-label="Настройки" onClick={() => openPanel('settings')}><Icon name="settings" /><span>Настройки</span></button><button type="button" className="button" onClick={openHistory}>История игр</button><button type="button" className="button pwa-header-button" aria-label={applicationLabel} onClick={event => { event.currentTarget.focus(); openApplication(); }}>{applicationLabel}{pwa.needRefresh && <span className="update-dot" aria-hidden="true" />}</button></>}
            </div>
          </div>
          <div ref={fieldRef} className="play-area" style={!compact && (game.paused || panel) ? { height: pausedFieldHeight } : undefined}>
            {panel ? <div className="pause-panel"><h3>{PANEL_TITLES[panel]}</h3><p>Время остановлено.</p></div> : game.paused ? <section className="pause-panel" aria-labelledby="pause-title">
              <span className="pause-mark"><Icon name="pause" /></span>
              <h3 id="pause-title">Игра на паузе</h3>
              <p>Пирамидка подождёт.<br />Продолжите, когда будете готовы.</p>
              <button type="button" className="button button-primary" onClick={togglePause}><Icon name="play" />Продолжить</button>
            </section> : <BoardView fitHeight={compact} board={currentBoard(game)} config={game.config} selected={game.selected} won={won} control={control} onClear={() => dispatch({ type: 'clearSelection' })} onMove={(from, to) => dispatch({ type: 'move', from, to })} onRod={rod => dispatch({ type: 'select', rod })} />}
          </div>
          <div className={`game-message ${game.error ? 'message-error' : ''} ${won ? 'message-success' : ''}`} role="status" aria-live="polite" aria-atomic="true"><Icon name={won ? 'check' : game.error ? 'info' : 'spark'} />
            {(saved.error ? compact ? <span>Прогресс не сохраняется. Откройте меню.</span> : saveNotice : null) || (compact ? <><span aria-hidden="true">{compactMessage}</span><span className="visually-hidden">{fullMessage}</span></> : <span>{fullMessage}</span>)}
          </div>
          <div className="game-toolbar"><div className="history-buttons">
            <button className="button" type="button" disabled={game.paused || !!panel || game.cursor === 0} onClick={() => dispatch({ type: 'undo' })}><Icon name="undo" /><span>Отменить</span></button>
            <button className="button" type="button" disabled={game.paused || !!panel || future === 0} onClick={() => dispatch({ type: 'redo' })}><Icon name="redo" /><span>Повторить</span></button>
          </div>
            {compact ? <>{pauseControl}<button type="button" className="button menu-button" data-return-focus onClick={event => { event.currentTarget.focus(); openPanel('menu'); }}><Icon name="menu" /><span>Меню</span>{pwa.needRefresh && <span className="update-dot" aria-hidden="true" />}</button></>
              : <><span className="history-position">Шаг {game.cursor} из {game.history.length - 1}</span><button type="button" className="button restart-button" onClick={() => startGame(game.config)}><Icon name="restart" />Начать заново</button></>}
          </div>
        </section>
        : <section className="landing-card game-card" aria-label="Новая игра">
          <h2>Пирамидки</h2>
          <div className="play-area">{!modal && <BoardView fitHeight={compact} config={draft} board={currentBoard(createGame(draft))} />}</div>
          <button type="button" className="button button-primary" data-return-focus onClick={() => saved.latest ? setPanel('welcome') : openPanel('settings')}>{saved.latest ? 'Вернуться к сохранению' : 'Настроить игру'}</button>
        </section>}
      {hasGame && !desktopSettings && !compact && <Rules mode={game.config.mode} control={control} />}
    </main>
    {modal && <Dialog title={PANEL_TITLES[panel]} view={panel} onClose={closePanel}
      onBack={panel === 'application' || panel === 'update' || panel === 'history' || panel === 'welcome' || panel === 'storage' ? undefined : panel === 'controls' && newGameControls ? () => setPanel('settings') : fromMenu && panel !== 'menu' ? () => setPanel('menu') : undefined}>
      {panel !== 'storage' && saveNotice}
      {panel === 'settings' && <SettingsForm modal onHistory={openHistory} onApplication={openApplication} applicationLabel={applicationLabel} config={draft} onChange={setDraft} onStart={chooseNewControls} onBack={hasGame ? () => setPanel(null) : undefined} />}
      {panel === 'controls' && <ControlDialog mode={newGameControls ? draft.mode : game.config.mode} control={controlDraft} newGame={newGameControls} onChange={setControlDraft} onConfirm={() => {
        if (newGameControls) startGame(draft, controlDraft); else { setControl(controlDraft); setPanel(null); }
      }} />}
      {panel === 'menu' && <>
        <div className="dialog-body menu-body">
          <div className="menu-summary"><p>{game.config.mode === 'hardcore' ? 'Хардкор · Только соседи' : 'Обычный режим'}</p>
            <p>{countLabel(game.config.rods, 'стержня', 'стержней')} · {countLabel(game.config.disks, 'диска', 'дисков')}</p>
            <p>Управление: {CONTROL_LABELS[control]}</p><p className="history-position">Шаг {game.cursor} из {game.history.length - 1}</p>
          </div>
          <div className="menu-actions">
            <button type="button" className="button" onClick={() => openPanel('settings', true)}><Icon name="settings" />Настройки</button>
            <button type="button" className="button" onClick={() => openPanel('controls', true)}>Управление</button>
            <button type="button" className="button" onClick={() => openPanel('rules', true)}><Icon name="info" />Правила</button>
            <button type="button" className="button" onClick={openHistory}>История игр</button>
            <button type="button" className="button" aria-label={applicationLabel} onClick={openApplication}>{applicationLabel}</button>
            {pwa.needRefresh && <button type="button" className="button update-entry" onClick={openApplication}>Доступна новая версия</button>}
            <button type="button" className="button" onClick={() => startGame(game.config)}><Icon name="restart" />Начать заново</button>
          </div>
        </div>
        <div className="dialog-footer"><button type="button" className="button button-primary start-button" onClick={() => setPanel(null)}>Назад к игре</button></div>
      </>}
      {panel === 'welcome' && <><div className="dialog-body welcome-body"><p>{saved.latest && `${saved.latest.game.config.mode === 'hardcore' ? 'Хардкор' : 'Обычный'} · Стержней: ${saved.latest.game.config.rods} · Дисков: ${saved.latest.game.config.disks}`}</p><p>Ходов: {saved.latest?.game.cursor ?? 0} · Время: {formatElapsed(saved.latest?.elapsed ?? 0)}</p><button className="button" onClick={openHistory}>История игр</button></div><div className="dialog-footer welcome-actions"><button className="button button-primary" onClick={resumeSaved}>{saved.latest && isWon(saved.latest.game) ? 'Открыть последнюю партию' : 'Продолжить партию'}</button><button className="button" onClick={() => openPanel('settings')}>Новая игра</button></div></>}
      {panel === 'history' && <GameHistory repository={saved.repository} latest={saved.latest} flush={saved.flush} onOpen={resumeSaved} onBack={() => setPanel(historyReturn)} />}
      {panel === 'storage' && <><div className="dialog-body"><p role="alert">{saved.error}</p><p>{saved.conflict ? 'Продолжайте игру в одном окне. Закройте другое окно и загрузите последнее сохранение; изменения этого окна не заменят его.' : 'Сохранённые данные остаются на устройстве.'}</p>{saved.incompatible && <button className="button" onClick={openApplication}>Приложение и обновления</button>}</div><div className="dialog-footer"><button type="button" className="button button-primary start-button" onClick={() => { void saved.reload().then(last => setPanel(last ? 'welcome' : 'settings')); }}>Загрузить актуальное сохранение</button></div></>}
      {(panel === 'application' || panel === 'update') && <PwaPanel beforeUpdate={saved.beforeUpdate} confirmUpdate={panel === 'update'} onConfirmUpdate={() => setPanel('update')} onBack={() => setPanel(panel === 'update' ? 'application' : pwaReturn)} />}
      {panel === 'rules' && <><div className="dialog-body"><Rules mode={game.config.mode} control={control} /><p className="control-extra">Брать можно только верхний диск. Нажатия работают при любом управлении. Пауза скрывает поле и останавливает время. Новый ход после отмены заменяет будущие ходы.</p></div><div className="dialog-footer"><button type="button" className="button button-primary start-button" onClick={() => setPanel(null)}>Назад к игре</button></div></>}
    </Dialog>}
    <footer><span>Простые правила. Красивые решения.</span><span>Сделайте паузу для мысли <span className="footer-spark">✳</span></span></footer>
  </div>;
}
