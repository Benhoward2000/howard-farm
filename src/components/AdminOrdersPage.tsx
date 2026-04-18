import React, { useEffect, useState } from "react";
import axios from "axios";
import { apiBaseUrl } from "../config";

interface OrderItem {
  orderId: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
}

interface Shipment {
  shippingId: number;
  items: OrderItem[];
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
  preferredContact?: string;
  shippingMethod?: string;
  shippingCost?: number;
}

interface RawOrder {
  orderId: number;
  shippingId: number;
  productId: number;
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
  preferredContact?: string;
  shippingMethod?: string;
  shippingCost?: number;
}

function groupByShipping(rows: RawOrder[]): Shipment[] {
  const map = new Map<number, Shipment>();
  for (const row of rows) {
    if (!map.has(row.shippingId)) {
      map.set(row.shippingId, {
        shippingId: row.shippingId,
        items: [],
        createdAt: row.createdAt,
        orderStatus: row.orderStatus,
        trackingNumber: row.trackingNumber,
        shippedAt: row.shippedAt,
        fullName: row.fullName,
        street: row.street,
        city: row.city,
        state: row.state,
        zip: row.zip,
        email: row.email,
        phone: row.phone,
        preferredContact: row.preferredContact,
        shippingMethod: row.shippingMethod,
        shippingCost: row.shippingCost,
      });
    }
    map.get(row.shippingId)!.items.push({
      orderId: row.orderId,
      productId: row.productId,
      productName: row.productName,
      quantity: row.quantity,
      price: row.price,
    });
  }
  return Array.from(map.values());
}

const AdminOrdersPage: React.FC = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get(`${apiBaseUrl}/api/admin/orders`, { withCredentials: true });
        setShipments(groupByShipping(res.data));
      } catch (err) {
        console.error("Fetch error:", err);
        setMessage("❌ Failed to load orders.");
      }
    };
    fetchOrders();
  }, []);

  const updateShipment = async (shipment: Shipment) => {
    try {
      await axios.put(
        `${apiBaseUrl}/api/admin/orders/by-shipping/${shipment.shippingId}`,
        { orderStatus: shipment.orderStatus, trackingNumber: shipment.trackingNumber },
        { withCredentials: true }
      );
      setMessage("✅ Order updated.");
      setShipments((prev) =>
        prev.map((s) => (s.shippingId === shipment.shippingId ? { ...s, ...shipment } : s))
      );
    } catch (err) {
      console.error("Update error:", err);
      setMessage("❌ Failed to update order.");
    }
  };

  const filteredShipments = shipments.filter((shipment) => {
    const matchesSearch =
      searchText === "" ||
      shipment.items.some((item) =>
        item.productName.toLowerCase().includes(searchText.toLowerCase())
      );
    const matchesStatus = statusFilter ? shipment.orderStatus === statusFilter : true;
    const createdAt = new Date(shipment.createdAt);
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

      {filteredShipments.length === 0 ? (
        <p className="text-gray-600 italic">No matching orders found.</p>
      ) : (
        <div className="space-y-6">
          {filteredShipments.map((shipment) => {
            const itemsTotal = shipment.items.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0
            );
            return (
              <div
                key={shipment.shippingId}
                className="border border-gray-200 rounded-lg p-4 shadow-sm bg-white"
              >
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <p><strong>Shipment ID:</strong> {shipment.shippingId}</p>
                  <p><strong>Customer:</strong> {shipment.fullName}</p>
                  <p><strong>Address:</strong> {shipment.street}, {shipment.city}, {shipment.state} {shipment.zip}</p>
                  <p><strong>Email:</strong> {shipment.email} | <strong>Phone:</strong> {shipment.phone}</p>
                  {shipment.preferredContact && (
                    <p><strong>Preferred Contact:</strong> {shipment.preferredContact.charAt(0).toUpperCase() + shipment.preferredContact.slice(1)}</p>
                  )}
                  {shipment.shippingMethod && (
                    <p>
                      <strong>Shipping:</strong> {shipment.shippingMethod}
                      {shipment.shippingCost != null ? ` - $${shipment.shippingCost.toFixed(2)}` : ""}
                    </p>
                  )}
                  <p><strong>Placed:</strong> {new Date(shipment.createdAt).toLocaleString()}</p>
                  {shipment.shippedAt && (
                    <p><strong>Shipped:</strong> {new Date(shipment.shippedAt).toLocaleString()}</p>
                  )}
                </div>

                <div className="mt-3 text-sm">
                  <strong>Items:</strong>
                  <ul className="mt-1 space-y-1 pl-3">
                    {shipment.items.map((item) => (
                      <li key={item.orderId}>
                        {item.quantity} × {item.productName} @ ${item.price.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 font-semibold">Items Total: ${itemsTotal.toFixed(2)}</p>
                </div>

                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Order Status</label>
                    <select
                      value={shipment.orderStatus}
                      onChange={(e) =>
                        setShipments((prev) =>
                          prev.map((s) =>
                            s.shippingId === shipment.shippingId
                              ? { ...s, orderStatus: e.target.value }
                              : s
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
                      value={shipment.trackingNumber || ""}
                      onChange={(e) =>
                        setShipments((prev) =>
                          prev.map((s) =>
                            s.shippingId === shipment.shippingId
                              ? { ...s, trackingNumber: e.target.value }
                              : s
                          )
                        )
                      }
                      className="border border-gray-300 rounded px-3 py-2 w-full"
                    />
                  </div>
                </div>

                <button
                  onClick={() => updateShipment(shipment)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
                >
                  💾 Save Changes
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
