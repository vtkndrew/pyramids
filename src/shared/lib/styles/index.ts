/** Bind local CSS Module names; optional/state-only tokens need no style rule. */
export function bindClasses(styles: Readonly<Record<string, string>>) {
  return (...values: (string | undefined | false)[]) =>
    values
      .filter(Boolean)
      .join(" ")
      .split(/\s+/)
      .map((name) => styles[name])
      .filter(Boolean)
      .join(" ");
}
