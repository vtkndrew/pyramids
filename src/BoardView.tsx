import { useRef, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { moveError, type Board, type Config } from './game';
import { useBoardGestures } from './useBoardGestures';
import type { ControlMode } from './controls';

const COLORS = ['#d18a67', '#dfb759', '#9cab79', '#69a298', '#7e91b8', '#aa8eaf', '#be7587', '#be9a78', '#8b9c5a', '#7b9eae'];

export default function BoardView({ board, config, selected = null, onRod, onMove, onClear, control = 'tap', won = false, fitHeight = false }: {
  fitHeight?: boolean; board: Board; config: Config; selected?: number | null; onRod?: (rod: number) => void; won?: boolean; control?: ControlMode; onMove?: (from: number, to: number) => void; onClear?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const gestures = useBoardGestures({ root, board, control, enabled: !!onRod && !won, onMove, onClear });
  const source = gestures.visual?.from ?? selected;
  const ghost = gestures.visual;
  return <div ref={root} className={`board-shell control-${control} ${fitHeight ? 'board-fit' : ''}`} onDragStart={event => event.preventDefault()}
    onContextMenu={event => { if (control !== 'tap') event.preventDefault(); }} role="region" aria-label={onRod ? 'Игровое поле' : 'Начальная позиция'} tabIndex={0}>
    <div className={`board ${onRod ? '' : 'board-preview'}`} style={{ '--rod-count': config.rods, '--disk-count': config.disks } as CSSProperties}>
      {board.map((disks, rod) => {
        const target = rod === config.rods - 1;
        const active = source === rod;
        const available = source !== null && !active && !moveError(board, source, rod, config.mode);
        const content = <>
          <span className="rod-top-label">{target ? <><span className="target-dot" /> Цель</> : rod === 0 ? 'Старт' : '\u00a0'}</span>
          <span className="rod-scene" aria-hidden="true">
            <span className="rod-pole" />
            {target && disks.length === 0 && <span className="target-outline" />}
            <span className="disk-stack">
              {disks.map((disk, index) => <span key={disk} className={`disk ${active && index === disks.length - 1 ? 'disk-selected' : ''} ${ghost?.from === rod && control === 'drag' && index === disks.length - 1 ? 'disk-in-transit' : ''}`} style={{ width: `${30 + (disk / config.disks) * 62}%`, backgroundColor: COLORS[disk - 1] }}>
                <span>{disk}</span>
              </span>)}
            </span>
            <span className="rod-base" />
          </span>
          <span className="rod-number">{String(rod + 1).padStart(2, '0')}<span>{active ? 'Выбран' : available ? 'Переместить сюда' : `Стержень ${rod + 1}`}</span></span>
        </>;
        const className = `rod ${target ? 'rod-target' : ''} ${active ? 'rod-selected' : ''} ${available ? 'rod-available' : ''} ${available && ghost?.target === rod ? 'rod-drop-target' : ''}`;
        return onRod ? <button key={rod} type="button" data-rod={rod} className={className} aria-label={`Стержень ${rod + 1}${target ? ', цель' : rod === 0 ? ', старт' : ''}. ${disks.length ? `Диски снизу вверх: ${disks.join(', ')}. Верхний диск: ${disks.at(-1)}.` : 'Пустой.'}`} aria-pressed={active} disabled={won} onPointerDown={event => gestures.down(event, rod)} onPointerMove={gestures.update} onPointerUp={gestures.up}
          onPointerCancel={gestures.cancel} onLostPointerCapture={gestures.cancel}
          onClick={event => { if (gestures.allowClick(event.detail)) onRod(rod); }}>{content}</button>
          : <div key={rod} className={className}>{content}</div>;
      })}
    </div>
    {ghost && control === 'drag' && createPortal(<div className="disk drag-ghost" aria-hidden="true" style={{
      width: ghost.width, height: ghost.height, backgroundColor: COLORS[ghost.disk - 1],
      left: Math.max(0, Math.min(window.innerWidth - ghost.width, ghost.x - ghost.width / 2)),
      top: Math.max(0, Math.min(window.innerHeight - ghost.height, ghost.y - ghost.height / 2)),
    }}><span>{ghost.disk}</span></div>, document.body)}
  </div>;
}
