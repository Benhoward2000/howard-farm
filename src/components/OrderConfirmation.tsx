import React from "react";

interface OrderConfirmationProps {
  order: {
    OrderId: number;
    ProductName: string;
    Quantity: number;
    Price: number;
    CreatedAt: string;
    OrderStatus: string;
    TrackingNumber: string | null;
    ShippedAt?: string;
    FullName: string;
    Street: string;
    City: string;
    State: string;
    Zip: string;
    Email: string;
    Phone: string;
    ShippingMethod?: string; // ✅ NEW
    ShippingCost?: number;    // ✅ NEW
  } | null;
}

const OrderConfirmation: React.FC<OrderConfirmationProps> = ({ order }) => {
  if (!order) {
    return (
      <div className="text-center mt-10 px-4">
        <h2 className="text-xl font-semibold">Thank you for your order!</h2>
        <p className="text-gray-700">We’ll email you a receipt shortly.</p>
        <p className="text-sm text-gray-500 mt-2">(No order details available to show)</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 border rounded shadow bg-white">
      <h2 className="text-2xl font-bold mb-4 text-green-600">✅ Order Confirmed!</h2>
      <p className="mb-2">Thank you for your order, <strong>{order.FullName}</strong>!</p>
      <p className="text-sm text-gray-600 mb-4">
        Order ID: #{order.OrderId} | Placed: {new Date(order.CreatedAt).toLocaleString()}
      </p>

      <div className="mb-4">
        <h3 className="font-semibold">Shipping Address</h3>
        <p>{order.Street}, {order.City}, {order.State} {order.Zip}</p>
        <p>Email: {order.Email}</p>
        <p>Phone: {order.Phone}</p>
      </div>

      <div className="mt-4">
  <h3 className="font-semibold">Items Ordered</h3>
  <p>
    {order.Quantity} × {order.ProductName} @ $
    {typeof order.Price === "number" ? order.Price.toFixed(2) : "0.00"}
  </p>

  {/* ✅ NEW: Show Shipping */}
  {order.ShippingMethod && (
    <p className="mt-2">
      Shipping: <strong>{order.ShippingMethod}</strong> – ${order.ShippingCost?.toFixed(2) ?? "0.00"}
    </p>
  )}

  {/* ✅ Updated Total Calculation */}
  <p className="mt-2">
    Total: <strong>
      ${typeof order.Price === "number" && typeof order.Quantity === "number"
        ? ((order.Quantity * order.Price) + (order.ShippingCost || 0)).toFixed(2)
        : "0.00"}
    </strong>
  </p>

  <p>Status: {order.OrderStatus}</p>
  {order.TrackingNumber && <p>Tracking: {order.TrackingNumber}</p>}
</div>

    </div>
  );
};

export default OrderConfirmation;


