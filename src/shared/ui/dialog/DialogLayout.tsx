import type { ComponentProps } from 'react';

import styles from './Dialog.module.css';

export function DialogBody({
  enabled = true,
  className = '',
  ...props
}: ComponentProps<'div'> & { enabled?: boolean }) {
  return (
    <div
      data-testid="dialog-body"
      {...props}
      className={`${enabled ? styles['dialog-body'] : ''} ${className}`}
    />
  );
}

export function DialogFooter({
  enabled = true,
  paired = false,
  className = '',
  ...props
}: ComponentProps<'div'> & { enabled?: boolean; paired?: boolean }) {
  return (
    <div
      {...props}
      className={`${enabled ? styles['dialog-footer'] : ''} ${paired ? styles['paired-actions'] : ''} ${className}`}
    />
  );
}

export function DialogForm({
  enabled = true,
  className = '',
  ...props
}: ComponentProps<'form'> & { enabled?: boolean }) {
  return <form {...props} className={`${enabled ? styles['dialog-form'] : ''} ${className}`} />;
}
