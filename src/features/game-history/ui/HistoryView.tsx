import type { Summary } from '@/entities/game';
import { bindClasses } from '@/shared/lib/styles';
import { formatElapsed } from '@/shared/lib/time';
import { Button } from '@/shared/ui/button';
import { DialogBody, DialogFooter } from '@/shared/ui/dialog';

import styles from './HistoryView.module.css';

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
  function renderRecords() {
    if (loading) {
      return <p>Загружаем историю…</p>;
    }

    if (error) {
      return <p role="alert">Не удалось прочитать историю игр.</p>;
    }

    if (!records.length) {
      return <p>Здесь появятся ваши партии после нажатия «Играть».</p>;
    }

    return (
      <ol className={css('saved-list')}>
        {records.map((record) => (
          <li key={record.id} className={css('saved-game')} data-testid="saved-game">
            <div className={css('saved-game-heading')}>
              <strong>{record.config.mode === 'hardcore' ? 'Хардкор' : 'Обычный'}</strong>
              <span>
                {{ won: 'Победа', abandoned: 'Не завершена', active: 'В процессе' }[record.status]}
              </span>
            </div>
            <time dateTime={new Date(record.startedAt).toISOString()}>
              {new Date(record.startedAt).toLocaleString('ru-RU')}
            </time>
            <p>
              Стержней: {record.config.rods} · Дисков: {record.config.disks}
            </p>
            <p>
              Ходов: {record.moves} · Время: {formatElapsed(record.elapsed)}
            </p>
            {record.id === latestId && (
              <Button type="button" onClick={onOpen} className={css('', 'action')}>
                {record.status === 'won' ? 'Открыть последнюю партию' : 'Продолжить партию'}
              </Button>
            )}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <>
      <DialogBody className={css('dialog-body saved-games')} data-testid="dialog-body saved-games">
        {renderRecords()}
        {more && (
          <Button type="button" onClick={onMore} className={css('', 'action')}>
            Показать ещё
          </Button>
        )}
      </DialogBody>
      <DialogFooter className={css('dialog-footer')} data-testid="dialog-footer">
        <Button
          type="button"
          onClick={onBack}
          variant="primary"
          layout="start"
          className={css(' start-button', 'action', 'primary-action')}
        >
          Назад
        </Button>
      </DialogFooter>
    </>
  );
}
