import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { apiBaseUrl } from "../config";
import { toast } from "react-toastify";

interface Product {
  productId?: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageURL: string;
  localPickupOnly: boolean;
  displayOrder: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  isArchived?: boolean;
  category?: string;
}

const AdminPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const labelMap: Record<keyof Pick<
    Product,
    "displayOrder" | "price" | "stock" | "weight" | "length" | "width" | "height"
  >, string> = {
    displayOrder: "Display Order",
    price: "Price ($)",
    stock: "Stock (qty)",
    weight: "Weight (oz)",
    length: "Length (in)",
    width: "Width (in)",
    height: "Height (in)",
  };

  const productFields = Object.keys(labelMap) as (keyof typeof labelMap)[];

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  const fetchProducts = useCallback(async () => {
    try {
      const endpoint = showArchived ? `${apiBaseUrl}/products/all` : `${apiBaseUrl}/products`;
      const res = await axios.get(endpoint, { withCredentials: true });
      const data = res.data.map((p: any): Product => ({
        productId: p.ProductId,
        name: p.Name,
        description: p.Description,
        price: p.Price,
        stock: p.StockQty,
        imageURL: p.ImageUrl,
        localPickupOnly: p.LocalPickupOnly,
        displayOrder: p.DisplayOrder ?? 0,
        weight: p.Weight,
        length: p.Length,
        width: p.Width,
        height: p.Height,
        isArchived: p.IsArchived === true,
        category: p.Category,
      }));
      setProducts(data.sort((a: Product, b: Product) => a.displayOrder - b.displayOrder)
    );
    } catch (err) {
      toast.error("❌ Failed to load products.");
      console.error(err);
    }
  }, [showArchived]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleChange = (id: number | undefined, field: keyof Product, value: string | number | boolean) => {
    setProducts((prev) =>
      prev.map((p) => (p.productId === id ? { ...p, [field]: value } : p))
    );
  };

  const saveProduct = async (product: Product) => {
    try {
      await axios.put(`${apiBaseUrl}/products/${product.productId}`, product, {
        withCredentials: true,
      });
      toast.success("💾 Product saved.");
      fetchProducts();
    } catch (err) {
      toast.error("❌ Failed to save product.");
      console.error(err);
    }
  };

  const deleteProduct = async (id: number) => {
    try {
      await axios.delete(`${apiBaseUrl}/products/${id}`, { withCredentials: true });
      toast.success("🗑️ Product deleted.");
      fetchProducts();
    } catch (err: any) {
      const msg = err?.response?.data || "Failed to delete.";
      toast.error(`❌ ${msg}`);
    }
  };

  const toggleArchive = async (product: Product) => {
    const newStatus = !product.isArchived;
    try {
      await axios.put(
        `${apiBaseUrl}/products/${product.productId}/archive`,
        { isArchived: newStatus },
        { withCredentials: true }
      );
      toast.success(newStatus ? "♻️ Recovered." : "🗃️ Archived.");
      fetchProducts();
    } catch (err) {
      toast.error("❌ Failed to toggle archive.");
      console.error(err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-[#4a3a28]">🛠️ Product Admin</h1>

      <div className="mb-6 flex items-center gap-2">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={() => setShowArchived((prev) => !prev)}
          className="w-4 h-4"
        />
        <label className="text-gray-700 text-lg">Show Archived Products</label>
      </div>

      <button
        className="mb-8 bg-[#a8936a] hover:bg-[#967f55] text-white font-semibold py-2 px-6 rounded transition"
        onClick={async () => {
          try {
            const res = await axios.post(`${apiBaseUrl}/products`, {
              name: "New Product",
              description: "",
              price: 0,
              stock: 0,
              imageURL: "",
              localPickupOnly: false,
              displayOrder: products.length + 1,
              weight: 0,
              length: 0,
              width: 0,
              height: 0,
              category: "",
            }, { withCredentials: true });
            toast.success("➕ Product created.");
            fetchProducts();
          } catch (err) {
            toast.error("❌ Failed to create product.");
          }
        }}
      >
        ➕ Add Product
      </button>

      {products.map((product) => (
        <div key={product.productId} className="border rounded-lg p-4 mb-6 bg-white shadow">
          <h2
            className="text-xl font-semibold mb-4 cursor-pointer text-[#4a3a28]"
            onClick={() => toggleExpanded(product.productId!)}
          >
            {product.name}
          </h2>

          {expanded === product.productId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productFields.map((dim) => (
                <div key={dim} className="flex flex-col">
                  <label className="text-gray-600 mb-1">{labelMap[dim]}</label>
                  <input
                    type="number"
                    value={typeof product[dim] === "number" ? (product[dim] as number) : 0}
                    onChange={(e) => handleChange(product.productId, dim, parseFloat(e.target.value))}
                    className="border rounded px-3 py-2"
                  />
                </div>
              ))}

              <div className="flex flex-col md:col-span-2">
                <label className="text-gray-600 mb-1">Product Name</label>
                <input
                  type="text"
                  value={product.name}
                  onChange={(e) => handleChange(product.productId, "name", e.target.value)}
                  className="border rounded px-3 py-2"
                />
              </div>

              <div className="flex flex-col md:col-span-2">
                <label className="text-gray-600 mb-1">Description</label>
                <input
                  type="text"
                  value={product.description}
                  onChange={(e) => handleChange(product.productId, "description", e.target.value)}
                  className="border rounded px-3 py-2"
                />
              </div>

              <div className="flex flex-col md:col-span-2">
                <label className="text-gray-600 mb-1">Category</label>
                <input
                  type="text"
                  value={product.category || ""}
                  onChange={(e) => handleChange(product.productId, "category", e.target.value)}
                  className="border rounded px-3 py-2"
                />
              </div>

              <div className="flex flex-col md:col-span-2">
                <label className="text-gray-600 mb-1">Image URL</label>
                <input
                  type="text"
                  value={product.imageURL}
                  onChange={(e) => handleChange(product.productId, "imageURL", e.target.value)}
                  className="border rounded px-3 py-2"
                />
                {product.imageURL && (
                  <img
                    src={product.imageURL}
                    alt="Preview"
                    className="mt-3 max-h-40 object-contain rounded shadow"
                  />
                )}
              </div>

              <div className="flex items-center md:col-span-2 gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={product.localPickupOnly}
                  onChange={(e) => handleChange(product.productId, "localPickupOnly", e.target.checked)}
                  className="w-4 h-4"
                />
                <label className="text-gray-700">Local Pickup Only</label>
              </div>

              <div className="flex flex-wrap gap-4 mt-6 md:col-span-2">
                <button
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded transition"
                  onClick={() => saveProduct(product)}
                >
                  💾 Save
                </button>

                <button
                  className={`${
                    product.isArchived ? "bg-blue-500 hover:bg-blue-600" : "bg-red-500 hover:bg-red-600"
                  } text-white font-semibold py-2 px-6 rounded transition`}
                  onClick={() => toggleArchive(product)}
                >
                  {product.isArchived ? "♻️ Recover" : "🗃️ Archive"}
                </button>

                <button
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded transition"
                  onClick={() => deleteProduct(product.productId!)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminPage;












