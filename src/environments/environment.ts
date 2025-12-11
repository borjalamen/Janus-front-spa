// Environment for local development (localhost).
export const environment = {
  production: false,
  name: 'local',
  // API base URL used in local development. Ajusta según tu backend local.
  apiBaseUrl: 'http://localhost:3000',
  // Path prefix for API on the host (kept separate in case host and path differ)
  api: '/api',
  // Otros valores de configuración comunes
  featureFlagX: false
};
