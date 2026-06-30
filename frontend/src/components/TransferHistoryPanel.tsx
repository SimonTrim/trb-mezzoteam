import { useEffect, useState } from 'react';
import {
  ModusWcButton,
  ModusWcIcon,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react';
import {
  clearTransferHistory,
  loadTransferHistory,
} from '@/services/transferHistoryService';
import type { TransferLogEntry } from '@/types';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR');
  } catch {
    return iso;
  }
}

export function TransferHistoryPanel() {
  const [history, setHistory] = useState<TransferLogEntry[]>([]);

  useEffect(() => {
    setHistory(loadTransferHistory());
  }, []);

  const handleClear = () => {
    clearTransferHistory();
    setHistory([]);
  };

  if (history.length === 0) {
    return (
      <div className="history-panel app__center">
        <ModusWcTypography hierarchy="p">Aucun transfert enregistré pour le moment.</ModusWcTypography>
      </div>
    );
  }

  return (
    <div className="history-panel">
      <div className="history-panel__header">
        <ModusWcTypography hierarchy="h5" label="Historique des transferts" />
        <ModusWcButton color="tertiary" size="sm" onButtonClick={handleClear}>
          Effacer
        </ModusWcButton>
      </div>
      <ul className="history-panel__list">
        {history.map((entry) => (
          <li key={entry.id} className={`history-panel__item history-panel__item--${entry.status}`}>
            <ModusWcIcon
              name={
                entry.status === 'success'
                  ? 'check_circle'
                  : entry.status === 'error'
                    ? 'alert'
                    : 'sync'
              }
              size="sm"
              decorative
            />
            <div className="history-panel__content">
              <strong>{entry.fileName}</strong>
              <span>
                {entry.direction === 'mezzoteam-to-trimble'
                  ? 'Mezzoteam → Trimble Connect'
                  : 'Trimble Connect → Mezzoteam'}
              </span>
              {entry.message && <span>{entry.message}</span>}
              <time dateTime={entry.timestamp}>{formatDate(entry.timestamp)}</time>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
