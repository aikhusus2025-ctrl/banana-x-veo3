
import { useCallback } from 'react';
import { FileConversionResult } from '../types';

export const useFileConverter = () => {
  const convertFile = useCallback((file: File): Promise<FileConversionResult> => {
    return new Promise((resolve, reject) => {
      if (!file) {
        return reject(new Error('No file provided.'));
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const [meta, data] = result.split(',');
        if (!meta || !data) {
          return reject(new Error('Invalid file format.'));
        }
        const mimeMatch = meta.match(/:(.*?);/);
        if (!mimeMatch || !mimeMatch[1]) {
           return reject(new Error('Could not determine MIME type.'));
        }
        const mimeType = mimeMatch[1];
        resolve({ base64: data, mimeType });
      };
      reader.onerror = (error) => {
        reject(error);
      };
    });
  }, []);

  return { convertFile };
};
