import type { ReactNode } from 'react';
import {
  ModusWcButton,
  ModusWcCard,
  ModusWcLoader,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react';

import { useAuth } from '@/services/authService';

interface AuthGateProps {
  children: ReactNode;
  mockMode?: boolean;
}

export function AuthGate({ children, mockMode = false }: AuthGateProps) {
  const { status, isChecking, login } = useAuth();

  if (mockMode || status.mock) {
    return <>{children}</>;
  }

  if (isChecking) {
    return (
      <div className="app__center">
        <ModusWcLoader />
        <ModusWcTypography hierarchy="p">
          Vérification de la session Mezzoteam…
        </ModusWcTypography>
      </div>
    );
  }

  if (!status.authenticated) {
    return (
      <div className="auth-gate">
        <ModusWcCard bordered padding="comfortable">
          <ModusWcTypography hierarchy="h4" label="Connexion Mezzoteam" />
          <ModusWcTypography hierarchy="p">
            Connectez-vous pour accéder à la GED Mezzoteam depuis Trimble Connect.
          </ModusWcTypography>
          <div className="app__actions">
            <ModusWcButton color="primary" onButtonClick={login}>
              Se connecter
            </ModusWcButton>
          </div>
        </ModusWcCard>
      </div>
    );
  }

  return <>{children}</>;
}
