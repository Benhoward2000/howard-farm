// config.ts

const apiBaseUrl = process.env.REACT_APP_API_URL as string;
const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY as string;
const stripePublishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY as string;

if (!apiBaseUrl || !googleMapsApiKey || !stripePublishableKey) {
  console.warn("⚠️ One or more environment variables are missing in config.ts");
}

export {
  apiBaseUrl,
  googleMapsApiKey,
  stripePublishableKey
};



