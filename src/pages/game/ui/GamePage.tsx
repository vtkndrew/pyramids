import { BoardView, createGame, currentBoard, Rules } from "@/entities/game";
import { bindClasses } from "@/shared/lib/styles";
import { Button } from "@/shared/ui/button";
import { useGamePage } from "../model/useGamePage";
import { GameDialogs } from "./GameDialogs";
import styles from "./GamePage.module.css";
import { GamePanel } from "./GamePanel";
import Settings from "./Settings";
const css = bindClasses(styles);
export default function GamePage() {
  const model = useGamePage();
  const {
    compact,
    applicationLabel,
    setPanel,
    saved,
    game,
    control,
    hasGame,
    desktopSettings,
    modal,
    draft,
    setDraft,
    openPanel,
    openApplication,
    openHistory,
    chooseNewControls,
  } = model;
  if (saved.loading)
    return (
      <div
        data-compact={compact}
        className={css(`app-shell ${compact ? "compact-app" : ""}`)}
      >
        <main role="status" className={css("save-loading")}>
          Загружаем сохранение…
        </main>
      </div>
    );
  const saveNotice = saved.error && (
    <div role="alert" className={css("save-notice")}>
      <span>{saved.error}</span>
      <Button
        type="button"
        onClick={() => {
          if (saved.conflict || saved.incompatible) setPanel("storage");
          else void saved.flush().catch(() => {});
        }}
        className={css("", "action")}
      >
        {" "}
        {saved.conflict || saved.incompatible
          ? "Открыть"
          : "Повторить сохранение"}
      </Button>
    </div>
  );
  return (
    <div
      data-compact={compact}
      className={css(`app-shell ${compact ? "compact-app" : ""}`)}
    >
      <header className={css("site-header")}>
        <a
          href="./"
          aria-label="Пирамидки — на главную"
          className={css("brand")}
        >
          <img
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            width="38"
            height="38"
            alt=""
          />
          <span>
            пирамидки<span className={css("brand-dot")}>.</span>
          </span>
        </a>
        <span className={css("header-caption")}>
          Маленькие шаги. Большое решение.
        </span>
        <span className={css("header-badge")}>
          <span /> Время подумать
        </span>
      </header>
      <main>
        <section className={css("intro")}>
          <div>
            <p className={css("eyebrow")}>
              <span className={css("tiny-star")}>✳</span> Классическая
              головоломка
            </p>
            <h1>
              Всё сложится<span className={css("title-dot")}>.</span>
            </h1>
            <p className={css("intro-description")}>
              Несколько дисков и одно простое правило.
              <br className={css("desktop-break")} /> Перенесите пирамидку — ход
              за ходом.
            </p>
          </div>
          <div className={css("intro-aside")}>
            <span aria-hidden="true" className={css("orbit-mark")}>
              ↗
            </span>
            <p>
              Не спешите.
              <br />
              Здесь важен каждый ход.
            </p>
          </div>
        </section>
        {desktopSettings && saveNotice}
        {desktopSettings ? (
          <Settings
            onHistory={openHistory}
            onApplication={openApplication}
            applicationLabel={applicationLabel}
            config={draft}
            onChange={setDraft}
            hasGame={hasGame || !!saved.latest}
            onBack={() => setPanel(saved.latest && !hasGame ? "welcome" : null)}
            hidePreview={modal}
            onStart={chooseNewControls}
          />
        ) : hasGame ? (
          <GamePanel model={model} saveNotice={saveNotice} />
        ) : (
          <section
            aria-label="Новая игра"
            className={css("landing-card game-card")}
          >
            <h2>Пирамидки</h2>
            <div className={css("play-area")} data-testid="play-area">
              {!modal && (
                <BoardView
                  fitHeight={compact}
                  config={draft}
                  board={currentBoard(createGame(draft))}
                />
              )}
            </div>
            <Button
              type="button"
              data-return-focus
              onClick={() =>
                saved.latest ? setPanel("welcome") : openPanel("settings")
              }
              variant="primary"
              className={css("", "action", "primary-action")}
            >
              {saved.latest ? "Вернуться к сохранению" : "Настроить игру"}
            </Button>
          </section>
        )}
        {hasGame && !desktopSettings && !compact && (
          <Rules mode={game.config.mode} control={control} />
        )}
      </main>
      <GameDialogs model={model} saveNotice={saveNotice} />
      <footer className={css("footer")}>
        <span>Простые правила. Красивые решения.</span>
        <span>
          Сделайте паузу для мысли{" "}
          <span className={css("footer-spark")}>✳</span>
        </span>
      </footer>
    </div>
  );
}
