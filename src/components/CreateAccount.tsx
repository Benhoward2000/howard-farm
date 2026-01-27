import React, { useState } from "react";
import { apiBaseUrl } from "../config";

interface Props {
  setPage: (page: string) => void;
}

const CreateAccount: React.FC<Props> = ({ setPage }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const validatePassword = (password: string) => {
    const lengthCheck = password.length >= 8;
    const uppercaseCheck = /[A-Z]/.test(password);
    const lowercaseCheck = /[a-z]/.test(password);
    const numberCheck = /[0-9]/.test(password);
    const specialCharCheck = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return lengthCheck && uppercaseCheck && lowercaseCheck && numberCheck && specialCharCheck;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (password !== confirm) {
      showToast("Passwords do not match.", "error");
      return;
    }

    if (!validatePassword(password)) {
      showToast(
        "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.",
        "error"
      );
      return;
    }

    setLoading(true);
    setToast(null);

    try {
      // Debug: Log the API URL being used
      console.log("API Base URL:", apiBaseUrl);
      console.log("Full endpoint:", `${apiBaseUrl}/api/auth/register`);

      const res = await fetch(`${apiBaseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password }),
      });

      // Debug: Log response status
      console.log("Response status:", res.status);
      console.log("Response ok:", res.ok);

      // Try to parse response as JSON
      let data;
      const contentType = res.headers.get("content-type");
      
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
        console.log("Response data:", data);
      } else {
        // If response is not JSON, get text for debugging
        const text = await res.text();
        console.error("Non-JSON response:", text);
        showToast("Server returned an unexpected response format.", "error");
        return;
      }

      if (!res.ok) {
        // Handle specific error codes
        if (res.status === 400) {
          showToast(data.message || "Invalid input. Please check your information.", "error");
        } else if (res.status === 409) {
          showToast(data.message || "An account with this email already exists.", "error");
        } else if (res.status === 500) {
          showToast(data.message || "Server error. Please try again later.", "error");
        } else {
          showToast(data.message || "Registration failed.", "error");
        }
        return;
      }

      showToast("✅ Account created! Redirecting to login...", "success");
      setTimeout(() => setPage("Login"), 1500);
      
    } catch (err) {
      // Enhanced error logging
      console.error("Registration error:", err);
      
      if (err instanceof TypeError) {
        // Network error or CORS issue
        console.error("Network error - possible causes:");
        console.error("1. Backend server is not running");
        console.error("2. API URL is incorrect:", apiBaseUrl);
        console.error("3. CORS is not configured on the backend");
        showToast("Cannot connect to server. Please check your connection.", "error");
      } else if (err instanceof SyntaxError) {
        // JSON parsing error
        console.error("JSON parsing error - server might not be returning valid JSON");
        showToast("Server returned invalid data.", "error");
      } else {
        // Generic error
        showToast("An unexpected error occurred. Please try again.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-start justify-center min-h-screen bg-white px-4 pt-8 pb-12 relative">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-white transition-all duration-300 ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-xl">
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Create Account</h2>

        <form className="space-y-5" onSubmit={handleRegister}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your name"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="555-555-5555"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter password"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="Confirm password"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>

          <p className="mt-6 text-sm text-center text-gray-600">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setPage("Login")}
              className="text-blue-600 hover:underline font-medium"
            >
              Log in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default CreateAccount;




