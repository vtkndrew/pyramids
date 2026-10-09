import { useRef, useEffect } from 'react';

import { createGame, currentBoard, type Config, BoardView, Rules } from '@/entities/game';
import { SettingsForm } from '@/features/game-setup';
import { bindClasses } from '@/shared/lib/styles';
import { Icon } from '@/shared/ui/icon';

import styles from './GamePage.module.css';

const css = bindClasses(styles);

export default function Settings({
  config,
  onChange,
  hasGame,
  onStart,
  onBack,
  hidePreview,
  onApplication,
  applicationLabel,
  onHistory,
}: {
  config: Config;
  onChange: (config: Config) => void;
  hasGame: boolean;
  hidePreview: boolean;
  onStart: () => void;
  onBack: () => void;
  onApplication: () => void;
  applicationLabel: string;
  onHistory: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <>
      <div className={css('setup-layout')}>
        <section className={css('preview-card')}>
          <div className={css('card-heading')}>
            <span className={css('eyebrow')}>Всё начинается с первого хода</span>
            <span className={css('preview-tag')}>Начальная позиция</span>
          </div>
          {!hidePreview && (
            <BoardView preview config={config} board={currentBoard(createGame(config))} />
          )}
          <div className={css('preview-note')}>
            <span className={css('note-line')} />
            <span>С первого стержня — на последний</span>
            <Icon name="arrow" />
          </div>
        </section>
        <section aria-labelledby="settings-title" className={css('settings-card')}>
          <div className={css('settings-icon')}>
            <Icon name="settings" />
          </div>
          <h2 id="settings-title" ref={heading} tabIndex={-1}>
            Ваша головоломка
          </h2>
          <p className={css('muted settings-description')}>
            Выберите сложность и найдите свой путь к решению.
          </p>
          <SettingsForm
            onHistory={onHistory}
            onApplication={onApplication}
            applicationLabel={applicationLabel}
            config={config}
            onChange={onChange}
            onStart={onStart}
            onBack={hasGame ? onBack : undefined}
          />
        </section>
      </div>
      <Rules mode={config.mode} />
    </>
  );
}
