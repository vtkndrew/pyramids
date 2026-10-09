import { useCallback } from 'react';

import { bindClasses } from '@/shared/lib/styles';
import { Button } from '@/shared/ui/button';
import { DialogBody, DialogFooter } from '@/shared/ui/dialog';

import styles from './PwaView.module.css';
import type { PwaState } from '../model/pwa';

const css = bindClasses(styles);

export function PwaView({
  pwa,
  saving,
  saveError,
  update,
  install,
  ios,
  confirmUpdate,
  onConfirmUpdate,
  onBack,
}: {
  pwa: PwaState;
  saving: boolean;
  saveError: boolean;
  update: () => Promise<void>;
  install: () => Promise<void>;
  ios: boolean;
  confirmUpdate: boolean;
  onConfirmUpdate: () => void;
  onBack: () => void;
}) {
  const handleUpdate = useCallback(() => {
    void update();
  }, [update]);

  const handleInstall = useCallback(() => {
    void install();
  }, [install]);

  function getUpdateLabel() {
    if (saving) {
      return 'Сохраняем…';
    }

    if (pwa.updateBusy) {
      return 'Обновляем…';
    }

    return 'Обновить и перезапустить';
  }

  if (confirmUpdate)
    return (
      <>
        <DialogBody className={css('dialog-body pwa-body')} data-testid="dialog-body">
          <p>
            Игра сохранится и перезапустится. После обновления можно продолжить последнюю партию.
          </p>
          {saveError && (
            <p role="alert">
              Не удалось сохранить партию. Обновление отложено; повторите сохранение.
            </p>
          )}
          {pwa.updateError && <p role="alert">{pwa.updateError}</p>}
        </DialogBody>
        <DialogFooter className={css('dialog-footer pwa-actions')} data-testid="dialog-footer">
          <Button
            type="button"
            disabled={pwa.updateBusy || saving}
            onClick={handleUpdate}
            variant="primary"
            className={css('', 'action', 'primary-action')}
          >
            {getUpdateLabel()}
          </Button>
          <Button
            type="button"
            disabled={pwa.updateBusy || saving}
            onClick={onBack}
            className={css('', 'action')}
          >
            Позже
          </Button>
        </DialogFooter>
      </>
    );

  function getOfflineLabel() {
    if (pwa.offline === 'ready') {
      return 'Готово к работе без интернета.';
    }

    if (pwa.offline === 'preparing') {
      return 'Подготавливаем игру для работы без интернета…';
    }

    if (pwa.offline === 'development') {
      return 'Офлайн-режим доступен в опубликованной версии игры.';
    }

    return 'Офлайн-режим пока недоступен. Онлайн-игра продолжает работать.';
  }

  return (
    <>
      <DialogBody className={css('dialog-body pwa-body')} data-testid="dialog-body">
        <div className={css('pwa-brand')}>
          <img
            src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
            width="64"
            height="64"
            alt=""
          />
          <div>
            <h3>Пирамидки</h3>
            <p>Ваша головоломка — под рукой.</p>
          </div>
        </div>
        {pwa.installed ? (
          <p>Приложение установлено. Открывайте его с главного экрана.</p>
        ) : (
          <>
            <p>Добавьте игру на главный экран, чтобы запускать её в отдельном окне.</p>
            {pwa.canInstall && (
              <Button
                type="button"
                onClick={handleInstall}
                variant="primary"
                className={css('', 'action', 'primary-action')}
              >
                Установить
              </Button>
            )}
            {pwa.installBusy && <p role="status">Подтвердите установку в окне браузера.</p>}
            {ios ? (
              <ol>
                <li>Откройте эту страницу в Safari.</li>
                <li>Нажмите «Поделиться» → «На экран “Домой”».</li>
                <li>
                  Если есть переключатель «Открывать как веб-приложение», оставьте его включённым.
                </li>
                <li>Нажмите «Добавить».</li>
              </ol>
            ) : (
              !pwa.canInstall && (
                <p>
                  В меню браузера выберите «Установить приложение» или «Добавить на главный экран».
                  Если такого пункта нет, откройте сайт в браузере с поддержкой установки, например
                  Chrome.
                </p>
              )
            )}
            {pwa.installMessage && <p role="status">{pwa.installMessage}</p>}
          </>
        )}
        <section aria-label="Работа без интернета" className={css('pwa-status')}>
          <h3>Без интернета</h3>
          <p role="status">{getOfflineLabel()}</p>
          <p>
            Последняя партия и история игр сохраняются на этом устройстве, в том числе без
            интернета. После закрытия можно продолжить последнюю партию. Очистка данных сайта удалит
            сохранения; Safari и приложение с главного экрана могут хранить их отдельно.
          </p>
        </section>
        {pwa.needRefresh && (
          <section className={css('pwa-status')}>
            <h3>Доступна новая версия</h3>
            <p>Обновите приложение, когда закончите партию.</p>
            <Button type="button" onClick={onConfirmUpdate} className={css('', 'action')}>
              Обновить
            </Button>
          </section>
        )}
      </DialogBody>
      <DialogFooter className={css('dialog-footer')} data-testid="dialog-footer">
        <Button
          type="button"
          onClick={onBack}
          variant="primary"
          layout="start"
          className={css(' start-button', 'action', 'primary-action')}
        >
          Назад
        </Button>
      </DialogFooter>
    </>
  );
}
