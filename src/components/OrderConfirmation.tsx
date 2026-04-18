import React from "react";

interface OrderItem {
  OrderId: number;
  ProductName: string;
  Quantity: number;
  Price: number;
}

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
    ShippingMethod?: string;
    ShippingCost?: number;
    items?: OrderItem[];
  } | null;
}

const OrderConfirmation: React.FC<OrderConfirmationProps> = ({ order }) => {
  if (!order) {
    return (
      <div className="text-center mt-10 px-4">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Thank you for your order!</h2>
        <p className="text-gray-600">We'll email you a receipt shortly.</p>
        <p className="text-sm text-gray-500 mt-2">(No order details available to show)</p>
      </div>
    );
  }

  const items = order.items && order.items.length > 0
    ? order.items
    : [{ OrderId: order.OrderId, ProductName: order.ProductName, Quantity: order.Quantity, Price: order.Price }];

  const shippingFee = order.ShippingCost || 0;
  const itemsTotal = items.reduce((sum, item) => sum + item.Price * item.Quantity, 0);
  const total = (itemsTotal + shippingFee).toFixed(2);

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 border border-gray-200 rounded-lg shadow bg-white">
      <h2 className="text-3xl font-bold text-green-600 mb-4">✅ Order Confirmed!</h2>

      <p className="mb-2 text-gray-800">
        Thank you for your order, <strong>{order.FullName}</strong>!
      </p>

      <p className="text-sm text-gray-500 mb-4">
        Order ID: #{order.OrderId} &nbsp;|&nbsp; Placed:{" "}
        {new Date(order.CreatedAt).toLocaleString()}
      </p>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Shipping Address</h3>
        <p className="text-gray-700">{order.Street}</p>
        <p className="text-gray-700">
          {order.City}, {order.State} {order.Zip}
        </p>
        <p className="text-gray-700">Email: {order.Email}</p>
        <p className="text-gray-700">Phone: {order.Phone}</p>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Items Ordered</h3>
        {items.map((item) => (
          <p key={item.OrderId} className="text-gray-700">
            {item.Quantity} × {item.ProductName} @ ${item.Price.toFixed(2)}
          </p>
        ))}
        {order.ShippingMethod && (
          <p className="text-gray-700 mt-2">
            Shipping: <strong>{order.ShippingMethod}</strong> – $
            {shippingFee.toFixed(2)}
          </p>
        )}
      </div>

      <div className="mb-2">
        <p className="text-lg font-medium text-gray-800">
          Total: <span className="font-bold text-black">${total}</span>
        </p>
        <p className="text-gray-700">
          Status: <span className="font-medium">{order.OrderStatus}</span>
        </p>
        {order.TrackingNumber && (
          <p className="text-gray-700">Tracking #: {order.TrackingNumber}</p>
        )}
        {order.ShippedAt && (
          <p className="text-gray-600 text-sm">
            Shipped At: {new Date(order.ShippedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
};

export default OrderConfirmation;
