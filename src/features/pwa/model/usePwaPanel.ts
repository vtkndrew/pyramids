import { useState } from "react";
import { applyUpdate, installApp, isIOS, usePwa } from "./pwa";
export function usePwaPanel(beforeUpdate: () => Promise<void>) {
  const pwa = usePwa();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  async function update() {
    setSaving(true);
    setSaveError(false);
    try {
      await beforeUpdate();
      applyUpdate();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }
  return { pwa, saving, saveError, update, install: installApp, ios: isIOS() };
}
