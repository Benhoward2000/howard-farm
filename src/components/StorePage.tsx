import React, { useState, useEffect } from "react";
import axios from "axios";
import ProductCard from "./ProductCard";
import { apiBaseUrl } from "../config";
import { Helmet } from "react-helmet-async";

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
  category?: string;
}

interface StoreProps {
  cart: Product[];
  setCart: React.Dispatch<React.SetStateAction<Product[]>>;
  setPage: (page: string) => void;
}

const StorePage: React.FC<StoreProps> = ({ cart, setCart, setPage }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [localToggle, setLocalToggle] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    axios.get(`${apiBaseUrl}/products`).then((response) => {
      const formatted = response.data.map((p: any): Product => ({
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
        category: p.Category || "Uncategorized",
      }));
      setProducts(formatted);

      const uniqueCategories: string[] = Array.from(
        new Set<string>(formatted.map((p: Product) => p.category || "Uncategorized"))
      ).sort();
      setCategories(uniqueCategories);
    });
  }, []);

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(search.toLowerCase()) &&
      (localToggle || !product.localPickupOnly) &&
      (categoryFilter === "All" || product.category === categoryFilter)
  );

  const addToCart = (product: Product, quantity: number) => {
    if (product.stock <= 0 || quantity <= 0) return;
    setCart((prev) => {
      const index = prev.findIndex((p) => p.name === product.name);
      if (index !== -1) {
        const updated = [...prev];
        const newQty = Math.min(updated[index].quantityInCart + quantity, product.stock);
        updated[index] = { ...updated[index], quantityInCart: newQty };
        return updated;
      }
      return [...prev, { ...product, quantityInCart: quantity }];
    });
  };

  const removeFromCart = (product: Product) => {
    setCart((prev) => {
      const updated = [...prev];
      const index = updated.findIndex((p) => p.name === product.name);
      if (index !== -1) {
        const qty = updated[index].quantityInCart;
        if (qty <= 1) updated.splice(index, 1);
        else updated[index].quantityInCart = qty - 1;
      }
      return updated;
    });
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantityInCart, 0);
  const totalPrice = cart
    .reduce((sum, item) => sum + item.quantityInCart * item.price, 0)
    .toFixed(2);

  return (
    <>
      <Helmet>
        <title>Shop Jams, Salsa, Hot Sauce, BBQ Sauce & Eggs – Howard's Farm</title>
        <meta
          name="description"
          content="Browse small-batch jams, jellies, salsa, hot sauce, BBQ sauce, and fresh farm eggs. Made in Saint Helens, Oregon. Local pickup and shipping available."
        />
        <meta
          name="keywords"
          content="jam, jelly, salsa, hot sauce, bbq sauce, eggs, homemade, Saint Helens Oregon, Yankton, local farm, small batch, farm fresh, local pickup"
        />
      </Helmet>

      <div className="pb-28">
        <div className="flex flex-col md:flex-row md:items-end md:space-x-6 space-y-4 md:space-y-0 px-4 py-6 bg-white shadow-sm rounded-xl mb-6">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={localToggle}
              onChange={() => setLocalToggle(!localToggle)}
              className="mr-2"
            />
            Local Pickup only
          </label>

          <div className="flex-1">
            <label htmlFor="category" className="block text-xs text-gray-600 mb-1">
              Category
            </label>
            <select
              id="category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="All">All</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="search" className="block text-xs text-gray-600 mb-1">
              Search
            </label>
            <input
              id="search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.name}
              product={product}
              cart={cart}
              addToCart={addToCart}
              removeFromCart={removeFromCart}
            />
          ))}
        </div>

        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-4 border-t border-gray-200 z-50">
            <div className="max-w-screen-xl mx-auto flex justify-between items-center">
              <div className="text-sm sm:text-base">
                <strong>{totalItems}</strong> item{totalItems !== 1 ? "s" : ""} | Total:{" "}
                <strong>${totalPrice}</strong>
              </div>
              <button
                onClick={() => setPage("Checkout")}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                Proceed to Checkout 🛒
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default StorePage;







