import { useEffect, useReducer, useRef, useState, type CSSProperties } from 'react';
import { createGame, currentBoard, DEFAULT_CONFIG, gameReducer, isWon, type Config, type GameMode } from './game';
import BoardView from './BoardView';
import ControlDialog from './ControlDialog';
import { defaultControl, CONTROL_HINTS, type ControlMode } from './controls';
import { formatElapsed, useGameTimer } from './useGameTimer';

type IconName = 'arrow' | 'undo' | 'redo' | 'restart' | 'settings' | 'check' | 'spark' | 'info' | 'pause' | 'play';
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
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


function Settings({ initial, hasGame, onStart, onBack, hidePreview }: {
  initial: Config; hasGame: boolean; hidePreview: boolean; onStart: (config: Config) => void; onBack: () => void;
}) {
  const [config, setConfig] = useState(initial);
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
      <form onSubmit={event => { event.preventDefault(); onStart(config); }}>
        <fieldset><legend>Количество стержней</legend><div className="rod-options">{[3, 4, 5, 6].map(rods => <label key={rods} className={config.rods === rods ? 'option checked' : 'option'}><input type="radio" name="rods" value={rods} checked={config.rods === rods} onChange={() => setConfig({ ...config, rods })} /><span>{rods}</span></label>)}</div></fieldset>
        <div className="disk-setting"><div className="field-label"><label htmlFor="disks">Количество дисков</label><output htmlFor="disks">{config.disks}</output></div><input id="disks" type="range" min="3" max="10" value={config.disks} onChange={event => setConfig({ ...config, disks: Number(event.target.value) })} style={{ '--range-progress': `${(config.disks - 3) / 7 * 100}%` } as CSSProperties} /><div className="range-labels"><span>3 · Попроще</span><span>10 · Посложнее</span></div></div>
        <fieldset className="mode-setting" aria-describedby="mode-description">
          <legend>Режим игры</legend>
          <div className="rod-options">
            {(['classic', 'hardcore'] as const).map(mode => <label key={mode} className={`option ${config.mode === mode ? 'checked' : ''}`}>
              <input type="radio" name="mode" value={mode} checked={config.mode === mode} onChange={() => setConfig({ ...config, mode })} />
              <span>{mode === 'classic' ? 'Обычный' : 'Хардкор'}</span>
            </label>)}
          </div>
          <p id="mode-description" className="mode-description">{config.mode === 'hardcore' ? 'Диски можно переносить только на соседний стержень.' : 'Переносите диски на любой подходящий стержень.'}</p>
        </fieldset>
        <p className="settings-hint"><Icon name="info" /><span>Больше дисков — больше шагов.<br />Больше стержней — больше свободы.</span></p>
        <button className="button button-primary start-button" type="submit">Начать игру <Icon name="arrow" /></button>
        {hasGame && <button type="button" className="button back-button" onClick={onBack}>Назад к игре</button>}
      </form>
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

export default function App() {
  const [game, dispatch] = useReducer(gameReducer, DEFAULT_CONFIG, createGame);
  const [screen, setScreen] = useState<'settings' | 'game'>('settings');
  const [hasGame, setHasGame] = useState(false);
  const [timerSession, setTimerSession] = useState(0);
  const [control, setControl] = useState<ControlMode>('drag');
  const [controlDialog, setControlDialog] = useState<{ config: Config; initial: ControlMode; newGame: boolean } | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const pauseButton = useRef<HTMLButtonElement>(null);
  const [pausedFieldHeight, setPausedFieldHeight] = useState<number>();
  const gameHeading = useRef<HTMLHeadingElement>(null);
  const won = isWon(game);
  const elapsed = useGameTimer(hasGame && screen === 'game' && !won && !game.paused && !controlDialog, timerSession);
  const elapsedLabel = formatElapsed(elapsed);
  const future = game.history.length - 1 - game.cursor;
  useEffect(() => { if (screen === 'game') gameHeading.current?.focus(); }, [screen]);

  useEffect(() => {
    if (screen !== 'game' || game.paused || won || controlDialog) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable], dialog, [role="dialog"]')) return;
      if (event.key === 'Escape') dispatch({ type: 'clearSelection' });
      else if (/^[1-6]$/.test(event.key) && Number(event.key) <= game.config.rods) {
        event.preventDefault();
        dispatch({ type: 'select', rod: Number(event.key) - 1 });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [screen, game.paused, game.config.rods, won, controlDialog]);

  function openControls(config: Config, newGame: boolean) {
    setPausedFieldHeight(fieldRef.current?.getBoundingClientRect().height);
    dispatch({ type: 'clearSelection' });
    setControlDialog({ config, initial: newGame ? defaultControl(config.mode) : control, newGame });
  }

  function togglePause() {
    if (game.paused) {
      dispatch({ type: 'resume' });
      pauseButton.current?.focus();
    } else {
      setPausedFieldHeight(fieldRef.current?.getBoundingClientRect().height);
      dispatch({ type: 'pause' });
    }
  }

  function startGame(config: Config) {
    dispatch({ type: 'start', config });
    setTimerSession(session => session + 1);
    setHasGame(true);
    setScreen('game');
  }

  return <div className="app-shell">
    <header className="site-header"><a href="./" className="brand" aria-label="Пирамидки — на главную"><img src={`${import.meta.env.BASE_URL}favicon.svg`} width="38" height="38" alt="" /><span>пирамидки<span className="brand-dot">.</span></span></a><span className="header-caption">Маленькие шаги. Большое решение.</span><span className="header-badge"><span /> Время подумать</span></header>
    <main>
      <section className="intro"><div><p className="eyebrow"><span className="tiny-star">✳</span> Классическая головоломка</p><h1>Всё сложится<span className="title-dot">.</span></h1><p className="intro-description">Несколько дисков и одно простое правило.<br className="desktop-break" /> Перенесите пирамидку — ход за ходом.</p></div><div className="intro-aside"><span className="orbit-mark" aria-hidden="true">↗</span><p>Не спешите.<br />Здесь важен каждый ход.</p></div></section>
      {screen === 'settings' ? <Settings initial={game.config} hasGame={hasGame} onBack={() => setScreen('game')} hidePreview={!!controlDialog} onStart={config => openControls(config, true)} /> :
        <section className={`game-card ${won ? 'game-won' : ''}`} aria-labelledby="game-title">
          <div className="game-heading">
            <div className="game-title-block">
              <div className="eyebrow">{won ? 'Отличная работа' : 'Ваша партия'}</div>
              <h2 id="game-title" tabIndex={-1} ref={gameHeading}>{won ? 'Всё получилось!' : 'Ход за ходом'}</h2>
              <span className={`mode-badge ${game.config.mode === 'hardcore' ? 'mode-hardcore' : ''}`}>{game.config.mode === 'hardcore' ? 'Хардкор · Только соседи' : 'Обычный режим'}</span>
            </div>
            <div className="game-meta">
              <span className="config-summary">{countLabel(game.config.rods, 'стержня', 'стержней')} · {countLabel(game.config.disks, 'диска', 'дисков')}</span>
              <div className="timer-controls">
                <div className="move-count game-timer"><strong role="timer" aria-label="Время партии" aria-live="off">{elapsedLabel}</strong><span>Время</span></div>
                <button ref={pauseButton} type="button" className="button pause-button" disabled={won} aria-pressed={game.paused} onClick={togglePause}>
                  <Icon name={game.paused ? 'play' : 'pause'} />{game.paused ? 'Продолжить' : 'Пауза'}
                </button>
              </div>
              <div className="move-count"><strong>{game.cursor}</strong><span>Ходов</span></div>
              <button type="button" className="button control-button" onClick={() => openControls(game.config, false)}>Управление</button>
              <button type="button" className="button button-settings" aria-label="Настройки" onClick={() => setScreen('settings')}><Icon name="settings" /><span>Настройки</span></button>
            </div>
          </div>
          <div ref={fieldRef} className="play-area" style={game.paused || controlDialog ? { height: pausedFieldHeight } : undefined}>
            {controlDialog ? <div className="pause-panel"><h3>Выбор управления</h3><p>Время остановлено.</p></div> : game.paused ? <section className="pause-panel" aria-labelledby="pause-title">
              <span className="pause-mark"><Icon name="pause" /></span>
              <h3 id="pause-title">Игра на паузе</h3>
              <p>Пирамидка подождёт.<br />Продолжите, когда будете готовы.</p>
              <button type="button" className="button button-primary" onClick={togglePause}><Icon name="play" />Продолжить</button>
            </section> : <BoardView board={currentBoard(game)} config={game.config} selected={game.selected} won={won} control={control} onClear={() => dispatch({ type: 'clearSelection' })} onMove={(from, to) => dispatch({ type: 'move', from, to })} onRod={rod => dispatch({ type: 'select', rod })} />}
          </div>
          <div className={`game-message ${game.error ? 'message-error' : ''} ${won ? 'message-success' : ''}`} role="status" aria-live="polite" aria-atomic="true"><Icon name={won ? 'check' : game.error ? 'info' : 'spark'} /><span>{controlDialog ? 'Выберите удобный способ управления.' : game.paused ? 'Время остановлено. Продолжите игру, когда будете готовы.' : won ? `Пирамидка собрана! Количество ходов: ${game.cursor}. Время: ${elapsedLabel}. Можно начать заново или вернуться к любому ходу.` : game.error ?? (game.selected !== null ? `Выбран диск ${currentBoard(game)[game.selected].at(-1)}. Нажмите на стержень, куда хотите его переместить.` : CONTROL_HINTS[control])}</span></div>
          <div className="game-toolbar"><div className="history-buttons"><button className="button" type="button" disabled={game.paused || game.cursor === 0} onClick={() => dispatch({ type: 'undo' })}><Icon name="undo" />Отменить</button><button className="button" type="button" disabled={game.paused || future === 0} onClick={() => dispatch({ type: 'redo' })}><Icon name="redo" />Повторить</button></div><span className="history-position">Шаг {game.cursor} из {game.history.length - 1}</span><button type="button" className="button restart-button" onClick={() => startGame(game.config)}><Icon name="restart" />Начать заново</button></div>
        </section>}
      {screen === 'game' && <Rules mode={game.config.mode} control={control} />}
    </main>
    {controlDialog && <ControlDialog mode={controlDialog.config.mode} initial={controlDialog.initial} newGame={controlDialog.newGame}
      onClose={() => setControlDialog(null)} onConfirm={choice => {
        setControl(choice);
        if (controlDialog.newGame) startGame(controlDialog.config);
        setControlDialog(null);
      }} />}
    <footer><span>Простые правила. Красивые решения.</span><span>Сделайте паузу для мысли <span className="footer-spark">✳</span></span></footer>
  </div>;
}
