import React from "react";
import { Helmet } from "react-helmet-async";
import ImageSlider from "./ImageSlider";

export interface Slide {
  url: string;
  alt: string;
}

interface Props {
  setPage: (page: string) => void;
}

const HomePage: React.FC<Props> = ({ setPage }) => {
  const slides: Slide[] = [
    {
      url: "https://howardfarmblob.blob.core.windows.net/websiteimages/hero.jpg",
      alt: "Scenic view of the farm in the morning",
    },
    {
      url: "https://howardfarmblob.blob.core.windows.net/websiteimages/home.jpg",
      alt: "Exterior view of the farmhouse",
    },
    {
      url: "https://howardfarmblob.blob.core.windows.net/websiteimages/produce.jpg",
      alt: "Fresh produce harvested from the farm",
    },
    {
      url: "https://howardfarmblob.blob.core.windows.net/websiteimages/Tomatoes.jpg",
      alt: "Freshly picked tomatoes from the field",
    },
    {
      url: "https://howardfarmblob.blob.core.windows.net/websiteimages/peppers.jpg",
      alt: "Colorful peppers grown at Howard Farm",
    },
    {
      url: "https://howardfarmblob.blob.core.windows.net/websiteimages/dogs.jpg",
      alt: "The farm dogs relaxing near the barn",
    },
    {
      url: "https://howardfarmblob.blob.core.windows.net/websiteimages/peacock.jpg",
      alt: "A peacock wandering around the farm",
    },
  ];

  return (
    <div className="w-full bg-[#fdfcf9]">
      <Helmet>
        <title>
          Howard's Farm | Handmade Jams, Salsa, BBQ Sauce & Eggs – Saint Helens, Oregon
        </title>
        <meta
          name="description"
          content="Discover Howard's Farm in Saint Helens, Oregon. We offer small-batch jams, salsas, BBQ sauces, hot sauces, and farm-fresh eggs with local pickup or shipping."
        />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="rounded-2xl overflow-hidden shadow-lg mb-10">
          <ImageSlider slides={slides} />
        </div>

        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-extrabold text-[#4a3a28] mb-4">
            Welcome to Howard Farm
          </h2>
          <p className="text-lg leading-relaxed text-[#4a3a28] mb-6">
            Since 2022, we've been dedicated to growing fresh, quality produce and sharing the
            flavors of our heritage with our community. At Howard Farm, we not only cultivate our
            own fruits, vegetables, and herbs, but we also use them to create delicious, homemade
            recipes inspired by a lineage of skilled chefs and cooks in our family. Each product we
            offer is crafted with care, combining generations of culinary expertise with the
            freshest ingredients straight from our fields.
          </p>
          <button
            onClick={() => setPage("Shop")}
            className="bg-[#a8936a] hover:bg-[#967f55] text-white text-lg font-semibold py-3 px-6 rounded-full transition duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#4a3a28] focus:ring-offset-2"
          >
            Go to Shop →
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;





