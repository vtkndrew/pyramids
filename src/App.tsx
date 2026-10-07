import { useEffect, useReducer, useRef, useState, type CSSProperties } from 'react';
import { createGame, currentBoard, DEFAULT_CONFIG, gameReducer, isWon, moveError, type Board, type Config } from './game';

type IconName = 'arrow' | 'undo' | 'redo' | 'restart' | 'settings' | 'check' | 'spark' | 'info';
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
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

const COLORS = ['#d18a67', '#dfb759', '#9cab79', '#69a298', '#7e91b8', '#aa8eaf', '#be7587', '#be9a78', '#8b9c5a', '#7b9eae'];

function countLabel(count: number, few: string, many: string) {
  return `${count} ${count < 5 ? few : many}`;
}

function BoardView({ board, config, selected = null, onRod, won = false }: {
  board: Board; config: Config; selected?: number | null; onRod?: (rod: number) => void; won?: boolean;
}) {
  return <div className="board-scroll" role="region" aria-label={onRod ? 'Игровое поле' : 'Начальная позиция'} tabIndex={0}>
    <div className={`board ${onRod ? '' : 'board-preview'}`} style={{ '--rod-count': config.rods, '--disk-count': config.disks } as CSSProperties}>
      {board.map((disks, rod) => {
        const target = rod === config.rods - 1;
        const active = selected === rod;
        const available = selected !== null && !active && !moveError(board, selected, rod);
        const content = <>
          <span className="rod-top-label">{target ? <><span className="target-dot" /> Цель</> : rod === 0 ? 'Старт' : '\u00a0'}</span>
          <span className="rod-scene" aria-hidden="true">
            <span className="rod-pole" />
            {target && disks.length === 0 && <span className="target-outline" />}
            <span className="disk-stack">
              {disks.map((disk, index) => <span key={disk} className={`disk ${active && index === disks.length - 1 ? 'disk-selected' : ''}`} style={{ width: `${30 + (disk / config.disks) * 62}%`, backgroundColor: COLORS[disk - 1] }}>
                <span>{disk}</span>
              </span>)}
            </span>
            <span className="rod-base" />
          </span>
          <span className="rod-number">{String(rod + 1).padStart(2, '0')}<span>{active ? 'Выбран' : available ? 'Переместить сюда' : `Стержень ${rod + 1}`}</span></span>
        </>;
        const className = `rod ${target ? 'rod-target' : ''} ${active ? 'rod-selected' : ''} ${available ? 'rod-available' : ''}`;
        return onRod ? <button key={rod} type="button" className={className} aria-label={`Стержень ${rod + 1}${target ? ', цель' : ''}. ${disks.length ? `Диски снизу вверх: ${disks.join(', ')}. Верхний диск: ${disks.at(-1)}.` : 'Пустой.'}`} aria-pressed={active} disabled={won} onClick={() => onRod(rod)}>{content}</button>
          : <div key={rod} className={className}>{content}</div>;
      })}
    </div>
  </div>;
}

function Settings({ initial, hasGame, onStart, onBack }: {
  initial: Config; hasGame: boolean; onStart: (config: Config) => void; onBack: () => void;
}) {
  const [config, setConfig] = useState(initial);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <div className="setup-layout">
    <section className="preview-card">
      <div className="card-heading"><span className="eyebrow">Всё начинается с первого хода</span><span className="preview-tag">Начальная позиция</span></div>
      <BoardView config={config} board={currentBoard(createGame(config))} />
      <div className="preview-note"><span className="note-line" /><span>С первого стержня — на последний</span><Icon name="arrow" /></div>
    </section>
    <section className="settings-card" aria-labelledby="settings-title">
      <div className="settings-icon"><Icon name="settings" /></div>
      <h2 id="settings-title" ref={heading} tabIndex={-1}>Ваша головоломка</h2>
      <p className="muted settings-description">Выберите сложность и найдите свой путь к решению.</p>
      <form onSubmit={event => { event.preventDefault(); onStart(config); }}>
        <fieldset><legend>Количество стержней</legend><div className="rod-options">{[3, 4, 5, 6].map(rods => <label key={rods} className={config.rods === rods ? 'option checked' : 'option'}><input type="radio" name="rods" value={rods} checked={config.rods === rods} onChange={() => setConfig({ ...config, rods })} /><span>{rods}</span></label>)}</div></fieldset>
        <div className="disk-setting"><div className="field-label"><label htmlFor="disks">Количество дисков</label><output htmlFor="disks">{config.disks}</output></div><input id="disks" type="range" min="3" max="10" value={config.disks} onChange={event => setConfig({ ...config, disks: Number(event.target.value) })} style={{ '--range-progress': `${(config.disks - 3) / 7 * 100}%` } as CSSProperties} /><div className="range-labels"><span>3 · Попроще</span><span>10 · Посложнее</span></div></div>
        <p className="settings-hint"><Icon name="info" /><span>Больше дисков — больше шагов.<br />Больше стержней — больше свободы.</span></p>
        <button className="button button-primary start-button" type="submit">Начать игру <Icon name="arrow" /></button>
        {hasGame && <button type="button" className="button back-button" onClick={onBack}>Назад к игре</button>}
      </form>
    </section>
  </div>;
}

function Rules() {
  return <section className="rules" aria-label="Как играть">
    <div className="rule"><span className="rule-index">01</span><div><h3>Выберите диск</h3><p>Нажмите на стержень, чтобы взять верхний диск.</p></div></div>
    <div className="rule"><span className="rule-index">02</span><div><h3>Найдите ему место</h3><p>Нажмите на пустой стержень или на стержень с диском большего размера.</p></div></div>
    <div className="rule"><span className="rule-index">03</span><div><h3>Соберите пирамидку</h3><p>Перенесите все диски на последний стержень. В своём темпе.</p></div></div>
  </section>;
}

export default function App() {
  const [game, dispatch] = useReducer(gameReducer, DEFAULT_CONFIG, createGame);
  const [screen, setScreen] = useState<'settings' | 'game'>('settings');
  const [hasGame, setHasGame] = useState(false);
  const gameHeading = useRef<HTMLHeadingElement>(null);
  const won = isWon(game);
  const future = game.history.length - 1 - game.cursor;
  useEffect(() => { if (screen === 'game') gameHeading.current?.focus(); }, [screen]);

  return <div className="app-shell">
    <header className="site-header"><a href="./" className="brand" aria-label="Пирамидки — на главную"><img src="/favicon.svg" width="38" height="38" alt="" /><span>пирамидки<span className="brand-dot">.</span></span></a><span className="header-caption">Маленькие шаги. Большое решение.</span><span className="header-badge"><span /> Время подумать</span></header>
    <main>
      <section className="intro"><div><p className="eyebrow"><span className="tiny-star">✳</span> Классическая головоломка</p><h1>Всё сложится<span className="title-dot">.</span></h1><p className="intro-description">Несколько дисков и одно простое правило.<br className="desktop-break" /> Перенесите пирамидку — ход за ходом.</p></div><div className="intro-aside"><span className="orbit-mark" aria-hidden="true">↗</span><p>Не спешите.<br />Здесь важен каждый ход.</p></div></section>
      {screen === 'settings' ? <Settings initial={game.config} hasGame={hasGame} onBack={() => setScreen('game')} onStart={config => { dispatch({ type: 'start', config }); setHasGame(true); setScreen('game'); }} /> :
        <section className={`game-card ${won ? 'game-won' : ''}`} aria-labelledby="game-title">
          <div className="game-heading"><div><div className="eyebrow">{won ? 'Отличная работа' : 'Ваша партия'}</div><h2 id="game-title" tabIndex={-1} ref={gameHeading}>{won ? 'Всё получилось!' : 'Ход за ходом'}</h2></div><div className="game-meta"><span className="config-summary">{countLabel(game.config.rods, 'стержня', 'стержней')} · {countLabel(game.config.disks, 'диска', 'дисков')}</span><div className="move-count"><strong>{game.cursor}</strong><span>Ходов</span></div><button type="button" className="button button-settings" aria-label="Настройки" onClick={() => setScreen('settings')}><Icon name="settings" /><span>Настройки</span></button></div></div>
          <BoardView board={currentBoard(game)} config={game.config} selected={game.selected} won={won} onRod={rod => dispatch({ type: 'select', rod })} />
          <div className={`game-message ${game.error ? 'message-error' : ''} ${won ? 'message-success' : ''}`} role="status" aria-live="polite" aria-atomic="true"><Icon name={won ? 'check' : game.error ? 'info' : 'spark'} /><span>{won ? `Пирамидка собрана! Количество ходов: ${game.cursor}. Можно начать заново или вернуться к любому ходу.` : game.error ?? (game.selected !== null ? `Выбран диск ${currentBoard(game)[game.selected].at(-1)}. Нажмите на стержень, куда хотите его переместить.` : game.cursor === 0 ? 'Первый шаг — ваш. Нажмите на стержень с дисками.' : 'Выберите верхний диск для следующего хода.')}</span></div>
          <div className="game-toolbar"><div className="history-buttons"><button className="button" type="button" disabled={game.cursor === 0} onClick={() => dispatch({ type: 'undo' })}><Icon name="undo" />Отменить</button><button className="button" type="button" disabled={future === 0} onClick={() => dispatch({ type: 'redo' })}><Icon name="redo" />Повторить</button></div><span className="history-position">Шаг {game.cursor} из {game.history.length - 1}</span><button type="button" className="button restart-button" onClick={() => dispatch({ type: 'restart' })}><Icon name="restart" />Начать заново</button></div>
        </section>}
      <Rules />
    </main>
    <footer><span>Простые правила. Красивые решения.</span><span>Сделайте паузу для мысли <span className="footer-spark">✳</span></span></footer>
  </div>;
}
