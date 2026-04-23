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
  paymentMethod?: string;
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
  paymentMethod?: string;
  shippingMethod?: string;
  shippingCost?: number;
}

interface EditingCustomer {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phone: string;
}

interface Draft {
  orderStatus: string;
  trackingNumber: string;
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
        paymentMethod: row.paymentMethod,
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

const STATUS_STYLES: Record<string, string> = {
  Pending:   "bg-yellow-100 text-yellow-800 border-yellow-300",
  Shipped:   "bg-blue-100 text-blue-800 border-blue-300",
  Delivered: "bg-green-100 text-green-800 border-green-300",
  Cancelled: "bg-red-100 text-red-800 border-red-300",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash:  "Cash at Pickup",
  venmo: "Venmo at Pickup",
  card:  "Credit Card",
};

const CONTACT_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone Call",
  text:  "Text Message",
};

const AdminOrdersPage: React.FC = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [drafts, setDrafts] = useState<Map<number, Draft>>(new Map());
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [searchText, setSearchText] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<EditingCustomer>({ fullName: "", street: "", city: "", state: "", zip: "", email: "", phone: "" });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("Pending");

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get(`${apiBaseUrl}/api/admin/orders`, { withCredentials: true });
        const grouped = groupByShipping(res.data);
        setShipments(grouped);
        // Initialise drafts from loaded data
        const initial = new Map<number, Draft>();
        grouped.forEach((s) => initial.set(s.shippingId, { orderStatus: s.orderStatus, trackingNumber: s.trackingNumber || "" }));
        setDrafts(initial);
      } catch {
        showToast("Failed to load orders.", false);
      }
    };
    fetchOrders();
  }, []);

  const getDraft = (shippingId: number): Draft =>
    drafts.get(shippingId) ?? { orderStatus: "Pending", trackingNumber: "" };

  const setDraft = (shippingId: number, patch: Partial<Draft>) =>
    setDrafts((prev) => new Map(prev).set(shippingId, { ...getDraft(shippingId), ...patch }));

  const saveShipment = async (shippingId: number) => {
    const draft = getDraft(shippingId);
    try {
      await axios.put(
        `${apiBaseUrl}/api/admin/orders/by-shipping/${shippingId}`,
        { orderStatus: draft.orderStatus, trackingNumber: draft.trackingNumber },
        { withCredentials: true }
      );
      setShipments((prev) => prev.map((s) => s.shippingId === shippingId ? { ...s, orderStatus: draft.orderStatus, trackingNumber: draft.trackingNumber } : s));
      showToast("Order updated.");
    } catch {
      showToast("Failed to update order.", false);
    }
  };

  const applyBulkStatus = async () => {
    if (selectedIds.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          axios.put(`${apiBaseUrl}/api/admin/orders/by-shipping/${id}`, { orderStatus: bulkStatus, trackingNumber: getDraft(id).trackingNumber }, { withCredentials: true })
        )
      );
      setShipments((prev) => prev.map((s) => selectedIds.has(s.shippingId) ? { ...s, orderStatus: bulkStatus } : s));
      setDrafts((prev) => {
        const next = new Map(prev);
        selectedIds.forEach((id) => next.set(id, { ...getDraft(id), orderStatus: bulkStatus }));
        return next;
      });
      setSelectedIds(new Set());
      showToast(`${selectedIds.size} order${selectedIds.size !== 1 ? "s" : ""} updated to ${bulkStatus}.`);
    } catch {
      showToast("Bulk update failed.", false);
    }
  };

  const startEditing = (shipment: Shipment) => {
    setEditingId(shipment.shippingId);
    setEditFields({ fullName: shipment.fullName, street: shipment.street, city: shipment.city, state: shipment.state, zip: shipment.zip, email: shipment.email, phone: shipment.phone });
  };

  const saveCustomerEdit = async (shippingId: number) => {
    try {
      await axios.put(`${apiBaseUrl}/api/admin/shipping/${shippingId}`, editFields, { withCredentials: true });
      setShipments((prev) => prev.map((s) => s.shippingId === shippingId ? { ...s, ...editFields } : s));
      setEditingId(null);
      showToast("Customer info updated.");
    } catch {
      showToast("Failed to update customer info.", false);
    }
  };

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const filteredShipments = shipments.filter((s) => {
    const q = searchText.toLowerCase();
    const matchesSearch = !q || s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.items.some((i) => i.productName.toLowerCase().includes(q));
    const matchesStatus =
      statusFilter === "active" ? (s.orderStatus === "Pending" || s.orderStatus === "Shipped") :
      !statusFilter ? true :
      s.orderStatus === statusFilter;
    const createdAt = new Date(s.createdAt);
    const now = new Date();
    const matchesDate =
      dateFilter === "7"  ? createdAt >= new Date(now.getTime() - 7  * 86400000) :
      dateFilter === "30" ? createdAt >= new Date(now.getTime() - 30 * 86400000) : true;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const pendingCount = shipments.filter((s) => s.orderStatus === "Pending").length;
  const shippedCount = shipments.filter((s) => s.orderStatus === "Shipped").length;
  const revenue      = shipments.filter((s) => s.orderStatus !== "Cancelled").reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.price * i.quantity, 0), 0);

  const allVisibleSelected = filteredShipments.length > 0 && filteredShipments.every((s) => selectedIds.has(s.shippingId));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredShipments.map((s) => s.shippingId)));
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.ok ? "bg-green-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}

      <h2 className="text-3xl font-bold text-gray-800 mb-6">Orders</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Pending</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-blue-600">{shippedCount}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Shipped</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-green-600">${revenue.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Total Revenue</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by name, email, or product…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-48"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="active">Active Orders</option>
          <option value="">All Orders</option>
          <option value="Pending">Pending</option>
          <option value="Shipped">Shipped</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <div className="flex gap-2">
          {[["all","All"], ["7","7 Days"], ["30","30 Days"]].map(([val, label]) => (
            <button key={val} onClick={() => setDateFilter(val)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${dateFilter === val ? "bg-green-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
              {label}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-400 ml-auto">{filteredShipments.length} order{filteredShipments.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-blue-800">{selectedIds.size} order{selectedIds.size !== 1 ? "s" : ""} selected</span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="border border-blue-300 rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            <option value="Pending">Pending</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <button onClick={applyBulkStatus} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition">
            Apply to Selected
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-blue-500 hover:underline ml-auto">
            Clear selection
          </button>
        </div>
      )}

      {filteredShipments.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-lg font-medium">No orders found</p>
        </div>
      ) : (
        <>
          {/* Select all row */}
          <div className="flex items-center gap-2 px-2 mb-2">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} className="w-4 h-4 accent-blue-600 cursor-pointer" />
            <span className="text-xs text-gray-500">{allVisibleSelected ? "Deselect all" : "Select all"}</span>
          </div>

          <div className="space-y-3">
            {filteredShipments.map((shipment) => {
              const draft = getDraft(shipment.shippingId);
              const itemsTotal = shipment.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
              const shippingFee = shipment.shippingCost ?? 0;
              const orderTotal = itemsTotal + shippingFee;
              const isExpanded = expandedId === shipment.shippingId;
              const isEditing = editingId === shipment.shippingId;
              const isSelected = selectedIds.has(shipment.shippingId);
              const statusStyle = STATUS_STYLES[shipment.orderStatus] ?? "bg-gray-100 text-gray-700 border-gray-300";
              const isLocal = shipment.shippingMethod === "Local Pickup" || !shipment.street;

              return (
                <div key={shipment.shippingId}
                  className={`bg-white border rounded-xl shadow-sm overflow-hidden transition ${isSelected ? "border-blue-400 ring-1 ring-blue-300" : "border-gray-200"}`}>

                  {/* Card header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Checkbox — stops propagation so it doesn't toggle expand */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(shipment.shippingId)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 accent-blue-600 cursor-pointer flex-shrink-0"
                    />

                    <button
                      className="flex flex-wrap items-center gap-2 flex-1 text-left hover:opacity-80 transition min-w-0"
                      onClick={() => setExpandedId(isExpanded ? null : shipment.shippingId)}
                    >
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${statusStyle}`}>{shipment.orderStatus}</span>
                      {shipment.paymentMethod === "card" && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-green-100 text-green-700 border-green-300 flex-shrink-0">✓ Paid</span>
                      )}
                      {isLocal && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-orange-100 text-orange-700 border-orange-300 flex-shrink-0">🚜 Local</span>
                      )}
                      <span className="font-semibold text-gray-800">{shipment.fullName || <span className="text-gray-400 italic">No name</span>}</span>
                      <span className="text-gray-400 text-sm truncate">
                        {shipment.items.length} item{shipment.items.length !== 1 ? "s" : ""} · {shipment.items.map((i) => i.productName).join(", ").slice(0, 50)}{shipment.items.map((i) => i.productName).join(", ").length > 50 ? "…" : ""}
                      </span>
                      <span className="ml-auto font-bold text-gray-800 flex-shrink-0">${orderTotal.toFixed(2)}</span>
                      <span className="text-gray-400 text-sm flex-shrink-0">{new Date(shipment.createdAt).toLocaleDateString()}</span>
                      <span className="text-gray-400 flex-shrink-0">{isExpanded ? "▲" : "▼"}</span>
                    </button>
                  </div>

                  {/* Expanded body */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-5 space-y-5">
                      <div className="grid md:grid-cols-2 gap-5">
                        {/* Customer */}
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Customer</p>
                          {isEditing ? (
                            <div className="space-y-2">
                              {(["fullName","email","phone","street","city","state","zip"] as (keyof EditingCustomer)[]).map((field) => (
                                <div key={field}>
                                  <label className="text-xs text-gray-500 mb-0.5 block capitalize">{field === "fullName" ? "Full Name" : field}</label>
                                  <input type="text" value={editFields[field]}
                                    onChange={(e) => setEditFields((p) => ({ ...p, [field]: e.target.value }))}
                                    className="border border-gray-300 rounded-lg px-2 py-1.5 w-full text-sm" />
                                </div>
                              ))}
                              <div className="flex gap-2 pt-1">
                                <button onClick={() => saveCustomerEdit(shipment.shippingId)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded-lg">Save</button>
                                <button onClick={() => setEditingId(null)} className="bg-gray-100 hover:bg-gray-200 text-sm px-4 py-1.5 rounded-lg">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm space-y-1 text-gray-700">
                              <p className="font-medium text-gray-900">{shipment.fullName || "—"}</p>
                              <p>{shipment.email || "—"}</p>
                              <p>{shipment.phone || "—"}</p>
                              {!isLocal && <p className="text-gray-500">{shipment.street}<br />{shipment.city}, {shipment.state} {shipment.zip}</p>}
                              {shipment.preferredContact && <p><span className="text-gray-400">Contact via:</span> {CONTACT_LABELS[shipment.preferredContact] ?? shipment.preferredContact}</p>}
                              {shipment.paymentMethod && <p><span className="text-gray-400">Payment:</span> {PAYMENT_LABELS[shipment.paymentMethod] ?? shipment.paymentMethod}</p>}
                              <button onClick={() => startEditing(shipment)} className="text-blue-600 hover:underline text-xs mt-1">✏️ Edit customer info</button>
                            </div>
                          )}
                        </div>

                        {/* Items */}
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Items</p>
                          <div className="space-y-1 text-sm text-gray-700">
                            {shipment.items.map((item) => (
                              <div key={item.orderId} className="flex justify-between">
                                <span>{item.quantity} × {item.productName}</span>
                                <span className="text-gray-500">${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                            {shippingFee > 0 && (
                              <div className="flex justify-between text-gray-400">
                                <span>Shipping ({shipment.shippingMethod})</span>
                                <span>${shippingFee.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-100 pt-1 mt-1">
                              <span>Total</span>
                              <span>${orderTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Status + tracking + save — uses draft, never collapses card */}
                      <div className="border-t border-gray-100 pt-4 grid md:grid-cols-3 gap-4 items-end">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Order Status</label>
                          <select
                            value={draft.orderStatus}
                            onChange={(e) => setDraft(shipment.shippingId, { orderStatus: e.target.value })}
                            className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Tracking Number</label>
                          <input type="text" placeholder="Enter tracking number…"
                            value={draft.trackingNumber}
                            onChange={(e) => setDraft(shipment.shippingId, { trackingNumber: e.target.value })}
                            className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm" />
                        </div>
                        <button
                          onClick={() => saveShipment(shipment.shippingId)}
                          className="bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2 rounded-lg transition text-sm"
                        >
                          Save Changes
                        </button>
                      </div>

                      {shipment.shippedAt && (
                        <p className="text-xs text-gray-400">Shipped: {new Date(shipment.shippedAt).toLocaleString()}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminOrdersPage;
