import type { CSSProperties, RefObject, HTMLAttributes } from 'react';

import { bindClasses } from '@/shared/lib/styles';

import styles from './BoardView.module.css';
import { DISK_COLORS } from './diskPalette';
import type { ControlMode } from '../model/controls';
import { moveError, type Board, type Config } from '../model/game';

const css = bindClasses(styles);

export default function BoardView({
  board,
  config,
  selected = null,
  onRod,
  control = 'tap',
  won = false,
  fitHeight = false,
  root,
  gesture,
  rodEvents,
  preview = false,
}: {
  fitHeight?: boolean;
  board: Board;
  config: Config;
  selected?: number | null;
  onRod?: (rod: number) => void;
  won?: boolean;
  control?: ControlMode;
  root?: RefObject<HTMLDivElement | null>;
  gesture?: {
    from: number;
    target: number | null;
  };
  rodEvents?: (rod: number) => HTMLAttributes<HTMLButtonElement>;
  preview?: boolean;
}) {
  const source = gesture?.from ?? selected;
  const ghost = gesture;

  return (
    <div
      ref={root}
      onDragStart={(event) => event.preventDefault()}
      onContextMenu={(event) => {
        if (control !== 'tap') event.preventDefault();
      }}
      role="region"
      aria-label={onRod ? 'Игровое поле' : 'Начальная позиция'}
      tabIndex={0}
      className={css(
        `board-shell control-${control} ${fitHeight ? 'board-fit' : ''} ${preview ? 'preview-surface' : 'game-surface'}`,
      )}
      data-testid="board-shell"
      data-control={control}
    >
      <div
        style={
          {
            '--rod-count': config.rods,
            '--disk-count': config.disks,
          } as CSSProperties
        }
        className={css(`board ${onRod ? '' : 'board-preview'}`)}
        data-testid="board"
      >
        {board.map((disks, rod) => {
          const target = rod === config.rods - 1;
          const active = source === rod;
          const available =
            source !== null && !active && !moveError(board, source, rod, config.mode);

          function getSelectionLabel() {
            if (active) {
              return 'Выбран';
            }

            if (available) {
              return 'Переместить сюда';
            }

            return `Стержень ${rod + 1}`;
          }

          function renderRodCaption() {
            if (target) {
              return (
                <>
                  <span className={css('target-dot')} /> Цель
                </>
              );
            }

            if (rod === 0) {
              return 'Старт';
            }

            return '\u00a0';
          }

          const content = (
            <>
              <span className={css('rod-top-label')} data-testid="rod-top-label">
                {renderRodCaption()}
              </span>
              <span aria-hidden="true" className={css('rod-scene')}>
                <span className={css('rod-pole')} />
                {target && disks.length === 0 && <span className={css('target-outline')} />}
                <span className={css('disk-stack')}>
                  {disks.map((disk, index) => (
                    <span
                      data-disk={disk}
                      key={disk}
                      style={{
                        width: `${30 + (disk / config.disks) * 62}%`,
                        backgroundColor: DISK_COLORS[disk - 1],
                      }}
                      className={css(
                        `disk ${active && index === disks.length - 1 ? 'disk-selected' : ''} ${ghost?.from === rod && control === 'drag' && index === disks.length - 1 ? 'disk-in-transit' : ''}`,
                      )}
                      data-testid="disk"
                      data-in-transit={
                        ghost?.from === rod && control === 'drag' && index === disks.length - 1
                      }
                    >
                      <span>{disk}</span>
                    </span>
                  ))}
                </span>
                <span className={css('rod-base')} />
              </span>
              <span className={css('rod-number')} data-testid="rod-number">
                {String(rod + 1).padStart(2, '0')}
                <span>{getSelectionLabel()}</span>
              </span>
            </>
          );
          const className = `rod ${target ? 'rod-target' : ''} ${active ? 'rod-selected' : ''} ${available ? 'rod-available' : ''} ${available && ghost?.target === rod ? 'rod-drop-target' : ''}`;

          function getRodRole() {
            if (target) {
              return ', цель';
            }

            if (rod === 0) {
              return ', старт';
            }

            return '';
          }

          return onRod ? (
            <button
              key={rod}
              type="button"
              data-rod={rod}
              aria-label={`Стержень ${rod + 1}${getRodRole()}. ${disks.length ? `Диски снизу вверх: ${disks.join(', ')}. Верхний диск: ${disks.at(-1)}.` : 'Пустой.'}`}
              aria-pressed={active}
              disabled={won}
              onClick={() => onRod(rod)}
              {...rodEvents?.(rod)}
              className={css(className)}
              data-testid="rod"
              data-available={available}
              data-drop-target={available && ghost?.target === rod}
            >
              {content}
            </button>
          ) : (
            <div key={rod} className={css(className)} data-testid="rod">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
