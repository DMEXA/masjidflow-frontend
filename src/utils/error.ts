import type { AxiosError } from 'axios';
import axios from 'axios';

export function getErrorMessage(error: unknown, fallback: string = 'Something went wrong. Please try again.'): string {
  const axiosError = error as AxiosError<{ message?: string | string[] }>;
  const message = axiosError?.response?.data?.message;
  if (Array.isArray(message)) return message[0] || fallback;
  if (typeof message === 'string') return message;
  return fallback;
}

export function isRequestCanceled(error: unknown): boolean {
  if (axios.isCancel(error)) return true;
  const axiosError = error as AxiosError;
  return axiosError?.code === 'ERR_CANCELED';
}
