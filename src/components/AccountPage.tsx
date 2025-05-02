import React, { useEffect, useState, useRef } from "react";
import { apiBaseUrl, googleMapsApiKey } from "../config";
import { toast } from "react-toastify";

interface Props {
  user: any;
  setPage: (page: string) => void;
  refreshUser?: () => void;
}

interface Order {
  orderId: number;
  productId: number;
  productName: string;
  quantity: number;
  price?: number;
  orderStatus: string;
  trackingNumber: string;
  createdAt: string;
  shippedAt: string | null;
}

const AccountPage: React.FC<Props> = ({ user, setPage, refreshUser }) => {
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    street: user?.street || "",
    city: user?.city || "",
    state: user?.state || "",
    zip: user?.zip || "",
    marketingOptIn: user?.marketingOptIn || false,
  });
  

  const [streetInput, setStreetInput] = useState(formData.street);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [sessionToken, setSessionToken] = useState<google.maps.places.AutocompleteSessionToken | null>(null);
  const streetInputRef = useRef<HTMLInputElement>(null);
  const [userTyping, setUserTyping] = useState(false);

  const [message, setMessage] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  




 // Create autocompleteService and sessionToken when Google Maps is loaded
useEffect(() => {
  if ((window as any).google) {
    setAutocompleteService(new google.maps.places.AutocompleteService());
    setSessionToken(new google.maps.places.AutocompleteSessionToken());
  }
}, []);

// Fetch predictions when user types
useEffect(() => {
  if (autocompleteService && streetInput.length > 2 && sessionToken) {
    autocompleteService.getPlacePredictions(
      { input: streetInput, sessionToken },
      (predictions) => setSuggestions(predictions || [])
    );
  } else {
    setSuggestions([]);
  }
}, [streetInput, autocompleteService, sessionToken]);


  const handlePlaceSelect = (placeId: string) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ placeId }, (results, status) => {
      if (status === "OK" && results && results.length > 0) {
        const address = results[0].address_components;
        const get = (type: string) => address.find((a) => a.types.includes(type))?.long_name || "";

        const parsedStreet = `${get("street_number")} ${get("route")}`;
        setFormData((prev) => ({
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
    if (name === "street") {
      setUserTyping(true);
    }
    setFormData({ ...formData, [name]: value });
  };
  const validatePassword = (password: string) => {
    const lengthCheck = password.length >= 8;
    const uppercaseCheck = /[A-Z]/.test(password);
    const lowercaseCheck = /[a-z]/.test(password);
    const numberCheck = /[0-9]/.test(password);
    const specialCharCheck = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return lengthCheck && uppercaseCheck && lowercaseCheck && numberCheck && specialCharCheck;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage("");
  
    if (newPassword !== confirmNewPassword) {
      toast.error(" New passwords do not match.");
      return;
    }
  
    if (!validatePassword(newPassword)) {
      toast.error(" Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.");
      return;
    }
  
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/account/changepassword`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        toast.error(data.message || " Failed to change password.");
      } else {
        toast.success("✅ Password changed successfully! Redirecting to login...");
        setOldPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
  
        // Wait 1.5 seconds so the user sees the success message
        setTimeout(() => {
          setPage("Login"); // Redirect user back to Login page
        }, 1500);
      }
    } catch (err) {
      console.error("Password change error:", err);
      toast.error("❌ Server error.");
    }
  };
  
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/account/update`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Account updated successfully!");
        refreshUser?.();
      } else {
        toast.error(" Failed to update Account.");
      }
    } catch (err) {
      console.error("Error updating account:", err);
      toast.error(" Something went wrong.");
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/orders`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrders(data);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (user?.email) fetchOrders();
  }, [user]);

  if (!user) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">You are not logged in.</h2>
        <button
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          onClick={() => setPage("Login")}
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-3xl font-bold mb-6 text-center">My Account</h2>

      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <div className="flex flex-col">
          <label className="font-semibold mb-1">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="border rounded p-2"
          />
        </div>

        <div className="flex flex-col">
          <label className="font-semibold mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            disabled
            className="border rounded p-2 bg-gray-100 cursor-not-allowed"
          />
        </div>

        <div className="flex flex-col md:col-span-2 relative">
          <label className="font-semibold mb-1">Street</label>
          <input
            ref={streetInputRef}
            name="street"
            placeholder="Street Address"
            value={streetInput}
            onChange={(e) => {
              setStreetInput(e.target.value);
              setUserTyping(true);
              setSuggestions([]);
            }}
            required
            className="border rounded p-2"
          />

          {userTyping && suggestions.length > 0 && (
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

        <div className="flex flex-col">
          <label className="font-semibold mb-1">City</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="border rounded p-2"
          />
        </div>

        <div className="flex flex-col">
          <label className="font-semibold mb-1">State</label>
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleChange}
            className="border rounded p-2"
          />
        </div>

        <div className="flex flex-col md:col-span-2">
          <label className="font-semibold mb-1">Zip</label>
          <input
            type="text"
            name="zip"
            value={formData.zip}
            onChange={handleChange}
            className="border rounded p-2"
          />
        </div>
        <div className="flex items-center md:col-span-2 mt-2">
  <input
    type="checkbox"
    id="marketingOptIn"
    name="marketingOptIn"
    checked={formData.marketingOptIn}
    onChange={(e) =>
      setFormData((prev) => ({ ...prev, marketingOptIn: e.target.checked }))
    }
    className="mr-2"
  />
  <label htmlFor="marketingOptIn" className="text-sm text-gray-700">
    I want to receive farm updates, promotions, and news! 📬
  </label>
</div>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
          >
            💾 Save
          </button>
                 </div>
      </form>
      <h3 className="text-2xl font-bold mt-10 mb-4 text-center">🔒 Change Password</h3>

<form className="grid gap-4 md:grid-cols-2" onSubmit={handlePasswordChange}>
  <div className="flex flex-col md:col-span-2">
    <label className="font-semibold mb-1">Old Password</label>
    <input
      type="password"
      value={oldPassword}
      onChange={(e) => setOldPassword(e.target.value)}
      className="border rounded p-2"
      required
    />
  </div>

  <div className="flex flex-col md:col-span-2">
    <label className="font-semibold mb-1">New Password</label>
    <input
      type="password"
      value={newPassword}
      onChange={(e) => setNewPassword(e.target.value)}
      className="border rounded p-2"
      required
    />
  </div>

  <div className="flex flex-col md:col-span-2">
    <label className="font-semibold mb-1">Confirm New Password</label>
    <input
      type="password"
      value={confirmNewPassword}
      onChange={(e) => setConfirmNewPassword(e.target.value)}
      className="border rounded p-2"
      required
    />
  </div>

  <div className="md:col-span-2">
    <button
      type="submit"
      className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
    >
      🔒 Update Password
    </button>
     </div>
</form>

      <h3 className="text-2xl font-bold mt-10 mb-4 text-center">📦 My Orders</h3>

      {loadingOrders ? (
        <p className="text-center">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="text-center">You have no orders yet.</p>
      ) : (
        <div className="grid gap-4 mt-4">
          {orders.map((order) => (
            <div key={order.orderId} className="border p-4 rounded shadow">
              <p><strong>Order ID:</strong> {order.orderId ?? "—"}</p>
              <p><strong>Product:</strong> {order.productName || "—"}</p>
              <p><strong>Qty:</strong> {order.quantity ?? 0} @ ${order.price?.toFixed(2) ?? "0.00"}</p>
              <p><strong>Status:</strong> {order.orderStatus || "—"}</p>
              <p><strong>Tracking:</strong> {order.trackingNumber || "N/A"}</p>
              <p><strong>Placed At:</strong> {new Date(order.createdAt).toLocaleString()}</p>
              {order.shippedAt && (
                <p><strong>Shipped At:</strong> {new Date(order.shippedAt).toLocaleString()}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AccountPage;







