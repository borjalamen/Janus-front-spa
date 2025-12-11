// Environment configuration for DEV environment.
export const environment = {
  production: false,
  name: 'dev',
  // API base URL for dev environment. Usando el host del route en service.yaml.
  apiBaseUrl: 'https://janushub-dev.apps-crc.testing',
  // Habilitar o deshabilitar flags específicas para dev
  featureFlagX: true
};
