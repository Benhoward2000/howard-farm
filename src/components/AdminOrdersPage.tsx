import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AdminPage.css";
import apiBaseUrl from "../config";

interface Order {
  orderId: number;
  productId: number;
  shippingId: number;
  productName: string;
  quantity: number;
  price: number;
  createdAt: string;
  orderStatus: string;
  trackingNumber: string;
  shippedAt: string | null;
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phone: string;
  shippingMethod?: string; // ✅ NEW
  shippingCost?: number;    // ✅ NEW
}

const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [dateFilter, setDateFilter] = useState("all");

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/admin/orders`, {
        withCredentials: true,
      });
      setOrders(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
      setMessage("❌ Failed to load orders.");
    }
  };

  const updateOrder = async (order: Order) => {
    try {
      await axios.put(
        `${apiBaseUrl}/api/admin/orders/${order.orderId}`,
        {
          orderStatus: order.orderStatus,
          trackingNumber: order.trackingNumber,
        },
        { withCredentials: true }
      );

      setMessage("✅ Order updated.");
      setOrders((prev) =>
        prev.map((o) => (o.orderId === order.orderId ? { ...o, ...order } : o))
      );
    } catch (err) {
      console.error("Update error:", err);
      setMessage("❌ Failed to update order.");
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.productName
      .toLowerCase()
      .includes(searchText.toLowerCase());
    const matchesStatus = statusFilter ? order.orderStatus === statusFilter : true;
    const createdAt = new Date(order.createdAt);
    const now = new Date();
    let matchesDate = true;
    if (dateFilter === "7") {
      matchesDate = createdAt >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateFilter === "30") {
      matchesDate = createdAt >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="admin-container max-w-5xl mx-auto px-4">
      <h2 className="admin-title">📦 Orders</h2>

      {message && <p style={{ marginBottom: "1rem", color: "darkred" }}>{message}</p>}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="Search product..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="border px-2 py-1 rounded"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Shipped">Shipped</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <div className="flex gap-2">
          <button onClick={() => setDateFilter("all")} className="filter-btn">All</button>
          <button onClick={() => setDateFilter("7")} className="filter-btn">Last 7 Days</button>
          <button onClick={() => setDateFilter("30")} className="filter-btn">Last 30 Days</button>
        </div>
      </div>

      {/* Results */}
      {filteredOrders.length === 0 ? (
        <p className="text-gray-600 italic">No matching orders found.</p>
      ) : (
        filteredOrders.map((order) => (
          <div key={order.orderId} className="admin-product-card">
            <p><strong>Order ID:</strong> {order.orderId}</p>
            <p><strong>Product:</strong> {order.productName || "Unknown"}</p>
            <p><strong>Qty:</strong> {order.quantity} @ ${order.price}</p>
            <p><strong>Customer:</strong> {order.fullName || "N/A"}</p>
            <p>
              <strong>Shipping Address:</strong> {order.street || ""}, {order.city || ""}, {order.state || ""} {order.zip || ""}
            </p>
            {/* ✅ Show shipping method and cost */}
            {order.shippingMethod && (
              <p>
                <strong>Shipping Method:</strong> {order.shippingMethod} - ${order.shippingCost?.toFixed(2) ?? "0.00"}
              </p>
            )}
            <p>
              <strong>Email:</strong> {order.email || "N/A"} | <strong>Phone:</strong> {order.phone || "N/A"}
            </p>
            <p>
              <strong>Placed At:</strong>{" "}
              {order.createdAt ? new Date(order.createdAt).toLocaleString() : "N/A"}
            </p>
            {order.shippedAt && (
              <p>
                <strong>Shipped At:</strong>{" "}
                {order.shippedAt ? new Date(order.shippedAt).toLocaleString() : "N/A"}
              </p>
            )}

            <div className="admin-field">
              <label>Status</label>
              <select
                className={`border rounded px-2 py-1 ${
                  order.orderStatus === "Shipped"
                    ? "text-blue-600"
                    : order.orderStatus === "Delivered"
                    ? "text-green-600"
                    : order.orderStatus === "Cancelled"
                    ? "text-red-600"
                    : "text-black"
                }`}
                value={order.orderStatus}
                onChange={(e) =>
                  setOrders((prev) =>
                    prev.map((o) =>
                      o.orderId === order.orderId ? { ...o, orderStatus: e.target.value } : o
                    )
                  )
                }
              >
                <option value="Pending">Pending</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="admin-field">
              <label>Tracking Number</label>
              <input
                type="text"
                value={order.trackingNumber || ""}
                onChange={(e) =>
                  setOrders((prev) =>
                    prev.map((o) =>
                      o.orderId === order.orderId
                        ? { ...o, trackingNumber: e.target.value }
                        : o
                    )
                  )
                }
                className="border rounded px-2 py-1"
              />
            </div>

            <button className="save-btn" onClick={() => updateOrder(order)}>
              💾 Save Changes
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default AdminOrdersPage;




