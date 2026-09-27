'use client';
import { useFormStatus } from 'react-dom';

/** Submit button that asks "are you sure?" first. */
export function ConfirmButton({ children, message, className = 'btn small' }: {
  children: React.ReactNode; message: string; className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      disabled={pending}
      onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}
    >
      {pending ? 'Working…' : children}
    </button>
  );
}

export function SubmitButton({ children, className = 'btn small' }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending}>{pending ? 'Working…' : children}</button>;
}
