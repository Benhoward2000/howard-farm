// config.ts

const apiBaseUrl =
  process.env.NODE_ENV === "production"
    ? "https://app.howardsfarm.org"
    : process.env.REACT_APP_API_URL || "http://localhost:8080";

const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY as string;
const stripePublishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY as string;

if (!apiBaseUrl || !googleMapsApiKey || !stripePublishableKey) {
  console.warn("⚠️ One or more environment variables are missing in config.ts");
}

export {
  apiBaseUrl,
  googleMapsApiKey,
  stripePublishableKey,
};




