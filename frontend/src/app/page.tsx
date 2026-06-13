'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface LearningObject {
  id: string;
  title: string;
  description: string;
  author: string;
  status: string;
  fileUrl: string;
  lomMetadata?: {
    general?: {
      title?: { [key: string]: string };
      description?: { [key: string]: string };
      keyword?: string[];
    };
    educational?: {
      learningResourceType?: string;
      'learning-resource-type'?: string;
      difficulty?: string;
      context?: string;
      intendedEndUserRole?: string;
    };
  };
}

interface FilterOption {
  value: string;
  label: string;
}

interface FilterFacets {
  difficulties: string[];
  types: string[];
}

const DEFAULT_DIFFICULTY_OPTIONS: FilterOption[] = [
  { value: 'very easy', label: 'Muy facil' },
  { value: 'easy', label: 'Facil' },
  { value: 'normal', label: 'Medio' },
  { value: 'difficult', label: 'Dificil' },
];

const DIFFICULTY_LABELS: Record<string, string> = {
  'very easy': 'Muy facil',
  easy: 'Facil',
  normal: 'Medio',
  difficult: 'Dificil',
  'muy facil': 'Muy facil',
  facil: 'Facil',
  medio: 'Medio',
  dificil: 'Dificil',
  'muy dificil': 'Muy dificil',
};

const TYPE_LABELS: Record<string, string> = {
  'narrative text': 'Texto narrativo',
  lecture: 'Conferencia',
  exercise: 'Ejercicio',
  exam: 'Examen',
  simulation: 'Simulacion',
  image: 'Imagen',
  diagram: 'Diagrama',
  questionnaire: 'Cuestionario',
  'self assessment': 'Autoevaluacion',
  experiment: 'Experimento',
  'problem statement': 'Enunciado de problema',
  slide: 'Diapositiva',
  table: 'Tabla',
  course: 'Curso',
  document: 'Documento',
};

function ObjectList({
  objects,
  loading,
  onRefresh,
}: {
  objects: LearningObject[];
  loading: boolean;
  onRefresh: () => void;
}) {

  return (
    <>
      {loading ? (
        <div className="skeleton-grid">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-line" style={{width: '60%'}}></div>
              <div className="skeleton-line" style={{width: '80%'}}></div>
              <div className="skeleton-line" style={{width: '40%'}}></div>
              <div className="skeleton-line" style={{width: '90%'}}></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid">
          {objects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">0</div>
              <p className="empty-state-kicker">Sin resultados</p>
              <p className="empty-state-title">No hay objetos para esta busqueda</p>
              <p className="empty-state-text">Intenta con otros filtros o revisa recursos publicados desde administracion</p>
              <button className="empty-state-btn" onClick={onRefresh}>
                 Ver todos los objetos
              </button>
            </div>
          ) : (
            objects.map((obj) => (
              <div key={obj.id} className="object-card">
                <aside className="card-aside">
                  <span className={`status-badge status-${obj.status}`}>
                    {getStatusLabel(obj.status)}
                  </span>
                  {obj.lomMetadata && (
                    <span className="badge-ai">IA verificado</span>
                  )}
                  {obj.lomMetadata?.educational?.difficulty && (
                    <span className="difficulty-badge">
                      {getDifficultyLabel(obj.lomMetadata.educational.difficulty)}
                    </span>
                  )}
                  {getResourceType(obj) && (
                    <div className="type-tag">
                      Tipo: {getTypeLabel(getResourceType(obj))}
                    </div>
                  )}
                </aside>

                <div className="card-main">
                  <h3 className="card-title">{obj.title}</h3>

                  <p className="card-description">{obj.description || 'Sin descripción'}</p>

                  {obj.lomMetadata && (
                    <details className="metadata-details">
                      <summary className="metadata-summary">Metadatos IEEE LOM</summary>
                      <pre className="metadata-content">
                        {JSON.stringify(obj.lomMetadata, null, 2)}
                      </pre>
                    </details>
                  )}

                  <div className="card-footer">
                    <div className="author-info">
                      <span className="author-label">Autor</span>
                      <span className="author-name">{obj.author}</span>
                    </div>
                    <div className="card-actions">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(obj.id);
                          alert('ID copiado al portapapeles');
                        }}
                        className="copy-btn"
                      >
                        Copiar ID
                      </button>
                      {obj.fileUrl && (
                        <a href={`${API_URL}/${obj.fileUrl}`} download className="download-btn">
                          Descargar
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'published':
      return 'Publicado';
    case 'archived':
      return 'Archivado';
    default:
      return 'Borrador';
  }
}

function getDifficultyLabel(difficulty: string) {
  return DIFFICULTY_LABELS[normalizeOptionKey(difficulty)] ?? difficulty;
}

function getResourceType(object: LearningObject) {
  return object.lomMetadata?.educational?.learningResourceType
    ?? object.lomMetadata?.educational?.['learning-resource-type']
    ?? '';
}

function getTypeLabel(type: string) {
  return TYPE_LABELS[normalizeOptionKey(type)] ?? type;
}

function normalizeOptionKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildFilterOptions(
  values: string[],
  defaults: FilterOption[],
  labels: Record<string, string>,
): FilterOption[] {
  const seen = new Set<string>();
  const options: FilterOption[] = [];

  for (const option of defaults) {
    const key = normalizeOptionKey(option.value);
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(option);
  }

  for (const value of values) {
    const key = normalizeOptionKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({
      value,
      label: labels[key] ?? value,
    });
  }

  return options;
}

function buildFacetOptions(
  values: string[],
  labels: Record<string, string>,
): FilterOption[] {
  const seen = new Set<string>();

  return values.reduce<FilterOption[]>((options, value) => {
    const key = normalizeOptionKey(value);
    if (!key || seen.has(key)) return options;
    seen.add(key);
    options.push({
      value,
      label: labels[key] ?? value,
    });
    return options;
  }, []);
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [objects, setObjects] = useState<LearningObject[]>([]);
  const [facets, setFacets] = useState<FilterFacets>({ difficulties: [], types: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') ?? '');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showStats, setShowStats] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchObjects = useCallback(() => {
    setLoading(true);
    setErrorMessage('');
    const params = new URLSearchParams();
    if (searchTerm) params.append('q', searchTerm);
    if (difficultyFilter) params.append('difficulty', difficultyFilter);
    if (typeFilter) params.append('type', typeFilter);
    
    fetch(`${API_URL}/learning-objects?${params.toString()}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setObjects(data.filter((object: LearningObject) => object.status === 'published'));
        } else {
          console.error("Received non-array data from API:", data);
          setErrorMessage('La API devolvio una respuesta inesperada.');
          setObjects([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching objects:", err);
        setErrorMessage('No se pudieron cargar los objetos. Revisa que el backend este activo.');
        setObjects([]);
        setLoading(false);
      });
  }, [difficultyFilter, searchTerm, typeFilter]);

  useEffect(() => {
    fetch(`${API_URL}/learning-object-filters`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!data || typeof data !== 'object') {
          throw new Error('Unexpected facets payload');
        }

        setFacets({
          difficulties: Array.isArray((data as FilterFacets).difficulties)
            ? (data as FilterFacets).difficulties
            : [],
          types: Array.isArray((data as FilterFacets).types)
            ? (data as FilterFacets).types
            : [],
        });
      })
      .catch((err) => {
        console.error('Error fetching facets:', err);
        setFacets({ difficulties: [], types: [] });
      });
  }, []);

  // Calcular estadisticas
  const getStats = () => {
    const published = objects.filter(o => o.status === 'published').length;
    const withMetadata = objects.filter(o => o.lomMetadata).length;
    const uniqueTypes = new Set(objects.map(getResourceType).filter(Boolean)).size;
    return { published, withMetadata, uniqueTypes, total: objects.length };
  };

  const stats = getStats();
  const difficultyOptions = buildFilterOptions(
    facets.difficulties,
    DEFAULT_DIFFICULTY_OPTIONS,
    DIFFICULTY_LABELS,
  );
  const typeOptions = buildFacetOptions(
    facets.types,
    TYPE_LABELS,
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchObjects();
  }, [fetchObjects]);

  return (
    <main className="container">
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <div>
              <h1 className="title">Repositorio de Objetos de Aprendizaje</h1>
              <p className="subtitle">Catalogo de recursos educativos publicados</p>
            </div>
          </div>
          <div className="header-actions">
            <Link href="/admin" className="btn-admin">
              Administrar
            </Link>
          </div>
        </div>
      </header>

      {/* Panel de Estadisticas */}
      {showStats && objects.length > 0 && !loading && (
        <div className="stats-panel">
          <div className="stats-header">
            <h3 className="stats-title">Estadistica del Repositorio</h3>
            <button className="stats-close" onClick={() => setShowStats(false)}>x</button>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Objetos</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.published}</div>
              <div className="stat-label">Publicados</div>
              <div className="stat-trend">{((stats.published/stats.total)*100).toFixed(0)}% del total</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.withMetadata}</div>
              <div className="stat-label">Verificados por IA</div>
              <div className="stat-trend">{((stats.withMetadata/stats.total)*100).toFixed(0)}% con metadatos</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.uniqueTypes}</div>
              <div className="stat-label">Tipos de recurso</div>
            </div>
          </div>
        </div>
      )}

      <div className="filters-card">
        <div className="filters-header">
          <h3 className="filters-title">Filtros de busqueda</h3>
          <button className="filters-reset" onClick={() => {
            setSearchTerm('');
            setDifficultyFilter('');
            setTypeFilter('');
          }}>
            Limpiar filtros
          </button>
        </div>
        
        <div className="filters-grid">
          <div className="filter-group">
            <label className="filter-label">Busqueda por texto</label>
            <input 
              type="text" 
              placeholder="Titulo, descripcion o autor..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Nivel de dificultad</label>
            <select 
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="filter-select"
              aria-label="Nivel de dificultad"
            >
              <option value="">Todos los niveles</option>
              {difficultyOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Tipo de recurso educativo</label>
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="filter-select"
              aria-label="Tipo de recurso educativo"
            >
              <option value="">Todos los tipos</option>
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => fetchObjects()} 
            className="btn-search"
          >
            Aplicar filtros
          </button>
        </div>
      </div>

      <div className="results-header">
        <h3 className="results-title">
          Resultados encontrados
          {!loading && <span className="results-count">({objects.length} objetos)</span>}
        </h3>
        <button className="results-refresh" onClick={fetchObjects}>
          Refrescar
        </button>
      </div>

      {errorMessage && (
        <div className="error-banner">
          {errorMessage}
        </div>
      )}

      <ObjectList 
        objects={objects} 
        loading={loading}
        onRefresh={fetchObjects} 
      />

      <style jsx global>{`
        /* Variables y estilos mejorados */
        :root {
          --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
          background: #f5f5f5;
          min-height: 100vh;
        }

        /* Header con fondo de color */
        .header {
          background: linear-gradient(135deg, #1f5fbf 0%, #174a96 100%);
          border-radius: 0.5rem;
          padding: 3rem 2.5rem;
          margin-bottom: 2rem;
          box-shadow: var(--shadow-md);
          border: 1px solid #174a96;
          min-height: 190px;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .title {
          font-size: 2.4rem;
          font-weight: 700;
          color: white;
          line-height: 1.1;
          max-width: 760px;
          margin: 0;
        }

        .subtitle {
          color: rgba(255, 255, 255, 0.88);
          font-size: 1rem;
          margin: 0.65rem 0 0 0;
        }

        /* Panel de estadsticas */
        .stats-panel {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: var(--shadow-md);
          border: 1px solid #e0e0e0;
          position: relative;
        }

        .stats-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .stats-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
        }

        .stats-close {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: #666666;
          padding: 0 0.5rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .stat-card {
          background: #f5f5f5;
          padding: 1.5rem;
          border-radius: 0.75rem;
          text-align: center;
          transition: transform 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
        }

        .stat-value {
          font-size: 3rem;
          font-weight: 800;
          color: #1a1a1a;
          margin-bottom: 0.5rem;
          line-height: 1;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #666666;
          margin-top: 0.25rem;
          font-weight: 500;
        }

        .stat-trend {
          font-size: 0.7rem;
          color: #1f5fbf;
          margin-top: 0.5rem;
        }

        /* Filtros mejorados */
        .filters-card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: var(--shadow-md);
          border: 1px solid #e0e0e0;
        }

        .error-banner {
          background: #fef2f2;
          border: 1px solid #e0e0e0;
          color: #1a1a1a;
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .filters-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .filters-title {
          font-size: 1rem;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
        }

        .filters-reset {
          background: none;
          border: 1px solid #e0e0e0;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          color: #666666;
          transition: all 0.2s;
        }

        .filters-reset:hover {
          background: #f5f5f5;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: 1fr auto auto auto;
          gap: 1rem;
          align-items: end;
        }

        @media (max-width: 1024px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }

          .header {
            min-height: auto;
            padding: 2rem 1.5rem;
          }

          .title {
            font-size: 1.9rem;
          }
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          min-width: 0;
        }

        .filter-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #666666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .filter-input,
        .filter-select {
          width: 100%;
          min-width: 220px;
          padding: 0.75rem;
          border: 1px solid #e0e0e0;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          transition: all 0.2s;
          background: white;
          color: #1a1a1a;
        }

        .filter-select {
          cursor: pointer;
        }

        .filter-select option {
          background: white;
          color: #1a1a1a;
        }

        .filter-input:focus,
        .filter-select:focus {
          outline: none;
          border-color: #1f5fbf;
          box-shadow: 0 0 0 3px rgba(31, 95, 191, 0.12);
        }

        .btn-search {
          background: linear-gradient(135deg, #1f5fbf 0%, #174a96 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-search:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .btn-admin {
          background: white;
          color: #174a96;
          border: 1px solid rgba(255, 255, 255, 0.75);
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s;
        }

        .btn-admin:hover {
          background: #f5f5f5;
          transform: translateY(-2px);
        }

        /* Resultados header */
        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .results-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
        }

        .results-count {
          font-size: 0.875rem;
          color: #666666;
          margin-left: 0.5rem;
        }

        .results-refresh {
          background: white;
          border: 1px solid #e0e0e0;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          color: #666666;
          transition: all 0.2s;
        }

        .results-refresh:hover {
          background: #f5f5f5;
        }

        /* Grid y tarjetas */
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 1.5rem;
        }

        .object-card {
          position: relative;
          background: #ffffff;
          border-radius: 0.5rem;
          border: 1px solid #dfe6ee;
          box-shadow: 0 8px 18px rgba(26, 26, 26, 0.06);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }

        .object-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 26px rgba(26, 26, 26, 0.09);
          border-color: #b8c9e3;
        }

        .card-aside {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding: 0.85rem 1rem;
          background: linear-gradient(135deg, #1f5fbf 0%, #174a96 100%);
          border-bottom: 1px solid #174a96;
        }

        .status-badge,
        .badge-ai,
        .difficulty-badge,
        .type-tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.34rem 0.55rem;
          border: 1px solid transparent;
          white-space: nowrap;
          width: fit-content;
        }

        .status-badge {
          background: rgba(255, 255, 255, 0.18);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.28);
        }

        .status-published {
          background: #ffffff;
          color: #174a96;
          border-color: #ffffff;
        }

        .badge-ai {
          background: rgba(255, 255, 255, 0.16);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.28);
        }

        .difficulty-badge {
          background: rgba(255, 255, 255, 0.16);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.28);
        }

        .type-tag {
          background: rgba(255, 255, 255, 0.96);
          color: #174a96;
          border-color: rgba(255, 255, 255, 0.96);
          text-transform: capitalize;
          line-height: 1.2;
        }

        .card-main {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
          padding: 1rem;
          min-width: 0;
        }

        .card-title {
          font-size: 1.16rem;
          font-weight: 800;
          color: #1a1a1a;
          margin: 0;
          line-height: 1.28;
        }

        .card-description {
          color: #555d66;
          font-size: 0.92rem;
          line-height: 1.6;
          margin: 0;
          min-height: 3.5rem;
        }

        .metadata-details {
          margin-top: 0.1rem;
          border: 1px solid #e3e8ef;
          border-radius: 0.75rem;
          background: #f8fafc;
          padding: 0.8rem 0.85rem;
        }

        .metadata-summary {
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 700;
          color: #1f5fbf;
          list-style: none;
        }

        .metadata-summary::-webkit-details-marker {
          display: none;
        }

        .metadata-content {
          background: #ffffff;
          color: #2f3a46;
          padding: 0.8rem;
          border-radius: 0.55rem;
          font-size: 0.7rem;
          overflow-x: auto;
          margin-top: 0.6rem;
          border: 1px solid #e3e8ef;
        }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding-top: 0.95rem;
          border-top: 1px solid #edf1f5;
          margin-top: auto;
          flex-wrap: wrap;
        }

        .author-info {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          min-width: 0;
          flex-wrap: wrap;
        }

        .author-label {
          color: #6b7280;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .author-name {
          font-size: 0.88rem;
          color: #1a1a1a;
          font-weight: 700;
          overflow-wrap: anywhere;
          min-width: 0;
        }

        .card-actions {
          display: flex;
          gap: 0.6rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .copy-btn,
        .download-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.55rem 0.85rem;
          border-radius: 0.5rem;
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 800;
          transition: all 0.2s;
          white-space: nowrap;
          min-height: 2.35rem;
          border: 1px solid #d7dde5;
        }

        .copy-btn {
          cursor: pointer;
          background: #ffffff;
          color: #1a1a1a;
        }

        .download-btn {
          background: #1f5fbf;
          border-color: #1f5fbf;
          color: white;
        }

        .copy-btn:hover {
          background: #f7f9fc;
          border-color: #c4ced8;
        }

        .download-btn:hover {
          background: #174a96;
          border-color: #174a96;
        }

        @media (max-width: 640px) {
          .grid {
            grid-template-columns: 1fr;
          }

          .card-footer,
          .card-actions {
            align-items: stretch;
          }

          .card-actions,
          .copy-btn,
          .download-btn {
            width: 100%;
          }
        }

        /* Empty state */
        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          background: linear-gradient(180deg, #ffffff 0%, #f5f8fd 100%);
          border-radius: 0.5rem;
          border: 1px dashed #b8c9e3;
          grid-column: 1 / -1;
          max-width: 760px;
          margin: 0 auto;
          width: 100%;
        }

        .empty-state-icon {
          width: 4rem;
          height: 4rem;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: #1f5fbf;
          color: white;
          font-size: 1.7rem;
          font-weight: 900;
          margin: 0 auto 1rem;
        }

        .empty-state-kicker {
          color: #1f5fbf;
          font-size: 0.75rem;
          font-weight: 900;
          text-transform: uppercase;
          margin: 0 0 0.35rem;
        }

        .empty-state-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 0.5rem 0;
        }

        .empty-state-text {
          color: #666666;
          margin: 0 0 1rem 0;
        }

        .empty-state-btn {
          background: linear-gradient(135deg, #1f5fbf 0%, #174a96 100%);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
        }

        /* Skeleton loader */
        .skeleton-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 1.5rem;
        }

        .skeleton-card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          border: 1px solid #e0e0e0;
        }

        .skeleton-line {
          height: 1rem;
          background: linear-gradient(90deg, #e0e0e0 25%, #f5f5f5 50%, #e0e0e0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 0.25rem;
          margin-bottom: 0.75rem;
        }

        @keyframes loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<main className="container">Cargando repositorio...</main>}>
      <HomeContent />
    </Suspense>
  );
}


