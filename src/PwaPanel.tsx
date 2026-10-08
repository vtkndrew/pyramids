import { applyUpdate, installApp, isIOS, usePwa } from './pwa';

export default function PwaPanel({ confirmUpdate, onConfirmUpdate, onBack }: {
  confirmUpdate: boolean; onConfirmUpdate: () => void; onBack: () => void;
}) {
  const pwa = usePwa();
  if (confirmUpdate) return <>
    <div className="dialog-body pwa-body">
      <p>Игра перезапустится, текущая партия будет сброшена.</p>
      {pwa.updateError && <p role="alert">{pwa.updateError}</p>}
    </div>
    <div className="dialog-footer pwa-actions">
      <button type="button" className="button button-primary" disabled={pwa.updateBusy} onClick={applyUpdate}>{pwa.updateBusy ? 'Обновляем…' : 'Обновить и перезапустить'}</button>
      <button type="button" className="button" disabled={pwa.updateBusy} onClick={onBack}>Позже</button>
    </div>
  </>;
  return <>
    <div className="dialog-body pwa-body">
      <div className="pwa-brand"><img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} width="64" height="64" alt="" /><div><h3>Пирамидки</h3><p>Ваша головоломка — под рукой.</p></div></div>
      {pwa.installed ? <p>Приложение установлено. Открывайте его с главного экрана.</p>
        : <><p>Добавьте игру на главный экран, чтобы запускать её в отдельном окне.</p>
          {pwa.canInstall && <button type="button" className="button button-primary" onClick={() => { void installApp(); }}>Установить</button>}
          {pwa.installBusy && <p role="status">Подтвердите установку в окне браузера.</p>}
          {isIOS() ? <ol><li>Откройте эту страницу в Safari.</li><li>Нажмите «Поделиться» → «На экран “Домой”».</li><li>Если есть переключатель «Открывать как веб-приложение», оставьте его включённым.</li><li>Нажмите «Добавить».</li></ol>
            : !pwa.canInstall && <p>В меню браузера выберите «Установить приложение» или «Добавить на главный экран». Если такого пункта нет, откройте сайт в браузере с поддержкой установки, например Chrome.</p>}
          {pwa.installMessage && <p role="status">{pwa.installMessage}</p>}
        </>}
      <section className="pwa-status" aria-label="Работа без интернета">
        <h3>Без интернета</h3>
        <p role="status">{pwa.offline === 'ready' ? 'Готово к работе без интернета.' : pwa.offline === 'preparing' ? 'Подготавливаем игру для работы без интернета…' : pwa.offline === 'development' ? 'Офлайн-режим доступен в опубликованной версии игры.' : 'Офлайн-режим пока недоступен. Онлайн-игра продолжает работать.'}</p>
        <p>После полного закрытия или перезагрузки начинается новая партия. Прогресс не сохраняется.</p>
      </section>
      {pwa.needRefresh && <section className="pwa-status"><h3>Доступна новая версия</h3><p>Обновите приложение, когда закончите партию.</p><button type="button" className="button" onClick={onConfirmUpdate}>Обновить</button></section>}
    </div>
    <div className="dialog-footer"><button type="button" className="button button-primary start-button" onClick={onBack}>Назад</button></div>
  </>;
}
