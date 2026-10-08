import type { SaveRepository, Snapshot } from "@/entities/game";
import { useGameHistory } from "../model/useGameHistory";
import { HistoryView } from "./HistoryView";
export default function GameHistory({
  repository,
  latest,
  flush,
  onOpen,
  onBack,
}: {
  repository: SaveRepository;
  latest: Snapshot | null;
  flush: () => Promise<void>;
  onOpen: () => void;
  onBack: () => void;
}) {
  const history = useGameHistory(repository, flush);
  return (
    <HistoryView
      {...history}
      latestId={latest?.id}
      onOpen={onOpen}
      onBack={onBack}
    />
  );
}
