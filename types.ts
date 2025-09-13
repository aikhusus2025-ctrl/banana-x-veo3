
export interface FileConversionResult {
  base64: string;
  mimeType: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  modelId: 'gemini-2.5-flash';
  config: {
    temperature?: number;
  };
}
