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

const DEFAULT_TYPE_OPTIONS: FilterOption[] = [
  { value: 'Narrative Text', label: 'Texto narrativo' },
  { value: 'Lecture', label: 'Conferencia' },
  { value: 'Exercise', label: 'Ejercicio' },
  { value: 'Exam', label: 'Examen' },
  { value: 'Simulation', label: 'Simulacion' },
  { value: 'Image', label: 'Imagen' },
  { value: 'Diagram', label: 'Diagrama' },
  { value: 'Questionnaire', label: 'Cuestionario' },
  { value: 'Self Assessment', label: 'Autoevaluacion' },
  { value: 'Experiment', label: 'Experimento' },
  { value: 'Problem Statement', label: 'Enunciado de problema' },
  { value: 'Slide', label: 'Diapositiva' },
  { value: 'Table', label: 'Tabla' },
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
              <div className="empty-state-icon">Sin resultados</div>
              <p className="empty-state-title">No se encontraron objetos</p>
              <p className="empty-state-text">Intenta con otros filtros o revisa recursos publicados desde administracion</p>
              <button className="empty-state-btn" onClick={onRefresh}>
                 Ver todos los objetos
              </button>
            </div>
          ) : (
            objects.map((obj) => (
              <div key={obj.id} className="card">
                <div className="card-header">
                  <div className="badge-group">
                    <span className={`badge badge-${obj.status}`}>
                      {getStatusLabel(obj.status)}
                    </span>
                    {obj.lomMetadata && (
                      <span className="badge badge-ai">
                        IA verificado
                      </span>
                    )}
                    {obj.lomMetadata?.educational?.difficulty && (
                      <span className={`badge badge-difficulty-${getDifficultyBadgeKey(obj.lomMetadata.educational.difficulty)}`}>
                        {getDifficultyIcon(obj.lomMetadata.educational.difficulty)} {getDifficultyLabel(obj.lomMetadata.educational.difficulty)}
                      </span>
                    )}
                  </div>
                </div>
                
                <h3 className="card-title">{obj.title}</h3>
                
                <div className="id-copy">
                  <code className="id-code">ID: {obj.id}</code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(obj.id);
                      alert('ID Copiado al portapapeles');
                    }}
                    className="id-copy-btn"
                  >
                    Copiar
                  </button>
                </div>

                <p className="card-description">{obj.description || 'Sin descripcion'}</p>

                {obj.lomMetadata?.educational?.learningResourceType && (
                  <div className="resource-type-tag">
                    <span className="resource-type-icon">Tipo</span>
                    <span>{obj.lomMetadata.educational.learningResourceType}</span>
                  </div>
                )}

                {obj.lomMetadata && (
                  <div className="lom-box">
                    <details>
                      <summary className="lom-summary">
                        Metadatos IEEE LOM
                      </summary>
                      <pre className="lom-data">
                        {JSON.stringify(obj.lomMetadata, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

                <div className="card-footer">
                  <div className="author-info">
                    <span className="author-icon"></span>
                    <span className="author-name">{obj.author}</span>
                  </div>
                  {obj.fileUrl && (
                    <a 
                      href={`${API_URL}/${obj.fileUrl}`} 
                      download 
                      className="btn-download"
                    >
                      Descargar
                    </a>
                  )}
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

function getDifficultyIcon(difficulty: string) {
  switch(normalizeOptionKey(difficulty)) {
    case 'very easy':
    case 'muy facil':
      return 'Muy facil';
    case 'easy':
    case 'facil':
      return 'Facil';
    case 'normal':
    case 'medio':
      return 'Medio';
    case 'difficult':
    case 'dificil':
      return 'Dificil';
    default:
      return 'Nivel';
  }
}

function getDifficultyLabel(difficulty: string) {
  return DIFFICULTY_LABELS[normalizeOptionKey(difficulty)] ?? difficulty;
}

function getDifficultyBadgeKey(difficulty: string) {
  return normalizeOptionKey(difficulty).replace(/\s+/g, '');
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
    const uniqueTypes = new Set(objects.map(o => o.lomMetadata?.educational?.learningResourceType).filter(Boolean)).size;
    return { published, withMetadata, uniqueTypes, total: objects.length };
  };

  const stats = getStats();
  const difficultyOptions = buildFilterOptions(
    facets.difficulties,
    DEFAULT_DIFFICULTY_OPTIONS,
    DIFFICULTY_LABELS,
  );
  const typeOptions = buildFilterOptions(
    facets.types,
    DEFAULT_TYPE_OPTIONS,
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

      <style jsx>{`
        /* Variables y estilos mejorados */
        :root {
          --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          --gradient-secondary: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          min-height: 100vh;
        }

        /* Header con fondo de color */
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 1rem;
          padding: 1.5rem 2rem;
          margin-bottom: 1.5rem;
          box-shadow: var(--shadow-md);
          border: none;
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
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          margin: 0;
        }

        .subtitle {
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.875rem;
          margin: 0.25rem 0 0 0;
        }

        /* Panel de estadsticas */
        .stats-panel {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: var(--shadow-md);
          border: 1px solid #e2e8f0;
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
          color: #0f172a;
          margin: 0;
        }

        .stats-close {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: #94a3b8;
          padding: 0 0.5rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .stat-card {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
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
          color: #0f172a;
          margin-bottom: 0.5rem;
          line-height: 1;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #475569;
          margin-top: 0.25rem;
          font-weight: 500;
        }

        .stat-trend {
          font-size: 0.7rem;
          color: #667eea;
          margin-top: 0.5rem;
        }

        /* Filtros mejorados */
        .filters-card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: var(--shadow-md);
          border: 1px solid #e2e8f0;
        }

        .error-banner {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
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
          color: #0f172a;
          margin: 0;
        }

        .filters-reset {
          background: none;
          border: 1px solid #e2e8f0;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          color: #475569;
          transition: all 0.2s;
        }

        .filters-reset:hover {
          background: #f1f5f9;
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
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .filter-input,
        .filter-select {
          width: 100%;
          min-width: 220px;
          padding: 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          transition: all 0.2s;
          background: white;
          color: #0f172a;
        }

        .filter-select {
          cursor: pointer;
        }

        .filter-select option {
          background: white;
          color: #0f172a;
        }

        .filter-input:focus,
        .filter-select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .btn-search {
          background: var(--gradient-primary);
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
          color: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.45);
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s;
        }

        .btn-admin:hover {
          background: #f8fafc;
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
          color: #0f172a;
          margin: 0;
        }

        .results-count {
          font-size: 0.875rem;
          color: #64748b;
          margin-left: 0.5rem;
        }

        .results-refresh {
          background: white;
          border: 1px solid #e2e8f0;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          color: #475569;
          transition: all 0.2s;
        }

        .results-refresh:hover {
          background: #f1f5f9;
        }

        /* Grid y tarjetas */
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 1.5rem;
        }

        .card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: var(--shadow-sm);
          transition: all 0.3s;
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-xl);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .badge-group {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .badge {
          font-size: 0.7rem;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .badge-published {
          background: #dcfce7;
          color: #15803d;
        }

        .badge-draft {
          background: #fee2e2;
          color: #991b1b;
        }

        .badge-archived {
          background: #f1f5f9;
          color: #475569;
        }

        .badge-ai {
          background: #e0f2fe;
          color: #0369a1;
        }

        .badge-difficulty-veryeasy {
          background: #fef9c3;
          color: #854d0e;
        }

        .badge-difficultyeasy {
          background: #dcfce7;
          color: #15803d;
        }

        .badge-difficultynormal {
          background: #e0f2fe;
          color: #0369a1;
        }

        .badge-difficultydifficult {
          background: #fee2e2;
          color: #991b1b;
        }

        .card-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .id-copy {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #f1f5f9;
          padding: 0.5rem;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
        }

        .id-code {
          font-size: 0.7rem;
          color: #475569;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }

        .id-copy-btn {
          font-size: 0.7rem;
          padding: 0.25rem 0.5rem;
          cursor: pointer;
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 0.25rem;
          transition: all 0.2s;
        }

        .id-copy-btn:hover {
          background: #e2e8f0;
        }

        .card-description {
          color: #475569;
          font-size: 0.875rem;
          line-height: 1.5;
          margin: 0;
        }

        .resource-type-tag {
          background: #f1f5f9;
          padding: 0.5rem;
          border-radius: 0.5rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #475569;
          width: fit-content;
        }

        .lom-box {
          margin-top: 0.5rem;
          border-top: 1px solid #e2e8f0;
          padding-top: 0.75rem;
        }

        .lom-summary {
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          color: #667eea;
        }

        .lom-data {
          background: #1e293b;
          color: #e2e8f0;
          padding: 0.75rem;
          border-radius: 0.5rem;
          font-size: 0.7rem;
          overflow-x: auto;
          margin-top: 0.5rem;
        }

        .card-footer {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.75rem;
          border-top: 1px solid #e2e8f0;
        }

        .author-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .author-name {
          font-size: 0.875rem;
          color: #475569;
        }

        .btn-download {
          background: #f1f5f9;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          text-decoration: none;
          color: #0f172a;
          font-size: 0.8rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-download:hover {
          background: #e2e8f0;
        }

        /* Empty state */
        .empty-state {
          text-align: center;
          padding: 4rem;
          background: white;
          border-radius: 1rem;
          grid-column: 1 / -1;
        }

        .empty-state-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-state-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 0.5rem 0;
        }

        .empty-state-text {
          color: #64748b;
          margin: 0 0 1rem 0;
        }

        .empty-state-btn {
          background: var(--gradient-primary);
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
          border: 1px solid #e2e8f0;
        }

        .skeleton-line {
          height: 1rem;
          background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
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

