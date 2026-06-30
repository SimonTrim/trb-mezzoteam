export const config = {
  port: process.env.PORT ?? 3001,
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  useMockMezzoteam: process.env.USE_MOCK_MEZZOTEAM === 'true',
  mezzoteamApiBase: process.env.MEZZOTEAM_API_BASE ?? 'https://api.mezzoteam.com',
  mezzoteamApiVersion: process.env.MEZZOTEAM_API_VERSION ?? '3.4',
  useMockTrimble: process.env.USE_MOCK_TRIMBLE === 'true',
  trimbleApiBase: process.env.TRIMBLE_API_BASE ?? 'https://app.connect.trimble.com/tc/api/2.0',
};

export function mezzoteamApiPath(suffix) {
  return `/mezzoteam/${config.mezzoteamApiVersion}${suffix}`;
}

/**
 * Base REST Trimble Connect (TCPS). La région dépend du projet (`project.location`),
 * ex. "europe" -> https://europe.connect.trimble.com/tc/api/2.0. On laisse la
 * possibilité de surcharger via TRIMBLE_API_BASE pour le développement.
 */
export function trimbleApiBase(region) {
  if (process.env.TRIMBLE_API_BASE) return process.env.TRIMBLE_API_BASE;
  if (region && region !== 'global') {
    return `https://${region}.connect.trimble.com/tc/api/2.0`;
  }
  return config.trimbleApiBase;
}
