import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import axios from 'axios';
import * as mammoth from 'mammoth';
import {
  PdfReader,
  type DataEntry,
  type Error as PdfReaderError,
} from 'pdfreader';

type LomMetadata = Record<string, unknown>;

interface OllamaGenerateResponse {
  response: unknown;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class AiService {
  private ollamaUrl =
    process.env.OLLAMA_URL ?? 'http://localhost:11434/api/generate';
  private ollamaModel = process.env.OLLAMA_MODEL ?? 'llama3';

  async extractText(filePath: string, mimeType: string): Promise<string> {
    const dataBuffer = fs.readFileSync(filePath);

    if (mimeType === 'application/pdf') {
      return new Promise((resolve) => {
        let text = '';
        new PdfReader().parseBuffer(
          dataBuffer,
          (err: PdfReaderError, item: DataEntry) => {
            if (err) {
              console.error('Error parseando PDF:', err);
              resolve('');
            } else if (!item) {
              // Fin del archivo
              resolve(text);
            } else if (item.text) {
              text += item.text + ' ';
            }
          },
        );
      });
    }

    if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const data = await mammoth.extractRawText({ buffer: dataBuffer });
      return data.value;
    }

    return '';
  }

  async generateMetadata(text: string): Promise<LomMetadata> {
    if (!text || text.trim().length < 10) {
      return this.fallbackMetadata('Texto insuficiente para análisis');
    }

    const prompt = `
      Analyze the following educational text and generate a JSON object following the IEEE LOM standard.
      Focus on these categories: General (title, description, keywords), Educational (learning resource type, difficulty).
      Respond ONLY with the JSON object, no introduction or conclusion.
      Text to analyze: ${text.substring(0, 3000)}
    `;

    try {
      const response = await axios.post<OllamaGenerateResponse>(
        this.ollamaUrl,
        {
          model: this.ollamaModel,
          prompt: prompt,
          stream: false,
          format: 'json',
        },
      );

      const generatedContent = response.data.response;
      return typeof generatedContent === 'string'
        ? (JSON.parse(generatedContent) as LomMetadata)
        : (generatedContent as LomMetadata);
    } catch (error) {
      console.error('Error con Ollama:', getErrorMessage(error));
      return this.fallbackMetadata(text);
    }
  }

  private fallbackMetadata(text: string): LomMetadata {
    const words = text.split(/\s+/);
    return {
      general: {
        title: { es: words.slice(0, 5).join(' ') || 'Objeto sin título' },
        description: { es: 'Generado por fallback (Ollama offline)' },
        keyword: words.slice(10, 15),
      },
    };
  }
}
