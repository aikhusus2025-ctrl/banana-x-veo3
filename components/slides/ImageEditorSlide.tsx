import React, { useState, useCallback, useRef, useEffect } from 'react';
import { editImage, generatePromptFromImage } from '../../services/geminiService';
import { useFileConverter } from '../../hooks/useFileConverter';
import { FileConversionResult, ModelConfig } from '../../types';
import { PaperAirplaneIcon, MicrophoneIcon, PlusIcon, SparklesIcon, DownloadIcon, XMarkIcon } from '../Icons';

const WelcomeMessage = () => (
    <div className="text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-transparent bg-clip-text">
            Hello, Banana
        </h1>
        <p className="mt-4 text-xl text-gray-500 dark:text-gray-400">Unggah gambar dan beri tahu saya apa yang harus dilakukan.</p>
    </div>
);

interface ImageEditorSlideProps {
  onUseForVideo: (image: FileConversionResult) => void;
  sharedPrompt: string | null;
  clearSharedPrompt: () => void;
  sharedImages: File[] | null;
  clearSharedImages: () => void;
  selectedModelConfig: ModelConfig;
}

// FIX: Encapsulated all component logic within the function body to resolve scoping issues and type errors.
export const ImageEditorSlide: React.FC<ImageEditorSlideProps> = ({ onUseForVideo, sharedPrompt, clearSharedPrompt, sharedImages, clearSharedImages, selectedModelConfig }) => {
  const [prompt, setPrompt] = useState('');
  const [originalImages, setOriginalImages] = useState<File[]>([]);
  const [originalImagePreviews, setOriginalImagePreviews] = useState<string[]>([]);
  const [generatedImage, setGeneratedImage] = useState<FileConversionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { convertFile } = useFileConverter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draggedItemIndex = useRef<number | null>(null);

  useEffect(() => {
    if (sharedPrompt) {
      setPrompt(sharedPrompt);
      clearSharedPrompt();
    }
  }, [sharedPrompt, clearSharedPrompt]);

  useEffect(() => {
    if (sharedImages) {
      setOriginalImages(sharedImages);
      const newPreviews = sharedImages.map(file => URL.createObjectURL(file));
      setOriginalImagePreviews(newPreviews);
      setCurrentImageIndex(0);
      clearSharedImages();
    }
  }, [sharedImages, clearSharedImages]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      setOriginalImages(prev => [...prev, ...fileList]);
      
      const newPreviews = fileList.map(file => URL.createObjectURL(file));
      setOriginalImagePreviews(prev => [...prev, ...newPreviews]);
      
      setGeneratedImage(null);
      setError(null);
      setCurrentImageIndex(originalImages.length); // Go to the first new image
    }
  };

  const removeImage = (indexToRemove: number) => {
    setOriginalImages(prev => prev.filter((_, index) => index !== indexToRemove));
    setOriginalImagePreviews(prev => {
        const newPreviews = prev.filter((_, index) => index !== indexToRemove);
        URL.revokeObjectURL(prev[indexToRemove]);
        return newPreviews;
    });
     if (indexToRemove < currentImageIndex) {
        setCurrentImageIndex(prev => prev - 1);
    } else if (indexToRemove === currentImageIndex && currentImageIndex === originalImages.length - 1) {
        setCurrentImageIndex(prev => Math.max(0, prev - 1));
    }
  };
  
  const handleGenerate = useCallback(async () => {
    if (!prompt) {
      setError("Please enter a prompt.");
      return;
    }
    if (originalImages.length === 0) {
      setError("Please upload an image.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const imageFiles = await Promise.all(originalImages.map(file => convertFile(file)));
      const result = await editImage(prompt, imageFiles);
      setGeneratedImage(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [prompt, originalImages, convertFile]);

  const handleSuggestPrompt = useCallback(async () => {
    if (originalImages.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
        const firstImage = await convertFile(originalImages[0]);
        const suggestedPrompt = await generatePromptFromImage(firstImage, selectedModelConfig);
        setPrompt(suggestedPrompt);
    } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred while suggesting a prompt.");
    } finally {
        setIsLoading(false);
    }
  }, [originalImages, convertFile, selectedModelConfig]);

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = `data:${generatedImage.mimeType};base64,${generatedImage.base64}`;
    const extension = generatedImage.mimeType.split('/')[1] || 'png';
    link.download = `edited-image.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    draggedItemIndex.current = index;
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
     const dragIndex = draggedItemIndex.current;
    if (dragIndex === null || dragIndex === index) {
        return;
    }
    
    const reorderedImages = [...originalImages];
    const [draggedImage] = reorderedImages.splice(dragIndex, 1);
    reorderedImages.splice(index, 0, draggedImage);
    setOriginalImages(reorderedImages);

    const reorderedPreviews = [...originalImagePreviews];
    const [draggedPreview] = reorderedPreviews.splice(dragIndex, 1);
    reorderedPreviews.splice(index, 0, draggedPreview);
    setOriginalImagePreviews(reorderedPreviews);

    draggedItemIndex.current = index;
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
    draggedItemIndex.current = null;
  };

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  const showWelcome = !isLoading && !error && originalImages.length === 0;

  return (
    <div className="w-full h-full flex flex-col items-center justify-end p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl flex-grow flex items-center justify-center min-h-0 overflow-y-auto hide-scrollbar py-4">
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
          {isLoading ? (
            <div className="text-center p-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 dark:border-white mx-auto"></div>
              <p className="mt-4 text-gray-800/90 dark:text-white/90">Editing your image...</p>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 p-4">{error}</div>
          ) : generatedImage ? (
            <div className="w-full flex flex-col items-center justify-center">
              <img src={`data:${generatedImage.mimeType};base64,${generatedImage.base64}`} alt="Generated result" className="w-full object-contain rounded-lg" />
               <div className="mt-4 flex space-x-2">
                  <button onClick={handleDownload} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    <DownloadIcon className="w-5 h-5 mr-2" /> Unduh Gambar
                  </button>
                  <button onClick={() => onUseForVideo(generatedImage)} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
                    Gunakan untuk Video
                  </button>
                </div>
            </div>
          ) : showWelcome ? (
            <WelcomeMessage />
          ) : null }
      </div>

      <div className="w-full max-w-4xl mt-6">
        <div className="w-full bg-white dark:bg-[#131314] rounded-2xl p-3 sm:p-4 border-2 border-gray-300 dark:border-gray-700">
            {originalImagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 px-1">
                {originalImagePreviews.map((preview, index) => (
                  <div 
                    key={preview}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 cursor-grab active:cursor-grabbing transition-opacity"
                  >
                    <img src={preview} alt={`preview ${index}`} className="w-full h-full object-cover pointer-events-none"/>
                    <button onClick={() => removeImage(index)} className="absolute top-0 right-0 p-0.5 bg-black/50 text-white rounded-bl-lg hover:bg-red-500">
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Masukkan prompt di sini..."
              className="w-full px-2 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 outline-none resize-none mb-3"
              rows={1}
              style={{ maxHeight: '200px' }}
              disabled={isLoading}
            />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600" aria-label="Upload Image">
                 <PlusIcon className="w-6 h-6 text-gray-600 dark:text-gray-300"/>
              </button>
              {originalImages.length > 0 && (
                <button onClick={handleSuggestPrompt} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50" disabled={isLoading} aria-label="Suggest prompt from image">
                  <SparklesIcon className="w-6 h-6 text-purple-500"/>
                </button>
              )}
              <button className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50" disabled={isLoading || originalImages.length === 0} aria-label="Use microphone">
                 <MicrophoneIcon className="w-6 h-6 text-gray-600 dark:text-gray-300"/>
              </button>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isLoading || originalImages.length === 0 || !prompt}
              className="p-3 rounded-full bg-gray-800 dark:bg-gray-200 hover:bg-gray-900 dark:hover:bg-white disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
              aria-label="Generate edit"
            >
              <PaperAirplaneIcon className="w-5 h-5 text-white dark:text-black" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};