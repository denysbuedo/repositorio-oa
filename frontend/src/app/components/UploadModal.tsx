'use client';

import { useState } from 'react';

interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: ''
  });
  const [createdId, setCreatedId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/learning-objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      setCreatedId(data.id);
      setStep(2);
    } catch (error) {
      alert('Error al crear el objeto');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !createdId) return;
    
    setLoading(true);
    const file = e.target.files[0];
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      await fetch(`http://localhost:3001/learning-objects/${createdId}/upload`, {
        method: 'POST',
        body: formDataUpload
      });
      onSuccess();
      onClose();
    } catch (error) {
      alert('Error al subir el archivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2>{step === 1 ? 'Nuevo Objeto de Aprendizaje' : 'Subir Recurso'}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
        </div>

        {step === 1 ? (
          <form onSubmit={handleCreate} className="form-group">
            <input 
              type="text" 
              placeholder="Título del Objeto" 
              className="input"
              required 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
            <input 
              type="text" 
              placeholder="Autor" 
              className="input"
              required 
              value={formData.author}
              onChange={(e) => setFormData({...formData, author: e.target.value})}
            />
            <textarea 
              placeholder="Descripción breve" 
              className="input"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
            <button type="submit" className="btn" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Creando...' : 'Siguiente: Subir Archivo'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', border: '2px dashed var(--border)', borderRadius: 'var(--radius)' }}>
            <p style={{ marginBottom: '1rem' }}>Selecciona el archivo (PDF o Word)</p>
            <input 
              type="file" 
              id="file-upload" 
              hidden 
              onChange={handleFileUpload}
              accept=".pdf,.docx"
            />
            <label htmlFor="file-upload" className="btn" style={{ cursor: 'pointer' }}>
              {loading ? 'Analizando con IA...' : 'Elegir Archivo'}
            </label>
            {loading && (
              <p style={{ marginTop: '1rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                Extrayendo metadatos inteligentes...
              </p>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: var(--radius);
          width: 100%;
          max-width: 500px;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .input {
          padding: 0.75rem;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-family: inherit;
          font-size: 1rem;
        }
        .input:focus {
          outline: none;
          border-color: var(--primary);
          ring: 2px solid var(--primary);
        }
      `}</style>
    </div>
  );
}
