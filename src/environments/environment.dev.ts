// Environment configuration for DEV environment.
export const environment = {
  production: false,
  name: 'dev',
  // API base URL for dev environment. Usando el host del route en service.yaml.
  // Añadimos `/api` para llegar al endpoint real del backend (evita recibir el index.html).
  apiBaseUrl: 'https://janushub-dev.apps-crc.testing/api',
  // Habilitar o deshabilitar flags específicas para dev
  featureFlagX: true
};
