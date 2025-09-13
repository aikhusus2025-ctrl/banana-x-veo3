import React from 'react';

const FloatingImage = ({ src, className }: { src: string; className: string }) => (
    <div className={`absolute rounded-lg shadow-2xl overflow-hidden ${className}`}>
        <img src={src} alt="story illustration" className="w-full h-full object-cover" />
    </div>
);

export const StoryGeneratorSlide: React.FC = () => {
    const images = [
        { src: 'https://picsum.photos/seed/story1/200/200', className: 'top-[10%] left-[10%] w-24 h-24 rotate-[-15deg]' },
        { src: 'https://picsum.photos/seed/story2/200/200', className: 'top-[15%] right-[12%] w-28 h-28 rotate-[10deg]' },
        { src: 'https://picsum.photos/seed/story3/200/200', className: 'bottom-[12%] left-[18%] w-20 h-20 rotate-[8deg]' },
        { src: 'https://picsum.photos/seed/story4/200/200', className: 'bottom-[8%] right-[8%] w-24 h-24 rotate-[-12deg]' },
        { src: 'https://picsum.photos/seed/story5/200/200', className: 'top-[40%] left-[5%] w-16 h-16 rotate-[20deg] hidden sm:block' },
        { src: 'https://picsum.photos/seed/story6/200/200', className: 'bottom-[35%] right-[5%] w-20 h-20 rotate-[5deg] hidden sm:block' },
    ];

    return (
        <div className="w-full max-w-4xl mx-auto h-full flex items-center justify-center p-4">
            <div className="relative w-full h-full bg-gray-50 dark:bg-zinc-900 rounded-3xl shadow-lg border border-black/10 dark:border-white/10 flex flex-col items-center justify-center text-center p-4 sm:p-6 md:p-8 overflow-hidden">
                {images.map(img => <FloatingImage key={img.src} {...img} />)}

                <div className="relative z-10">
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">Create magic moments</h2>
                    <p className="text-gray-800/80 dark:text-white/80 text-lg mb-8">Wonderful illustrated stories all about your children</p>
                    <button className="bg-cyan-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-cyan-600 transition-all duration-300 transform hover:scale-105">
                        Start your adventure
                    </button>
                </div>
            </div>
        </div>
    );
};