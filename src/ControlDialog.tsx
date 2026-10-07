import { useEffect, useRef, useState } from 'react';
import { CONTROL_HINTS, CONTROL_LABELS, type ControlMode } from './controls';
import type { GameMode } from './game';

export default function ControlDialog({ mode, initial, newGame, onConfirm, onClose }: {
  mode: GameMode; initial: ControlMode; newGame: boolean;
  onConfirm: (control: ControlMode) => void; onClose: () => void;
}) {
  const [control, setControl] = useState(initial);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => {
      element.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return <dialog ref={dialog} className="control-dialog" aria-labelledby="controls-title" aria-describedby="controls-description"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:checked')];
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}>
    <div className="dialog-heading"><div><p className="eyebrow">Ваш способ играть</p><h2 id="controls-title">Управление</h2></div>
      <button type="button" className="dialog-close button" aria-label="Закрыть выбор управления" onClick={onClose}>×</button>
    </div>
    <p id="controls-description" className="dialog-description">{newGame ? 'Выберите удобный способ. Его можно поменять во время партии.' : 'Позиция, история и время сохранятся.'}</p>
    <fieldset className="control-options"><legend className="visually-hidden">Способ управления</legend>
      {(['tap', 'drag', 'swipe'] as const).filter(option => mode === 'hardcore' || option !== 'swipe').map(option =>
        <label className={`option ${control === option ? 'checked' : ''}`} key={option}>
          <input type="radio" name="control" value={option} checked={control === option} onChange={() => setControl(option)} />
          <span>{CONTROL_LABELS[option]}</span>
        </label>)}
    </fieldset>
    <div key={control} className={`control-demo demo-${control}`} aria-hidden="true">
      <div className="demo-track"><span className="demo-rod demo-source" /><span className="demo-rod demo-target" /><span className="demo-base-disk" /><span className="demo-moving-disk" /><span className="demo-pointer" /><span className="demo-ripple demo-tap-source" /><span className="demo-ripple demo-tap-target" /></div>
      <div className="demo-labels"><span>Отсюда</span><span>Сюда</span></div>
    </div>
    <p className="control-explanation">{CONTROL_HINTS[control]}</p>
    <p className="control-extra">Нажатия доступны всегда. На клавиатуре: номер исходного стержня, затем номер целевого — клавиши 1–6.</p>
    <button type="button" className="button button-primary start-button" onClick={() => onConfirm(control)}>{newGame ? 'Играть' : 'Применить'}</button>
  </dialog>;
}
