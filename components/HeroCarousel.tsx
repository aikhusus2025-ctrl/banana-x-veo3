import React, { useCallback } from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from './Icons';

interface HeroCarouselProps {
  slides: React.ReactNode[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
}

const HeroCarousel: React.FC<HeroCarouselProps> = ({ slides, currentIndex, setCurrentIndex }) => {

  const goToPrevious = useCallback(() => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? slides.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  }, [currentIndex, slides.length, setCurrentIndex]);

  const goToNext = useCallback(() => {
    const isLastSlide = currentIndex === slides.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  }, [currentIndex, slides.length, setCurrentIndex]);

  const goToSlide = (slideIndex: number) => {
    setCurrentIndex(slideIndex);
  };

  return (
    <div className="w-full max-w-7xl h-full mx-auto flex flex-col items-center justify-center">
      <div className="relative w-full h-full perspective-1000">
        {slides.map((slide, index) => {
            const offset = index - currentIndex;
            const transform = `translateX(${offset * 105}%)`;
            const opacity = Math.abs(offset) > 0 ? 0 : 1;
            const pointerEvents = Math.abs(offset) > 0 ? 'none' : 'auto';

            return (
                <div
                    key={index}
                    className="absolute w-full h-full transition-all duration-500 ease-out"
                    style={{
                        transform,
                        opacity,
                        pointerEvents,
                    }}
                >
                    {slide}
                </div>
            )
        })}
      </div>
      
      <div className="flex items-center justify-center mt-6 space-x-6 z-20">
        <button
          onClick={goToPrevious}
          className="p-3 bg-white/50 dark:bg-black/50 rounded-full hover:bg-white/60 dark:hover:bg-black/60 transition-colors duration-300 backdrop-blur-sm border border-black/20 dark:border-white/20"
          aria-label="Previous slide"
        >
          <ArrowLeftIcon className="w-6 h-6 text-gray-800 dark:text-white" />
        </button>

        <div className="flex items-center justify-center space-x-2">
          {slides.map((_, slideIndex) => (
            <button
              key={slideIndex}
              onClick={() => goToSlide(slideIndex)}
              className={`transition-all duration-300 rounded-full ${currentIndex === slideIndex ? 'w-6 h-2 bg-gray-800 dark:bg-white' : 'w-2 h-2 bg-gray-800/50 dark:bg-white/50 hover:bg-gray-800/75 dark:hover:bg-white/75'}`}
              aria-label={`Go to slide ${slideIndex + 1}`}
            />
          ))}
        </div>

        <button
          onClick={goToNext}
          className="p-3 bg-white/50 dark:bg-black/50 rounded-full hover:bg-white/60 dark:hover:bg-black/60 transition-colors duration-300 backdrop-blur-sm border border-black/20 dark:border-white/20"
          aria-label="Next slide"
        >
          <ArrowRightIcon className="w-6 h-6 text-gray-800 dark:text-white" />
        </button>
      </div>
    </div>
  );
};

export default HeroCarousel;