'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import UploadModal from '../components/UploadModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const ADMIN_TOKEN_KEY = 'roa_admin_token';

type ObjectStatus = 'draft' | 'published' | 'archived';
type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'failed';

interface LearningObject {
  id: string;
  title: string;
  description?: string;
  author: string;
  status: ObjectStatus;
  fileUrl?: string;
  fileMimeType?: string;
  originalFilename?: string | null;
  fileSize?: number | null;
  uploadedAt?: string | null;
  processingStatus?: ProcessingStatus;
  processingError?: string | null;
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

interface ReviewForm {
  title: string;
  description: string;
  author: string;
  learningResourceType: string;
  difficulty: string;
  keywords: string;
}

const statusOptions: Array<{ value: ObjectStatus; label: string }> = [
  { value: 'draft', label: 'Borrador' },
  { value: 'published', label: 'Publicado' },
  { value: 'archived', label: 'Archivado' },
];

const resourceTypeOptions = [
  'Articulo',
  'Caso de estudio',
  'Ejercicio',
  'Guia',
  'Leccion',
  'Presentacion',
  'Simulacion',
  'Video',
];

const difficultyOptions = ['Muy facil', 'Facil', 'Medio', 'Dificil', 'Muy dificil'];

export default function AdminPage() {
  const router = useRouter();
  const [objects, setObjects] = useState<LearningObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ObjectStatus>('all');
  const [selectedObject, setSelectedObject] = useState<LearningObject | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewForm>(createReviewForm(null));
  const [savingReview, setSavingReview] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem(ADMIN_TOKEN_KEY) ?? '';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthToken(storedToken);
    setAuthChecked(true);

    if (!storedToken) {
      router.replace('/admin/login');
    }
  }, [router]);

  const fetchObjects = useCallback(() => {
    if (!authChecked || !authToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    fetch(`${API_URL}/learning-objects?scope=admin`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
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
        const loadedObjects = data as LearningObject[];
        setObjects(loadedObjects);
        setSelectedObject((current) =>
          current ? loadedObjects.find((object) => object.id === current.id) ?? null : current
        );
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading admin objects:', error);
        setObjects([]);
        setErrorMessage('No se pudieron cargar los recursos. Verifica que el backend este activo.');
        setLoading(false);
      });
  }, [authChecked, authToken]);

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
    const processing = objects.filter((object) =>
      object.fileUrl && (object.processingStatus === 'pending' || object.processingStatus === 'processing')
    ).length;
    return { total, published, draft, archived, withMetadata, processing };
  }, [objects]);

  const selectObject = (object: LearningObject) => {
    setSelectedObject(object);
    setReviewForm(createReviewForm(object));
  };

  const saveReview = async () => {
    if (!selectedObject) return;

    setSavingReview(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch(`${API_URL}/learning-objects/${selectedObject.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(buildReviewPayload(selectedObject, reviewForm)),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const updatedObject = await res.json() as LearningObject;
      setObjects((current) =>
        current.map((object) => object.id === updatedObject.id ? updatedObject : object)
      );
      setSelectedObject(updatedObject);
      setReviewForm(createReviewForm(updatedObject));
      setSuccessMessage('Revision guardada.');
    } catch (error) {
      console.error('Error saving review:', error);
      setErrorMessage('No se pudo guardar la revision del recurso.');
    } finally {
      setSavingReview(false);
    }
  };

  const updateStatus = async (id: string, status: ObjectStatus) => {
    const targetObject = objects.find((object) => object.id === id);
    if (status === 'published' && targetObject) {
      const blockers = getPublishBlockers(targetObject);
      if (blockers.length > 0) {
        const confirmed = window.confirm(
          `El recurso tiene advertencias antes de publicar:\n\n${blockers.join('\n')}\n\nPublicar de todos modos?`
        );
        if (!confirmed) return;
      }
    }

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
      const updatedObject = await res.json() as LearningObject;
      setObjects((current) =>
        current.map((object) => object.id === updatedObject.id ? updatedObject : object)
      );
      setSelectedObject((current) => current?.id === updatedObject.id ? updatedObject : current);
      if (selectedObject?.id === updatedObject.id) {
        setReviewForm(createReviewForm(updatedObject));
      }
      setSuccessMessage(`Recurso marcado como ${getStatusLabel(status)}.`);
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

  if (!authChecked || !authToken) {
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
        <Metric label="Procesando" value={stats.processing} />
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
                  <th>IA</th>
                  <th>Autor</th>
                  <th>Tipo</th>
                  <th>Dificultad</th>
                  <th>Actualizado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="empty-row">Cargando recursos...</td></tr>
                ) : filteredObjects.length === 0 ? (
                  <tr><td colSpan={8} className="empty-row">No hay recursos para los filtros actuales.</td></tr>
                ) : (
                  filteredObjects.map((object) => (
                    <tr key={object.id} className={selectedObject?.id === object.id ? 'selected-row' : ''}>
                      <td>
                        <button className="resource-title" onClick={() => selectObject(object)}>
                          {object.title}
                        </button>
                        <div className="resource-id">{object.id}</div>
                      </td>
                      <td><span className={`status-pill status-${object.status}`}>{getStatusLabel(object.status)}</span></td>
                      <td>
                        <span className={`processing-pill processing-${getProcessingClass(object)}`}>
                          {getProcessingLabel(object.processingStatus, Boolean(object.fileUrl))}
                        </span>
                      </td>
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
              <div className="review-header">
                <h3>{selectedObject.title}</h3>
                <span className={`status-pill status-${selectedObject.status}`}>{getStatusLabel(selectedObject.status)}</span>
              </div>

              <div className="review-actions">
                <button className="primary-button" onClick={() => updateStatus(selectedObject.id, 'published')} disabled={selectedObject.status === 'published'}>
                  Aprobar y publicar
                </button>
                <button className="secondary-button" onClick={() => updateStatus(selectedObject.id, 'draft')} disabled={selectedObject.status === 'draft'}>
                  Enviar a borrador
                </button>
                <button className="secondary-button" onClick={() => updateStatus(selectedObject.id, 'archived')} disabled={selectedObject.status === 'archived'}>
                  Archivar
                </button>
              </div>

              <section className="review-section">
                <h4>Datos del recurso</h4>
                <label className="field">
                  <span>Titulo</span>
                  <input
                    value={reviewForm.title}
                    onChange={(event) => setReviewForm((current) => ({ ...current, title: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Autor</span>
                  <input
                    value={reviewForm.author}
                    onChange={(event) => setReviewForm((current) => ({ ...current, author: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Descripcion</span>
                  <textarea
                    value={reviewForm.description}
                    rows={4}
                    onChange={(event) => setReviewForm((current) => ({ ...current, description: event.target.value }))}
                  />
                </label>
              </section>

              <section className="review-section">
                <h4>Metadatos educativos</h4>
                <label className="field">
                  <span>Tipo de recurso</span>
                  <select
                    value={reviewForm.learningResourceType}
                    onChange={(event) => setReviewForm((current) => ({ ...current, learningResourceType: event.target.value }))}
                  >
                    <option value="">Sin tipo</option>
                    {resourceTypeOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Nivel de dificultad</span>
                  <select
                    value={reviewForm.difficulty}
                    onChange={(event) => setReviewForm((current) => ({ ...current, difficulty: event.target.value }))}
                  >
                    <option value="">Sin nivel</option>
                    {difficultyOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Palabras clave</span>
                  <input
                    value={reviewForm.keywords}
                    placeholder="Separadas por coma"
                    onChange={(event) => setReviewForm((current) => ({ ...current, keywords: event.target.value }))}
                  />
                </label>
              </section>

              <button className="save-review-button" onClick={saveReview} disabled={savingReview}>
                {savingReview ? 'Guardando...' : 'Guardar revision'}
              </button>

              <dl className="file-summary">
                <div><dt>ID</dt><dd>{selectedObject.id}</dd></div>
                <div><dt>Archivo</dt><dd>{selectedObject.originalFilename ?? (selectedObject.fileUrl ? 'Disponible' : 'Pendiente')}</dd></div>
                <div><dt>Tamano</dt><dd>{formatFileSize(selectedObject.fileSize)}</dd></div>
                <div><dt>Subido</dt><dd>{formatDate(selectedObject.uploadedAt)}</dd></div>
                <div>
                  <dt>Procesamiento IA</dt>
                  <dd>
                    <span className={`processing-pill processing-${getProcessingClass(selectedObject)}`}>
                      {getProcessingLabel(selectedObject.processingStatus, Boolean(selectedObject.fileUrl))}
                    </span>
                  </dd>
                </div>
              </dl>
              {selectedObject.processingError && (
                <p className="processing-error">{selectedObject.processingError}</p>
              )}
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
          color: #1a1a1a;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          padding: 2.25rem 2rem;
          border: 1px solid #174a96;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #1f5fbf 0%, #174a96 100%);
          color: white;
          min-height: 170px;
        }

        .eyebrow {
          color: rgba(255, 255, 255, 0.82);
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }

        h1 {
          font-size: 2.15rem;
          margin: 0;
        }

        .subtitle {
          color: rgba(255, 255, 255, 0.86);
          margin-top: 0.45rem;
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
          color: #1a1a1a;
          border: 1px solid #e0e0e0;
          background: white;
        }

        .primary-button {
          color: white;
          border: 1px solid #1f5fbf;
          background: #1f5fbf;
        }

        .admin-header .secondary-link,
        .admin-header .secondary-button {
          color: #174a96;
          border-color: rgba(255, 255, 255, 0.75);
        }

        .admin-header .primary-button {
          color: #174a96;
          border-color: rgba(255, 255, 255, 0.75);
          background: white;
        }

        .metrics {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .metric {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 0.5rem;
          padding: 0.9rem;
        }

        .metric-value {
          font-size: 1.5rem;
          font-weight: 800;
        }

        .metric-label {
          color: #666666;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .toolbar {
          display: flex;
          gap: 0.75rem;
          align-items: end;
          background: white;
          border: 1px solid #e0e0e0;
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
          color: #666666;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        input,
        select,
        textarea {
          width: 100%;
          border: 1px solid #e0e0e0;
          border-radius: 0.375rem;
          padding: 0.65rem;
          color: #1a1a1a;
          background: white;
          font: inherit;
        }

        textarea {
          resize: vertical;
          min-height: 96px;
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
          border: 1px solid #e0e0e0;
          color: #1a1a1a;
        }

        .message.success {
          background: #f0fdf4;
          border: 1px solid #e0e0e0;
          color: #1a1a1a;
        }

        .admin-workspace {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 440px;
          gap: 1rem;
          align-items: start;
        }

        .table-panel,
        .detail-panel {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 0.5rem;
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e0e0e0;
        }

        .table-header h2,
        .detail-panel h2 {
          font-size: 1rem;
          margin: 0;
        }

        .table-header span {
          color: #666666;
          font-size: 0.875rem;
        }

        .table-scroll {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1180px;
        }

        th,
        td {
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
          padding: 0.75rem;
          vertical-align: top;
          font-size: 0.875rem;
        }

        th {
          color: #666666;
          background: #f5f5f5;
          font-size: 0.75rem;
          text-transform: uppercase;
        }

        .selected-row {
          background: #f5f5f5;
        }

        .resource-title {
          border: none;
          background: none;
          padding: 0;
          color: #1a1a1a;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          text-align: left;
        }

        .resource-id {
          color: #666666;
          font-size: 0.7rem;
          margin-top: 0.2rem;
        }

        .status-pill,
        .processing-pill {
          display: inline-flex;
          border-radius: 999px;
          padding: 0.25rem 0.55rem;
          font-size: 0.75rem;
          font-weight: 800;
        }

        .status-published {
          background: #eeeeee;
          color: #1a1a1a;
        }

        .status-draft {
          background: #f5f5f5;
          color: #666666;
        }

        .status-archived {
          background: #f5f5f5;
          color: #666666;
        }

        .processing-pending {
          background: #f5f5f5;
          color: #666666;
        }

        .processing-processing {
          background: #eeeeee;
          color: #333333;
        }

        .processing-ready {
          background: #eeeeee;
          color: #1a1a1a;
        }

        .processing-failed {
          background: #f5f5f5;
          color: #333333;
        }

        .processing-none {
          background: #f5f5f5;
          color: #666666;
        }

        .row-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }

        .row-actions button {
          border: 1px solid #e0e0e0;
          border-radius: 0.375rem;
          background: white;
          color: #1a1a1a;
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
          color: #1a1a1a;
          border-color: #e0e0e0;
        }

        .empty-row {
          color: #666666;
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
          margin: 0;
        }

        .review-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
          margin: 1rem 0;
        }

        .review-actions {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .review-actions button,
        .save-review-button {
          width: 100%;
          text-align: center;
        }

        .review-actions button:disabled,
        .save-review-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .review-section {
          display: grid;
          gap: 0.75rem;
          border-top: 1px solid #e0e0e0;
          padding-top: 1rem;
          margin-top: 1rem;
        }

        .review-section h4 {
          font-size: 0.875rem;
          margin: 0;
        }

        .save-review-button {
          border: 1px solid #1f5fbf;
          border-radius: 0.375rem;
          background: #1f5fbf;
          color: white;
          cursor: pointer;
          font: inherit;
          font-size: 0.875rem;
          font-weight: 800;
          margin-top: 1rem;
          padding: 0.75rem;
        }

        dl {
          display: grid;
          gap: 0.65rem;
        }

        .file-summary {
          border-top: 1px solid #e0e0e0;
          margin-top: 1rem;
          padding-top: 1rem;
        }

        dt {
          color: #666666;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        dd {
          color: #1a1a1a;
          font-size: 0.875rem;
          overflow-wrap: anywhere;
        }

        .description,
        .empty-detail,
        .processing-error {
          color: #666666;
          margin: 1rem 0;
          font-size: 0.875rem;
        }

        .processing-error {
          border: 1px solid #e0e0e0;
          border-radius: 0.375rem;
          background: #f5f5f5;
          color: #1a1a1a;
          padding: 0.75rem;
        }

        .download-link {
          display: inline-flex;
          margin-bottom: 1rem;
          color: #1a1a1a;
          font-weight: 800;
          text-decoration: none;
        }

        .metadata summary {
          cursor: pointer;
          font-weight: 800;
          color: #333333;
        }

        .metadata pre {
          margin-top: 0.75rem;
          max-height: 320px;
          overflow: auto;
          background: #1a1a1a;
          color: #f5f5f5;
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

          .admin-header {
            min-height: auto;
            padding: 1.5rem;
          }

          h1 {
            font-size: 1.65rem;
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

function createReviewForm(object: LearningObject | null): ReviewForm {
  return {
    title: object?.title ?? '',
    description: object?.description ?? '',
    author: object?.author ?? '',
    learningResourceType: object?.lomMetadata?.educational?.learningResourceType ?? '',
    difficulty: object?.lomMetadata?.educational?.difficulty ?? '',
    keywords: object?.lomMetadata?.general?.keyword?.join(', ') ?? '',
  };
}

function buildReviewPayload(object: LearningObject, form: ReviewForm) {
  const keywords = form.keywords
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  return {
    title: form.title.trim(),
    description: form.description.trim(),
    author: form.author.trim(),
    lomMetadata: {
      ...(object.lomMetadata ?? {}),
      general: {
        ...(object.lomMetadata?.general ?? {}),
        title: form.title.trim(),
        description: form.description.trim(),
        keyword: keywords,
      },
      educational: {
        ...(object.lomMetadata?.educational ?? {}),
        learningResourceType: form.learningResourceType,
        difficulty: form.difficulty,
      },
    },
  };
}

function getPublishBlockers(object: LearningObject) {
  const blockers: string[] = [];

  if (!object.fileUrl) {
    blockers.push('- No tiene archivo cargado.');
  }

  if (object.processingStatus === 'pending' || object.processingStatus === 'processing') {
    blockers.push('- La IA todavia no termino de procesar el archivo.');
  }

  if (object.processingStatus === 'failed') {
    blockers.push('- El procesamiento de IA fallo.');
  }

  if (!object.lomMetadata?.educational?.learningResourceType) {
    blockers.push('- Falta el tipo de recurso.');
  }

  if (!object.lomMetadata?.educational?.difficulty) {
    blockers.push('- Falta el nivel de dificultad.');
  }

  return blockers;
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

function getProcessingClass(object: LearningObject) {
  if (!object.fileUrl) return 'none';
  return object.processingStatus ?? 'pending';
}

function getProcessingLabel(status?: ProcessingStatus, hasFile = true) {
  if (!hasFile) return 'Sin archivo';

  switch (status) {
    case 'processing':
      return 'Procesando';
    case 'ready':
      return 'Listo';
    case 'failed':
      return 'Fallido';
    default:
      return 'Pendiente';
  }
}

function formatFileSize(value?: number | null) {
  if (!value) return 'Sin archivo';
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
