import { ModusWcBadge, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react';

interface MockModeBannerProps {
  apiVersion?: string;
}

export function MockModeBanner({ apiVersion = '3.4' }: MockModeBannerProps) {
  return (
    <div className="mock-banner" role="status">
      <ModusWcBadge color="warning" size="sm">
        Mode démo
      </ModusWcBadge>
      <ModusWcTypography hierarchy="p" size="sm">
        Données fictives — API Mezzoteam {apiVersion} non connectée
      </ModusWcTypography>
    </div>
  );
}
