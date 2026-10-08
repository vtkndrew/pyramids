import { DialogBody, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import styles from "./HistoryView.module.css";
import { bindClasses } from "@/shared/lib/styles";
import { formatElapsed } from "@/shared/lib/time";
import type { Summary } from "@/entities/game";
const css = bindClasses(styles);
export function HistoryView({
  records,
  more,
  loading,
  error,
  latestId,
  onMore,
  onOpen,
  onBack,
}: {
  records: Summary[];
  more: boolean;
  loading: boolean;
  error: boolean;
  latestId?: string;
  onMore: () => void;
  onOpen: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <DialogBody
        className={css("dialog-body saved-games")}
        data-testid="dialog-body saved-games"
      >
        {loading ? (
          <p>Загружаем историю…</p>
        ) : error ? (
          <p role="alert">Не удалось прочитать историю игр.</p>
        ) : !records.length ? (
          <p>Здесь появятся ваши партии после нажатия «Играть».</p>
        ) : (
          <ol className={css("saved-list")}>
            {records.map((record) => (
              <li
                key={record.id}
                className={css("saved-game")}
                data-testid="saved-game"
              >
                <div className={css("saved-game-heading")}>
                  <strong>
                    {record.config.mode === "hardcore" ? "Хардкор" : "Обычный"}
                  </strong>
                  <span>
                    {record.status === "won"
                      ? "Победа"
                      : record.status === "abandoned"
                        ? "Не завершена"
                        : "В процессе"}
                  </span>
                </div>
                <time dateTime={new Date(record.startedAt).toISOString()}>
                  {new Date(record.startedAt).toLocaleString("ru-RU")}
                </time>
                <p>
                  Стержней: {record.config.rods} · Дисков: {record.config.disks}
                </p>
                <p>
                  Ходов: {record.moves} · Время: {formatElapsed(record.elapsed)}
                </p>
                {record.id === latestId && (
                  <Button
                    type="button"
                    onClick={onOpen}
                    className={css("", "action")}
                  >
                    {record.status === "won"
                      ? "Открыть последнюю партию"
                      : "Продолжить партию"}
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}
        {more && (
          <Button type="button" onClick={onMore} className={css("", "action")}>
            Показать ещё
          </Button>
        )}
      </DialogBody>
      <DialogFooter
        className={css("dialog-footer")}
        data-testid="dialog-footer"
      >
        <Button
          type="button"
          onClick={onBack}
          variant="primary"
          layout="start"
          className={css(" start-button", "action", "primary-action")}
        >
          Назад
        </Button>
      </DialogFooter>
    </>
  );
}
