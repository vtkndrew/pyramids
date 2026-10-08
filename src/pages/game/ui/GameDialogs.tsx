import { CONTROL_LABELS, isWon, Rules } from "@/entities/game";
import { GameHistory } from "@/features/game-history";
import {
  ControlPicker as ControlDialog,
  SettingsForm,
} from "@/features/game-setup";
import { PwaPanel } from "@/features/pwa";
import { bindClasses } from "@/shared/lib/styles";
import { formatElapsed } from "@/shared/lib/time";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/shared/ui/dialog";
import { Icon } from "@/shared/ui/icon";
import type { ReactNode } from "react";
import type { GamePageModel } from "../model/useGamePage";
import { PANEL_TITLES } from "../model/useGamePage";
import styles from "./GamePage.module.css";
const css = bindClasses(styles);
function countLabel(count: number, few: string, many: string) {
  return `${count} ${count < 5 ? few : many}`;
}
export function GameDialogs({
  model,
  saveNotice,
}: {
  model: GamePageModel;
  saveNotice: ReactNode;
}) {
  const {
    pwa,
    applicationLabel,
    pwaReturn,
    panel,
    setPanel,
    saved,
    game,
    control,
    hasGame,
    modal,
    draft,
    setDraft,
    controlDraft,
    setControlDraft,
    newGameControls,
    fromMenu,
    historyReturn,
    openPanel,
    openApplication,
    openHistory,
    resumeSaved,
    chooseNewControls,
    closePanel,
    startGame,
    setControl,
  } = model;
  return (
    modal &&
    panel && (
      <Dialog
        title={PANEL_TITLES[panel]}
        view={panel}
        onClose={closePanel}
        onBack={
          panel === "application" ||
          panel === "update" ||
          panel === "history" ||
          panel === "welcome" ||
          panel === "storage"
            ? undefined
            : panel === "controls" && newGameControls
              ? () => setPanel("settings")
              : fromMenu && panel !== "menu"
                ? () => setPanel("menu")
                : undefined
        }
      >
        {panel !== "storage" && saveNotice}
        {panel === "settings" && (
          <SettingsForm
            modal
            onHistory={openHistory}
            onApplication={openApplication}
            applicationLabel={applicationLabel}
            config={draft}
            onChange={setDraft}
            onStart={chooseNewControls}
            onBack={hasGame ? () => setPanel(null) : undefined}
          />
        )}
        {panel === "controls" && (
          <ControlDialog
            mode={newGameControls ? draft.mode : game.config.mode}
            control={controlDraft}
            newGame={newGameControls}
            onChange={setControlDraft}
            onConfirm={() => {
              if (newGameControls) startGame(draft, controlDraft);
              else {
                setControl(controlDraft);
                setPanel(null);
              }
            }}
          />
        )}
        {panel === "menu" && (
          <>
            <DialogBody
              className={css("dialog-body menu-body")}
              data-testid="dialog-body"
            >
              <div className={css("menu-summary")}>
                <p>
                  {game.config.mode === "hardcore"
                    ? "Хардкор · Только соседи"
                    : "Обычный режим"}
                </p>
                <p>
                  {countLabel(game.config.rods, "стержня", "стержней")} ·{" "}
                  {countLabel(game.config.disks, "диска", "дисков")}
                </p>
                <p>Управление: {CONTROL_LABELS[control]}</p>
                <p
                  className={css("history-position")}
                  data-testid="history-position"
                >
                  Шаг {game.cursor} из {game.history.length - 1}
                </p>
              </div>
              <div className={css("menu-actions")}>
                <Button
                  type="button"
                  onClick={() => openPanel("settings", true)}
                  className={css("", "action")}
                >
                  <Icon name="settings" />
                  Настройки
                </Button>
                <Button
                  type="button"
                  onClick={() => openPanel("controls", true)}
                  className={css("", "action")}
                >
                  Управление
                </Button>
                <Button
                  type="button"
                  onClick={() => openPanel("rules", true)}
                  className={css("", "action")}
                >
                  <Icon name="info" />
                  Правила
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
                  onClick={openApplication}
                  className={css("", "action")}
                >
                  {applicationLabel}
                </Button>
                {pwa.needRefresh && (
                  <Button
                    type="button"
                    onClick={openApplication}
                    className={css(" update-entry", "action")}
                  >
                    Доступна новая версия
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => startGame(game.config)}
                  className={css("", "action")}
                >
                  <Icon name="restart" />
                  Начать заново
                </Button>
              </div>
            </DialogBody>
            <DialogFooter
              className={css("dialog-footer")}
              data-testid="dialog-footer"
            >
              <Button
                type="button"
                onClick={() => setPanel(null)}
                variant="primary"
                layout="start"
                className={css(" start-button", "action", "primary-action")}
              >
                Назад к игре
              </Button>
            </DialogFooter>
          </>
        )}
        {panel === "welcome" && (
          <>
            <DialogBody
              className={css("dialog-body welcome-body")}
              data-testid="dialog-body"
            >
              <p>
                {saved.latest &&
                  `${saved.latest.game.config.mode === "hardcore" ? "Хардкор" : "Обычный"} · Стержней: ${saved.latest.game.config.rods} · Дисков: ${saved.latest.game.config.disks}`}
              </p>
              <p>
                Ходов: {saved.latest?.game.cursor ?? 0} · Время:{" "}
                {formatElapsed(saved.latest?.elapsed ?? 0)}
              </p>
              <Button onClick={openHistory} className={css("", "action")}>
                История игр
              </Button>
            </DialogBody>
            <DialogFooter
              className={css("dialog-footer welcome-actions")}
              data-testid="dialog-footer"
            >
              <Button
                onClick={resumeSaved}
                variant="primary"
                className={css("", "action", "primary-action")}
              >
                {saved.latest && isWon(saved.latest.game)
                  ? "Открыть последнюю партию"
                  : "Продолжить партию"}
              </Button>
              <Button
                onClick={() => openPanel("settings")}
                className={css("", "action")}
              >
                Новая игра
              </Button>
            </DialogFooter>
          </>
        )}
        {panel === "history" && (
          <GameHistory
            repository={saved.repository}
            latest={saved.latest}
            flush={saved.flush}
            onOpen={resumeSaved}
            onBack={() => setPanel(historyReturn)}
          />
        )}
        {panel === "storage" && (
          <>
            <DialogBody
              className={css("dialog-body")}
              data-testid="dialog-body"
            >
              <p role="alert">{saved.error}</p>
              <p>
                {saved.conflict
                  ? "Продолжайте игру в одном окне. Закройте другое окно и загрузите последнее сохранение; изменения этого окна не заменят его."
                  : "Сохранённые данные остаются на устройстве."}
              </p>
              {saved.incompatible && (
                <Button onClick={openApplication} className={css("", "action")}>
                  Приложение и обновления
                </Button>
              )}
            </DialogBody>
            <DialogFooter
              className={css("dialog-footer")}
              data-testid="dialog-footer"
            >
              <Button
                type="button"
                onClick={() => {
                  void saved
                    .reload()
                    .then((last) => setPanel(last ? "welcome" : "settings"));
                }}
                variant="primary"
                layout="start"
                className={css(" start-button", "action", "primary-action")}
              >
                Загрузить актуальное сохранение
              </Button>
            </DialogFooter>
          </>
        )}
        {(panel === "application" || panel === "update") && (
          <PwaPanel
            beforeUpdate={saved.beforeUpdate}
            confirmUpdate={panel === "update"}
            onConfirmUpdate={() => setPanel("update")}
            onBack={() =>
              setPanel(panel === "update" ? "application" : pwaReturn)
            }
          />
        )}
        {panel === "rules" && (
          <>
            <DialogBody
              className={css("dialog-body")}
              data-testid="dialog-body"
            >
              <Rules modal mode={game.config.mode} control={control} />
              <p className={css("control-extra")}>
                Брать можно только верхний диск. Нажатия работают при любом
                управлении. Пауза скрывает поле и останавливает время. Новый ход
                после отмены заменяет будущие ходы.
              </p>
            </DialogBody>
            <DialogFooter
              className={css("dialog-footer")}
              data-testid="dialog-footer"
            >
              <Button
                type="button"
                onClick={() => setPanel(null)}
                variant="primary"
                layout="start"
                className={css(" start-button", "action", "primary-action")}
              >
                Назад к игре
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
    )
  );
}
