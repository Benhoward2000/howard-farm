import React, { useState } from "react";
import axios from "axios";
import { apiBaseUrl } from "../config";
import { Helmet } from "react-helmet-async";

const ContactPage: React.FC = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Sending...");

    try {
      await axios.post(`${apiBaseUrl}/contact`, form);
      setStatus("✅ Message sent successfully!");
      setForm({ name: "", email: "", message: "" });
    } catch (error) {
      setStatus("❌ Failed to send message. Please try again.");
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <Helmet>
        <title>Contact Howard’s Farm | Local Farm in Saint Helens, Oregon</title>
        <meta
          name="description"
          content="Get in touch with Howard’s Farm for questions about our jams, hot sauce, salsa, eggs, and local pickup options in Saint Helens / Yankton, Oregon."
        />
        <meta
          name="keywords"
          content="contact Howard's Farm, farm in Saint Helens Oregon, local farm Yankton, farm fresh products, contact small batch food producer"
        />
      </Helmet>

      <h2 className="text-3xl font-bold mb-6 text-center text-[#4a3a28]">
        Contact Us
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="name"
          type="text"
          placeholder="Your Name"
          value={form.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-[#4a3a28]"
        />
        <input
          name="email"
          type="email"
          placeholder="Your Email"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-[#4a3a28]"
        />
        <textarea
          name="message"
          placeholder="Your Message"
          value={form.message}
          onChange={handleChange}
          required
          rows={5}
          className="w-full px-4 py-3 border border-gray-300 rounded-md text-base resize-none focus:outline-none focus:ring-2 focus:ring-[#4a3a28]"
        />
        <button
          type="submit"
          className="bg-[#a8936a] hover:bg-[#967f55] text-white font-semibold px-6 py-3 rounded-md transition w-full"
        >
          Send Message
        </button>
        {status && (
          <p
            className={`mt-3 text-center font-medium ${
              status.startsWith("✅")
                ? "text-green-600"
                : status.startsWith("❌")
                ? "text-red-600"
                : "text-gray-600"
            }`}
          >
            {status}
          </p>
        )}
      </form>
    </div>
  );
};

export default ContactPage;
