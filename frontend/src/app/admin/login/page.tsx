'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const ADMIN_TOKEN_KEY = 'roa_admin_token';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      localStorage.setItem(ADMIN_TOKEN_KEY, data.accessToken);
      router.push('/admin');
    } catch (error) {
      console.error('Admin login failed:', error);
      setErrorMessage('Credenciales invalidas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-panel">
        <p className="eyebrow">Administracion</p>
        <h1>Acceso admin</h1>
        <p className="subtitle">Inicia sesion para gestionar recursos, publicaciones y archivos.</p>

        {errorMessage && <div className="error">{errorMessage}</div>}

        <form onSubmit={handleSubmit}>
          <label>
            Usuario
            <input value={username} onChange={(event) => setUsername(event.target.value)} required />
          </label>
          <label>
            Contrasena
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>

      <style jsx>{`
        .login-shell {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 1.5rem;
          background: #f8fafc;
        }

        .login-panel {
          width: 100%;
          max-width: 420px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          padding: 1.5rem;
          box-shadow: 0 10px 30px rgb(15 23 42 / 0.08);
        }

        .eyebrow {
          color: #2563eb;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }

        h1 {
          margin: 0;
          font-size: 1.5rem;
        }

        .subtitle {
          color: #64748b;
          margin: 0.35rem 0 1.25rem;
        }

        form {
          display: grid;
          gap: 1rem;
        }

        label {
          display: grid;
          gap: 0.4rem;
          color: #334155;
          font-size: 0.875rem;
          font-weight: 700;
        }

        input {
          border: 1px solid #cbd5e1;
          border-radius: 0.375rem;
          padding: 0.75rem;
          font: inherit;
        }

        button {
          border: 1px solid #2563eb;
          border-radius: 0.375rem;
          background: #2563eb;
          color: white;
          padding: 0.75rem;
          font-weight: 800;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          border-radius: 0.375rem;
          padding: 0.7rem;
          margin-bottom: 1rem;
          font-weight: 700;
          font-size: 0.875rem;
        }
      `}</style>
    </main>
  );
}
