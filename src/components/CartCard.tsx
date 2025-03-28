import React from "react";
import { Product } from "./StorePage";
import "./CartCard.css";

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
  const isStockExceeded: boolean = product.quantityInCart >= product.stock;
  return (
    <div className="product-card">
      <img
        src={product.imageURL}
        alt={product.name}
        className="product-image"
      />
      <p className="product-name">{product.name}</p>
      <p className="product-price">${product.price.toFixed(2)}</p>
      <p className="product-quantity">
        Number in cart:{" "}
        <button onClick={() => decreaseCartQuantity(product)}> - </button>
        {product.quantityInCart}{" "}
        <button
          onClick={() => increaseCartQuantity(product)}
          disabled={isStockExceeded}
          className={isStockExceeded ? "disabled-button" : ""}
        >
          +
        </button>
      </p>
      <p className="product-stock">Number in stock: {product.stock}</p>
      <p className="product-description">{product.description}</p>
      <p>
        {product.localPickupOnly
          ? "Item is for local pickup only"
          : "Item can be shipped to the US"}
      </p>
      <button onClick={() => removeFromCart(product)}>
        Remove All from Cart
      </button>
    </div>
  );
};

export default CartCard;
