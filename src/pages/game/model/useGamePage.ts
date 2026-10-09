import { useEffect, useRef, useState } from 'react';

import {
  currentBoard,
  DEFAULT_CONFIG,
  isWon,
  type Config,
  defaultControl,
  CONTROL_HINTS,
  type ControlMode,
} from '@/entities/game';
import { useGameSession, useGameKeyboard } from '@/features/play-game';
import { usePwa } from '@/features/pwa';
import { useCompactLayout } from '@/shared/lib/layout';
import { formatElapsed } from '@/shared/lib/time';

type Panel =
  | 'settings'
  | 'controls'
  | 'menu'
  | 'rules'
  | 'application'
  | 'update'
  | 'history'
  | 'welcome'
  | 'storage'
  | null;
export const PANEL_TITLES = {
  settings: 'Ваша головоломка',
  controls: 'Управление',
  menu: 'Меню партии',
  rules: 'Как играть',
  application: 'Приложение',
  update: 'Обновить приложение?',
  history: 'История игр',
  welcome: 'Ваша последняя партия',
  storage: 'Сохранение партии',
};

export function useGamePage() {
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
  const desktopSettings =
    !compact &&
    (panel === 'settings' ||
      (panel === 'controls' && newGameControls) ||
      ((panel === 'application' || panel === 'update') && pwaReturn === 'settings') ||
      (panel === 'history' && historyReturn === 'settings'));
  const modal = panel !== null && (compact || panel !== 'settings');

  const bootHandled = useRef(false);

  useEffect(() => {
    if (!saved.loading && !bootHandled.current) {
      bootHandled.current = true;

      if (saved.latest) {
        setPanel('welcome');
      }
    }
  }, [saved.loading, saved.latest]);
  useEffect(() => {
    if (saved.conflict || saved.incompatible) {
      setPanel('storage');
    }
  }, [saved.conflict, saved.incompatible]);

  useEffect(() => {
    if (hasGame && !panel) {
      gameHeading.current?.focus({ preventScroll: true });
    }
  }, [hasGame, panel, timerSession]);

  useGameKeyboard(hasGame && !panel && !game.paused && !won, game.config.rods, dispatch);

  function openPanel(next: Exclude<Panel, null>, viaMenu = false) {
    if (!panel) {
      setPausedFieldHeight(fieldRef.current?.getBoundingClientRect().height);
    }

    dispatch({ type: 'clearSelection' });
    setFromMenu(viaMenu);

    if (next === 'settings') {
      setDraft(hasGame ? game.config : draft);
    }

    if (next === 'controls') {
      setNewGameControls(false);
      setControlDraft(control);
    }

    setPanel(next);
  }

  function openApplication() {
    setPwaReturn(panel === 'settings' || panel === 'menu' ? panel : null);
    openPanel('application', fromMenu || panel === 'menu');
  }

  function openHistory() {
    setHistoryReturn(panel);
    openPanel('history', panel === 'menu' || fromMenu);
  }

  function resumeSaved() {
    setPanel(saved.resume() ? null : 'storage');
  }

  function chooseNewControls() {
    setNewGameControls(true);
    setControlDraft(defaultControl(draft.mode));
    setPanel('controls');
  }

  function closePanel() {
    if (panel === 'history') {
      function getHistoryDestination() {
        if (hasGame) {
          return null;
        }

        if (saved.latest) {
          return 'welcome';
        }

        return 'settings';
      }

      setPanel(getHistoryDestination());

      return;
    }

    if (panel === 'settings' && !hasGame && saved.latest) {
      setPanel('welcome');

      return;
    }

    if (panel === 'update') {
      setPanel('application');

      return;
    }

    if (panel === 'application' && pwaReturn === 'settings') {
      setPanel('settings');

      return;
    }

    setPanel(panel === 'controls' && newGameControls ? 'settings' : null);
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

  function startGame(config: Config, nextControl = control) {
    setPanel(saved.start(config, nextControl) ? null : 'storage');
  }

  function getFullMessage() {
    if (panel) {
      return 'Время остановлено.';
    }

    if (game.paused) {
      return 'Время остановлено. Продолжите игру, когда будете готовы.';
    }

    if (won) {
      return `Пирамидка собрана! Количество ходов: ${game.cursor}. Время: ${elapsedLabel}. Можно начать заново или вернуться к любому ходу.`;
    }

    return (
      game.error ??
      (game.selected !== null
        ? `Выбран диск ${currentBoard(game)[game.selected].at(-1)}. Нажмите на стержень, куда хотите его переместить.`
        : CONTROL_HINTS[control])
    );
  }

  const fullMessage = getFullMessage();

  function getShortError() {
    if (game.error?.includes('Большой диск')) {
      return 'Большой диск нельзя класть на маленький.';
    }

    if (game.error?.includes('соседний')) {
      return 'Можно переносить только к соседу.';
    }

    if (game.error?.includes('нет дисков')) {
      return 'Здесь нет дисков.';
    }

    return 'Выберите стержень на поле.';
  }

  const shortError = getShortError();

  function getCompactMessage() {
    if (panel || game.paused) {
      return 'Время остановлено.';
    }

    if (won) {
      return 'Пирамидка собрана!';
    }

    if (game.error) {
      return shortError;
    }

    if (game.selected !== null) {
      return `Диск ${currentBoard(game)[game.selected].at(-1)}: выберите цель.`;
    }

    if (control === 'swipe') {
      return 'Смахните к соседнему стержню.';
    }

    if (control === 'drag') {
      return 'Перетащите верхний диск.';
    }

    return 'Нажмите на стержень с дисками.';
  }

  const compactMessage = getCompactMessage();

  return {
    compact,
    pwa,
    applicationLabel,
    pwaReturn,
    panel,
    setPanel,
    saved,
    game,
    dispatch,
    control,
    hasGame,
    elapsedLabel,
    future,
    desktopSettings,
    modal,
    draft,
    setDraft,
    controlDraft,
    setControlDraft,
    newGameControls,
    fromMenu,
    fieldRef,
    pauseButton,
    pausedFieldHeight,
    gameHeading,
    won,
    fullMessage,
    compactMessage,
    historyReturn,
    openPanel,
    openApplication,
    openHistory,
    resumeSaved,
    chooseNewControls,
    closePanel,
    togglePause,
    startGame,
    setControl,
  };
}

export type GamePageModel = ReturnType<typeof useGamePage>;
