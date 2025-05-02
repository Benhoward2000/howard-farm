import React, { useEffect, useState } from "react";
import axios from "axios";
import { apiBaseUrl } from "../config";

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
  shippingMethod?: string;
  shippingCost?: number;
}

const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get(`${apiBaseUrl}/api/admin/orders`, { withCredentials: true });
        setOrders(res.data);
      } catch (err) {
        console.error("Fetch error:", err);
        setMessage("❌ Failed to load orders.");
      }
    };
    fetchOrders();
  }, []);

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

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.productName.toLowerCase().includes(searchText.toLowerCase());
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
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">📦 Admin Orders</h2>

      {message && <p className="text-red-600 font-semibold mb-4">{message}</p>}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <input
          type="text"
          placeholder="Search product..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm w-60"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Shipped">Shipped</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <div className="flex gap-2">
          {["all", "7", "30"].map((range) => (
            <button
              key={range}
              onClick={() => setDateFilter(range)}
              className={`px-3 py-2 rounded text-sm ${
                dateFilter === range
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {range === "all" ? "All" : `Last ${range} Days`}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <p className="text-gray-600 italic">No matching orders found.</p>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => (
            <div key={order.orderId} className="border border-gray-200 rounded-lg p-4 shadow-sm bg-white">
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <p><strong>Order ID:</strong> {order.orderId}</p>
                <p><strong>Product:</strong> {order.productName}</p>
                <p><strong>Qty:</strong> {order.quantity} × ${order.price.toFixed(2)}</p>
                <p><strong>Customer:</strong> {order.fullName}</p>
                <p><strong>Address:</strong> {order.street}, {order.city}, {order.state} {order.zip}</p>
                {order.shippingMethod && (
                  <p>
                    <strong>Shipping:</strong> {order.shippingMethod} - ${order.shippingCost?.toFixed(2)}
                  </p>
                )}
                <p><strong>Email:</strong> {order.email} | <strong>Phone:</strong> {order.phone}</p>
                <p><strong>Placed:</strong> {new Date(order.createdAt).toLocaleString()}</p>
                {order.shippedAt && (
                  <p><strong>Shipped:</strong> {new Date(order.shippedAt).toLocaleString()}</p>
                )}
              </div>

              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Order Status</label>
                  <select
                    value={order.orderStatus}
                    onChange={(e) =>
                      setOrders((prev) =>
                        prev.map((o) =>
                          o.orderId === order.orderId ? { ...o, orderStatus: e.target.value } : o
                        )
                      )
                    }
                    className="border border-gray-300 rounded px-3 py-2 w-full"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Tracking Number</label>
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
                    className="border border-gray-300 rounded px-3 py-2 w-full"
                  />
                </div>
              </div>

              <button
                onClick={() => updateOrder(order)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
              >
                💾 Save Changes
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;







