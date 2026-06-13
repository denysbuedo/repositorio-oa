'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Collection {
  id: string;
  name: string;
  description?: string | null;
}

interface LearningObject {
  id: string;
  title: string;
  description?: string;
  author: string;
  fileUrl?: string;
  fileMimeType?: string;
  originalFilename?: string | null;
  fileSize?: number | null;
  collection?: Collection | null;
  lomMetadata?: {
    general?: {
      language?: string;
      keyword?: string[];
    };
    educational?: {
      learningResourceType?: string;
      difficulty?: string;
      educationalLevel?: string;
      intendedEndUserRole?: string;
    };
    rights?: {
      license?: string;
      description?: string;
    };
  };
}

export default function ObjectDetailPage() {
  const params = useParams<{ id: string }>();
  const objectId = params.id;
  const [object, setObject] = useState<LearningObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const keywords = useMemo(() => object?.lomMetadata?.general?.keyword ?? [], [object]);
  const canonicalPath = `/objects/${objectId}`;

  useEffect(() => {
    if (!objectId) return;

    fetch(`${API_URL}/learning-objects/${objectId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setObject(data as LearningObject);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading public object detail:', error);
        setObject(null);
        setErrorMessage('No se pudo cargar la ficha publica del recurso.');
        setLoading(false);
      });
  }, [objectId]);

  const copyCanonicalUrl = () => {
    void navigator.clipboard.writeText(`${window.location.origin}${canonicalPath}`);
  };

  if (loading) {
    return <main className="detail-shell">Cargando ficha del recurso...</main>;
  }

  if (errorMessage || !object) {
    return (
      <main className="detail-shell">
        <section className="message-panel">
          <h1>Ficha no disponible</h1>
          <p>{errorMessage || 'El recurso no existe o no esta publicado.'}</p>
          <Link href="/" className="secondary-link">Volver al catalogo</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="detail-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(object, canonicalPath)),
        }}
      />
      <header className="detail-header">
        <div>
          <Link href="/" className="back-link">Catalogo</Link>
          <h1>{object.title}</h1>
          <p>{object.description || 'Sin descripcion'}</p>
        </div>
        <div className="header-actions">
          <button onClick={copyCanonicalUrl} className="secondary-button">Copiar enlace</button>
          {object.fileUrl && (
            <a href={`${API_URL}/${object.fileUrl}`} download className="primary-button">
              Descargar
            </a>
          )}
        </div>
      </header>

      <section className="detail-grid">
        <article className="metadata-panel">
          <h2>Ficha del OA</h2>
          <dl className="metadata-list">
            <MetadataRow label="Identificador" value={object.id} />
            <MetadataRow label="URL canonica" value={canonicalPath} />
            <MetadataRow label="Autor" value={object.author} />
            <MetadataRow label="Coleccion" value={object.collection?.name ?? 'Sin coleccion'} />
            <MetadataRow label="Tipo" value={object.lomMetadata?.educational?.learningResourceType ?? 'Sin tipo'} />
            <MetadataRow label="Dificultad" value={object.lomMetadata?.educational?.difficulty ?? 'Sin nivel'} />
            <MetadataRow label="Nivel educativo" value={object.lomMetadata?.educational?.educationalLevel ?? 'Sin nivel educativo'} />
            <MetadataRow label="Audiencia" value={object.lomMetadata?.educational?.intendedEndUserRole ?? 'Sin audiencia'} />
            <MetadataRow label="Idioma" value={getLanguageLabel(object.lomMetadata?.general?.language)} />
            <MetadataRow label="Licencia" value={object.lomMetadata?.rights?.license ?? 'Sin licencia'} />
            <MetadataRow label="Archivo" value={object.originalFilename ?? 'Archivo disponible'} />
            <MetadataRow label="Formato" value={object.fileMimeType ?? 'Sin formato'} />
            <MetadataRow label="Tamano" value={formatFileSize(object.fileSize)} />
          </dl>
        </article>

        <aside className="rights-panel">
          <h2>Derechos y reutilizacion</h2>
          <div className="license-card">
            <span>Licencia</span>
            <strong>{object.lomMetadata?.rights?.license ?? 'Sin licencia declarada'}</strong>
          </div>
          <p>{object.lomMetadata?.rights?.description || 'No se han especificado notas adicionales de derechos.'}</p>

          <h2>Interoperabilidad</h2>
          <a href={`${API_URL}/learning-objects/${object.id}/metadata`} className="metadata-export-link">
            Ver metadatos Dublin Core / LRMI
          </a>

          <h2>Palabras clave</h2>
          {keywords.length > 0 ? (
            <div className="keywords">
              {keywords.map((keyword) => (
                <span key={keyword}>{keyword}</span>
              ))}
            </div>
          ) : (
            <p>Sin palabras clave.</p>
          )}
        </aside>
      </section>

      <style jsx global>{`
        .detail-shell {
          max-width: 1180px;
          margin: 0 auto;
          min-height: 100vh;
          padding: 2rem;
          color: #1a1a1a;
          background: #f5f5f5;
        }

        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1.25rem;
          border: 1px solid #174a96;
          border-radius: 0.5rem;
          background: linear-gradient(135deg, #1f5fbf 0%, #174a96 100%);
          color: white;
          padding: 2.25rem;
          margin-bottom: 1rem;
        }

        .back-link {
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.8rem;
          font-weight: 800;
          text-decoration: none;
          text-transform: uppercase;
        }

        h1 {
          font-size: 2rem;
          line-height: 1.15;
          margin: 0.45rem 0 0;
        }

        .detail-header p {
          max-width: 760px;
          color: rgba(255, 255, 255, 0.88);
          margin: 0.75rem 0 0;
          line-height: 1.6;
        }

        .header-actions {
          display: flex;
          gap: 0.65rem;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .primary-button,
        .secondary-button,
        .secondary-link {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          border-radius: 0.375rem;
          padding: 0.68rem 0.9rem;
          font-size: 0.86rem;
          font-weight: 800;
          text-decoration: none;
          min-height: 2.45rem;
        }

        .primary-button {
          color: #174a96;
          background: white;
          border: 1px solid rgba(255, 255, 255, 0.75);
        }

        .secondary-button,
        .secondary-link {
          color: #174a96;
          background: white;
          border: 1px solid #e0e0e0;
          cursor: pointer;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 1rem;
          align-items: start;
        }

        .metadata-panel,
        .rights-panel,
        .message-panel {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 0.5rem;
          padding: 1rem;
        }

        h2 {
          font-size: 1rem;
          margin: 0 0 0.9rem;
        }

        .metadata-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
          margin: 0;
        }

        .metadata-row {
          border: 1px solid #e0e0e0;
          border-radius: 0.45rem;
          background: #f8fafc;
          padding: 0.75rem;
          min-width: 0;
        }

        dt {
          color: #666666;
          font-size: 0.7rem;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }

        dd {
          color: #1a1a1a;
          font-size: 0.9rem;
          font-weight: 700;
          margin: 0;
          overflow-wrap: anywhere;
        }

        .license-card {
          border: 1px solid #dbe4ef;
          border-radius: 0.5rem;
          background: #f7f9fc;
          padding: 0.85rem;
          margin-bottom: 0.9rem;
        }

        .license-card span {
          display: block;
          color: #666666;
          font-size: 0.7rem;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }

        .license-card strong {
          color: #1f5fbf;
          font-size: 1rem;
        }

        .rights-panel p,
        .message-panel p {
          color: #666666;
          font-size: 0.9rem;
          line-height: 1.6;
          margin: 0 0 1rem;
        }

        .metadata-export-link {
          display: inline-flex;
          width: 100%;
          justify-content: center;
          align-items: center;
          border-radius: 0.375rem;
          border: 1px solid #1f5fbf;
          color: #1f5fbf;
          background: white;
          font-size: 0.86rem;
          font-weight: 800;
          text-decoration: none;
          min-height: 2.5rem;
          margin-bottom: 1rem;
        }

        .keywords {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }

        .keywords span {
          border-radius: 999px;
          background: #f5f5f5;
          border: 1px solid #e0e0e0;
          color: #1a1a1a;
          font-size: 0.78rem;
          font-weight: 800;
          padding: 0.35rem 0.55rem;
        }

        @media (max-width: 900px) {
          .detail-header,
          .detail-grid {
            grid-template-columns: 1fr;
          }

          .detail-header {
            display: grid;
          }

          .header-actions {
            justify-content: stretch;
          }

          .primary-button,
          .secondary-button {
            width: 100%;
          }

          .metadata-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="metadata-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function buildJsonLd(object: LearningObject, canonicalPath: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    '@id': canonicalPath,
    url: canonicalPath,
    name: object.title,
    description: object.description ?? '',
    author: {
      '@type': 'Person',
      name: object.author,
    },
    keywords: object.lomMetadata?.general?.keyword ?? [],
    inLanguage: object.lomMetadata?.general?.language,
    learningResourceType: object.lomMetadata?.educational?.learningResourceType,
    educationalLevel: object.lomMetadata?.educational?.educationalLevel,
    audience: object.lomMetadata?.educational?.intendedEndUserRole
      ? {
          '@type': 'EducationalAudience',
          educationalRole: object.lomMetadata.educational.intendedEndUserRole,
        }
      : undefined,
    license: object.lomMetadata?.rights?.license,
    isPartOf: object.collection
      ? {
          '@type': 'Collection',
          name: object.collection.name,
        }
      : undefined,
    encodingFormat: object.fileMimeType,
    contentUrl: object.fileUrl ? `${API_URL}/${object.fileUrl}` : undefined,
  };
}

function getLanguageLabel(value?: string) {
  switch (value) {
    case 'es':
      return 'Espanol';
    case 'en':
      return 'Ingles';
    case 'pt':
      return 'Portugues';
    case 'fr':
      return 'Frances';
    default:
      return 'Sin idioma';
  }
}

function formatFileSize(value?: number | null) {
  if (!value) return 'Sin archivo';
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
