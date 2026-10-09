import { useEffect, useRef, type ReactNode } from 'react';

import { bindClasses } from '@/shared/lib/styles';
import { Button } from '@/shared/ui/button';

import styles from './Dialog.module.css';

const css = bindClasses(styles);

/** One native modal; changing its view keeps the background inert and time paused. */
export default function Dialog({
  title,
  view,
  onClose,
  onBack,
  children,
}: {
  title: string;
  view: string;
  onClose: () => void;
  onBack?: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const element = dialog.current;

    if (!element) {
      return;
    }

    const previousFocus = document.activeElement as HTMLElement | null;

    element.showModal();
    document.body.classList.add('modal-open');

    return () => {
      element.close();
      document.body.classList.remove('modal-open');
      void Promise.resolve().then(() => {
        if (document.querySelector('dialog[open]')) {
          return;
        }

        const target =
          previousFocus?.isConnected &&
          previousFocus !== document.body &&
          previousFocus.getBoundingClientRect().width > 1
            ? previousFocus
            : document.querySelector<HTMLElement>('[data-return-focus]');

        target?.focus({ preventScroll: true });
      });
    };
  }, []);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [view]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') {
          return;
        }

        const focusable = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), [tabindex="0"]',
          ),
        ].filter(
          (el) =>
            el.getClientRects().length &&
            (!(el instanceof HTMLInputElement) || el.type !== 'radio' || el.checked),
        );

        if (!focusable.length) {
          return;
        }

        // Safari may omit buttons from its default Tab order. Keep a consistent
        // keyboard path through every control in all supported browsers.
        event.preventDefault();
        const index = focusable.indexOf(document.activeElement as HTMLElement);

        function getNextFocusIndex() {
          if (index < 0) {
            if (event.shiftKey) {
              return focusable.length - 1;
            }

            return 0;
          }

          return (index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
        }

        const next = getNextFocusIndex();

        focusable[next].focus();
      }}
      className={css('app-dialog control-dialog')}
    >
      <div className={css('dialog-heading')}>
        {onBack && (
          <Button type="button" onClick={onBack} className={css(' dialog-back', 'action')}>
            Назад
          </Button>
        )}
        <h2 id="dialog-title" ref={heading} tabIndex={-1}>
          {title}
        </h2>
        <Button
          type="button"
          aria-label="Закрыть окно"
          onClick={onClose}
          className={css('dialog-close button', 'action')}
        >
          ×
        </Button>
      </div>
      {children}
    </dialog>
  );
}
