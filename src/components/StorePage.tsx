import React, { useState, ChangeEvent, useEffect } from "react";
import axios from "axios";
import ProductCard from "./ProductCard";
import apiBaseUrl from "../config";

export interface Product {
  productId?: number;
  name: string;
  description: string;
  price: number;
  imageURL: string;
  visible?: boolean;
  localPickupOnly: boolean;
  quantityInCart: number;
  stock: number;
  displayOrder?: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
}

interface StoreProps {
  cart: Product[];
  setCart: React.Dispatch<React.SetStateAction<Product[]>>;
  setPage: (page: string) => void; // ✅ added this
}

const StorePage: React.FC<StoreProps> = ({ cart, setCart, setPage }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState<string>("");
  const [localToggle, setLocalToggle] = useState<boolean>(true);

  useEffect(() => {
    axios.get(`${apiBaseUrl}/products`).then((response) => {
      const formatted: Product[] = response.data.map((p: any): Product => ({
        productId: p.ProductId,
        name: p.Name,
        description: p.Description,
        price: p.Price,
        stock: p.StockQty,
        imageURL: p.ImageUrl,
        localPickupOnly: p.LocalPickupOnly,
        quantityInCart: 0,
        displayOrder: p.DisplayOrder ?? 0,
        weight: p.Weight,
        length: p.Length,
        width: p.Width,
        height: p.Height,
      }));
    
      setProducts(formatted); // ✅ THIS LINE!
    });
    
   
  }, []);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value.toLowerCase());
  };

  const handleCheckboxChange = () => {
    setLocalToggle((prevState) => !prevState);
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(search) &&
      (localToggle || !product.localPickupOnly)
  );

  const addToCart = (product: Product, quantity: number): void => {
    if (product.stock <= 0 || quantity <= 0) return;

    setCart((prevCart) => {
      const index = prevCart.findIndex((item) => item.name === product.name);

      if (index !== -1) {
        const existing = prevCart[index];
        const newQuantity = Math.min(existing.quantityInCart + quantity, product.stock);
        const updatedCart = [...prevCart];
        updatedCart[index] = { ...existing, quantityInCart: newQuantity };
        return updatedCart;
      } else {
        return [...prevCart, { ...product, quantityInCart: Math.min(quantity, product.stock) }];
      }
    });
  };

  const removeFromCart = (product: Product): void => {
    setCart((prevCart) => {
      const productIndex = prevCart.findIndex((item) => item.name === product.name);
      if (productIndex !== -1) {
        const updatedCart = [...prevCart];
        const currentQty = updatedCart[productIndex].quantityInCart || 0;

        if (currentQty <= 1) {
          updatedCart.splice(productIndex, 1);
        } else {
          updatedCart[productIndex].quantityInCart = currentQty - 1;
        }

        return updatedCart;
      }
      return prevCart;
    });
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantityInCart, 0);
  const totalPrice = cart
    .reduce((sum, item) => sum + item.quantityInCart * item.price, 0)
    .toFixed(2);

  return (
    <div className="store-page pb-28">
      <div className="filter-section my-4 px-4">
        <label className="block mb-2">
          <input
            type="checkbox"
            checked={localToggle}
            onChange={handleCheckboxChange}
            className="mr-2"
          />
          Show items for Local Pickup only in the Saint Helens area
        </label>
        <div className="search-section">
          <label htmlFor="search-input" className="block text-sm font-medium mb-1">
            Search for item:
          </label>
          <input
            id="search-input"
            type="text"
            value={search}
            onChange={handleSearchChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
        {filteredProducts.map((product) => (
          <ProductCard
            addToCart={addToCart}
            removeFromCart={() => removeFromCart(product)}
            product={product}
            key={product.name}
            cart={cart}
          />
        ))}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-4 border-t border-gray-200 z-50">
          <div className="max-w-screen-xl mx-auto flex justify-between items-center">
            <div className="text-sm sm:text-base">
              <span className="font-semibold">{totalItems}</span>{" "}
              item{totalItems !== 1 ? "s" : ""} in cart |{" "}
              <span className="font-semibold">${totalPrice}</span> total
            </div>
            <button
              onClick={() => setPage("Checkout")}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Proceed to Checkout 🛒
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorePage;



