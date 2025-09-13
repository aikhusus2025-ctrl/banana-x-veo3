import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateVideo, generatePromptFromImage } from '../../services/geminiService';
import { PaperAirplaneIcon, MicrophoneIcon, SparklesIcon, DownloadIcon, PlusIcon, XMarkIcon } from '../Icons';
import { useFileConverter } from '../../hooks/useFileConverter';
import { FileConversionResult, ModelConfig } from '../../types';

const WelcomeMessage = () => (
    <div className="text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
            Hello, Veo 3
        </h1>
        <p className="mt-4 text-xl text-gray-500 dark:text-gray-400">Bagaimana saya bisa membantu Anda hari ini?</p>
    </div>
);

interface VideoGeneratorSlideProps {
  sharedImage: FileConversionResult | null;
  clearSharedImage: () => void;
  sharedPrompt: string | null;
  clearSharedPrompt: () => void;
  sharedImages: File[] | null;
  clearSharedImages: () => void;
  selectedModelConfig: ModelConfig;
}

export const VideoGeneratorSlide: React.FC<VideoGeneratorSlideProps> = ({ sharedImage, clearSharedImage, sharedPrompt, clearSharedPrompt, sharedImages, clearSharedImages, selectedModelConfig }) => {
  const [prompt, setPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [referenceImage, setReferenceImage] = useState<FileConversionResult | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { convertFile } = useFileConverter();


  useEffect(() => {
    if (sharedImage) {
      setReferenceImage(sharedImage);
      setReferenceImagePreview(`data:${sharedImage.mimeType};base64,${sharedImage.base64}`);
      clearSharedImage();
    }
  }, [sharedImage, clearSharedImage]);

  useEffect(() => {
    const handleSharedImages = async () => {
        if (sharedImages && sharedImages.length > 0) {
            const firstImage = sharedImages[0];
            try {
                const convertedFile = await convertFile(firstImage);
                setReferenceImage(convertedFile);
                setReferenceImagePreview(URL.createObjectURL(firstImage));
            } catch (e) {
                setError("Could not process the shared image.");
            } finally {
                clearSharedImages();
            }
        }
    };
    handleSharedImages();
  }, [sharedImages, clearSharedImages, convertFile]);
  
  useEffect(() => {
    if (sharedPrompt) {
      setPrompt(sharedPrompt);
      clearSharedPrompt();
    }
  }, [sharedPrompt, clearSharedPrompt]);

  const loadingMessages = [
    "Warming up the video engine...", "This can take a few minutes...", "Rendering pixels into motion...", "Almost there, adding the final touches...", "Hang tight, your video is being created!",
  ];

  const handleGenerate = useCallback(async () => {
    if (!prompt) {
      setError("Please enter a prompt.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setVideoUrl(null);
    
    let messageIndex = 0;
    setLoadingMessage(loadingMessages[0]);
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setLoadingMessage(loadingMessages[messageIndex]);
    }, 5000);

    try {
      const url = await generateVideo(prompt, referenceImage ?? undefined);
      setVideoUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
      clearInterval(interval);
      setLoadingMessage('');
    }
  }, [prompt, referenceImage]);
  
  const handleSuggestPrompt = useCallback(async () => {
    if (!referenceImage) return;
    setIsLoading(true);
    setError(null);
    try {
        const suggestedPrompt = await generatePromptFromImage(referenceImage, selectedModelConfig);
        setPrompt(suggestedPrompt);
    } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred while suggesting a prompt.");
    } finally {
        setIsLoading(false);
    }
  }, [referenceImage, selectedModelConfig]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const convertedFile = await convertFile(file);
        setReferenceImage(convertedFile);
        setReferenceImagePreview(URL.createObjectURL(file));
      } catch (e) {
        setError("Could not process file.");
      }
    }
  };
  
  const handleRemoveReferenceImage = () => {
    setReferenceImage(null);
    setReferenceImagePreview(null);
  };

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);
  
  const showWelcome = !isLoading && !error && !videoUrl && !prompt && !referenceImagePreview;

  return (
    <div className="w-full h-full flex flex-col items-center justify-end p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl flex-grow flex items-center justify-center min-h-0 overflow-y-auto hide-scrollbar py-4">
        {isLoading ? (
          <div className="text-center p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 dark:border-white mx-auto"></div>
            <p className="mt-4 text-gray-800/90 dark:text-white/90">{loadingMessage || 'Generating...'}</p>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4">{error}</div>
        ) : videoUrl ? (
          <div className="w-full flex flex-col items-center justify-center">
            <video src={videoUrl} controls autoPlay loop className="w-full object-contain" />
            <a href={videoUrl} download="generated-video.mp4" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <DownloadIcon className="w-5 h-5 mr-2" />
              Unduh Video
            </a>
          </div>
        ) : showWelcome ? (
          <WelcomeMessage />
        ) : null}
      </div>

      <div className="w-full max-w-4xl mt-6">
        <div className="w-full bg-white dark:bg-[#131314] rounded-2xl p-3 sm:p-4 border-2 border-gray-300 dark:border-gray-700">
          {referenceImagePreview && (
            <div className="mb-3 px-1">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                <img src={referenceImagePreview} alt="Reference" className="w-full h-full object-cover pointer-events-none"/>
                <button onClick={handleRemoveReferenceImage} className="absolute top-0 right-0 p-0.5 bg-black/50 text-white rounded-bl-lg hover:bg-red-500">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
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
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600" aria-label="Upload reference image">
                  <PlusIcon className="w-6 h-6"/>
                </button>
                {referenceImage && (
                    <button onClick={handleSuggestPrompt} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50" disabled={isLoading} aria-label="Suggest prompt from image">
                      <SparklesIcon className="w-6 h-6 text-purple-500"/>
                    </button>
                )}
                <button className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50" disabled={isLoading} aria-label="Use microphone">
                   <MicrophoneIcon className="w-6 h-6 text-gray-600 dark:text-gray-300"/>
                </button>
             </div>
            <button
              onClick={handleGenerate}
              disabled={isLoading || !prompt}
              className="p-3 rounded-full bg-gray-800 dark:bg-gray-200 hover:bg-gray-900 dark:hover:bg-white disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
              aria-label="Generate video"
            >
              <PaperAirplaneIcon className="w-5 h-5 text-white dark:text-black" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};