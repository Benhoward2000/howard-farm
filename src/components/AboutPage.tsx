import React from "react";

const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 text-gray-700 text-lg leading-relaxed">
      <h2 className="text-4xl font-extrabold mb-8 text-center text-gray-900">
        Our Story
      </h2>

      <p className="mb-6">
        At <span className="font-semibold text-gray-900">Howard's Farm</span>, cooking isn’t just a passion—it’s a part of our heritage.
      </p>

      <div className="overflow-hidden rounded-lg shadow-lg mb-8">
        <img
          src="https://howardfarmblob.blob.core.windows.net/websiteimages/MostlyMexican.JPG"
          alt="Mostly Mexican Restaurant Ad"
          className="w-full transform transition-transform duration-500 hover:scale-105"
        />
      </div>

      <p className="mb-6">
        My wife and I both grew up surrounded by the warmth of home-cooked meals and the joy of sharing them with others.
        With her Spanish roots, she was raised on the tradition of making Mexican dishes from scratch—every meal filled with love, flavor, and family.
        Early in our relationship, we found ourselves working side-by-side in my mom’s restaurant,{" "}
        <span className="font-semibold text-gray-900">Mostly Mexican</span>, in Lafayette, Colorado—a cozy spot known for authentic dishes and a welcoming atmosphere.
      </p>

      <div className="overflow-hidden rounded-lg shadow-lg mb-8">
        <img
          src="https://howardfarmblob.blob.core.windows.net/websiteimages/bbqcontest1.jpg"
          alt="Family at BBQ Competition"
          className="w-full transform transition-transform duration-500 hover:scale-105"
        />
      </div>

      <p className="mb-6">
        Food runs deep in our family. My mom owned and ran the restaurant, and my dad was a true barbecue enthusiast.
        We spent years traveling the country together, competing in BBQ contests big and small—including the incredible opportunity to compete at the
        <span className="font-semibold text-gray-900"> Jack Daniel’s World Championship Invitational</span> in 2012.
      </p>

      <div className="overflow-hidden rounded-lg shadow-lg mb-8">
        <img
          src="https://howardfarmblob.blob.core.windows.net/websiteimages/TheJack.jpg"
          alt="Jack Daniel's Competition - The Smoke Ring Team"
          className="w-full transform transition-transform duration-500 hover:scale-105"
        />
      </div>

      <p className="mb-6">
        Beyond competitions, my dad also created and ran{" "}
        <span className="font-semibold text-gray-900">TheSmokeRing.com</span>, one of the internet’s largest BBQ communities and knowledge hubs.
        From smoker builds to rub recipes, it was a gathering place for pitmasters everywhere.
      </p>

      <div className="overflow-hidden rounded-lg shadow mb-8">
        <img
          src="https://howardfarmblob.blob.core.windows.net/websiteimages/SmokeRingLogo.jpg"
          alt="The Smoke Ring Logo"
          className="w-full transform transition-transform duration-500 hover:scale-105"
        />
      </div>

      <p className="mb-6">
        Though he’s now retired, his passion and influence continue to inspire us.
        Over the years, we’ve poured ourselves into perfecting our recipes, experimenting with sauces, spices, baking, and slow-smoked barbecue.
        <span className="font-semibold text-gray-900"> Howard’s Farm</span> is our way of sharing that journey with you—every jar, bottle, or batch is a reflection of the traditions we grew up with and the flavors we love.
      </p>

      <p className="text-center text-xl font-medium text-gray-800 mt-10">
        Thank you for being part of our journey!
      </p>
    </div>
  );
};

export default AboutPage;



