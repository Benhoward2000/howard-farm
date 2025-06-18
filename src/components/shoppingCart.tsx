import React, { useState, useEffect } from "react";
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
  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [selectedShippingOption, setSelectedShippingOption] = useState("local");
  const [shippingCost, setShippingCost] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const stripe = useStripe();
  const elements = useElements();

  const requiresLocalOnly = cart.some((p) => p.localPickupOnly);
  const totalAmount = cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantityInCart || 1), 0);

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
    }
  }, [user]);

  useEffect(() => {
    if (requiresLocalOnly) {
      setSelectedShippingOption("local");
      setShippingCost(0);
    }
  }, [requiresLocalOnly]);

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
        if (res.ok) setShippingOptions(data);
        else setShippingOptions([]);
      } catch (err) {
        console.error("Error fetching rates:", err);
        setShippingOptions([]);
      }
    };
    fetchRates();
  }, [shipping, cart, requiresLocalOnly]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShipping((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckout = async () => {
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
        <input name="fullName" placeholder="Full Name" value={shipping.fullName} onChange={handleChange} required className="border rounded p-2" disabled={!!user} />
        {!requiresLocalOnly && <input name="street" placeholder="Street Address" value={shipping.street} onChange={handleChange} required className="border rounded p-2" disabled={!!user} />}
        {!requiresLocalOnly && <input name="city" placeholder="City" value={shipping.city} onChange={handleChange} required className="border rounded p-2" disabled={!!user} />}
        {!requiresLocalOnly && <input name="state" placeholder="State" value={shipping.state} onChange={handleChange} required className="border rounded p-2" disabled={!!user} />}
        {!requiresLocalOnly && <input name="zip" placeholder="Zip Code" value={shipping.zip} onChange={handleChange} required className="border rounded p-2" disabled={!!user} />}
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
              🚚 {rate.carrier} {rate.service} – ${rate.rate.toFixed(2)} {rate.delivery_days ? `(${rate.delivery_days}d)` : ""}
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















