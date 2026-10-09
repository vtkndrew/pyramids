import { bindClasses } from '@/shared/lib/styles';

import styles from './Rules.module.css';
import { CONTROL_HINTS, type ControlMode } from '../model/controls';
import type { GameMode } from '../model/game';

const css = bindClasses(styles);

export default function Rules({
  mode,
  control = 'tap',
  modal = false,
}: {
  mode: GameMode;
  control?: ControlMode;
  modal?: boolean;
}) {
  return (
    <section aria-label="Как играть" className={css('rules', modal && 'modal')}>
      <div className={css('rule')}>
        <span className={css('rule-index')}>01</span>
        <div>
          <h3>Выберите диск</h3>
          <p>{CONTROL_HINTS[control]}</p>
        </div>
      </div>
      <div className={css('rule')}>
        <span className={css('rule-index')}>02</span>
        <div>
          <h3>Найдите ему место</h3>
          <p>
            {mode === 'hardcore'
              ? 'Переносите диск на соседний стержень: пустой или с диском большего размера.'
              : 'Переносите диск на пустой стержень или на стержень с диском большего размера.'}
          </p>
        </div>
      </div>
      <div className={css('rule')}>
        <span className={css('rule-index')}>03</span>
        <div>
          <h3>Соберите пирамидку</h3>
          <p>Перенесите все диски на последний стержень. В своём темпе.</p>
        </div>
      </div>
    </section>
  );
}
