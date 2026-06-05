'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface LearningObject {
  id: string;
  title: string;
  fileUrl?: string;
  fileMimeType?: string;
}

interface HtmlResponse {
  html?: string;
}

function LtiContent() {
  const searchParams = useSearchParams();
  const objectId = searchParams.get('objectId');
  const [object, setObject] = useState<LearningObject | null>(null);
  const [wordHtml, setWordHtml] = useState<string>('');
  const [loadingHtml, setLoadingHtml] = useState(false);

  useEffect(() => {
    if (objectId && objectId !== 'undefined') {
      fetch(`${API_URL}/learning-objects/${objectId}`)
        .then(res => res.json())
        .then((data: LearningObject) => {
          setObject(data);
          if (data.fileMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            setLoadingHtml(true);
            fetch(`${API_URL}/learning-objects/${objectId}/html`)
              .then(res => res.json())
              .then((htmlData: HtmlResponse) => {
                setWordHtml(htmlData.html || '<p>El documento está vacío.</p>');
                setLoadingHtml(false);
              })
              .catch(err => {
                console.error("Error cargando HTML:", err);
                setLoadingHtml(false);
              });
          }
        })
        .catch(err => console.error("Error cargando objeto:", err));
    }
  }, [objectId]);

  if (!objectId || objectId === 'undefined') return <div style={{ padding: '2rem' }}>Error: No se proporcionó un ID de objeto válido.</div>;
  if (!object) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando recurso seguro...</div>;

  return (
    <div style={{ background: 'white', minHeight: '100vh', padding: '1rem' }}>
      <header style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', margin: 0 }}>{object.title}</h1>
          <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>Recurso entregado vía LTI 1.3 por ROA God-Level</p>
        </div>
        <a 
          href={`${API_URL}/${object.fileUrl}`} 
          download 
          style={{ 
            padding: '0.5rem 1rem', 
            background: '#f1f5f9', 
            color: '#475569', 
            textDecoration: 'none', 
            borderRadius: '6px', 
            fontSize: '0.8rem', 
            fontWeight: 'bold',
            border: '1px solid #e2e8f0'
          }}
        >
          ⬇️ Descargar Original
        </a>
      </header>

      <div style={{ width: '100%', height: 'calc(100vh - 100px)', borderRadius: '8px', overflow: 'auto', border: '1px solid #ddd', background: '#f8fafc' }}>
        {object.fileMimeType === 'application/pdf' ? (
          <iframe 
            src={`${API_URL}/${object.fileUrl}`} 
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : object.fileMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? (
          <div style={{ padding: '3rem', background: 'white', maxWidth: '800px', margin: '0 auto', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', minHeight: '100%' }}>
            {loadingHtml ? (
              <p style={{ textAlign: 'center', color: '#666' }}>Convirtiendo documento a HTML...</p>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: wordHtml }} />
            )}
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p>Este recurso es un archivo. Puedes descargarlo aquí:</p>
            <a href={`${API_URL}/${object.fileUrl}`} className="btn" target="_blank">Descargar {object.title}</a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LtiView() {
  return (
    <Suspense fallback={<div>Cargando visor...</div>}>
      <LtiContent />
    </Suspense>
  );
}
