'use client';

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface UploadModalProps {
  authToken?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadModal({ authToken, onClose, onSuccess }: UploadModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
  });
  const [createdId, setCreatedId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${API_URL}/learning-objects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setCreatedId(data.id);
      setStep(2);
    } catch (error) {
      console.error('Error creating learning object:', error);
      setErrorMessage('No se pudo crear el objeto. Revisa los datos e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !createdId) return;
    
    setLoading(true);
    setErrorMessage('');
    const file = e.target.files[0];
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const res = await fetch(`${API_URL}/learning-objects/${createdId}/upload`, {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        body: formDataUpload,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error uploading file:', error);
      setErrorMessage('No se pudo subir el archivo. Solo se permiten PDF o DOCX validos.');
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

        {errorMessage && <div className="modal-error">{errorMessage}</div>}

        {step === 1 ? (
          <form onSubmit={handleCreate} className="form-group">
            <input 
              type="text" 
              placeholder="Titulo del objeto" 
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
              placeholder="Descripcion breve" 
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
        .modal-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          border-radius: 8px;
          padding: 0.75rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          font-weight: 600;
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

