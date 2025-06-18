import React, { useState } from "react";

interface Props {
  setPage: (page: string) => void;
}

const RequestPasswordReset: React.FC<Props> = ({ setPage }) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    const res = await fetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setMessage(data.message || "Check your email.");
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Reset Password</h2>

      <input
        type="email"
        placeholder="Enter your email"
        className="border p-2 w-full mb-3"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        onClick={handleSubmit}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        Send Reset Link
      </button>

      {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}

      <p className="mt-6 text-center text-sm">
        <button
          className="text-blue-600 hover:underline"
          onClick={() => setPage("Login")}
        >
          Back to Login
        </button>
      </p>
    </div>
  );
};

export default RequestPasswordReset;

