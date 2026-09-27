'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { login } from './actions';

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn primary" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>;
}

export default function LoginPage() {
  const [state, action] = useFormState(login, null as null | { error: string });
  return (
    <main className="login">
      <div className="panel">
        <h1>Admin sign in</h1>
        <p className="sub">Orders, sites and screens for every product.</p>
        <form action={action}>
          <label className="field">Email<input name="email" type="email" autoComplete="username" required /></label>
          <label className="field">Password<input name="password" type="password" autoComplete="current-password" required /></label>
          <label className="field">6-digit code
            <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" placeholder="From your authenticator app" />
          </label>
          {state?.error && <p className="error" role="alert">{state.error}</p>}
          <Submit />
        </form>
      </div>
    </main>
  );
}
