import { SpinnerService } from './spinner.service';

export function installNetworkSpinner(spinner: SpinnerService) {
  // Patch only fetch (HttpClient is handled by the interceptor)
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo, init?: RequestInit) {
    try {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url && url.includes('/api')) {
        const id = spinner.show();
        return originalFetch(input, init).finally(() => spinner.hide(id));
      }
    } catch (e) {
      // ignore
    }
    return originalFetch(input, init);
  } as typeof window.fetch;
}

export default installNetworkSpinner;
