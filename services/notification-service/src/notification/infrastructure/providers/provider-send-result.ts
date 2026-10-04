import { isAxiosError } from 'axios';

import type { SendResult } from '../../domain/ports/notification-sender.port';

export function httpSendFailure(error: unknown): SendResult {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    return {
      success: false,
      isTransientError: status === undefined || status === 429 || status >= 500,
      errorMessage: status ? `HTTP ${status}` : 'HTTP request failed',
    };
  }

  return {
    success: false,
    isTransientError: false,
    errorMessage: 'Unexpected provider error',
  };
}
