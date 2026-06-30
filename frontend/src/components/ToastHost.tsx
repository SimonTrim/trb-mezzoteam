import { ModusWcAlert } from '@trimble-oss/moduswebcomponents-react';
import { useToast } from '@/services/useToast';
import { toastService } from '@/services/toastService';

export function ToastHost() {
  const toasts = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-host" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast-host__item">
          <ModusWcAlert
            alertTitle={toast.title}
            alertDescription={toast.message}
            variant={toast.variant}
            dismissible
            onDismissClick={() => toastService.dismiss(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}
