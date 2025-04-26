import React from "react";
import { Product } from "./StorePage";

interface Props {
  product: Product;
  removeFromCart: (product: Product) => void;
  decreaseCartQuantity: (product: Product) => void;
  increaseCartQuantity: (product: Product) => void;
}

const CartCard: React.FC<Props> = ({
  product,
  removeFromCart,
  decreaseCartQuantity,
  increaseCartQuantity,
}) => {
  const isStockExceeded = product.quantityInCart >= product.stock;

  return (
    <div className="flex flex-col sm:flex-row gap-4 bg-white rounded-2xl shadow-md p-4">
      {/* Image */}
      <div className="w-full sm:w-1/3 flex justify-center items-center">
        <img
          src={product.imageURL}
          alt={product.name}
          className="object-contain h-48 w-full max-w-xs rounded-lg"
        />
      </div>

      {/* Details */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-semibold">{product.name}</h2>
          <p className="text-sm text-gray-600 italic">{product.description}</p>
          <p className="text-sm mt-1">
            Stock: <strong>{product.stock}</strong>
          </p>
          <p className="text-sm">
            {product.localPickupOnly
              ? "Local pickup only"
              : "Shipping available"}
          </p>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Quantity Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm">Qty:</span>
            <button
              onClick={() => decreaseCartQuantity(product)}
              disabled={product.quantityInCart <= 1}
              className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              −
            </button>
            <span className="text-base font-semibold">
              {product.quantityInCart}
            </span>
            <button
              onClick={() => increaseCartQuantity(product)}
              disabled={isStockExceeded}
              className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              +
            </button>
          </div>

          <p className="text-lg font-bold">${product.price.toFixed(2)}</p>

          <button
            onClick={() => removeFromCart(product)}
            className="text-sm px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Remove All
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartCard;



