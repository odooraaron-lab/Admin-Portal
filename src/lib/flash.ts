import { redirect } from 'next/navigation';

/** Redirect back to a page with a success or error message in the URL. */
export function back(path: string, kind: 'ok' | 'err', message: string): never {
  const sep = path.includes('?') ? '&' : '?';
  redirect(`${path}${sep}${kind}=${encodeURIComponent(message)}`);
}

export function errMsg(e: unknown) {
  return e instanceof Error ? e.message : 'Something went wrong';
}
