import { CONTROL_HINTS, CONTROL_LABELS, type ControlMode } from './controls';
import type { GameMode } from './game';

export default function ControlDialog({ mode, control, newGame, onChange, onConfirm }: {
  mode: GameMode; control: ControlMode; newGame: boolean;
  onChange: (control: ControlMode) => void; onConfirm: () => void;
}) {
  return <form className="dialog-form" onSubmit={event => { event.preventDefault(); onConfirm(); }}>
    <div className="dialog-body">
      <p className="dialog-description">{newGame ? 'Выберите удобный способ. Его можно поменять во время партии.' : 'Позиция, история и время сохранятся.'}</p>
      <fieldset className="control-options"><legend className="visually-hidden">Способ управления</legend>
        {(['tap', 'drag', 'swipe'] as const).filter(option => mode === 'hardcore' || option !== 'swipe').map(option =>
          <label className={`option ${control === option ? 'checked' : ''}`} key={option}>
            <input type="radio" name="control" value={option} checked={control === option} onChange={() => onChange(option)} />
            <span>{CONTROL_LABELS[option]}</span>
          </label>)}
      </fieldset>
      <div key={control} className={`control-demo demo-${control}`} aria-hidden="true">
        <div className="demo-track"><span className="demo-rod demo-source" /><span className="demo-rod demo-target" /><span className="demo-base-disk" /><span className="demo-moving-disk" /><span className="demo-pointer" /><span className="demo-ripple demo-tap-source" /><span className="demo-ripple demo-tap-target" /></div>
        <div className="demo-labels"><span>Отсюда</span><span>Сюда</span></div>
      </div>
      <p className="control-explanation">{CONTROL_HINTS[control]}</p>
      <p className="control-extra">Нажатия доступны всегда. На клавиатуре: номер исходного стержня, затем номер целевого — клавиши 1–6.</p>
    </div>
    <div className="dialog-footer"><button type="submit" className="button button-primary start-button">{newGame ? 'Играть' : 'Применить'}</button></div>
  </form>;
}
