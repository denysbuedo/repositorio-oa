'use client';

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function LtiSimulator() {
  const targetUrl = `${API_URL}/lti/launch`;
  const [objectId, setObjectId] = useState('');

  // Evitar desajustes de hidratación (Hydration Mismatch)


  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#f8f9fa', border: '2px solid #e9ecef', padding: '2rem', borderRadius: '12px' }}>
        <h1 style={{ color: '#ff5c5c' }}>🏗️ SimuLMS (Moodle Mock)</h1>
        <p>Esta página simula una petición de lanzamiento desde un LMS externo.</p>
        
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label>ID del Objeto en el Repositorio:</label>
          <input 
            type="text" 
            placeholder="Pega aqui el UUID del objeto" 
            value={objectId}
            onChange={(e) => setObjectId(e.target.value)}
            style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }}
          />
          
          <p style={{ fontSize: '0.9rem', color: '#666' }}>
            Al pulsar el botón, simularemos un <strong>LTI 1.3 Launch</strong>. 
            El Repositorio validará la firma y entregará el recurso de forma segura.
          </p>

          <form action={targetUrl} method="POST">
            {/* Campos ocultos que enviaría un LMS real */}
            <input type="hidden" name="id_token" value="dummy_token_validado_por_rs256" />
            <input type="hidden" name="state" value="random_state" />
            <input type="hidden" name="custom_object_id" value={objectId} />
            
            <button 
              type="submit" 
              className="btn" 
              style={{ 
                background: objectId ? '#ff5c5c' : '#ccc', 
                width: '100%', 
                padding: '1rem', 
                color: 'white', 
                fontWeight: 'bold', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: objectId ? 'pointer' : 'not-allowed' 
              }}
              disabled={!objectId}
            >
              Lanzar Recurso desde LMS
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
