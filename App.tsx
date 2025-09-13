import React, { useState, useEffect, useRef } from 'react';
import { VideoGeneratorSlide } from './components/slides/VideoGeneratorSlide';
import { ImageEditorSlide } from './components/slides/ImageEditorSlide';
import { AssistantSlide } from './components/slides/AssistantSlide';
import { MenuIcon, PencilSquareIcon, Cog6ToothIcon, SunIcon, MoonIcon, ChevronDownIcon, SparklesIcon, BananaIcon, VeoIcon, CheckIcon, ChatBubbleLeftRightIcon, EllipsisHorizontalIcon, ShareIcon, BookmarkSquareIcon, PencilIcon, TrashIcon, XMarkIcon } from './components/Icons';
import { FileConversionResult, ModelConfig } from './types';

// --- Model Configurations ---
const modelConfigs: ModelConfig[] = [
  { id: 'flash-balanced', name: '2.5 flash', description: 'Model yang seimbang untuk sebagian besar tugas.', modelId: 'gemini-2.5-flash', config: { temperature: 0.7 } },
  { id: 'flash-creative', name: '2.5 flash (Creative)', description: 'Untuk tugas yang membutuhkan lebih banyak imajinasi.', modelId: 'gemini-2.5-flash', config: { temperature: 1.0 } },
];

// --- History Item Type ---
interface HistoryItem {
  id: number;
  text: string;
  pinned: boolean;
}

// --- Sidebar Component ---
interface SidebarProps {
  theme: string;
  toggleTheme: () => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  activeView: string;
  setActiveView: (view: 'banana' | 'veo' | 'assistant') => void;
  onNewTopic: () => void;
  historyItems: HistoryItem[];
  onShare: (text: string) => void;
  onPin: (id: number) => void;
  onRename: (id: number) => void;
  onDelete: (id: number) => void;
}

const Sidebar: React.FC<SidebarProps> = 
({ theme, toggleTheme, isSidebarOpen, setSidebarOpen, activeView, setActiveView, onNewTopic, historyItems, onShare, onPin, onRename, onDelete }) => {
  
  const [openHistoryMenu, setOpenHistoryMenu] = useState<number | null>(null);
  const historyMenuRef = useRef<HTMLDivElement>(null);
  
  const navItemClasses = "w-full flex items-center mt-2 p-2 rounded-lg text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors duration-200";
  const activeNavItemClasses = "bg-blue-100 dark:bg-gray-700";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (historyMenuRef.current && !historyMenuRef.current.contains(event.target as Node)) {
            setOpenHistoryMenu(null);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`flex flex-col justify-between bg-gray-100 dark:bg-[#1e1f20] p-2 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-16'}`}>
      <div>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
          <MenuIcon className="w-6 h-6" />
        </button>
        <button onClick={onNewTopic} className="w-full flex items-center mt-4 p-2 rounded-lg text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-gray-700">
          <PencilSquareIcon className="w-6 h-6" />
          {isSidebarOpen && <span className="ml-4 font-semibold">New Topic</span>}
        </button>
        <button onClick={() => setActiveView('assistant')} className={`${navItemClasses} ${activeView === 'assistant' ? activeNavItemClasses : ''}`}>
          <SparklesIcon className="w-6 h-6 text-purple-500" />
          {isSidebarOpen && <span className="ml-4 font-semibold">Prompt Assistant</span>}
        </button>
        <button onClick={() => setActiveView('banana')} className={`${navItemClasses} ${activeView === 'banana' ? activeNavItemClasses : ''}`}>
          <BananaIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          {isSidebarOpen && <span className="ml-4 font-semibold">Banana</span>}
        </button>
        <button onClick={() => setActiveView('veo')} className={`${navItemClasses} ${activeView === 'veo' ? activeNavItemClasses : ''}`}>
          <VeoIcon className="w-6 h-6" />
          {isSidebarOpen && <span className="ml-4 font-semibold">Veo 3</span>}
        </button>
         {isSidebarOpen && (
          <div className="mt-6">
            <span className="px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Riwayat</span>
            <div className="mt-2 space-y-1">
              {historyItems.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).map((item) => (
                <div key={item.id} className="relative group">
                  <div className="w-full flex items-center justify-between p-2 rounded-lg text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 text-left cursor-pointer">
                    <div className="flex items-center truncate">
                      <ChatBubbleLeftRightIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                      <span className="truncate text-sm">{item.text}</span>
                      {item.pinned && <BookmarkSquareIcon className="w-4 h-4 ml-2 text-blue-500 flex-shrink-0" />}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setOpenHistoryMenu(openHistoryMenu === item.id ? null : item.id); }}
                      className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-300 dark:hover:bg-gray-600 focus:opacity-100"
                      aria-label="More options"
                    >
                      <EllipsisHorizontalIcon className="w-5 h-5" />
                    </button>
                  </div>
                  {openHistoryMenu === item.id && (
                    <div ref={historyMenuRef} className="absolute z-20 right-0 -mt-2 w-48 bg-white dark:bg-[#2d2e30] rounded-md border border-gray-200 dark:border-gray-700">
                      <ul className="py-1">
                        <li><button onClick={() => { onShare(item.text); setOpenHistoryMenu(null); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"><ShareIcon className="w-4 h-4 mr-3"/> Bagikan</button></li>
                        <li><button onClick={() => { onPin(item.id); setOpenHistoryMenu(null); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"><BookmarkSquareIcon className="w-4 h-4 mr-3"/> {item.pinned ? 'Batal Sematkan' : 'Sematkan'}</button></li>
                        <li><button onClick={() => { onRename(item.id); setOpenHistoryMenu(null); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"><PencilIcon className="w-4 h-4 mr-3"/> Ubah nama</button></li>
                        <li><button onClick={() => { onDelete(item.id); setOpenHistoryMenu(null); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600"><TrashIcon className="w-4 h-4 mr-3"/> Hapus</button></li>
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col items-center">
         <button
            onClick={toggleTheme}
            className="w-full flex items-center p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <SunIcon className="w-6 h-6 text-white/80" /> : <MoonIcon className="w-6 h-6 text-gray-800" />}
          {isSidebarOpen && <span className="ml-4">Switch Theme</span>}
        </button>
        <button className="w-full flex items-center p-2 mt-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
          <Cog6ToothIcon className="w-6 h-6" />
          {isSidebarOpen && <span className="ml-4">Settings</span>}
        </button>
      </div>
    </div>
  );
};

// --- Header Component ---
interface HeaderProps {
  selectedModelConfig: ModelConfig;
  onModelChange: (config: ModelConfig) => void;
}
const Header: React.FC<HeaderProps> = ({ selectedModelConfig, onModelChange }) => {
  const [isModelDropdownOpen, setModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const handleModelSelect = (model: ModelConfig) => {
    onModelChange(model);
    setModelDropdownOpen(false);
  };

  return (
    <header className="flex items-center justify-between p-2 flex-shrink-0">
      <div className="relative" ref={dropdownRef}>
        <button 
            onClick={() => setModelDropdownOpen(!isModelDropdownOpen)} 
            className="flex items-center p-1 px-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Select model"
            aria-haspopup="true"
            aria-expanded={isModelDropdownOpen}
        >
          <div className="flex flex-col items-start leading-tight">
            <h1 className="text-lg font-medium">Gemini</h1>
            <div className="flex items-center space-x-1">
               <div className="bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-0.5">
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{selectedModelConfig.name}</span>
               </div>
               <ChevronDownIcon className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </button>
        {isModelDropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-[#2d2e30] rounded-lg border border-gray-200 dark:border-gray-700 z-50">
            <div className="p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 px-2 pb-1">Pilih model</p>
              {modelConfigs.map(model => (
                <button key={model.id} onClick={() => handleModelSelect(model)} className="w-full text-left p-2 flex items-start rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <div className="flex-shrink-0 w-5 pt-1">
                    {model.id === selectedModelConfig.id && <CheckIcon className="w-5 h-5 text-blue-500" />}
                  </div>
                  <div className="ml-2">
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{model.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{model.description}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 p-2">
               <button className="w-full text-left p-2 flex items-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Cog6ToothIcon className="w-5 h-5 mr-3 text-gray-600 dark:text-gray-400"/>
                  <span className="text-sm font-medium">Setelan model</span>
               </button>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <button className="flex items-center space-x-2 bg-gray-200 dark:bg-gray-700/50 hover:bg-gray-300 dark:hover:bg-gray-700 text-sm font-semibold py-1.5 px-3 rounded-lg">
           <SparklesIcon className="w-4 h-4 text-purple-500" />
           <span>Upgrade ke Google AI Plus</span>
        </button>
        <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white font-bold">
          K
        </div>
      </div>
    </header>
  );
}


const App: React.FC = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<'banana' | 'veo' | 'assistant'>('assistant');
  const [topicKey, setTopicKey] = useState(0);
  const [sharedImageForVideo, setSharedImageForVideo] = useState<FileConversionResult | null>(null);
  const [sharedPrompt, setSharedPrompt] = useState<string | null>(null);
  const [sharedImages, setSharedImages] = useState<File[] | null>(null);
  const [selectedModelConfig, setSelectedModelConfig] = useState<ModelConfig>(modelConfigs[0]);

  // --- History State & Modals ---
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [itemToEdit, setItemToEdit] = useState<HistoryItem | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [showShareNotification, setShowShareNotification] = useState(false);
  const notificationTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };
  
  const handleShareHistoryItem = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      setShowShareNotification(true);
      notificationTimeoutRef.current = window.setTimeout(() => {
        setShowShareNotification(false);
      }, 3000);
    }).catch(err => {
      console.error("Gagal menyalin teks: ", err);
    });
  };

  const handlePinHistoryItem = (id: number) => {
    setHistoryItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, pinned: !item.pinned } : item
      )
    );
  };

  const handleRenameRequest = (id: number) => {
    const item = historyItems.find(item => item.id === id);
    if (item) {
      setItemToEdit(item);
      setRenameValue(item.text);
      setIsRenameModalOpen(true);
    }
  };

  const confirmRename = () => {
    if (itemToEdit && renameValue.trim() !== "") {
      setHistoryItems(prevItems =>
        prevItems.map(item =>
          item.id === itemToEdit.id ? { ...item, text: renameValue.trim() } : item
        )
      );
    }
    setIsRenameModalOpen(false);
    setItemToEdit(null);
  };

  const handleDeleteRequest = (id: number) => {
    const item = historyItems.find(item => item.id === id);
    if (item) {
      setItemToEdit(item);
      setIsDeleteModalOpen(true);
    }
  };

  const confirmDelete = () => {
    if (itemToEdit) {
      setHistoryItems(prevItems => prevItems.filter(item => item.id !== itemToEdit.id));
    }
    setIsDeleteModalOpen(false);
    setItemToEdit(null);
  };

  const handleNewTopic = () => {
    setSharedImageForVideo(null);
    setSharedPrompt(null);
    setSharedImages(null);
    setTopicKey(prev => prev + 1);
  };

  const handleUseForVideo = (image: FileConversionResult) => {
    setSharedImageForVideo(image);
    setActiveView('veo');
  };

  const handleUsePrompt = (prompt: string, images: File[], targetView: 'banana' | 'veo') => {
    setSharedImages(images);
    if (targetView === 'banana') {
      setSharedPrompt(prompt);
    } else {
      setSharedPrompt(null);
    }
    setActiveView(targetView);
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'banana':
        return (
          <ImageEditorSlide 
            key={`image-${topicKey}`} 
            onUseForVideo={handleUseForVideo} 
            sharedPrompt={sharedPrompt}
            clearSharedPrompt={() => setSharedPrompt(null)}
            sharedImages={sharedImages}
            clearSharedImages={() => setSharedImages(null)}
            selectedModelConfig={selectedModelConfig}
          />
        );
      case 'veo':
        return (
          <VideoGeneratorSlide 
            key={`video-${topicKey}`}
            sharedImage={sharedImageForVideo}
            clearSharedImage={() => setSharedImageForVideo(null)}
            sharedPrompt={sharedPrompt}
            clearSharedPrompt={() => setSharedPrompt(null)}
            sharedImages={sharedImages}
            clearSharedImages={() => setSharedImages(null)}
            selectedModelConfig={selectedModelConfig}
          />
        );
      case 'assistant':
         return (
          <AssistantSlide
            key={`assistant-${topicKey}`}
            onUsePrompt={handleUsePrompt}
            selectedModelConfig={selectedModelConfig}
          />
         );
      default:
        return null;
    }
  };

  return (
    <div className="flex w-full h-screen overflow-hidden">
      <Sidebar 
        theme={theme} 
        toggleTheme={toggleTheme} 
        isSidebarOpen={isSidebarOpen} 
        setSidebarOpen={setSidebarOpen}
        activeView={activeView}
        setActiveView={setActiveView}
        onNewTopic={handleNewTopic}
        historyItems={historyItems}
        onShare={handleShareHistoryItem}
        onPin={handlePinHistoryItem}
        onRename={handleRenameRequest}
        onDelete={handleDeleteRequest}
      />
      
      <main className="flex-grow flex flex-col relative bg-white dark:bg-[#131314]">
        <Header selectedModelConfig={selectedModelConfig} onModelChange={setSelectedModelConfig} />
        <div className="flex-grow flex flex-col items-center justify-center relative overflow-y-auto">
           {renderActiveView()}
        </div>
      </main>

      {/* Rename Modal */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-[#2d2e30] rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Ubah nama Riwayat</h2>
            <input 
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-6 flex justify-end space-x-2">
              <button onClick={() => setIsRenameModalOpen(false)} className="px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Batal</button>
              <button onClick={confirmRename} className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-[#2d2e30] rounded-lg p-6 w-full max-w-sm">
                <h2 className="text-lg font-semibold mb-2">Hapus Riwayat?</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Apakah Anda yakin ingin menghapus "<span className="font-medium">{itemToEdit?.text}</span>"? Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="mt-6 flex justify-end space-x-2">
                    <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Batal</button>
                    <button onClick={confirmDelete} className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700">Hapus</button>
                </div>
            </div>
         </div>
      )}

      {/* Share Notification */}
      <div 
        className={`fixed bottom-5 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full transition-opacity duration-300 ${showShareNotification ? 'opacity-100' : 'opacity-0'}`}
        style={{ pointerEvents: showShareNotification ? 'auto' : 'none' }}
      >
        Teks riwayat disalin ke clipboard!
      </div>
    </div>
  );
};

export default App;