import React from "react";

const Footer = () => {
  return (
    <footer className="border-t border-gray-200 py-6 px-4 text-center text-sm text-gray-600">
      <a
        href="https://www.netrelief.com"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center gap-2 hover:opacity-80 transition"
      >
        <span>Powered by</span>

        <img
          src="https://howardfarmblob.blob.core.windows.net/websiteimages/netrelief.png"
          alt="NetRelief"
          className="h-12 w-auto"
          loading="lazy"
        />
      </a>
    </footer>
  );
};

export default Footer;

