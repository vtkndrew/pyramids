import { useEffect, useState } from 'react';
import { formatElapsed } from './useGameTimer';
import type { SaveRepository, Snapshot, Summary } from './saves';

export default function GameHistory({ repository, latest, flush, onOpen, onBack }: {
  repository: SaveRepository; latest: Snapshot | null; flush: () => Promise<void>; onOpen: () => void; onBack: () => void;
}) {
  const [limit, setLimit] = useState(50);
  const [records, setRecords] = useState<Summary[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        await flush().catch(() => {});
        const result = await repository.list(limit);
        if (live) { setRecords(result.records); setMore(result.more); }
      } catch { if (live) setError(true); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
    // A mounted history view is a paused snapshot. Read again on pagination.
  }, [repository, limit]);
  return <>
    <div className="dialog-body saved-games">
      {loading ? <p>Загружаем историю…</p> : error ? <p role="alert">Не удалось прочитать историю игр.</p> : !records.length ? <p>Здесь появятся ваши партии после нажатия «Играть».</p> : <ol className="saved-list">
        {records.map(record => <li key={record.id} className="saved-game">
          <div className="saved-game-heading"><strong>{record.config.mode === 'hardcore' ? 'Хардкор' : 'Обычный'}</strong><span>{record.status === 'won' ? 'Победа' : record.status === 'abandoned' ? 'Не завершена' : 'В процессе'}</span></div>
          <time dateTime={new Date(record.startedAt).toISOString()}>{new Date(record.startedAt).toLocaleString('ru-RU')}</time>
          <p>Стержней: {record.config.rods} · Дисков: {record.config.disks}</p>
          <p>Ходов: {record.moves} · Время: {formatElapsed(record.elapsed)}</p>
          {record.id === latest?.id && <button className="button" type="button" onClick={onOpen}>{record.status === 'won' ? 'Открыть последнюю партию' : 'Продолжить партию'}</button>}
        </li>)}
      </ol>}
      {more && <button className="button" type="button" onClick={() => setLimit(value => value + 50)}>Показать ещё</button>}
    </div>
    <div className="dialog-footer"><button className="button button-primary start-button" type="button" onClick={onBack}>Назад</button></div>
  </>;
}
