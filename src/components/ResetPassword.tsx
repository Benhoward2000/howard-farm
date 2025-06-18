import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const ResetPassword: React.FC = () => {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
    setEmail(params.get("email") || "");
  }, []);

  const handleSubmit = async () => {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email, newPassword }),
    });

    const data = await res.json();
    setMessage(data.message || "Error occurred");

    if (res.ok) {
      toast.success("✅ Password reset successful!");
      setTimeout(() => {
        navigate("/"); // This lands them on the home page where Login is shown
      }, 2000);
    } else {
      toast.error(data.message || "❌ Reset failed.");
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Set New Password</h2>

      <input
        type="password"
        placeholder="New Password"
        className="border p-2 w-full mb-3"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />

      <button
        onClick={handleSubmit}
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
      >
        Reset Password
      </button>

      {message && <p className="mt-4 text-sm">{message}</p>}
    </div>
  );
};

export default ResetPassword;




