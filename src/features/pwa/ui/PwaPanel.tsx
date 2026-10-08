import { usePwaPanel } from "../model/usePwaPanel";
import { PwaView } from "./PwaView";
export default function PwaPanel({
  beforeUpdate,
  ...props
}: {
  beforeUpdate: () => Promise<void>;
  confirmUpdate: boolean;
  onConfirmUpdate: () => void;
  onBack: () => void;
}) {
  const model = usePwaPanel(beforeUpdate);
  return <PwaView {...model} {...props} />;
}
