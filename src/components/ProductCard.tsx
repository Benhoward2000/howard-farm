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

  const handleIncrease = () => {
    if (selectedQuantity < availableStock) {
      setSelectedQuantity((prev) => prev + 1);
    }
  };

  const handleDecrease = () => {
    if (selectedQuantity > 1) {
      setSelectedQuantity((prev) => prev - 1);
    }
  };

  const handleAddToCart = () => {
    if (canAdd) {
      addToCart(product, selectedQuantity);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition duration-300 flex flex-col">
      <div className="flex items-center justify-center bg-white h-48 md:h-56 lg:h-64 overflow-hidden">
  <img
    src={product.imageURL}
    alt={product.name}
    className="object-contain h-full max-w-full"
  />
</div>


      <div className="p-4 flex flex-col justify-between grow">
        <div>
          <h2 className="text-lg font-bold mb-1">{product.name}</h2>
          <p className="text-sm italic text-gray-600">{product.description}</p>
          <p className="text-sm mt-1">
            Availability:{" "}
            <strong>{availableStock > 0 ? "In Stock" : "Out of Stock"}</strong>
          </p>
          {showLowStock && (
            <p className="text-red-600 text-sm font-semibold">
              Only {availableStock} left in stock!
            </p>
          )}
          {quantityInCart > 0 && (
            <p className="text-green-600 text-sm mt-1">
              You have {quantityInCart} in your cart.
            </p>
          )}
        </div>

        <div className="mt-4">
          <p className="text-xl font-bold">${product.price.toFixed(2)}</p>
          <p className="text-sm text-gray-500">
            {product.localPickupOnly ? "Local pickup only" : "Shipping available"}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDecrease}
              disabled={selectedQuantity <= 1}
              className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              −
            </button>
            <span className="font-semibold">{selectedQuantity}</span>
            <button
              onClick={handleIncrease}
              disabled={selectedQuantity >= availableStock}
              className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              +
            </button>
          </div>

          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            onClick={handleAddToCart}
            disabled={!canAdd}
          >
            Add to Basket 🧺
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;









