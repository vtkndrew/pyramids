import type { ComponentProps } from "react";
import styles from "./Button.module.css";
export function Button({
  variant,
  layout,
  className = "",
  ...props
}: ComponentProps<"button"> & {
  variant?: "primary";
  layout?: "start" | "back";
}) {
  return (
    <button
      {...props}
      className={[
        styles.button,
        variant && styles["button-primary"],
        layout && styles[`${layout}-button`],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
