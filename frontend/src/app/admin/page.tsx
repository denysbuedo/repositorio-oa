'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import UploadModal from '../components/UploadModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const ADMIN_TOKEN_KEY = 'roa_admin_token';

type ObjectStatus = 'draft' | 'published' | 'archived';
type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'failed';

interface Collection {
  id: string;
  name: string;
  description?: string | null;
}

interface LtiPlatform {
  id: string;
  name: string;
  issuer: string;
  clientId: string;
  deploymentId?: string | null;
  authLoginUrl?: string | null;
  authTokenUrl?: string | null;
  jwksUrl?: string | null;
  enabled: boolean;
  notes?: string | null;
}

interface LearningObject {
  id: string;
  title: string;
  description?: string;
  author: string;
  status: ObjectStatus;
  fileUrl?: string;
  fileMimeType?: string;
  fileChecksumSha256?: string | null;
  originalFilename?: string | null;
  fileSize?: number | null;
  currentVersion?: string;
  uploadedAt?: string | null;
  processingStatus?: ProcessingStatus;
  processingError?: string | null;
  collectionId?: string | null;
  collection?: Collection | null;
  createdAt?: string;
  updatedAt?: string;
  lomMetadata?: {
    educational?: {
      learningResourceType?: string;
      difficulty?: string;
      educationalLevel?: string;
      intendedEndUserRole?: string;
    };
    general?: {
      language?: string;
      keyword?: string[];
    };
    rights?: {
      license?: string;
      description?: string;
    };
    accessibility?: AccessibilityMetadata;
  };
}

type AccessibilityValue = 'yes' | 'no' | 'not_applicable' | '';

interface AccessibilityMetadata {
  textSelectable?: AccessibilityValue;
  structuredHeadings?: AccessibilityValue;
  altText?: AccessibilityValue;
  readingOrder?: AccessibilityValue;
  sufficientContrast?: AccessibilityValue;
  captionsOrTranscript?: AccessibilityValue;
  notes?: string;
}

interface LearningObjectVersion {
  id: string;
  versionLabel: string;
  changeType: 'initial_publication' | 'metadata_update' | 'file_update';
  title: string;
  author: string;
  originalFilename?: string | null;
  fileSize?: number | null;
  fileChecksumSha256?: string | null;
  changeNote?: string | null;
  createdAt?: string;
}

interface PreservationEvent {
  id: string;
  eventType: 'checksum_calculated' | 'version_snapshot_created' | 'file_replaced';
  versionLabel?: string | null;
  message: string;
  details?: Record<string, unknown> | null;
  actor?: string | null;
  createdAt?: string;
}

interface QualityIssue {
  code: string;
  label: string;
  severity: 'blocker' | 'warning';
  category: 'metadata' | 'file' | 'preservation' | 'accessibility';
}

interface QualityReport {
  score: number;
  status: 'ready' | 'needs_review' | 'blocked';
  blockers: QualityIssue[];
  warnings: QualityIssue[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    blockerCount: number;
    warningCount: number;
  };
}

interface AnalyticsSummary {
  views: number;
  downloads: number;
  ltiLaunches: number;
  totalEvents: number;
  topObjects: Array<{
    learningObjectId: string;
    title: string;
    totalEvents: number;
    views: number;
    downloads: number;
    ltiLaunches: number;
  }>;
}

interface ReviewForm {
  title: string;
  description: string;
  author: string;
  collectionId: string;
  learningResourceType: string;
  difficulty: string;
  language: string;
  educationalLevel: string;
  intendedEndUserRole: string;
  license: string;
  rightsDescription: string;
  keywords: string;
  textSelectable: AccessibilityValue;
  structuredHeadings: AccessibilityValue;
  altText: AccessibilityValue;
  readingOrder: AccessibilityValue;
  sufficientContrast: AccessibilityValue;
  captionsOrTranscript: AccessibilityValue;
  accessibilityNotes: string;
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
const languageOptions = [
  { value: 'es', label: 'Espanol' },
  { value: 'en', label: 'Ingles' },
  { value: 'pt', label: 'Portugues' },
  { value: 'fr', label: 'Frances' },
];
const educationalLevelOptions = [
  'Pregrado',
  'Posgrado',
  'Formacion tecnica',
  'Educacion continua',
  'Autoaprendizaje',
];
const audienceOptions = [
  'Estudiante',
  'Docente',
  'Investigador',
  'Administrador academico',
];
const licenseOptions = [
  { value: 'CC BY', label: 'CC BY' },
  { value: 'CC BY-SA', label: 'CC BY-SA' },
  { value: 'CC BY-NC', label: 'CC BY-NC' },
  { value: 'CC BY-NC-SA', label: 'CC BY-NC-SA' },
  { value: 'Dominio publico', label: 'Dominio publico' },
  { value: 'Uso institucional restringido', label: 'Uso institucional restringido' },
  { value: 'Copyright reservado', label: 'Copyright reservado' },
];
const accessibilityOptions: Array<{ value: AccessibilityValue; label: string }> = [
  { value: '', label: 'Sin revisar' },
  { value: 'yes', label: 'Cumple' },
  { value: 'no', label: 'No cumple' },
  { value: 'not_applicable', label: 'No aplica' },
];

export default function AdminPage() {
  const router = useRouter();
  const [objects, setObjects] = useState<LearningObject[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [ltiPlatforms, setLtiPlatforms] = useState<LtiPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ObjectStatus>('all');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [selectedObject, setSelectedObject] = useState<LearningObject | null>(null);
  const [versionHistory, setVersionHistory] = useState<LearningObjectVersion[]>([]);
  const [preservationEvents, setPreservationEvents] = useState<PreservationEvent[]>([]);
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingQuality, setLoadingQuality] = useState(false);
  const [reviewForm, setReviewForm] = useState<ReviewForm>(createReviewForm(null));
  const [collectionName, setCollectionName] = useState('');
  const [collectionDescription, setCollectionDescription] = useState('');
  const [ltiPlatformName, setLtiPlatformName] = useState('');
  const [ltiIssuer, setLtiIssuer] = useState('');
  const [ltiClientId, setLtiClientId] = useState('');
  const [ltiDeploymentId, setLtiDeploymentId] = useState('');
  const [ltiAuthLoginUrl, setLtiAuthLoginUrl] = useState('');
  const [ltiJwksUrl, setLtiJwksUrl] = useState('');
  const [savingCollection, setSavingCollection] = useState(false);
  const [savingLtiPlatform, setSavingLtiPlatform] = useState(false);
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

  const fetchCollections = useCallback(() => {
    if (!authChecked || !authToken) {
      return;
    }

    fetch(`${API_URL}/collections`, {
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
        setCollections(data as Collection[]);
      })
      .catch((error) => {
        console.error('Error loading collections:', error);
        setCollections([]);
        setErrorMessage('No se pudieron cargar las colecciones.');
      });
  }, [authChecked, authToken]);

  const fetchLtiPlatforms = useCallback(() => {
    if (!authChecked || !authToken) {
      return;
    }

    fetch(`${API_URL}/lti/platforms`, {
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
        setLtiPlatforms(Array.isArray(data) ? data as LtiPlatform[] : []);
      })
      .catch((error) => {
        console.error('Error loading LTI platforms:', error);
        setLtiPlatforms([]);
        setErrorMessage('No se pudieron cargar las plataformas LTI.');
      });
  }, [authChecked, authToken]);

  const fetchAnalyticsSummary = useCallback(() => {
    if (!authChecked || !authToken) {
      return;
    }

    fetch(`${API_URL}/analytics/summary`, {
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
        setAnalyticsSummary(data as AnalyticsSummary);
      })
      .catch((error) => {
        console.error('Error loading analytics summary:', error);
        setAnalyticsSummary(null);
      });
  }, [authChecked, authToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchObjects();
    fetchCollections();
    fetchLtiPlatforms();
    fetchAnalyticsSummary();
  }, [fetchObjects, fetchCollections, fetchLtiPlatforms, fetchAnalyticsSummary]);

  const filteredObjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return objects.filter((object) => {
      const matchesStatus = statusFilter === 'all' || object.status === statusFilter;
      const matchesCollection =
        collectionFilter === 'all' ||
        (collectionFilter === 'none' && !object.collectionId) ||
        object.collectionId === collectionFilter;
      const matchesQuery =
        !normalizedQuery ||
        object.title.toLowerCase().includes(normalizedQuery) ||
        object.author.toLowerCase().includes(normalizedQuery) ||
        object.id.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesCollection && matchesQuery;
    });
  }, [collectionFilter, objects, query, statusFilter]);

  const stats = useMemo(() => {
    const total = objects.length;
    const published = objects.filter((object) => object.status === 'published').length;
    const draft = objects.filter((object) => object.status === 'draft').length;
    const archived = objects.filter((object) => object.status === 'archived').length;
    const withMetadata = objects.filter((object) => object.lomMetadata).length;
    const withCollection = objects.filter((object) => object.collectionId).length;
    const completeProfile = objects.filter((object) => getProfileCompletion(object).missing.length === 0).length;
    const processing = objects.filter((object) =>
      object.fileUrl && (object.processingStatus === 'pending' || object.processingStatus === 'processing')
    ).length;
    return { total, published, draft, archived, withMetadata, withCollection, completeProfile, processing };
  }, [objects]);

  const fetchVersions = useCallback(async (objectId: string) => {
    if (!authToken) return;

    setLoadingVersions(true);
    try {
      const res = await fetch(`${API_URL}/learning-objects/${objectId}/versions`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setVersionHistory(Array.isArray(data) ? data as LearningObjectVersion[] : []);
    } catch (error) {
      console.error('Error loading version history:', error);
      setVersionHistory([]);
      setErrorMessage('No se pudo cargar el historial de versiones.');
    } finally {
      setLoadingVersions(false);
    }
  }, [authToken]);

  const fetchPreservationEvents = useCallback(async (objectId: string) => {
    if (!authToken) return;

    setLoadingEvents(true);
    try {
      const res = await fetch(`${API_URL}/learning-objects/${objectId}/preservation-events`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setPreservationEvents(Array.isArray(data) ? data as PreservationEvent[] : []);
    } catch (error) {
      console.error('Error loading preservation events:', error);
      setPreservationEvents([]);
      setErrorMessage('No se pudo cargar el registro de preservacion.');
    } finally {
      setLoadingEvents(false);
    }
  }, [authToken]);

  const fetchQualityReport = useCallback(async (objectId: string) => {
    if (!authToken) return;

    setLoadingQuality(true);
    try {
      const res = await fetch(`${API_URL}/learning-objects/${objectId}/quality-report`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      setQualityReport(await res.json() as QualityReport);
    } catch (error) {
      console.error('Error loading quality report:', error);
      setQualityReport(null);
      setErrorMessage('No se pudo cargar el reporte de calidad.');
    } finally {
      setLoadingQuality(false);
    }
  }, [authToken]);

  const selectObject = (object: LearningObject) => {
    setSelectedObject(object);
    setReviewForm(createReviewForm(object));
    setVersionHistory([]);
    setPreservationEvents([]);
    setQualityReport(null);
    void fetchVersions(object.id);
    void fetchPreservationEvents(object.id);
    void fetchQualityReport(object.id);
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
        throw new Error(await getApiErrorMessage(res, 'No se pudo guardar la revision del recurso.'));
      }
      const updatedObject = await res.json() as LearningObject;
      setObjects((current) =>
        current.map((object) => object.id === updatedObject.id ? updatedObject : object)
      );
      setSelectedObject(updatedObject);
      setReviewForm(createReviewForm(updatedObject));
      void fetchVersions(updatedObject.id);
      void fetchPreservationEvents(updatedObject.id);
      void fetchQualityReport(updatedObject.id);
      setSuccessMessage('Revision guardada.');
    } catch (error) {
      console.error('Error saving review:', error);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo guardar la revision del recurso.');
    } finally {
      setSavingReview(false);
    }
  };

  const createCollection = async () => {
    const name = collectionName.trim();
    if (!name) {
      setErrorMessage('Escribe un nombre para la coleccion.');
      return;
    }

    setSavingCollection(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch(`${API_URL}/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name,
          description: collectionDescription.trim() || undefined,
        }),
      });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, 'No se pudo crear la coleccion.'));
      }
      const collection = await res.json() as Collection;
      setCollections((current) =>
        [...current, collection].sort((a, b) => a.name.localeCompare(b.name))
      );
      setCollectionName('');
      setCollectionDescription('');
      setSuccessMessage('Coleccion creada.');
    } catch (error) {
      console.error('Error creating collection:', error);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo crear la coleccion. Revisa si ya existe una con ese nombre.');
    } finally {
      setSavingCollection(false);
    }
  };

  const createLtiPlatform = async () => {
    const name = ltiPlatformName.trim();
    const issuer = ltiIssuer.trim();
    const clientId = ltiClientId.trim();

    if (!name || !issuer || !clientId) {
      setErrorMessage('Completa nombre, issuer y client ID de la plataforma LTI.');
      return;
    }

    setSavingLtiPlatform(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch(`${API_URL}/lti/platforms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name,
          issuer,
          clientId,
          deploymentId: ltiDeploymentId.trim() || undefined,
          authLoginUrl: ltiAuthLoginUrl.trim() || undefined,
          jwksUrl: ltiJwksUrl.trim() || undefined,
          enabled: true,
        }),
      });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, 'No se pudo crear la plataforma LTI.'));
      }
      const platform = await res.json() as LtiPlatform;
      setLtiPlatforms((current) =>
        [...current, platform].sort((a, b) => a.name.localeCompare(b.name))
      );
      setLtiPlatformName('');
      setLtiIssuer('');
      setLtiClientId('');
      setLtiDeploymentId('');
      setLtiAuthLoginUrl('');
      setLtiJwksUrl('');
      setSuccessMessage('Plataforma LTI creada.');
    } catch (error) {
      console.error('Error creating LTI platform:', error);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo crear la plataforma LTI.');
    } finally {
      setSavingLtiPlatform(false);
    }
  };

  const updateStatus = async (id: string, status: ObjectStatus) => {
    const targetObject = objects.find((object) => object.id === id);
    if (status === 'published' && targetObject) {
      const report =
        selectedObject?.id === id && qualityReport
          ? qualityReport
          : await loadQualityReportForDecision(id);

      if (report?.blockers.length) {
        setErrorMessage(
          `No se puede publicar. Bloqueos: ${report.blockers.map((issue) => issue.label).join(' ')}`
        );
        return;
      }

      if (report?.warnings.length) {
        const confirmed = window.confirm(
          `El recurso tiene avisos de calidad antes de publicar:\n\n${report.warnings.map((issue) => `- ${issue.label}`).join('\n')}\n\nPublicar de todos modos?`
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
        throw new Error(await getApiErrorMessage(res, 'No se pudo actualizar el estado del recurso.'));
      }
      const updatedObject = await res.json() as LearningObject;
      setObjects((current) =>
        current.map((object) => object.id === updatedObject.id ? updatedObject : object)
      );
      setSelectedObject((current) => current?.id === updatedObject.id ? updatedObject : current);
      if (selectedObject?.id === updatedObject.id) {
        setReviewForm(createReviewForm(updatedObject));
        void fetchVersions(updatedObject.id);
        void fetchPreservationEvents(updatedObject.id);
        void fetchQualityReport(updatedObject.id);
      }
      setSuccessMessage(`Recurso marcado como ${getStatusLabel(status)}.`);
    } catch (error) {
      console.error('Error updating status:', error);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo actualizar el estado del recurso.');
    }
  };

  const loadQualityReportForDecision = async (id: string) => {
    if (!authToken) return null;

    try {
      const res = await fetch(`${API_URL}/learning-objects/${id}/quality-report`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!res.ok) return null;
      return await res.json() as QualityReport;
    } catch (error) {
      console.error('Error loading quality report for publish decision:', error);
      return null;
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
      setVersionHistory((current) => (selectedObject?.id === id ? [] : current));
      setPreservationEvents((current) => (selectedObject?.id === id ? [] : current));
      setQualityReport((current) => (selectedObject?.id === id ? null : current));
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
    return <main id="main-content" className="admin-shell">Validando sesion...</main>;
  }

  return (
    <main id="main-content" className="admin-shell">
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
        <Metric label="Perfil completo" value={stats.completeProfile} />
        <Metric label="Vistas" value={analyticsSummary?.views ?? 0} tone="blue" />
        <Metric label="Descargas" value={analyticsSummary?.downloads ?? 0} tone="blue" />
      </section>

      <section className="analytics-panel" aria-label="Analitica de uso">
        <div>
          <p className="panel-kicker">Analitica</p>
          <h2>Uso del repositorio</h2>
          <p>Eventos registrados desde la ficha publica, descargas y lanzamientos LTI.</p>
        </div>
        <div className="analytics-summary">
          <Metric label="Eventos" value={analyticsSummary?.totalEvents ?? 0} compact />
          <Metric label="LTI" value={analyticsSummary?.ltiLaunches ?? 0} compact />
        </div>
        <div className="top-objects">
          {(analyticsSummary?.topObjects.length ?? 0) > 0 ? (
            analyticsSummary?.topObjects.map((item) => (
              <div key={item.learningObjectId} className="top-object-row">
                <span>{item.title}</span>
                <strong>{item.totalEvents}</strong>
              </div>
            ))
          ) : (
            <p className="empty-analytics">Aun no hay eventos de uso registrados.</p>
          )}
        </div>
      </section>

      <section className="collections-panel" aria-label="Gestion de colecciones">
        <div>
          <p className="panel-kicker">Colecciones</p>
          <h2>Organizacion del repositorio</h2>
          <p>Crea agrupaciones tematicas y asigna cada OA desde el panel de revision.</p>
        </div>
        <div className="collection-form">
          <label className="field">
            <span>Nombre</span>
            <input
              value={collectionName}
              onChange={(event) => setCollectionName(event.target.value)}
              placeholder="Ej. Base de datos"
            />
          </label>
          <label className="field">
            <span>Descripcion</span>
            <input
              value={collectionDescription}
              onChange={(event) => setCollectionDescription(event.target.value)}
              placeholder="Uso o alcance de la coleccion"
            />
          </label>
          <button className="primary-button" onClick={createCollection} disabled={savingCollection}>
            {savingCollection ? 'Creando...' : 'Crear coleccion'}
          </button>
        </div>
      </section>

      <section className="lti-platforms-panel" aria-label="Gestion de plataformas LTI">
        <div>
          <p className="panel-kicker">LTI</p>
          <h2>Plataformas LMS</h2>
          <p>Registra consumidores LTI para usar client ID y endpoints por plataforma.</p>
        </div>
        <div className="lti-platform-form">
          <label className="field">
            <span>Nombre</span>
            <input
              value={ltiPlatformName}
              onChange={(event) => setLtiPlatformName(event.target.value)}
              placeholder="Ej. Moodle institucional"
            />
          </label>
          <label className="field">
            <span>Issuer</span>
            <input
              value={ltiIssuer}
              onChange={(event) => setLtiIssuer(event.target.value)}
              placeholder="https://lms.ejemplo.edu"
            />
          </label>
          <label className="field">
            <span>Client ID</span>
            <input
              value={ltiClientId}
              onChange={(event) => setLtiClientId(event.target.value)}
              placeholder="client-id"
            />
          </label>
          <label className="field">
            <span>Deployment ID</span>
            <input
              value={ltiDeploymentId}
              onChange={(event) => setLtiDeploymentId(event.target.value)}
              placeholder="Opcional"
            />
          </label>
          <label className="field">
            <span>Login URL</span>
            <input
              value={ltiAuthLoginUrl}
              onChange={(event) => setLtiAuthLoginUrl(event.target.value)}
              placeholder="OIDC auth endpoint"
            />
          </label>
          <label className="field">
            <span>JWKS URL</span>
            <input
              value={ltiJwksUrl}
              onChange={(event) => setLtiJwksUrl(event.target.value)}
              placeholder="Endpoint de llaves del LMS"
            />
          </label>
          <button className="primary-button" onClick={createLtiPlatform} disabled={savingLtiPlatform}>
            {savingLtiPlatform ? 'Registrando...' : 'Registrar LMS'}
          </button>
        </div>
        <div className="lti-platform-list">
          {ltiPlatforms.length > 0 ? (
            ltiPlatforms.map((platform) => (
              <article key={platform.id} className="lti-platform-item">
                <div>
                  <strong>{platform.name}</strong>
                  <span>{platform.issuer}</span>
                </div>
                <span className={platform.enabled ? 'status-pill published' : 'status-pill archived'}>
                  {platform.enabled ? 'Activa' : 'Inactiva'}
                </span>
              </article>
            ))
          ) : (
            <p className="empty-analytics">No hay plataformas LTI registradas.</p>
          )}
        </div>
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
        <label className="field compact">
          <span>Coleccion</span>
          <select value={collectionFilter} onChange={(event) => setCollectionFilter(event.target.value)}>
            <option value="all">Todas</option>
            <option value="none">Sin coleccion</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>{collection.name}</option>
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
                  <th>Coleccion</th>
                  <th>Tipo</th>
                  <th>Dificultad</th>
                  <th>Version</th>
                  <th>Perfil</th>
                  <th>Actualizado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="empty-row">Cargando recursos...</td></tr>
                ) : filteredObjects.length === 0 ? (
                  <tr><td colSpan={11} className="empty-row">No hay recursos para los filtros actuales.</td></tr>
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
                      <td>{object.collection?.name ?? 'Sin coleccion'}</td>
                      <td>{object.lomMetadata?.educational?.learningResourceType ?? 'Sin tipo'}</td>
                      <td>{object.lomMetadata?.educational?.difficulty ?? 'Sin nivel'}</td>
                      <td>{object.currentVersion ?? '0.1'}</td>
                      <td>
                        <span className={`profile-pill ${getProfileCompletion(object).missing.length === 0 ? 'profile-complete' : 'profile-incomplete'}`}>
                          {getProfileCompletion(object).percent}%
                        </span>
                      </td>
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

              <ProfileSummary object={selectedObject} />
              <QualitySummary report={qualityReport} loading={loadingQuality} />

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
                <label className="field">
                  <span>Idioma</span>
                  <select
                    value={reviewForm.language}
                    onChange={(event) => setReviewForm((current) => ({ ...current, language: event.target.value }))}
                  >
                    <option value="">Sin idioma</option>
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </section>

              <section className="review-section">
                <h4>Organizacion</h4>
                <label className="field">
                  <span>Coleccion</span>
                  <select
                    value={reviewForm.collectionId}
                    onChange={(event) => setReviewForm((current) => ({ ...current, collectionId: event.target.value }))}
                  >
                    <option value="">Sin coleccion</option>
                    {collections.map((collection) => (
                      <option key={collection.id} value={collection.id}>{collection.name}</option>
                    ))}
                  </select>
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
                  <span>Nivel educativo</span>
                  <select
                    value={reviewForm.educationalLevel}
                    onChange={(event) => setReviewForm((current) => ({ ...current, educationalLevel: event.target.value }))}
                  >
                    <option value="">Sin nivel educativo</option>
                    {educationalLevelOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Audiencia</span>
                  <select
                    value={reviewForm.intendedEndUserRole}
                    onChange={(event) => setReviewForm((current) => ({ ...current, intendedEndUserRole: event.target.value }))}
                  >
                    <option value="">Sin audiencia</option>
                    {audienceOptions.map((option) => (
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

              <section className="review-section">
                <h4>Licencia y derechos</h4>
                <label className="field">
                  <span>Licencia</span>
                  <select
                    value={reviewForm.license}
                    onChange={(event) => setReviewForm((current) => ({ ...current, license: event.target.value }))}
                  >
                    <option value="">Sin licencia</option>
                    {licenseOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Notas de derechos</span>
                  <textarea
                    value={reviewForm.rightsDescription}
                    rows={3}
                    placeholder="Condiciones de uso, atribucion o restricciones"
                    onChange={(event) => setReviewForm((current) => ({ ...current, rightsDescription: event.target.value }))}
                  />
                </label>
              </section>

              <section className="review-section">
                <h4>Accesibilidad del recurso</h4>
                <label className="field">
                  <span>Texto seleccionable</span>
                  <select
                    value={reviewForm.textSelectable}
                    onChange={(event) => setReviewForm((current) => ({ ...current, textSelectable: event.target.value as AccessibilityValue }))}
                  >
                    {accessibilityOptions.map((option) => (
                      <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Encabezados estructurados</span>
                  <select
                    value={reviewForm.structuredHeadings}
                    onChange={(event) => setReviewForm((current) => ({ ...current, structuredHeadings: event.target.value as AccessibilityValue }))}
                  >
                    {accessibilityOptions.map((option) => (
                      <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Texto alternativo</span>
                  <select
                    value={reviewForm.altText}
                    onChange={(event) => setReviewForm((current) => ({ ...current, altText: event.target.value as AccessibilityValue }))}
                  >
                    {accessibilityOptions.map((option) => (
                      <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Orden de lectura</span>
                  <select
                    value={reviewForm.readingOrder}
                    onChange={(event) => setReviewForm((current) => ({ ...current, readingOrder: event.target.value as AccessibilityValue }))}
                  >
                    {accessibilityOptions.map((option) => (
                      <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Contraste suficiente</span>
                  <select
                    value={reviewForm.sufficientContrast}
                    onChange={(event) => setReviewForm((current) => ({ ...current, sufficientContrast: event.target.value as AccessibilityValue }))}
                  >
                    {accessibilityOptions.map((option) => (
                      <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Subtitulos o transcripcion</span>
                  <select
                    value={reviewForm.captionsOrTranscript}
                    onChange={(event) => setReviewForm((current) => ({ ...current, captionsOrTranscript: event.target.value as AccessibilityValue }))}
                  >
                    {accessibilityOptions.map((option) => (
                      <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Observaciones de accesibilidad</span>
                  <textarea
                    value={reviewForm.accessibilityNotes}
                    rows={3}
                    placeholder="Bloqueos, advertencias o mejoras pendientes"
                    onChange={(event) => setReviewForm((current) => ({ ...current, accessibilityNotes: event.target.value }))}
                  />
                </label>
              </section>

              <button className="save-review-button" onClick={saveReview} disabled={savingReview}>
                {savingReview ? 'Guardando...' : 'Guardar revision'}
              </button>

              <dl className="file-summary">
                <div><dt>ID</dt><dd>{selectedObject.id}</dd></div>
                <div><dt>Version actual</dt><dd>{selectedObject.currentVersion ?? '0.1'}</dd></div>
                <div><dt>Archivo</dt><dd>{selectedObject.originalFilename ?? (selectedObject.fileUrl ? 'Disponible' : 'Pendiente')}</dd></div>
                <div><dt>Tamano</dt><dd>{formatFileSize(selectedObject.fileSize)}</dd></div>
                <div><dt>SHA-256</dt><dd>{selectedObject.fileChecksumSha256 ?? 'Pendiente'}</dd></div>
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
                <a className="download-link" href={`${API_URL}/learning-objects/${selectedObject.id}/download?source=admin`} download>
                  Descargar archivo
                </a>
              )}
              <section className="version-history" aria-label="Historial de versiones">
                <div className="version-history-header">
                  <h4>Historial de versiones</h4>
                  <span>{versionHistory.length} registros</span>
                </div>
                {loadingVersions ? (
                  <p className="history-empty">Cargando historial...</p>
                ) : versionHistory.length === 0 ? (
                  <p className="history-empty">Aun no hay snapshots versionados para este recurso.</p>
                ) : (
                  <ol className="version-list">
                    {versionHistory.map((version) => (
                      <li key={version.id} className="version-item">
                        <div className="version-main">
                          <span className="version-label">v{version.versionLabel}</span>
                          <strong>{getVersionChangeLabel(version.changeType)}</strong>
                        </div>
                        <p>{version.changeNote ?? 'Snapshot de preservacion registrado.'}</p>
                        <dl>
                          <div><dt>Fecha</dt><dd>{formatDate(version.createdAt)}</dd></div>
                          <div><dt>Archivo</dt><dd>{version.originalFilename ?? 'Sin archivo'}</dd></div>
                          <div><dt>Tamano</dt><dd>{formatFileSize(version.fileSize)}</dd></div>
                          <div><dt>SHA-256</dt><dd>{formatChecksum(version.fileChecksumSha256)}</dd></div>
                        </dl>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
              <section className="preservation-events" aria-label="Eventos de preservacion">
                <div className="version-history-header">
                  <h4>Eventos de preservacion</h4>
                  <span>{preservationEvents.length} registros</span>
                </div>
                {loadingEvents ? (
                  <p className="history-empty">Cargando eventos...</p>
                ) : preservationEvents.length === 0 ? (
                  <p className="history-empty">Aun no hay eventos de preservacion para este recurso.</p>
                ) : (
                  <ol className="event-list">
                    {preservationEvents.map((event) => (
                      <li key={event.id} className="event-item">
                        <div className="event-main">
                          <strong>{getPreservationEventLabel(event.eventType)}</strong>
                          {event.versionLabel && <span>v{event.versionLabel}</span>}
                        </div>
                        <p>{event.message}</p>
                        <dl>
                          <div><dt>Fecha</dt><dd>{formatDate(event.createdAt)}</dd></div>
                          <div><dt>Actor</dt><dd>{event.actor ?? 'system'}</dd></div>
                          <div><dt>Detalle</dt><dd>{formatEventDetails(event.details)}</dd></div>
                        </dl>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
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

        .metric.blue {
          border-color: #b8cff1;
          background: #f5f8fd;
        }

        .metric.compact {
          padding: 0.75rem;
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

        .collections-panel {
          display: grid;
          grid-template-columns: 320px minmax(0, 1fr);
          gap: 1rem;
          align-items: end;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .analytics-panel {
          display: grid;
          grid-template-columns: minmax(220px, 320px) 220px minmax(0, 1fr);
          gap: 1rem;
          align-items: stretch;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .analytics-panel h2 {
          font-size: 1rem;
          margin: 0;
        }

        .analytics-panel p {
          color: #666666;
          margin: 0.35rem 0 0;
          font-size: 0.875rem;
        }

        .analytics-summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .top-objects {
          display: grid;
          gap: 0.45rem;
          align-content: start;
        }

        .top-object-row {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          border: 1px solid #e0e0e0;
          border-radius: 0.45rem;
          background: #f8fafc;
          padding: 0.6rem 0.7rem;
          color: #1a1a1a;
          font-size: 0.82rem;
          font-weight: 700;
        }

        .top-object-row span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .top-object-row strong {
          color: #1f5fbf;
        }

        .empty-analytics {
          border: 1px dashed #d0d7e2;
          border-radius: 0.45rem;
          padding: 0.75rem;
          margin: 0 !important;
        }

        .lti-platforms-panel {
          display: grid;
          grid-template-columns: 280px minmax(0, 1.3fr) minmax(260px, 0.7fr);
          gap: 1rem;
          align-items: start;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .collections-panel h2,
        .lti-platforms-panel h2 {
          font-size: 1rem;
          margin: 0;
        }

        .collections-panel p,
        .lti-platforms-panel p {
          color: #666666;
          margin: 0.35rem 0 0;
          font-size: 0.875rem;
        }

        .panel-kicker {
          color: #1f5fbf !important;
          font-size: 0.75rem !important;
          font-weight: 800;
          text-transform: uppercase;
        }

        .collection-form {
          display: grid;
          grid-template-columns: minmax(180px, 1fr) minmax(220px, 1.4fr) auto;
          gap: 0.75rem;
          align-items: end;
        }

        .lti-platform-form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
          align-items: end;
        }

        .lti-platform-list {
          display: grid;
          gap: 0.5rem;
        }

        .lti-platform-item {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          align-items: center;
          border: 1px solid #e0e0e0;
          border-radius: 0.45rem;
          background: #f8fafc;
          padding: 0.75rem;
        }

        .lti-platform-item div {
          min-width: 0;
        }

        .lti-platform-item strong,
        .lti-platform-item span {
          display: block;
        }

        .lti-platform-item strong {
          color: #1a1a1a;
          font-size: 0.85rem;
        }

        .lti-platform-item div span {
          color: #666666;
          font-size: 0.75rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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

        button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
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
        .processing-pill,
        .profile-pill {
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

        .profile-complete {
          background: #eeeeee;
          color: #1a1a1a;
        }

        .profile-incomplete {
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

        .profile-summary {
          border: 1px solid #e0e0e0;
          border-radius: 0.5rem;
          background: #f5f5f5;
          padding: 0.85rem;
          margin-bottom: 1rem;
        }

        .profile-summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #1a1a1a;
          font-size: 0.82rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .profile-bar {
          height: 0.45rem;
          border-radius: 999px;
          background: #e0e0e0;
          overflow: hidden;
          margin: 0.65rem 0;
        }

        .profile-bar span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: #1f5fbf;
        }

        .profile-summary p {
          color: #666666;
          font-size: 0.82rem;
          line-height: 1.45;
          margin: 0;
        }

        .quality-summary {
          border: 1px solid #e0e0e0;
          border-radius: 0.5rem;
          background: #f8fafc;
          padding: 0.85rem;
          margin-bottom: 1rem;
        }

        .quality-summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #1a1a1a;
          font-size: 0.82rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .quality-bar {
          height: 0.45rem;
          border-radius: 999px;
          background: #e0e0e0;
          overflow: hidden;
          margin: 0.65rem 0;
        }

        .quality-bar span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: #1f5fbf;
        }

        .quality-blocked .quality-bar span {
          background: #991b1b;
        }

        .quality-needs_review .quality-bar span {
          background: #92400e;
        }

        .quality-summary p,
        .quality-summary li {
          color: #666666;
          font-size: 0.82rem;
          line-height: 1.45;
        }

        .quality-summary p {
          margin: 0;
        }

        .quality-summary ul {
          display: grid;
          gap: 0.35rem;
          margin: 0.65rem 0 0;
          padding-left: 1rem;
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

        .version-history,
        .preservation-events {
          border-top: 1px solid #e0e0e0;
          margin-top: 1rem;
          padding-top: 1rem;
        }

        .version-history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .version-history-header h4 {
          margin: 0;
        }

        .version-history-header span,
        .history-empty {
          color: #666666;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .version-list,
        .event-list {
          display: grid;
          gap: 0.75rem;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .version-item,
        .event-item {
          border: 1px solid #e0e0e0;
          border-radius: 0.5rem;
          background: #f8fafc;
          padding: 0.85rem;
        }

        .version-main,
        .event-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .version-label {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          background: #1f5fbf;
          color: white;
          font-size: 0.75rem;
          font-weight: 900;
          padding: 0.25rem 0.55rem;
        }

        .version-main strong {
          color: #1a1a1a;
          font-size: 0.8rem;
          text-align: right;
        }

        .event-main span {
          border-radius: 999px;
          background: #eef4ff;
          color: #174a96;
          font-size: 0.75rem;
          font-weight: 900;
          padding: 0.25rem 0.55rem;
        }

        .event-main strong {
          color: #1a1a1a;
          font-size: 0.82rem;
        }

        .version-item p,
        .event-item p {
          color: #666666;
          font-size: 0.82rem;
          line-height: 1.45;
          margin: 0 0 0.65rem;
        }

        .version-item dl,
        .event-item dl {
          gap: 0.45rem;
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

          .analytics-panel {
            grid-template-columns: 1fr;
          }

          .lti-platforms-panel,
          .lti-platform-form {
            grid-template-columns: 1fr;
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
          .toolbar,
          .collections-panel,
          .analytics-panel,
          .lti-platforms-panel,
          .collection-form {
            flex-direction: column;
            align-items: stretch;
          }

          .collections-panel,
          .lti-platforms-panel,
          .collection-form {
            display: flex;
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

function Metric({
  label,
  value,
  tone,
  compact = false,
}: {
  label: string;
  value: number;
  tone?: 'blue';
  compact?: boolean;
}) {
  return (
    <div className={`metric${tone ? ` ${tone}` : ''}${compact ? ' compact' : ''}`}>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

function ProfileSummary({ object }: { object: LearningObject }) {
  const completion = getProfileCompletion(object);

  return (
    <section className="profile-summary" aria-label="Completitud del perfil ROA">
      <div className="profile-summary-header">
        <span>Perfil ROA</span>
        <strong>{completion.percent}%</strong>
      </div>
      <div className="profile-bar" aria-hidden="true">
        <span style={{ width: `${completion.percent}%` }}></span>
      </div>
      {completion.missing.length > 0 ? (
        <p>Faltan: {completion.missing.join(', ')}.</p>
      ) : (
        <p>Listo para publicacion segun el perfil minimo.</p>
      )}
    </section>
  );
}

function QualitySummary({ report, loading }: { report: QualityReport | null; loading: boolean }) {
  if (loading) {
    return (
      <section className="quality-summary" aria-label="Reporte de calidad">
        <p>Cargando reporte de calidad...</p>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="quality-summary" aria-label="Reporte de calidad">
        <p>Reporte de calidad no disponible.</p>
      </section>
    );
  }

  const issues = [...report.blockers, ...report.warnings].slice(0, 5);

  return (
    <section className={`quality-summary quality-${report.status}`} aria-label="Reporte de calidad">
      <div className="quality-summary-header">
        <span>Calidad OA</span>
        <strong>{report.score}%</strong>
      </div>
      <div className="quality-bar" aria-hidden="true">
        <span style={{ width: `${report.score}%` }}></span>
      </div>
      <p>{getQualityStatusLabel(report)}</p>
      {issues.length > 0 && (
        <ul>
          {issues.map((issue) => (
            <li key={issue.code}>
              <strong>{issue.severity === 'blocker' ? 'Bloqueo' : 'Aviso'}:</strong> {issue.label}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function createReviewForm(object: LearningObject | null): ReviewForm {
  return {
    title: object?.title ?? '',
    description: object?.description ?? '',
    author: object?.author ?? '',
    collectionId: object?.collectionId ?? '',
    learningResourceType: object?.lomMetadata?.educational?.learningResourceType ?? '',
    difficulty: object?.lomMetadata?.educational?.difficulty ?? '',
    language: object?.lomMetadata?.general?.language ?? '',
    educationalLevel: object?.lomMetadata?.educational?.educationalLevel ?? '',
    intendedEndUserRole: object?.lomMetadata?.educational?.intendedEndUserRole ?? '',
    license: object?.lomMetadata?.rights?.license ?? '',
    rightsDescription: object?.lomMetadata?.rights?.description ?? '',
    keywords: object?.lomMetadata?.general?.keyword?.join(', ') ?? '',
    textSelectable: object?.lomMetadata?.accessibility?.textSelectable ?? '',
    structuredHeadings: object?.lomMetadata?.accessibility?.structuredHeadings ?? '',
    altText: object?.lomMetadata?.accessibility?.altText ?? '',
    readingOrder: object?.lomMetadata?.accessibility?.readingOrder ?? '',
    sufficientContrast: object?.lomMetadata?.accessibility?.sufficientContrast ?? '',
    captionsOrTranscript: object?.lomMetadata?.accessibility?.captionsOrTranscript ?? '',
    accessibilityNotes: object?.lomMetadata?.accessibility?.notes ?? '',
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
    collectionId: form.collectionId || null,
    lomMetadata: {
      ...(object.lomMetadata ?? {}),
      general: {
        ...(object.lomMetadata?.general ?? {}),
        title: form.title.trim(),
        description: form.description.trim(),
        language: form.language,
        keyword: keywords,
      },
      educational: {
        ...(object.lomMetadata?.educational ?? {}),
        learningResourceType: form.learningResourceType,
        difficulty: form.difficulty,
        educationalLevel: form.educationalLevel,
        intendedEndUserRole: form.intendedEndUserRole,
      },
      rights: {
        ...(object.lomMetadata?.rights ?? {}),
        license: form.license,
        description: form.rightsDescription.trim(),
      },
      accessibility: {
        ...(object.lomMetadata?.accessibility ?? {}),
        textSelectable: form.textSelectable || undefined,
        structuredHeadings: form.structuredHeadings || undefined,
        altText: form.altText || undefined,
        readingOrder: form.readingOrder || undefined,
        sufficientContrast: form.sufficientContrast || undefined,
        captionsOrTranscript: form.captionsOrTranscript || undefined,
        notes: form.accessibilityNotes.trim(),
      },
    },
  };
}

function getQualityStatusLabel(report: QualityReport) {
  if (report.status === 'blocked') {
    return `${report.summary.blockerCount} bloqueos y ${report.summary.warningCount} avisos antes de publicar.`;
  }

  if (report.status === 'needs_review') {
    return `${report.summary.warningCount} avisos pendientes de revision editorial.`;
  }

  return 'Sin bloqueos ni avisos relevantes.';
}

function getProfileCompletion(object: LearningObject) {
  const keywords = object.lomMetadata?.general?.keyword ?? [];
  const requiredFields = [
    { label: 'titulo', complete: Boolean(object.title?.trim()) },
    { label: 'descripcion', complete: Boolean(object.description?.trim()) },
    { label: 'autor', complete: Boolean(object.author?.trim()) },
    { label: 'archivo', complete: Boolean(object.fileUrl) },
    { label: 'coleccion', complete: Boolean(object.collectionId) },
    { label: 'idioma', complete: Boolean(object.lomMetadata?.general?.language?.trim()) },
    { label: 'palabras clave', complete: keywords.length > 0 },
    { label: 'tipo de recurso', complete: Boolean(object.lomMetadata?.educational?.learningResourceType?.trim()) },
    { label: 'nivel de dificultad', complete: Boolean(object.lomMetadata?.educational?.difficulty?.trim()) },
    { label: 'nivel educativo', complete: Boolean(object.lomMetadata?.educational?.educationalLevel?.trim()) },
    { label: 'audiencia', complete: Boolean(object.lomMetadata?.educational?.intendedEndUserRole?.trim()) },
    { label: 'licencia', complete: Boolean(object.lomMetadata?.rights?.license?.trim()) },
  ];
  const completed = requiredFields.filter((field) => field.complete).length;
  const missing = requiredFields.filter((field) => !field.complete).map((field) => field.label);

  return {
    percent: Math.round((completed / requiredFields.length) * 100),
    missing,
  };
}

async function getApiErrorMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json() as {
      message?: string | string[];
      missingFields?: string[];
      qualityBlockers?: QualityIssue[];
    };
    if (Array.isArray(payload.qualityBlockers) && payload.qualityBlockers.length > 0) {
      return `${payload.message ?? fallback}: ${payload.qualityBlockers.map((issue) => issue.label).join(' ')}`;
    }

    if (Array.isArray(payload.missingFields) && payload.missingFields.length > 0) {
      return `${payload.message ?? fallback}: ${payload.missingFields.join(', ')}.`;
    }

    if (Array.isArray(payload.message)) {
      return payload.message.join(' ');
    }

    return payload.message ?? fallback;
  } catch {
    return fallback;
  }
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

function getVersionChangeLabel(changeType: LearningObjectVersion['changeType']) {
  switch (changeType) {
    case 'file_update':
      return 'Archivo actualizado';
    case 'metadata_update':
      return 'Metadatos actualizados';
    default:
      return 'Primera publicacion';
  }
}

function getPreservationEventLabel(eventType: PreservationEvent['eventType']) {
  switch (eventType) {
    case 'file_replaced':
      return 'Archivo reemplazado';
    case 'version_snapshot_created':
      return 'Snapshot versionado';
    default:
      return 'Checksum calculado';
  }
}

function formatEventDetails(details?: Record<string, unknown> | null) {
  if (!details) return 'Sin detalles';

  const checksum = getStringDetail(details, 'checksumSha256') ?? getStringDetail(details, 'newChecksumSha256');
  const filename = getStringDetail(details, 'originalFilename');
  const changeType = getStringDetail(details, 'changeType');

  return [filename, changeType, checksum ? formatChecksum(checksum) : null]
    .filter(Boolean)
    .join(' / ') || 'Detalles registrados';
}

function getStringDetail(details: Record<string, unknown>, key: string) {
  const value = details[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function formatChecksum(value?: string | null) {
  if (!value) return 'Pendiente';
  if (value.length <= 16) return value;
  return `${value.slice(0, 12)}...${value.slice(-8)}`;
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
