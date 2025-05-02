import React, { useState, useEffect } from "react";
import { Product } from "./StorePage";

interface Props {
  product: Product;
  cart: Product[];
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (product: Product) => void;
}

const ProductCard: React.FC<Props> = ({ product, cart, addToCart }) => {
  const cartItem = cart.find((item) => item.name === product.name);
  const quantityInCart = cartItem?.quantityInCart || 0;
  const totalStock = Number(product.stock) || 0;
  const availableStock = Math.max(totalStock - quantityInCart, 0);

  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const canAdd = selectedQuantity > 0 && selectedQuantity <= availableStock;
  const showLowStock = availableStock > 0 && availableStock <= 5;

  useEffect(() => {
    if (selectedQuantity > availableStock) {
      setSelectedQuantity(Math.max(availableStock, 1));
    }
  }, [availableStock, selectedQuantity]);

  const handleAddToCart = () => {
    if (canAdd) {
      addToCart(product, selectedQuantity);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-3 flex flex-col w-full max-w-xs text-sm">
      <div className="h-40 flex items-center justify-center overflow-hidden">
        <img
          src={product.imageURL}
          alt={product.name}
          className="object-contain h-full max-w-full"
        />
      </div>

      <div className="mt-3 grow flex flex-col justify-between">
        <div className="space-y-1">
          <h2 className="font-semibold text-base leading-tight">{product.name}</h2>
          <p className="text-gray-600 italic">{product.description}</p>
          <p>
            <span className="text-gray-600">Status:</span>{" "}
            <strong>{availableStock > 0 ? "In Stock" : "Out of Stock"}</strong>
          </p>
          {showLowStock && (
            <p className="text-red-600 font-semibold">
              Only {availableStock} left!
            </p>
          )}
          {quantityInCart > 0 && (
            <p className="text-green-600">In cart: {quantityInCart}</p>
          )}
        </div>

        <div className="mt-2">
          <p className="text-lg font-bold">${product.price.toFixed(2)}</p>
          <p className="text-gray-500">
            {product.localPickupOnly ? "Local pickup only" : "Shipping available"}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedQuantity((q) => Math.max(1, q - 1))}
              disabled={selectedQuantity <= 1}
              className="w-7 h-7 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              −
            </button>
            <span className="px-2">{selectedQuantity}</span>
            <button
              onClick={() => setSelectedQuantity((q) => Math.min(q + 1, availableStock))}
              disabled={selectedQuantity >= availableStock}
              className="w-7 h-7 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              +
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!canAdd}
            className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded disabled:bg-gray-400"
          >
            Add 🧺
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;










