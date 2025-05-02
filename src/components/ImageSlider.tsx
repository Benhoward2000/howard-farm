import React, { useState } from "react";
import { Slide } from "./HomePage";

interface Props {
  slides: Slide[];
}

const ImageSlider: React.FC<Props> = ({ slides }) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? slides.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === slides.length - 1 ? 0 : prevIndex + 1
    );
  };

  return (
    <div className="relative w-full h-80 md:h-[28rem] lg:h-[32rem] overflow-hidden group">
      {/* Image */}
      <img
        src={slides[currentIndex].url}
        alt={slides[currentIndex].alt}
        className="w-full h-full object-cover transition duration-700 ease-in-out"
      />

      {/* Left Arrow */}
      <button
        onClick={goToPrevious}
        className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-white bg-opacity-60 text-[#4a3a28] hover:bg-opacity-90 rounded-full w-10 h-10 flex items-center justify-center text-xl transition"
        aria-label="Previous Slide"
      >
        ❰
      </button>

      {/* Right Arrow */}
      <button
        onClick={goToNext}
        className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-white bg-opacity-60 text-[#4a3a28] hover:bg-opacity-90 rounded-full w-10 h-10 flex items-center justify-center text-xl transition"
        aria-label="Next Slide"
      >
        ❱
      </button>
    </div>
  );
};

export default ImageSlider;


