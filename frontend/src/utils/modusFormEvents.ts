type WithValue = { value?: string | null; checked?: boolean | null };

export function readInputString(e: CustomEvent): string {
  const t = (e.detail as InputEvent | undefined)?.target as WithValue | null;
  return t?.value ?? '';
}

export function readInputChecked(e: CustomEvent): boolean {
  const t = (e.detail as InputEvent | undefined)?.target as WithValue | null;
  return Boolean(t?.checked);
}
