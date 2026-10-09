import { useEffect, useState } from "react";
import type { SaveRepository, Summary } from "@/entities/game";
export function useGameHistory(
  repository: SaveRepository,
  flush: () => Promise<void>,
) {
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
        if (live) {
          setRecords(result.records);
          setMore(result.more);
        }
      } catch {
        if (live) setError(true);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [repository, limit, flush]);
  return {
    records,
    more,
    loading,
    error,
    onMore: () => setLimit((value) => value + 50),
  };
}
