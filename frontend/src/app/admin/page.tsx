'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import UploadModal from '../components/UploadModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const ADMIN_TOKEN_KEY = 'roa_admin_token';

type ObjectStatus = 'draft' | 'published' | 'archived';

interface LearningObject {
  id: string;
  title: string;
  description?: string;
  author: string;
  status: ObjectStatus;
  fileUrl?: string;
  fileMimeType?: string;
  createdAt?: string;
  updatedAt?: string;
  lomMetadata?: {
    educational?: {
      learningResourceType?: string;
      difficulty?: string;
    };
    general?: {
      keyword?: string[];
    };
  };
}

const statusOptions: Array<{ value: ObjectStatus; label: string }> = [
  { value: 'draft', label: 'Borrador' },
  { value: 'published', label: 'Publicado' },
  { value: 'archived', label: 'Archivado' },
];

export default function AdminPage() {
  const router = useRouter();
  const [objects, setObjects] = useState<LearningObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [authToken] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(ADMIN_TOKEN_KEY) ?? '';
  });
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ObjectStatus>('all');
  const [selectedObject, setSelectedObject] = useState<LearningObject | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!authToken) {
      router.replace('/admin/login');
    }
  }, [authToken, router]);

  const fetchObjects = useCallback(() => {
    setLoading(true);
    setErrorMessage('');
    fetch(`${API_URL}/learning-objects`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error('Unexpected API response');
        }
        setObjects(data as LearningObject[]);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading admin objects:', error);
        setObjects([]);
        setErrorMessage('No se pudieron cargar los recursos. Verifica que el backend este activo.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchObjects();
  }, [fetchObjects]);

  const filteredObjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return objects.filter((object) => {
      const matchesStatus = statusFilter === 'all' || object.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        object.title.toLowerCase().includes(normalizedQuery) ||
        object.author.toLowerCase().includes(normalizedQuery) ||
        object.id.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [objects, query, statusFilter]);

  const stats = useMemo(() => {
    const total = objects.length;
    const published = objects.filter((object) => object.status === 'published').length;
    const draft = objects.filter((object) => object.status === 'draft').length;
    const archived = objects.filter((object) => object.status === 'archived').length;
    const withMetadata = objects.filter((object) => object.lomMetadata).length;
    return { total, published, draft, archived, withMetadata };
  }, [objects]);

  const updateStatus = async (id: string, status: ObjectStatus) => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch(`${API_URL}/learning-objects/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      setSuccessMessage(`Recurso marcado como ${getStatusLabel(status)}.`);
      fetchObjects();
    } catch (error) {
      console.error('Error updating status:', error);
      setErrorMessage('No se pudo actualizar el estado del recurso.');
    }
  };

  const deleteObject = async (id: string) => {
    const confirmed = window.confirm('Eliminar este recurso de forma permanente?');
    if (!confirmed) return;

    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch(`${API_URL}/learning-objects/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      setSelectedObject((current) => (current?.id === id ? null : current));
      setSuccessMessage('Recurso eliminado.');
      fetchObjects();
    } catch (error) {
      console.error('Error deleting object:', error);
      setErrorMessage('No se pudo eliminar el recurso.');
    }
  };

  const logout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    router.replace('/admin/login');
  };

  if (!authToken) {
    return <main className="admin-shell">Validando sesion...</main>;
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Administracion</p>
          <h1>Gestion de recursos</h1>
          <p className="subtitle">Publica, archiva y revisa objetos de aprendizaje antes de entregarlos por LTI.</p>
        </div>
        <nav className="header-actions">
          <Link href="/" className="secondary-link">Catalogo</Link>
          <button className="secondary-button" onClick={() => setIsUploadOpen(true)}>Nuevo recurso</button>
          <button className="primary-button" onClick={fetchObjects}>Actualizar</button>
          <button className="secondary-button" onClick={logout}>Salir</button>
        </nav>
      </header>

      <section className="metrics" aria-label="Resumen administrativo">
        <Metric label="Total" value={stats.total} />
        <Metric label="Publicados" value={stats.published} />
        <Metric label="Borradores" value={stats.draft} />
        <Metric label="Archivados" value={stats.archived} />
        <Metric label="Con metadatos" value={stats.withMetadata} />
      </section>

      <section className="toolbar" aria-label="Filtros de administracion">
        <label className="field">
          <span>Busqueda</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Titulo, autor o ID"
          />
        </label>
        <label className="field compact">
          <span>Estado</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | ObjectStatus)}>
            <option value="all">Todos</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </section>

      {errorMessage && <div className="message error">{errorMessage}</div>}
      {successMessage && <div className="message success">{successMessage}</div>}

      <section className="admin-workspace">
        <div className="table-panel">
          <div className="table-header">
            <h2>Recursos</h2>
            <span>{filteredObjects.length} resultados</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Recurso</th>
                  <th>Estado</th>
                  <th>Autor</th>
                  <th>Tipo</th>
                  <th>Dificultad</th>
                  <th>Actualizado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="empty-row">Cargando recursos...</td></tr>
                ) : filteredObjects.length === 0 ? (
                  <tr><td colSpan={7} className="empty-row">No hay recursos para los filtros actuales.</td></tr>
                ) : (
                  filteredObjects.map((object) => (
                    <tr key={object.id} className={selectedObject?.id === object.id ? 'selected-row' : ''}>
                      <td>
                        <button className="resource-title" onClick={() => setSelectedObject(object)}>
                          {object.title}
                        </button>
                        <div className="resource-id">{object.id}</div>
                      </td>
                      <td><span className={`status-pill status-${object.status}`}>{getStatusLabel(object.status)}</span></td>
                      <td>{object.author}</td>
                      <td>{object.lomMetadata?.educational?.learningResourceType ?? 'Sin tipo'}</td>
                      <td>{object.lomMetadata?.educational?.difficulty ?? 'Sin nivel'}</td>
                      <td>{formatDate(object.updatedAt ?? object.createdAt)}</td>
                      <td>
                        <div className="row-actions">
                          <button onClick={() => updateStatus(object.id, 'published')} disabled={object.status === 'published'}>Publicar</button>
                          <button onClick={() => updateStatus(object.id, 'draft')} disabled={object.status === 'draft'}>Borrador</button>
                          <button onClick={() => updateStatus(object.id, 'archived')} disabled={object.status === 'archived'}>Archivar</button>
                          <button className="danger" onClick={() => deleteObject(object.id)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="detail-panel">
          <h2>Revision</h2>
          {selectedObject ? (
            <>
              <h3>{selectedObject.title}</h3>
              <dl>
                <div><dt>ID</dt><dd>{selectedObject.id}</dd></div>
                <div><dt>Estado</dt><dd>{getStatusLabel(selectedObject.status)}</dd></div>
                <div><dt>Autor</dt><dd>{selectedObject.author}</dd></div>
                <div><dt>Archivo</dt><dd>{selectedObject.fileUrl ? 'Disponible' : 'Pendiente'}</dd></div>
              </dl>
              <p className="description">{selectedObject.description || 'Sin descripcion.'}</p>
              {selectedObject.fileUrl && (
                <a className="download-link" href={`${API_URL}/${selectedObject.fileUrl}`} download>
                  Descargar archivo
                </a>
              )}
              <details className="metadata">
                <summary>Metadatos LOM</summary>
                <pre>{JSON.stringify(selectedObject.lomMetadata ?? {}, null, 2)}</pre>
              </details>
            </>
          ) : (
            <p className="empty-detail">Selecciona un recurso de la tabla para revisar sus datos y metadatos.</p>
          )}
        </aside>
      </section>

      {isUploadOpen && (
        <UploadModal
          authToken={authToken}
          onClose={() => setIsUploadOpen(false)}
          onSuccess={fetchObjects}
        />
      )}

      <style jsx>{`
        .admin-shell {
          max-width: 1500px;
          margin: 0 auto;
          padding: 1.5rem;
          min-height: 100vh;
          color: #0f172a;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 1rem;
        }

        .eyebrow {
          color: #2563eb;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }

        h1 {
          font-size: 1.75rem;
          margin: 0;
        }

        .subtitle {
          color: #64748b;
          margin-top: 0.25rem;
          max-width: 760px;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .secondary-link,
        .secondary-button,
        .primary-button {
          border-radius: 0.375rem;
          padding: 0.65rem 0.85rem;
          font-size: 0.875rem;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
        }

        .secondary-link,
        .secondary-button {
          color: #334155;
          border: 1px solid #cbd5e1;
          background: white;
        }

        .primary-button {
          color: white;
          border: 1px solid #2563eb;
          background: #2563eb;
        }

        .metrics {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .metric {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          padding: 0.9rem;
        }

        .metric-value {
          font-size: 1.5rem;
          font-weight: 800;
        }

        .metric-label {
          color: #64748b;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .toolbar {
          display: flex;
          gap: 0.75rem;
          align-items: end;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          flex: 1;
        }

        .field.compact {
          max-width: 220px;
        }

        .field span {
          color: #475569;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        input,
        select {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 0.375rem;
          padding: 0.65rem;
          color: #0f172a;
          background: white;
          font: inherit;
        }

        .message {
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          font-weight: 700;
        }

        .message.error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .message.success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }

        .admin-workspace {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 1rem;
          align-items: start;
        }

        .table-panel,
        .detail-panel {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .table-header h2,
        .detail-panel h2 {
          font-size: 1rem;
          margin: 0;
        }

        .table-header span {
          color: #64748b;
          font-size: 0.875rem;
        }

        .table-scroll {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1080px;
        }

        th,
        td {
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
          padding: 0.75rem;
          vertical-align: top;
          font-size: 0.875rem;
        }

        th {
          color: #475569;
          background: #f8fafc;
          font-size: 0.75rem;
          text-transform: uppercase;
        }

        .selected-row {
          background: #eff6ff;
        }

        .resource-title {
          border: none;
          background: none;
          padding: 0;
          color: #1d4ed8;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          text-align: left;
        }

        .resource-id {
          color: #64748b;
          font-size: 0.7rem;
          margin-top: 0.2rem;
        }

        .status-pill {
          display: inline-flex;
          border-radius: 999px;
          padding: 0.25rem 0.55rem;
          font-size: 0.75rem;
          font-weight: 800;
        }

        .status-published {
          background: #dcfce7;
          color: #166534;
        }

        .status-draft {
          background: #fef3c7;
          color: #92400e;
        }

        .status-archived {
          background: #f1f5f9;
          color: #475569;
        }

        .row-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }

        .row-actions button {
          border: 1px solid #cbd5e1;
          border-radius: 0.375rem;
          background: white;
          color: #334155;
          padding: 0.4rem 0.55rem;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }

        .row-actions button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .row-actions .danger {
          color: #991b1b;
          border-color: #fecaca;
        }

        .empty-row {
          color: #64748b;
          text-align: center;
          padding: 2rem;
        }

        .detail-panel {
          padding: 1rem;
          position: sticky;
          top: 1rem;
        }

        .detail-panel h3 {
          font-size: 1rem;
          margin: 1rem 0;
        }

        dl {
          display: grid;
          gap: 0.65rem;
        }

        dt {
          color: #64748b;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        dd {
          color: #0f172a;
          font-size: 0.875rem;
          overflow-wrap: anywhere;
        }

        .description,
        .empty-detail {
          color: #475569;
          margin: 1rem 0;
          font-size: 0.875rem;
        }

        .download-link {
          display: inline-flex;
          margin-bottom: 1rem;
          color: #1d4ed8;
          font-weight: 800;
          text-decoration: none;
        }

        .metadata summary {
          cursor: pointer;
          font-weight: 800;
          color: #334155;
        }

        .metadata pre {
          margin-top: 0.75rem;
          max-height: 320px;
          overflow: auto;
          background: #0f172a;
          color: #e2e8f0;
          border-radius: 0.375rem;
          padding: 0.75rem;
          font-size: 0.75rem;
        }

        @media (max-width: 1100px) {
          .metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .admin-workspace {
            grid-template-columns: 1fr;
          }

          .detail-panel {
            position: static;
          }
        }

        @media (max-width: 720px) {
          .admin-header,
          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .field.compact {
            max-width: none;
          }

          .metrics {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

function getStatusLabel(status: ObjectStatus) {
  switch (status) {
    case 'published':
      return 'Publicado';
    case 'archived':
      return 'Archivado';
    default:
      return 'Borrador';
  }
}

function formatDate(value?: string) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
