import React, { useEffect, useState } from "react";

const VerifyEmail: React.FC = () => {
  const [message, setMessage] = useState("Verifying...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const email = params.get("email");

    if (token && email) {
      fetch(`/api/auth/verify-email?token=${token}&email=${email}`)
        .then((res) => res.text())
        .then((msg) => setMessage(msg))
        .catch(() => setMessage("❌ Something went wrong."));
    } else {
      setMessage("Invalid verification link.");
    }
  }, []);

  return (
    <div className="p-4 text-center">
      <h1 className="text-xl font-bold">{message}</h1>
    </div>
  );
};

export default VerifyEmail;
