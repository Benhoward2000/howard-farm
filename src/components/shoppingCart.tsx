import React, { useState, useEffect, useRef } from "react";
import { Product } from "./StorePage";
import CartCard from "./CartCard";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { apiBaseUrl } from "../config";
import { loadGoogleMaps } from "../utils/loadGoogleMaps";
import { toast } from "react-toastify";

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

  // Google autocomplete state
  const [streetInput, setStreetInput] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [sessionToken, setSessionToken] = useState<google.maps.places.AutocompleteSessionToken | null>(null);
  const streetInputRef = useRef<HTMLInputElement>(null);
  const [userTyping, setUserTyping] = useState(false);

  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [selectedShippingOption, setSelectedShippingOption] = useState("local");
  const [shippingCost, setShippingCost] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [preferredContact, setPreferredContact] = useState("email");

  const stripe = useStripe();
  const elements = useElements();

  const requiresLocalOnly = cart.some((p) => p.localPickupOnly);
  const totalAmount = cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantityInCart || 1), 0);

  // Initialize Google autocomplete service
  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        if ((window as any).google) {
          setAutocompleteService(new google.maps.places.AutocompleteService());
          setSessionToken(new google.maps.places.AutocompleteSessionToken());
        }
      })
      .catch((error) => {
        console.error('Failed to load Google Maps:', error);
      });
  }, []);

  // Fetch predictions when user types
  useEffect(() => {
    if (autocompleteService && streetInput.length > 2 && sessionToken && !user) {
      autocompleteService.getPlacePredictions(
        { input: streetInput, sessionToken },
        (predictions) => setSuggestions(predictions || [])
      );
    } else {
      setSuggestions([]);
    }
  }, [streetInput, autocompleteService, sessionToken, user]);

  // Load user data if logged in
  useEffect(() => {
    if (user) {
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
    }
  }, [user]);

  useEffect(() => {
    if (requiresLocalOnly) {
      setSelectedShippingOption("local");
      setShippingCost(0);
    }
  }, [requiresLocalOnly]);

  // Create a dependency that changes when cart quantities change
  const cartTotalWeight = cart.reduce((sum, item) => {
    const weight = parseFloat(String(item.weight || 0));
    const quantity = item.quantityInCart || 1;
    return sum + (weight * quantity);
  }, 0);

  useEffect(() => {
    const fetchRates = async () => {
      if (requiresLocalOnly || !shipping.street || !shipping.city || !shipping.state || !shipping.zip || cart.length === 0) return;
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
          // Re-select current shipping option to update cost
          if (selectedShippingOption !== "local") {
            const currentOption = data.find((r: any) => r.rate_id === selectedShippingOption);
            if (currentOption) {
              setShippingCost(currentOption.rate);
            } else {
              // If selected option no longer exists, reset to local
              setSelectedShippingOption("local");
              setShippingCost(0);
            }
          }
        } else {
          setShippingOptions([]);
        }
      } catch (err) {
        console.error("Error fetching rates:", err);
        setShippingOptions([]);
      }
    };
    fetchRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipping.street, shipping.city, shipping.state, shipping.zip, cart.length, cartTotalWeight, requiresLocalOnly]);

  const handlePlaceSelect = (placeId: string) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ placeId }, (results, status) => {
      if (status === "OK" && results && results.length > 0) {
        const address = results[0].address_components;
        const get = (type: string) => address.find((a) => a.types.includes(type))?.long_name || "";

        const parsedStreet = `${get("street_number")} ${get("route")}`;
        setShipping((prev) => ({
          ...prev,
          street: parsedStreet,
          city: get("locality") || get("sublocality") || "",
          state: get("administrative_area_level_1"),
          zip: get("postal_code"),
        }));
        setStreetInput(parsedStreet);
        setSuggestions([]);
      }
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShipping((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckout = async () => {
    if (!shipping.email || !shipping.phone) {
      toast.error("Please add an email and phone number to your account before placing an order.");
      return;
    }
    try {
      const order = {
        shippingInfo: shipping,
        cartItems: cart.map(p => ({
          productId: p.productId,
          quantity: p.quantityInCart,
          price: p.price,
        })),
        shippingMethod: selectedShippingOption === "local"
          ? "Local Pickup"
          : shippingOptions.find(r => r.rate_id === selectedShippingOption)?.service || "Unknown",
        shippingCost,
        paymentMethod: selectedShippingOption === "local" ? paymentMethod : "card",
        preferredContact: selectedShippingOption === "local" ? preferredContact : undefined,
      };

      if (selectedShippingOption !== "local" || paymentMethod === "card") {
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
      }

      const res = await fetch(`${apiBaseUrl}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order failed");

      setCart([]);
      setLastOrder?.(data);
      setPage?.("Confirmation");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      alert(err.message || "Checkout failed");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-3xl font-bold mb-6 text-center">Shopping Cart</h2>

      <div className="space-y-4">
        {cart.map((product) => (
          <CartCard
            key={product.name}
            product={product}
            removeFromCart={() => setCart((prev) => prev.filter((item) => item.name !== product.name))}
            decreaseCartQuantity={() => setCart((prev) => prev.map((item) => item.name === product.name && item.quantityInCart > 1 ? { ...item, quantityInCart: item.quantityInCart - 1 } : item))}
            increaseCartQuantity={() => setCart((prev) => prev.map((item) => item.name === product.name ? { ...item, quantityInCart: item.quantityInCart + 1 } : item))}
          />
        ))}
      </div>

      <h3 className="text-xl font-medium mt-6 mb-2 text-center">
        Subtotal: ${totalAmount.toFixed(2)}<br />
        Shipping: ${shippingCost.toFixed(2)}<br />
        <span className="text-2xl font-bold">Total: ${(totalAmount + shippingCost).toFixed(2)}</span>
      </h3>

      {!user && (
        <p className="text-center text-sm text-gray-700 mb-4">
          You are checking out as a <strong>guest</strong>. {" "}
          <button className="text-blue-600 underline" onClick={() => setPage?.("CreateAccount")}>
            Create an account
          </button>{" "}
          to save your info for next time.
        </p>
      )}

      <h3 className="text-2xl font-bold mt-10 mb-2 text-center">Customer Information</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <input 
          name="fullName" 
          placeholder="Full Name" 
          value={shipping.fullName} 
          onChange={handleChange} 
          required 
          className="border rounded p-2" 
          disabled={!!user} 
        />

        {!requiresLocalOnly && (
          <div className="md:col-span-2 relative">
            <input
              ref={streetInputRef}
              name="street"
              placeholder="Street Address"
              value={user ? shipping.street : streetInput}
              onChange={(e) => {
                if (!user) {
                  setStreetInput(e.target.value);
                  setUserTyping(true);
                  setSuggestions([]);
                }
              }}
              required
              className="border rounded p-2 w-full"
              disabled={!!user}
            />

            {!user && userTyping && suggestions.length > 0 && (
              <ul
                className="absolute bg-white border rounded mt-1 w-full shadow-lg z-10"
                onMouseDown={(e) => e.preventDefault()}
              >
                {suggestions.map((s) => (
                  <li
                    key={s.place_id}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onMouseDown={() => {
                      streetInputRef.current?.blur();
                      setUserTyping(false);
                      handlePlaceSelect(s.place_id);
                    }}
                  >
                    {s.description}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!requiresLocalOnly && (
          <>
            <input name="city" placeholder="City" value={shipping.city} onChange={handleChange} required className="border rounded p-2" disabled={!!user} />
            <input name="state" placeholder="State" value={shipping.state} onChange={handleChange} required className="border rounded p-2" disabled={!!user} />
            <input name="zip" placeholder="Zip Code" value={shipping.zip} onChange={handleChange} required className="border rounded p-2" disabled={!!user} />
          </>
        )}

        <input name="email" placeholder="Email" value={shipping.email} onChange={handleChange} required className="border rounded p-2" disabled={!!user} />
        <input name="phone" placeholder="Phone Number" value={shipping.phone} onChange={handleChange} required className="border rounded p-2" disabled={!!user} />
      </div>

      <div className="my-6">
        <label className="block mb-2 font-medium">Shipping Method</label>
        <select
          className="border rounded p-2 w-full"
          value={selectedShippingOption}
          disabled={requiresLocalOnly}
          onChange={(e) => {
            const value = e.target.value;
            setSelectedShippingOption(value);
            if (value === "local") {
              setShippingCost(0);
              setPaymentMethod("cash");
            } else {
              const selected = shippingOptions.find(r => r.rate_id === value);
              setShippingCost(selected?.rate || 0);
              setPaymentMethod("card");
            }
          }}
        >
          <option value="local">🚜 Free Local Pickup ($0)</option>
          {!requiresLocalOnly && shippingOptions.map((rate) => (
            <option key={rate.rate_id} value={rate.rate_id}>
              🚚 {rate.carrier} {rate.service} — ${(rate.rate ?? 0).toFixed(2)} {rate.delivery_days ? `(${rate.delivery_days}d)` : ""}
            </option>
          ))}
        </select>
        {requiresLocalOnly && (
          <p className="text-sm text-yellow-800 bg-yellow-100 border border-yellow-300 mt-2 p-2 rounded">
            ⚠️ One or more items require local pickup. Shipping options have been disabled.
          </p>
        )}
      </div>

      {selectedShippingOption === "local" && (
        <>
          <div className="mb-6">
            <label className="block mb-2 font-medium">Payment Method</label>
            <select
              className="border rounded p-2 w-full"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="cash">Cash at Pickup</option>
              <option value="venmo">Venmo at Pickup</option>
              <option value="card">Credit Card</option>
            </select>
          </div>
          <div className="mb-6">
            <label className="block mb-2 font-medium">Preferred Contact Method</label>
            <select
              className="border rounded p-2 w-full"
              value={preferredContact}
              onChange={(e) => setPreferredContact(e.target.value)}
            >
              <option value="email">Email</option>
              <option value="phone">Phone Call</option>
              <option value="text">Text Message</option>
            </select>
          </div>
        </>
      )}

      {selectedShippingOption !== "local" && (
        <>
          <h3 className="text-2xl font-bold mt-10 mb-4 text-center">Payment</h3>
          <div className="border p-4 rounded mb-6">
            <CardElement />
          </div>
        </>
      )}

      {selectedShippingOption === "local" && paymentMethod === "card" && (
        <>
          <h3 className="text-2xl font-bold mt-10 mb-4 text-center">Payment</h3>
          <div className="border p-4 rounded mb-6">
            <CardElement />
          </div>
        </>
      )}

      <button
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        onClick={handleCheckout}
      >
        Submit Order
      </button>
    </div>
  );
};

export default ShoppingCart;



