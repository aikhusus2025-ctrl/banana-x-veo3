import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateDetailedPrompt, createChat, sendChatMessage, generateImage, regenerateDetailedPrompt } from '../../services/geminiService';
import { useFileConverter } from '../../hooks/useFileConverter';
import { PaperAirplaneIcon, PlusIcon, XMarkIcon, SparklesIcon, DownloadIcon, ClipboardIcon, ArrowPathIcon, CheckIcon, SquareIcon, LandscapeIcon, PortraitIcon } from '../Icons';
import { ModelConfig, FileConversionResult } from '../../types';
import { Chat } from '@google/genai';

const MAX_IMAGES = 6;

interface Message {
  id: number;
  role: 'user' | 'model';
  text: string;
  images?: string[];
  intent?: 'IMAGE' | 'VIDEO';
  originalPrompt?: string;
  originalImages?: File[];
  generatedImage?: FileConversionResult;
  isRefreshing?: boolean;
}

interface AssistantSlideProps {
  onUsePrompt: (prompt: string, images: File[], targetView: 'banana' | 'veo') => void;
  selectedModelConfig: ModelConfig;
}

export const AssistantSlide: React.FC<AssistantSlideProps> = ({ onUsePrompt, selectedModelConfig }) => {
  const [idea, setIdea] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [mode, setMode] = useState<'prompt-engineer' | 'create-image' | 'ai-dialog'>('prompt-engineer');
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  
  const chatRef = useRef<Chat | null>(null);
  const { convertFile } = useFileConverter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current = createChat(selectedModelConfig);
    setConversation([{
        id: Date.now(),
        role: 'model',
        text: "Halo! Saya adalah Asisten AI Anda. Pilih mode: 'Prompt Engineer' untuk menyempurnakan ide, 'Create Image' untuk membuat gambar, atau 'AI Dialog' untuk obrolan umum.",
    }]);
  }, [selectedModelConfig]);
  
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation, isLoading]);

  const handleModeChange = (newMode: 'prompt-engineer' | 'create-image' | 'ai-dialog') => {
    if (newMode === 'create-image' && images.length > 0) {
        setImages([]);
        setImagePreviews([]);
    }
    setMode(newMode);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const availableSlots = MAX_IMAGES - images.length;
      const filesToUpload = Array.from(files).slice(0, availableSlots);
      
      setImages(prev => [...prev, ...filesToUpload]);
      const newPreviews = filesToUpload.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
      setError(null);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
    setImagePreviews(prev => {
      const newPreviews = prev.filter((_, index) => index !== indexToRemove);
      URL.revokeObjectURL(prev[indexToRemove]);
      return newPreviews;
    });
  };

  const handleDownloadImage = (image: FileConversionResult) => {
    const link = document.createElement('a');
    link.href = `data:${image.mimeType};base64,${image.base64}`;
    const extension = image.mimeType.split('/')[1] || 'png';
    link.download = `generated-image-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyPrompt = (promptText: string, messageId: number) => {
    navigator.clipboard.writeText(promptText).then(() => {
        setCopiedMessageId(messageId);
        setTimeout(() => setCopiedMessageId(null), 2000);
    }).catch(err => {
        console.error("Failed to copy text: ", err);
    });
  };

  const handleRefreshPrompt = async (messageToRefresh: Message) => {
    if (!messageToRefresh.originalPrompt || !messageToRefresh.originalImages) {
        console.error("Original prompt or images not found for refresh.");
        return;
    }

    setConversation(prev => prev.map(m => 
        m.id === messageToRefresh.id ? { ...m, isRefreshing: true } : m
    ));

    try {
        const imageFiles = await Promise.all(messageToRefresh.originalImages.map(file => convertFile(file)));
        const result = await regenerateDetailedPrompt(
            messageToRefresh.originalPrompt,
            messageToRefresh.text,
            imageFiles,
            selectedModelConfig
        );
        
        setConversation(prev => prev.map(m => 
            m.id === messageToRefresh.id 
                ? { ...m, text: result.prompt, intent: result.intent, isRefreshing: false } 
                : m
        ));
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during refresh.";
        setError(errorMessage);
        setConversation(prev => prev.map(m => 
            m.id === messageToRefresh.id ? { ...m, isRefreshing: false } : m
        ));
    }
  };


  const handleSendMessage = useCallback(async () => {
    const ideaIsBlank = idea.trim() === '';
    if (ideaIsBlank && (images.length === 0 || mode === 'create-image')) {
      setError("Please provide an idea.");
      return;
    }
    if (mode === 'prompt-engineer' && ideaIsBlank && images.length === 0) {
       setError("Please provide an idea or an image for prompt engineering.");
       return;
    }

    setError(null);
    setIsLoading(true);

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      text: idea,
      images: imagePreviews,
    };
    setConversation(prev => [...prev, userMessage]);
    
    // Clear inputs immediately for better UX
    const currentImages = [...images];
    const currentIdea = idea;
    const currentAspectRatio = aspectRatio;
    setIdea('');
    setImages([]);
    setImagePreviews([]);

    try {
      const imageFiles = await Promise.all(currentImages.map(file => convertFile(file)));
      let modelResponse: Omit<Message, 'id' | 'role'>;
      
      if (mode === 'prompt-engineer') {
        const result = await generateDetailedPrompt(currentIdea, imageFiles, selectedModelConfig);
        modelResponse = {
            text: result.prompt,
            intent: result.intent,
            originalPrompt: currentIdea,
            originalImages: currentImages,
        };
      } else if (mode === 'create-image') {
        const result = await generateImage(currentIdea, currentAspectRatio);
        modelResponse = {
            text: currentIdea,
            generatedImage: result,
        };
      } else { // ai-dialog
        if (!chatRef.current) throw new Error("Chat not initialized.");
        const resultText = await sendChatMessage(chatRef.current, currentIdea, imageFiles);
        modelResponse = { text: resultText };
      }

      setConversation(prev => [...prev, { id: Date.now() + 1, role: 'model', ...modelResponse }]);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(errorMessage);
       setConversation(prev => [...prev, { id: Date.now() + 1, role: 'model', text: `Maaf, terjadi kesalahan: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [idea, images, imagePreviews, convertFile, selectedModelConfig, mode, onUsePrompt, aspectRatio]);
  
  const canUpload = images.length < MAX_IMAGES && mode !== 'create-image';
  const isSendDisabled = isLoading || 
    (idea.trim() === '' && images.length === 0) ||
    (mode === 'create-image' && idea.trim() === '');


  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [idea]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-4 sm:p-6 md:p-8">
      <div ref={chatContainerRef} className="w-full max-w-4xl flex-grow flex flex-col min-h-0 overflow-y-auto mb-4 space-y-4">
        {conversation.map((msg) => (
          <div key={msg.id} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
             {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white flex-shrink-0"><SparklesIcon className="w-5 h-5"/></div>}
            <div className={`max-w-xl p-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
              {msg.images && msg.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {msg.images.map(src => <img key={src} src={src} className="w-16 h-16 rounded-md object-cover" alt="user upload preview"/>)}
                </div>
              )}
              {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
              
              {msg.generatedImage && (
                <div className="mt-2">
                    <img 
                        src={`data:${msg.generatedImage.mimeType};base64,${msg.generatedImage.base64}`} 
                        className="w-full rounded-lg object-cover" 
                        alt="generated by AI"
                    />
                     <button 
                      onClick={() => handleDownloadImage(msg.generatedImage!)}
                      className="mt-2 w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      <DownloadIcon className="w-4 h-4 mr-2" />
                      Unduh Gambar
                    </button>
                </div>
              )}

              {(msg.intent === 'IMAGE' || msg.intent === 'VIDEO') && msg.originalPrompt !== undefined && msg.originalImages !== undefined && (
                <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-start gap-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                        <button 
                            onClick={() => handleCopyPrompt(msg.text, msg.id)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-gray-300/50 dark:bg-gray-600/50 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            aria-label="Copy prompt"
                        >
                            {copiedMessageId === msg.id ? (
                                <CheckIcon className="w-4 h-4 text-green-500" />
                            ) : (
                                <ClipboardIcon className="w-4 h-4" />
                            )}
                            <span>{copiedMessageId === msg.id ? 'Disalin' : 'Salin'}</span>
                        </button>
                         <button 
                            onClick={() => handleRefreshPrompt(msg)}
                            disabled={msg.isRefreshing}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-gray-300/50 dark:bg-gray-600/50 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                            aria-label="Regenerate prompt"
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${msg.isRefreshing ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {msg.intent === 'IMAGE' && (
                        <button onClick={() => onUsePrompt(msg.text, msg.originalImages!, 'banana')} className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700">
                          Gunakan untuk Gambar (Banana)
                        </button>
                      )}
                      {msg.intent === 'VIDEO' && (
                        <button onClick={() => onUsePrompt(msg.text, msg.originalImages!, 'veo')} className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                          Gunakan untuk Video (Veo)
                        </button>
                      )}
                    </div>
                </div>
              )}
            </div>
             {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white font-bold flex-shrink-0">K</div>}
          </div>
        ))}
        {isLoading && (
            <div className="flex items-end gap-2 justify-start">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white flex-shrink-0"><SparklesIcon className="w-5 h-5"/></div>
                 <div className="max-w-xl p-3 rounded-2xl bg-gray-200 dark:bg-gray-700">
                    <div className="flex items-center justify-center gap-2">
                        <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></span>
                    </div>
                </div>
            </div>
        )}
      </div>
        
      <div className="w-full max-w-4xl flex-shrink-0">
        <div className="bg-white dark:bg-[#131314] rounded-2xl p-3 sm:p-4 border-2 border-gray-300 dark:border-gray-700">
            {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 px-1">
                    {imagePreviews.map((preview, index) => (
                    <div key={preview} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
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
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder={
                    mode === 'prompt-engineer' ? "Masukkan ide untuk prompt..." :
                    mode === 'create-image' ? "Jelaskan gambar yang ingin Anda buat..." :
                    "Tanyakan apa saja..."
                }
                className="w-full px-2 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 outline-none resize-none mb-3"
                rows={1}
                disabled={isLoading}
                style={{ maxHeight: '200px' }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                    }
                }}
            />
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50" aria-label="Upload Image" disabled={!canUpload}>
                        <PlusIcon className="w-6 h-6 text-gray-600 dark:text-gray-300"/>
                    </button>
                    <div className="flex items-center space-x-1 bg-gray-200 dark:bg-gray-700 rounded-full p-1">
                        <button 
                            onClick={() => handleModeChange('prompt-engineer')}
                            className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${mode === 'prompt-engineer' ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600'}`}
                        >
                            Prompt Engineer
                        </button>
                         <button 
                            onClick={() => handleModeChange('create-image')}
                            className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${mode === 'create-image' ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600'}`}
                        >
                            Create Image
                        </button>
                        <button
                            onClick={() => handleModeChange('ai-dialog')}
                            className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${mode === 'ai-dialog' ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600'}`}
                        >
                            Dialog AI
                        </button>
                    </div>
                    {mode === 'create-image' && (
                      <div className="flex items-center space-x-1 bg-gray-200 dark:bg-gray-700 rounded-full p-1 text-gray-600 dark:text-gray-300">
                          <button onClick={() => setAspectRatio('1:1')} className={`p-1.5 rounded-full transition-colors ${aspectRatio === '1:1' ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100' : 'hover:bg-white/50 dark:hover:bg-gray-600'}`} aria-label="Square ratio">
                              <SquareIcon className="w-5 h-5" />
                          </button>
                          <button onClick={() => setAspectRatio('16:9')} className={`p-1.5 rounded-full transition-colors ${aspectRatio === '16:9' ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100' : 'hover:bg-white/50 dark:hover:bg-gray-600'}`} aria-label="Landscape ratio">
                              <LandscapeIcon className="w-5 h-5" />
                          </button>
                          <button onClick={() => setAspectRatio('9:16')} className={`p-1.5 rounded-full transition-colors ${aspectRatio === '9:16' ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100' : 'hover:bg-white/50 dark:hover:bg-gray-600'}`} aria-label="Portrait ratio">
                              <PortraitIcon className="w-5 h-5" />
                          </button>
                      </div>
                    )}
                     <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple disabled={!canUpload} />
                </div>
                <button
                    onClick={handleSendMessage}
                    disabled={isSendDisabled}
                    className="p-3 rounded-full bg-gray-800 dark:bg-gray-200 hover:bg-gray-900 dark:hover:bg-white disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                    aria-label="Generate prompt"
                >
                    <PaperAirplaneIcon className="w-5 h-5 text-white dark:text-black" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};