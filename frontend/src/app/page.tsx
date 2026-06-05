'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import UploadModal from './components/UploadModal';

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

type ObjectStatus = 'draft' | 'published' | 'archived';

function ObjectList({
  objects,
  loading,
  onRefresh,
  onStatusChange,
  onDelete,
}: {
  objects: LearningObject[];
  loading: boolean;
  onRefresh: () => void;
  onStatusChange: (id: string, status: ObjectStatus) => void;
  onDelete: (id: string) => void;
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
              <p className="empty-state-text">Intenta con otros filtros o palabras clave</p>
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
                      <span className={`badge badge-difficulty-${obj.lomMetadata.educational.difficulty.toLowerCase().replace(' ', '')}`}>
                        {getDifficultyIcon(obj.lomMetadata.educational.difficulty)} {obj.lomMetadata.educational.difficulty}
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

                <div className="card-actions" aria-label={`Acciones de ${obj.title}`}>
                  {obj.status !== 'published' && (
                    <button className="btn-action btn-action-primary" onClick={() => onStatusChange(obj.id, 'published')}>
                      Publicar
                    </button>
                  )}
                  {obj.status !== 'draft' && (
                    <button className="btn-action" onClick={() => onStatusChange(obj.id, 'draft')}>
                      Borrador
                    </button>
                  )}
                  {obj.status !== 'archived' && (
                    <button className="btn-action" onClick={() => onStatusChange(obj.id, 'archived')}>
                      Archivar
                    </button>
                  )}
                  <button className="btn-action btn-action-danger" onClick={() => onDelete(obj.id)}>
                    Eliminar
                  </button>
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
  switch(difficulty.toLowerCase()) {
    case 'very easy': return 'Muy facil';
    case 'easy': return 'Facil';
    case 'normal': return 'Medio';
    case 'difficult': return 'Dificil';
    default: return 'Nivel';
  }
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [objects, setObjects] = useState<LearningObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') ?? '');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showStats, setShowStats] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchObjects = useCallback(() => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
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
          setObjects(data);
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

  const updateObjectStatus = async (id: string, status: ObjectStatus) => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch(`${API_URL}/learning-objects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      setSuccessMessage(`Estado actualizado a ${getStatusLabel(status)}.`);
      fetchObjects();
    } catch (error) {
      console.error('Error updating object status:', error);
      setErrorMessage('No se pudo actualizar el estado del objeto.');
    }
  };

  const deleteObject = async (id: string) => {
    const confirmed = window.confirm('Esta accion eliminara el objeto. Deseas continuar?');
    if (!confirmed) return;

    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch(`${API_URL}/learning-objects/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      setSuccessMessage('Objeto eliminado.');
      fetchObjects();
    } catch (error) {
      console.error('Error deleting object:', error);
      setErrorMessage('No se pudo eliminar el objeto.');
    }
  };

  // Calcular estadisticas
  const getStats = () => {
    const published = objects.filter(o => o.status === 'published').length;
    const withMetadata = objects.filter(o => o.lomMetadata).length;
    const uniqueTypes = new Set(objects.map(o => o.lomMetadata?.educational?.learningResourceType).filter(Boolean)).size;
    return { published, withMetadata, uniqueTypes, total: objects.length };
  };

  const stats = getStats();

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
              <p className="subtitle">Gestion inteligente de Recursos Educativos</p>
            </div>
          </div>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <span className="btn-icon">+</span>
            Nuevo Objeto
          </button>
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
              <option value="Very easy">Muy facil</option>
              <option value="Easy">Facil</option>
              <option value="Normal">Medio</option>
              <option value="Difficult">Dificil</option>
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
              <option value="Narrative Text">Texto narrativo</option>
              <option value="Lecture">Conferencia</option>
              <option value="Exercise">Ejercicio</option>
              <option value="Exam">Examen</option>
              <option value="Simulation">Simulacion</option>
              <option value="Image">Imagen</option>
              <option value="Diagram">Diagrama</option>
              <option value="Questionnaire">Cuestionario</option>
              <option value="Self Assessment">Autoevaluacion</option>
              <option value="Experiment">Experimento</option>
              <option value="Problem Statement">Enunciado de problema</option>
              <option value="Slide">Diapositiva</option>
              <option value="Table">Tabla</option>
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

      {successMessage && (
        <div className="success-banner">
          {successMessage}
        </div>
      )}

      <ObjectList 
        objects={objects} 
        loading={loading}
        onRefresh={fetchObjects} 
        onStatusChange={updateObjectStatus}
        onDelete={deleteObject}
      />

      {isModalOpen && (
        <UploadModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchObjects} 
        />
      )}

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

        .success-banner {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
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

        .btn-primary {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          background: rgba(255, 255, 255, 0.3);
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

        .card-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding-top: 0.75rem;
          border-top: 1px solid #e2e8f0;
        }

        .btn-action {
          background: white;
          border: 1px solid #cbd5e1;
          color: #334155;
          border-radius: 0.375rem;
          padding: 0.45rem 0.65rem;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-action:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        .btn-action-primary {
          background: #2563eb;
          border-color: #2563eb;
          color: white;
        }

        .btn-action-primary:hover {
          background: #1d4ed8;
          border-color: #1d4ed8;
        }

        .btn-action-danger {
          border-color: #fecaca;
          color: #991b1b;
        }

        .btn-action-danger:hover {
          background: #fef2f2;
          border-color: #fca5a5;
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

