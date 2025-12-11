// Environment configuration for DEV environment.
export const environment = {
  name: 'dev',
  production: false,
  local: false,
  // API base URL for dev environment. Usando el host del route en service.yaml.
  apiBaseUrl: 'https://janushub-dev.apps-crc.testing',
  // Path prefix for API on the host (kept separate to avoid double slashes)
  api: '/api',
};
