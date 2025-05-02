import React, { useState, useEffect, useRef } from "react";
import { Product } from "./StorePage";
import CartCard from "./CartCard";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { apiBaseUrl } from "../config";


interface Props {
  cart: Product[];
  setCart: React.Dispatch<React.SetStateAction<Product[]>>;
  user?: any;
  setPage?: (page: string) => void;
  setLastOrder?: (order: any) => void;
}

const ShoppingCart: React.FC<Props> = ({ cart, setCart, user, setPage, setLastOrder }) => {
  const [shipping, setShipping] = useState({
    fullName: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    email: "",
    phone: "",
  });

  const [streetInput, setStreetInput] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [sessionToken, setSessionToken] = useState<google.maps.places.AutocompleteSessionToken | null>(null);
  const [useAccountAddress, setUseAccountAddress] = useState(!!user);
  const [userTyping, setUserTyping] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [selectedShippingOption, setSelectedShippingOption] = useState("local");
  const [shippingCost, setShippingCost] = useState(0);

  const stripe = useStripe();
  const elements = useElements();
  const streetInputRef = useRef<HTMLInputElement>(null);

  // Create autocompleteService and sessionToken when Google Maps is loaded
useEffect(() => {
  if ((window as any).google) {
    setAutocompleteService(new google.maps.places.AutocompleteService());
    setSessionToken(new google.maps.places.AutocompleteSessionToken());
  }
}, []);

// Fetch predictions when user types
useEffect(() => {
  if (autocompleteService && streetInput.length > 2 && sessionToken && userTyping) {
    autocompleteService.getPlacePredictions(
      { input: streetInput, sessionToken },
      (predictions) => setSuggestions(predictions || [])
    );
  } else {
    setSuggestions([]);
  }
}, [streetInput, autocompleteService, sessionToken, userTyping]);


  useEffect(() => {
    const fetchRates = async () => {
      if (!shipping.street || !shipping.city || !shipping.state || !shipping.zip || cart.length === 0) return;

      try {
        const res = await fetch(`${apiBaseUrl}/api/shipping/rates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            street: shipping.street,
            city: shipping.city,
            state: shipping.state,
            zip: shipping.zip,
            cartItems: cart.map(p => ({
              productId: p.productId,
              quantity: p.quantityInCart,
              weight: p.weight,
              length: p.length,
              width: p.width,
              height: p.height,
            })),
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setShippingOptions(data);
        } else {
          console.warn("Shipping rates fetch failed:", data.error);
          setShippingOptions([]);
        }
      } catch (err) {
        console.error("Error fetching rates:", err);
        setShippingOptions([]);
      }
    };

    fetchRates();
  }, [shipping.street, shipping.city, shipping.state, shipping.zip, cart]);

  useEffect(() => {
    if (user && useAccountAddress) {
      setShipping({
        fullName: user.name || "",
        street: user.street || "",
        city: user.city || "",
        state: user.state || "",
        zip: user.zip || "",
        email: user.email || "",
        phone: user.phone || "",
      });
      setStreetInput(user.street || "");
    } else if (!useAccountAddress) {
      setShipping({
        fullName: "",
        street: "",
        city: "",
        state: "",
        zip: "",
        email: user?.email || "",
        phone: "",
      });
      setStreetInput("");
    }
  }, [user, useAccountAddress]);

  

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "street") setStreetInput(value);
    setShipping((prev) => ({ ...prev, [name]: value }));
  };

  const removeFromCart = (product: Product) => {
    setCart((prev) => prev.filter((item) => item.name !== product.name));
  };

  const decreaseCartQuantity = (product: Product) => {
    setCart((prev) =>
      prev.reduce<Product[]>((acc, item) => {
        if (item.name === product.name && item.quantityInCart > 1) {
          acc.push({ ...item, quantityInCart: item.quantityInCart - 1 });
        } else if (item.name !== product.name) {
          acc.push(item);
        }
        return acc;
      }, [])
    );
  };

  const increaseCartQuantity = (product: Product) => {
    setCart((prev) =>
      prev.map((item) =>
        item.name === product.name
          ? { ...item, quantityInCart: item.quantityInCart + 1 }
          : item
      )
    );
  };

  const totalAmount = cart.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantityInCart || 1),
    0
  );

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const validationRes = await fetch(`${apiBaseUrl}/api/shipping/validate-address`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          street: shipping.street,
          city: shipping.city,
          state: shipping.state,
          zip: shipping.zip,
        }),
      });

      if (!validationRes.ok) {
        const { message } = await validationRes.json();
        alert(`⚠️ Address validation failed: ${message}`);
        setLoading(false);
        return;
      }

      if (!stripe || !elements) return alert("Stripe not loaded");

      const paymentRes = await fetch(`${apiBaseUrl}/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Math.round((totalAmount + shippingCost) * 100) }),
      });

      const { clientSecret } = await paymentRes.json();

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            name: shipping.fullName,
            email: shipping.email,
          },
        },
      });

      if (result.error) return alert(result.error.message);
      if (result.paymentIntent.status !== "succeeded") return alert("Payment did not complete.");

      const orderRes = await fetch(`${apiBaseUrl}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingInfo: shipping,
          cartItems: cart.map((p) => ({
            productId: p.productId,
            quantity: p.quantityInCart,
            price: p.price,
          })),
          shippingMethod: selectedShippingOption === "local"
            ? "Local Pickup"
            : shippingOptions.find(r => r.rate_id === selectedShippingOption)?.service || "Unknown",
          shippingCost,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Order failed");

      setSuccess(true);
      setCart([]);
      setLastOrder?.(orderData);
      setPage?.("Confirmation");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-3xl font-bold mb-6 text-center">Shopping Cart</h2>

      {success ? (
        <div className="p-8 text-center">
          <h2 className="text-2xl text-green-600 font-semibold mb-2">✅ Thank you for your order!</h2>
          <p>You’ll receive a confirmation email shortly.</p>
        </div>
      ) : cart.length === 0 ? (
        <p className="text-center">Your cart is empty.</p>
      ) : (
        <>
          <div className="space-y-4">
            {cart.map((product) => (
              <CartCard
                key={product.name}
                product={product}
                removeFromCart={() => removeFromCart(product)}
                decreaseCartQuantity={() => decreaseCartQuantity(product)}
                increaseCartQuantity={() => increaseCartQuantity(product)}
              />
            ))}
          </div>

          <h3 className="text-xl font-medium mt-6 mb-2 text-center">
            Subtotal: ${totalAmount.toFixed(2)}<br />
            Shipping: ${shippingCost.toFixed(2)}<br />
            <span className="text-2xl font-bold">Total: ${(totalAmount + shippingCost).toFixed(2)}</span>
          </h3>

          <h3 className="text-2xl font-bold mt-10 mb-2 text-center">Shipping Information</h3>

          {!user && (
            <div className="text-center text-sm text-gray-700 mb-4">
              You are checking out as a <strong>guest</strong>.{" "}
              <button
                className="text-blue-600 underline"
                onClick={() => setPage?.("CreateAccount")}
              >
                Create an account
              </button>{" "}
              to save your info for next time.
            </div>
          )}

          {user && (
            <label className="block mb-4 text-center">
              <input
                type="checkbox"
                className="mr-2"
                checked={useAccountAddress}
                onChange={(e) => setUseAccountAddress(e.target.checked)}
              />
              Use saved address from my account
            </label>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="fullName"
              placeholder="Full Name"
              value={shipping.fullName}
              onChange={handleChange}
              required
              className="border rounded p-2"
              disabled={user && useAccountAddress}
            />

<div className="relative">
  <form autoComplete="off">
    <input
      ref={streetInputRef}
      name="nope-street-autofill"
      autoComplete="new-password" // "off" sometimes ignored — "new-password" works better
      placeholder="Street Address"
      value={streetInput}
      onChange={(e) => {
        setUserTyping(true);
        setStreetInput(e.target.value);
      }}
      disabled={user && useAccountAddress}
      required
      className={`border rounded p-2 w-full ${user && useAccountAddress ? "bg-gray-100 cursor-not-allowed" : ""}`}
    />
  </form>

  {suggestions.length > 0 && (
    <ul className="absolute bg-white border rounded mt-1 w-full shadow-lg z-10">
      {suggestions.map((s) => (
        <li
        key={s.place_id}
        className="p-2 hover:bg-gray-100 cursor-pointer"
        onMouseDown={(e) => {
          e.preventDefault(); // ✅ Prevents blur
      
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ placeId: s.place_id }, (results, status) => {
            if (status === "OK" && results && results.length > 0) {
              const address = results[0].address_components;
              const get = (type: string) => address.find((a) => a.types.includes(type))?.long_name || "";
      
              const parsedStreet = `${get("street_number")} ${get("route")}`.trim();
      
              setShipping((prev) => ({
                ...prev,
                street: parsedStreet,
                city: get("locality") || get("sublocality") || "",
                state: get("administrative_area_level_1"),
                zip: get("postal_code"),
              }));
      
              setStreetInput(parsedStreet);
              setUserTyping(false);
      
              // ✅ Delay clearing suggestions to allow React to update first
              setTimeout(() => setSuggestions([]), 200);
            }
          });
        }}
      >
        {s.description}
      </li>
      
      ))}
    </ul>
  )}
</div>


            <input
              name="city"
              placeholder="City"
              value={shipping.city}
              onChange={handleChange}
              required
              className="border rounded p-2"
              disabled={user && useAccountAddress}
            />
            <input
              name="state"
              placeholder="State"
              value={shipping.state}
              onChange={handleChange}
              required
              className="border rounded p-2"
              disabled={user && useAccountAddress}
            />
            <input
              name="zip"
              placeholder="Zip Code"
              value={shipping.zip}
              onChange={handleChange}
              required
              className="border rounded p-2"
              disabled={user && useAccountAddress}
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={shipping.email}
              onChange={handleChange}
              required
              className="border rounded p-2"
              disabled={user && useAccountAddress}
            />
            <input
              name="phone"
              placeholder="Phone Number"
              value={shipping.phone}
              onChange={handleChange}
              required
              className="border rounded p-2"
              disabled={user && useAccountAddress}
            />
          </div>

          <div className="my-6">
            <label className="block mb-2 font-medium">Shipping Method</label>
            <select
              className="border rounded p-2 w-full"
              value={selectedShippingOption}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedShippingOption(value);
                if (value === "local") {
                  setShippingCost(0);
                } else {
                  const selected = shippingOptions.find(r => r.rate_id === value);
                  setShippingCost(selected?.rate || 0);
                }
              }}
            >
              <option value="">Select a shipping option...</option>
              <option value="local">🚜 Free Local Pickup ($0)</option>
              {shippingOptions.map((rate) => (
                <option key={rate.rate_id} value={rate.rate_id}>
                  🚚 {rate.carrier} {rate.service} – ${rate.rate.toFixed(2)}
                  {rate.delivery_days ? ` (${rate.delivery_days}d)` : ""}
                </option>
              ))}
            </select>
          </div>

          <h3 className="text-2xl font-bold mt-10 mb-4 text-center">Payment</h3>
          <div className="border p-4 rounded mb-6">
            <CardElement />
          </div>

          <button
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading ? "Processing..." : "Submit Order"}
          </button>
        </>
      )}
    </div>
  );
};

export default ShoppingCart;







