'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface LearningObject {
  id: string;
  title: string;
  description?: string;
  author: string;
  collection?: {
    name?: string | null;
  } | null;
  lomMetadata?: {
    educational?: {
      learningResourceType?: string;
      difficulty?: string;
    };
  };
}

interface DeepLinkingResponse {
  jwt: string;
  returnUrl: string;
}

function DeepLinkContent() {
  const searchParams = useSearchParams();
  const sessionToken = searchParams.get('session') ?? '';
  const [objects, setObjects] = useState<LearningObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [response, setResponse] = useState<DeepLinkingResponse | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/learning-objects`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setObjects(Array.isArray(data) ? data as LearningObject[] : []);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading deep linking objects:', error);
        setErrorMessage('No se pudieron cargar los objetos publicados.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (response) {
      formRef.current?.submit();
    }
  }, [response]);

  const selectObject = async (objectId: string) => {
    if (!sessionToken) {
      setErrorMessage('La sesion Deep Linking no es valida.');
      return;
    }

    setSubmittingId(objectId);
    setErrorMessage('');
    try {
      const res = await fetch(`${API_URL}/lti/deep-linking-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, objectId }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      setResponse(await res.json() as DeepLinkingResponse);
    } catch (error) {
      console.error('Error creating deep linking response:', error);
      setErrorMessage('No se pudo preparar la respuesta para el LMS.');
      setSubmittingId('');
    }
  };

  if (response) {
    return (
      <main className="deep-link-shell">
        <form ref={formRef} action={response.returnUrl} method="POST">
          <input type="hidden" name="JWT" value={response.jwt} />
          <button className="primary-button" type="submit">Volver al LMS</button>
        </form>
      </main>
    );
  }

  return (
    <main className="deep-link-shell">
      <header className="deep-link-header">
        <div>
          <p>Deep Linking LTI</p>
          <h1>Seleccionar recurso</h1>
        </div>
      </header>

      {errorMessage && <div className="message error">{errorMessage}</div>}

      {loading ? (
        <div className="loading-panel">Cargando recursos publicados...</div>
      ) : (
        <section className="object-grid" aria-label="Objetos publicados">
          {objects.length > 0 ? (
            objects.map((object) => (
              <article key={object.id} className="object-card">
                <div>
                  <span className="type-tag">
                    {object.lomMetadata?.educational?.learningResourceType ?? 'OA'}
                  </span>
                  <h2>{object.title}</h2>
                  <p>{object.description || 'Sin descripcion'}</p>
                </div>
                <dl>
                  <div>
                    <dt>Autor</dt>
                    <dd>{object.author}</dd>
                  </div>
                  <div>
                    <dt>Coleccion</dt>
                    <dd>{object.collection?.name ?? 'Sin coleccion'}</dd>
                  </div>
                  <div>
                    <dt>Dificultad</dt>
                    <dd>{object.lomMetadata?.educational?.difficulty ?? 'Sin nivel'}</dd>
                  </div>
                </dl>
                <button
                  className="primary-button"
                  onClick={() => void selectObject(object.id)}
                  disabled={Boolean(submittingId)}
                >
                  {submittingId === object.id ? 'Enviando...' : 'Seleccionar'}
                </button>
              </article>
            ))
          ) : (
            <div className="empty-panel">No hay objetos publicados disponibles.</div>
          )}
        </section>
      )}

      <style jsx>{`
        .deep-link-shell {
          min-height: 100vh;
          background: #f5f5f5;
          color: #1a1a1a;
          padding: 1.5rem;
        }

        .deep-link-header {
          border: 1px solid #174a96;
          border-radius: 0.5rem;
          background: linear-gradient(135deg, #1f5fbf 0%, #174a96 100%);
          color: white;
          padding: 2rem;
          margin-bottom: 1rem;
        }

        .deep-link-header p {
          margin: 0 0 0.35rem;
          color: rgba(255, 255, 255, 0.82);
          font-size: 0.78rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: 2rem;
        }

        .object-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .object-card,
        .loading-panel,
        .empty-panel,
        .message {
          border: 1px solid #e0e0e0;
          border-radius: 0.5rem;
          background: white;
          padding: 1rem;
        }

        .object-card {
          display: grid;
          gap: 1rem;
          align-content: space-between;
        }

        .type-tag {
          display: inline-flex;
          border-radius: 999px;
          background: #eef4ff;
          color: #174a96;
          font-size: 0.72rem;
          font-weight: 900;
          padding: 0.25rem 0.55rem;
          margin-bottom: 0.75rem;
        }

        h2 {
          font-size: 1rem;
          line-height: 1.35;
          margin: 0;
        }

        p {
          color: #666666;
          font-size: 0.88rem;
          line-height: 1.55;
          margin: 0.5rem 0 0;
        }

        dl {
          display: grid;
          gap: 0.45rem;
          margin: 0;
        }

        dl div {
          display: grid;
          grid-template-columns: 86px minmax(0, 1fr);
          gap: 0.5rem;
        }

        dt {
          color: #666666;
          font-size: 0.72rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        dd {
          margin: 0;
          color: #1a1a1a;
          font-size: 0.84rem;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .primary-button {
          border: 1px solid #1f5fbf;
          border-radius: 0.375rem;
          background: #1f5fbf;
          color: white;
          cursor: pointer;
          font-size: 0.88rem;
          font-weight: 800;
          min-height: 2.55rem;
          padding: 0.65rem 0.9rem;
        }

        .primary-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .message.error {
          border-color: #fecaca;
          color: #991b1b;
          margin-bottom: 1rem;
        }
      `}</style>
    </main>
  );
}

export default function LtiDeepLinkPage() {
  return (
    <Suspense fallback={<main className="deep-link-shell">Cargando...</main>}>
      <DeepLinkContent />
    </Suspense>
  );
}
