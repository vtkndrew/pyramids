import { currentBoard } from "@/entities/game";
import { InteractiveBoard } from "@/features/play-game";
import { bindClasses } from "@/shared/lib/styles";
import { Button } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/icon";
import type { ReactNode } from "react";
import type { GamePageModel } from "../model/useGamePage";
import { PANEL_TITLES } from "../model/useGamePage";
import styles from "./GamePage.module.css";
const css = bindClasses(styles);
function countLabel(count: number, few: string, many: string) {
  return `${count} ${count < 5 ? few : many}`;
}
export function GamePanel({
  model,
  saveNotice,
}: {
  model: GamePageModel;
  saveNotice: ReactNode;
}) {
  const {
    compact,
    pwa,
    applicationLabel,
    panel,
    saved,
    game,
    dispatch,
    control,
    elapsedLabel,
    future,
    fieldRef,
    pauseButton,
    pausedFieldHeight,
    gameHeading,
    won,
    fullMessage,
    compactMessage,
    openPanel,
    openApplication,
    openHistory,
    togglePause,
    startGame,
  } = model;
  const pauseControl = (
    <Button
      ref={pauseButton}
      type="button"
      disabled={won}
      aria-pressed={game.paused}
      onClick={togglePause}
      className={css(" pause-button", "action")}
      data-testid="pause-button"
    >
      <Icon name={game.paused ? "play" : "pause"} />
      <span>{game.paused ? "Продолжить" : "Пауза"}</span>
    </Button>
  );
  return (
    <section
      aria-labelledby="game-title"
      className={css(`game-card ${won ? "game-won" : ""}`)}
    >
      <div className={css("game-heading")} data-testid="game-heading">
        <div className={css("game-title-block")}>
          {!compact && (
            <div className={css("eyebrow")}>
              {won ? "Отличная работа" : "Ваша партия"}
            </div>
          )}
          <h2
            id="game-title"
            tabIndex={-1}
            ref={gameHeading}
            data-return-focus={!compact ? "" : undefined}
            className={css(compact ? "visually-hidden" : undefined)}
          >
            {won ? "Всё получилось!" : "Ход за ходом"}
          </h2>
          <span
            className={css(
              `mode-badge ${game.config.mode === "hardcore" ? "mode-hardcore" : ""}`,
            )}
            data-testid="mode-badge"
          >
            {game.config.mode === "hardcore"
              ? compact
                ? "Хардкор"
                : "Хардкор · Только соседи"
              : compact
                ? "Обычный"
                : "Обычный режим"}
          </span>
        </div>
        <div className={css("game-meta")}>
          {!compact && (
            <span className={css("config-summary")}>
              {countLabel(game.config.rods, "стержня", "стержней")} ·{" "}
              {countLabel(game.config.disks, "диска", "дисков")}
            </span>
          )}
          <div className={css("timer-controls")}>
            <div className={css("move-count game-timer")}>
              <strong role="timer" aria-label="Время партии" aria-live="off">
                {elapsedLabel}
              </strong>
              <span>Время</span>
            </div>
            {!compact && pauseControl}
          </div>
          <div className={css("move-count")}>
            <strong data-testid="move-value">{game.cursor}</strong>
            <span>Ходов</span>
          </div>
          {!compact && (
            <>
              <Button
                type="button"
                onClick={() => openPanel("controls")}
                className={css(" control-button", "action")}
              >
                Управление
              </Button>
              <Button
                type="button"
                aria-label="Настройки"
                onClick={() => openPanel("settings")}
                className={css(" button-settings", "action")}
              >
                <Icon name="settings" />
                <span>Настройки</span>
              </Button>
              <Button
                type="button"
                onClick={openHistory}
                className={css("", "action")}
              >
                История игр
              </Button>
              <Button
                type="button"
                aria-label={applicationLabel}
                onClick={(event) => {
                  event.currentTarget.focus();
                  openApplication();
                }}
                className={css(" pwa-header-button", "action")}
              >
                {applicationLabel}
                {pwa.needRefresh && (
                  <span aria-hidden="true" className={css("update-dot")} />
                )}
              </Button>
            </>
          )}
        </div>
      </div>
      <div
        ref={fieldRef}
        style={
          !compact && (game.paused || panel)
            ? { height: pausedFieldHeight }
            : undefined
        }
        className={css("play-area")}
        data-testid="play-area"
      >
        {panel ? (
          <div className={css("pause-panel")} data-testid="pause-panel">
            <h3>{PANEL_TITLES[panel]}</h3>
            <p>Время остановлено.</p>
          </div>
        ) : game.paused ? (
          <section
            aria-labelledby="pause-title"
            className={css("pause-panel")}
            data-testid="pause-panel"
          >
            <span className={css("pause-mark")}>
              <Icon name="pause" />
            </span>
            <h3 id="pause-title">Игра на паузе</h3>
            <p>
              Пирамидка подождёт.
              <br />
              Продолжите, когда будете готовы.
            </p>
            <Button
              type="button"
              onClick={togglePause}
              variant="primary"
              className={css("", "action", "primary-action")}
            >
              <Icon name="play" />
              Продолжить
            </Button>
          </section>
        ) : (
          <InteractiveBoard
            fitHeight={compact}
            board={currentBoard(game)}
            config={game.config}
            selected={game.selected}
            won={won}
            control={control}
            onClear={() => dispatch({ type: "clearSelection" })}
            onMove={(from, to) => dispatch({ type: "move", from, to })}
            onRod={(rod) => dispatch({ type: "select", rod })}
          />
        )}
      </div>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={css(
          `game-message ${game.error ? "message-error" : ""} ${won ? "message-success" : ""}`,
        )}
        data-testid="game-message"
      >
        <Icon name={won ? "check" : game.error ? "info" : "spark"} />
        {(saved.error ? (
          compact ? (
            <span>Прогресс не сохраняется. Откройте меню.</span>
          ) : (
            saveNotice
          )
        ) : null) ||
          (compact ? (
            <>
              <span aria-hidden="true">{compactMessage}</span>
              <span className={css("visually-hidden")}>{fullMessage}</span>
            </>
          ) : (
            <span>{fullMessage}</span>
          ))}
      </div>
      <div className={css("game-toolbar")} data-testid="game-toolbar">
        <div className={css("history-buttons")}>
          <Button
            type="button"
            disabled={game.paused || !!panel || game.cursor === 0}
            onClick={() => dispatch({ type: "undo" })}
            className={css("", "action")}
          >
            <Icon name="undo" />
            <span>Отменить</span>
          </Button>
          <Button
            type="button"
            disabled={game.paused || !!panel || future === 0}
            onClick={() => dispatch({ type: "redo" })}
            className={css("", "action")}
          >
            <Icon name="redo" />
            <span>Повторить</span>
          </Button>
        </div>
        {compact ? (
          <>
            {pauseControl}
            <Button
              type="button"
              data-return-focus
              onClick={(event) => {
                event.currentTarget.focus();
                openPanel("menu");
              }}
              className={css(" menu-button", "action")}
            >
              <Icon name="menu" />
              <span>Меню</span>
              {pwa.needRefresh && (
                <span aria-hidden="true" className={css("update-dot")} />
              )}
            </Button>
          </>
        ) : (
          <>
            <span
              className={css("history-position")}
              data-testid="history-position"
            >
              Шаг {game.cursor} из {game.history.length - 1}
            </span>
            <Button
              type="button"
              onClick={() => startGame(game.config)}
              className={css(" restart-button", "action")}
            >
              <Icon name="restart" />
              Начать заново
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
