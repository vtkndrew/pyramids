import { useCallback, type ComponentProps, type CSSProperties } from 'react';

import type { Config } from '@/entities/game';
import { bindClasses } from '@/shared/lib/styles';
import { Button } from '@/shared/ui/button';
import { DialogForm, DialogBody, DialogFooter } from '@/shared/ui/dialog';
import { Icon } from '@/shared/ui/icon';

import styles from './GameSetup.module.css';

const css = bindClasses(styles);

export function SettingsForm({
  config,
  onChange,
  onStart,
  onBack,
  modal = false,
  onApplication,
  applicationLabel,
  onHistory,
}: {
  config: Config;
  onChange: (config: Config) => void;
  onStart: () => void;
  onBack?: () => void;
  modal?: boolean;
  onApplication: () => void;
  applicationLabel: string;
  onHistory: () => void;
}) {
  const handleSubmit = useCallback<NonNullable<ComponentProps<typeof DialogForm>['onSubmit']>>(
    (event) => {
      event.preventDefault();
      onStart();
    },
    [onStart],
  );

  const handleHistory = useCallback<NonNullable<ComponentProps<typeof Button>['onClick']>>(
    (event) => {
      event.currentTarget.focus();
      onHistory();
    },
    [onHistory],
  );

  const handleApplication = useCallback<NonNullable<ComponentProps<typeof Button>['onClick']>>(
    (event) => {
      event.currentTarget.focus();
      onApplication();
    },
    [onApplication],
  );

  return (
    <DialogForm onSubmit={handleSubmit} enabled={modal} className={css(!modal && 'desktop')}>
      <DialogBody
        enabled={modal}
        className={css(modal ? 'dialog-body settings-fields' : 'settings-fields')}
        data-testid="dialog-body"
      >
        <fieldset>
          <legend>Количество стержней</legend>
          <div className={css('rod-options')}>
            {[3, 4, 5, 6].map((rods) => (
              <label key={rods} className={css(config.rods === rods ? 'option checked' : 'option')}>
                <input
                  type="radio"
                  name="rods"
                  value={rods}
                  checked={config.rods === rods}
                  onChange={() => onChange({ ...config, rods })}
                />
                <span>{rods}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className={css('disk-setting')}>
          <div className={css('field-label')}>
            <label htmlFor="disks">Количество дисков</label>
            <output htmlFor="disks">{config.disks}</output>
          </div>
          <input
            id="disks"
            type="range"
            min="3"
            max="10"
            value={config.disks}
            onChange={(event) => onChange({ ...config, disks: Number(event.target.value) })}
            style={
              {
                '--range-progress': `${((config.disks - 3) / 7) * 100}%`,
              } as CSSProperties
            }
          />
          <div className={css('range-labels')}>
            <span>3 · Попроще</span>
            <span>10 · Посложнее</span>
          </div>
        </div>
        <fieldset aria-describedby="mode-description" className={css('mode-setting')}>
          <legend>Режим игры</legend>
          <div className={css('rod-options')}>
            {(['classic', 'hardcore'] as const).map((mode) => (
              <label key={mode} className={css(`option ${config.mode === mode ? 'checked' : ''}`)}>
                <input
                  type="radio"
                  name="mode"
                  value={mode}
                  checked={config.mode === mode}
                  onChange={() => onChange({ ...config, mode })}
                />
                <span>{mode === 'classic' ? 'Обычный' : 'Хардкор'}</span>
              </label>
            ))}
          </div>
          <p id="mode-description" className={css('mode-description')}>
            {config.mode === 'hardcore'
              ? 'Диски можно переносить только на соседний стержень.'
              : 'Переносите диски на любой подходящий стержень.'}
          </p>
        </fieldset>
        {!modal && (
          <p className={css('settings-hint')}>
            <Icon name="info" />
            <span>
              Больше дисков — больше шагов.
              <br />
              Больше стержней — больше свободы.
            </span>
          </p>
        )}
        <Button type="button" onClick={handleHistory} className={css(' history-entry', 'action')}>
          История игр
        </Button>
        <Button type="button" onClick={handleApplication} className={css(' pwa-entry', 'action')}>
          {applicationLabel}
        </Button>
      </DialogBody>
      <DialogFooter
        enabled={modal}
        paired={Boolean(onBack)}
        className={css(modal ? 'dialog-footer' : undefined)}
        data-testid="dialog-footer"
      >
        <Button
          type="submit"
          variant="primary"
          layout="start"
          className={css(' start-button', 'action', 'primary-action')}
        >
          Начать игру <Icon name="arrow" />
        </Button>
        {onBack && (
          <Button
            type="button"
            onClick={onBack}
            layout="back"
            className={css(' back-button', 'action')}
          >
            Назад к игре
          </Button>
        )}
      </DialogFooter>
    </DialogForm>
  );
}
