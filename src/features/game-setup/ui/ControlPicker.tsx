import { DialogForm, DialogBody, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import styles from "./GameSetup.module.css";
import { bindClasses } from "@/shared/lib/styles";
import {
  CONTROL_HINTS,
  CONTROL_LABELS,
  type ControlMode,
} from "@/entities/game";
import type { GameMode } from "@/entities/game";
const css = bindClasses(styles);
export default function ControlDialog({
  mode,
  control,
  newGame,
  onChange,
  onConfirm,
}: {
  mode: GameMode;
  control: ControlMode;
  newGame: boolean;
  onChange: (control: ControlMode) => void;
  onConfirm: () => void;
}) {
  return (
    <DialogForm
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm();
      }}
      className={css("dialog-form")}
    >
      <DialogBody className={css("dialog-body")} data-testid="dialog-body">
        <p className={css("dialog-description")}>
          {newGame
            ? "Выберите удобный способ. Его можно поменять во время партии."
            : "Позиция, история и время сохранятся."}
        </p>
        <fieldset className={css("control-options")}>
          <legend className={css("visually-hidden")}>Способ управления</legend>
          {(["tap", "drag", "swipe"] as const)
            .filter((option) => mode === "hardcore" || option !== "swipe")
            .map((option) => (
              <label
                key={option}
                className={css(`option ${control === option ? "checked" : ""}`)}
              >
                <input
                  type="radio"
                  name="control"
                  value={option}
                  checked={control === option}
                  onChange={() => onChange(option)}
                />
                <span>{CONTROL_LABELS[option]}</span>
              </label>
            ))}
        </fieldset>
        <div
          key={control}
          aria-hidden="true"
          className={css(`control-demo demo-${control}`)}
        >
          <div className={css("demo-track")}>
            <span className={css("demo-rod demo-source")} />
            <span className={css("demo-rod demo-target")} />
            <span className={css("demo-base-disk")} />
            <span
              className={css("demo-moving-disk")}
              data-testid="demo-moving-disk"
            />
            <span className={css("demo-pointer")} />
            <span className={css("demo-ripple demo-tap-source")} />
            <span className={css("demo-ripple demo-tap-target")} />
          </div>
          <div className={css("demo-labels")}>
            <span>Отсюда</span>
            <span>Сюда</span>
          </div>
        </div>
        <p className={css("control-explanation")}>{CONTROL_HINTS[control]}</p>
        <p className={css("control-extra")}>
          Нажатия доступны всегда. На клавиатуре: номер исходного стержня, затем
          номер целевого — клавиши 1–6.
        </p>
      </DialogBody>
      <DialogFooter
        className={css("dialog-footer")}
        data-testid="dialog-footer"
      >
        <Button
          type="submit"
          variant="primary"
          layout="start"
          className={css(" start-button", "action", "primary-action")}
        >
          {newGame ? "Играть" : "Применить"}
        </Button>
      </DialogFooter>
    </DialogForm>
  );
}
