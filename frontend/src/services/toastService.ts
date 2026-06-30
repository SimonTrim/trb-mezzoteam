export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
  delayMs?: number;
}

type ToastListener = (toasts: Toast[]) => void;

class ToastService {
  private toasts: Toast[] = [];
  private listeners = new Set<ToastListener>();

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => this.listeners.delete(listener);
  }

  push(partial: Omit<Toast, 'id'> & { id?: string }): string {
    const id = partial.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const toast: Toast = { delayMs: 4000, ...partial, id };
    this.toasts = [...this.toasts, toast];
    this.emit();
    const delay = toast.delayMs ?? 4000;
    if (delay > 0) {
      window.setTimeout(() => this.dismiss(id), delay);
    }
    return id;
  }

  success(title: string, message?: string) {
    return this.push({ title, message, variant: 'success' });
  }

  error(title: string, message?: string) {
    return this.push({ title, message, variant: 'error', delayMs: 6000 });
  }

  info(title: string, message?: string) {
    return this.push({ title, message, variant: 'info' });
  }

  warning(title: string, message?: string) {
    return this.push({ title, message, variant: 'warning' });
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.emit();
  }

  private emit() {
    this.listeners.forEach((l) => l(this.toasts));
  }
}

export const toastService = new ToastService();
