import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import "./AdminPage.css";
import apiBaseUrl from "../config";

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
}

const AdminPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const toggleExpanded = (id: number) => {
    setExpanded((prev: number | null) => (prev === id ? null : id));
  };

  const fetchProducts = useCallback(async () => {
    const endpoint = showArchived
      ? `${apiBaseUrl}/products/all`
      : `${apiBaseUrl}/products`;

    const res = await axios.get(endpoint, { withCredentials: true });
    const data = res.data.map((p: any) => ({
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
    }));
    setProducts(data.sort((a: Product, b: Product) => a.displayOrder - b.displayOrder));
  }, [showArchived]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleChange = (
    id: number | undefined,
    field: keyof Product,
    value: string | number | boolean
  ) => {
    setProducts((prev) =>
      prev.map((p) => (p.productId === id ? { ...p, [field]: value } : p))
    );
  };

  const saveProduct = async (product: Product) => {
    if (
      product.imageURL &&
      !product.imageURL.startsWith("http://") &&
      !product.imageURL.startsWith("https://")
    ) {
      alert("Please enter a valid image URL starting with http:// or https://");
      return;
    }

    try {
      await axios.put(`${apiBaseUrl}/products/${product.productId}`, product, {
        withCredentials: true,
      });
      alert("Product updated successfully!");
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert("Failed to update product.");
    }
  };

  const addProduct = async () => {
    try {
      const newProduct: Product = {
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
      };
      const res = await axios.post(`${apiBaseUrl}/products`, newProduct, {
        withCredentials: true,
      });
      if (res.status === 201) fetchProducts();
    } catch (err) {
      console.error(err);
      alert("Failed to add product.");
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
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert("Failed to update archive status.");
    }
  };

  return (
    <div className="admin-container max-w-5xl mx-auto px-4 md:px-6">
      <h1 className="admin-title">🛠️ Product Admin</h1>

      <div className="mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={() => setShowArchived((prev) => !prev)}
          />
          Show Archived Products
        </label>
      </div>

      <button className="admin-add-btn" onClick={addProduct}>
        ➕ Add Product
      </button>

      {products.map((product) => (
        <div key={product.productId} className="admin-product-card border rounded-lg p-4 my-4 shadow-sm">
          <h2
            className="text-lg font-semibold mb-3 cursor-pointer"
            onClick={() => toggleExpanded(product.productId!)}
          >
            {product.name}
          </h2>

          {expanded === product.productId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(["displayOrder", "price", "stock", "weight", "length", "width", "height"] as const).map((dim) => (
                <div className="admin-field" key={dim}>
                  <label>{dim.charAt(0).toUpperCase() + dim.slice(1)} {["price"].includes(dim) ? "($)" : "(in)"}</label>
                  <input
                    type="number"
                    value={
                      typeof product[dim] === "number" ? product[dim] as number : 0
                    }
                    onChange={(e) =>
                      handleChange(product.productId, dim, parseFloat(e.target.value))
                    }
                    className="border rounded px-2 py-1 w-full"
                  />
                </div>
              ))}

              <div className="admin-field col-span-2">
                <label>Product Name</label>
                <input
                  type="text"
                  value={product.name}
                  onChange={(e) =>
                    handleChange(product.productId, "name", e.target.value)
                  }
                  className="border rounded px-2 py-1 w-full"
                />
              </div>

              <div className="admin-field col-span-2">
                <label>Description</label>
                <input
                  type="text"
                  value={product.description}
                  onChange={(e) =>
                    handleChange(product.productId, "description", e.target.value)
                  }
                  className="border rounded px-2 py-1 w-full"
                />
              </div>

              <div className="admin-field col-span-2">
                <label>Image URL</label>
                <input
                  type="text"
                  value={product.imageURL}
                  onChange={(e) =>
                    handleChange(product.productId, "imageURL", e.target.value)
                  }
                  className="border rounded px-2 py-1 w-full"
                />
                {product.imageURL && (
                  <img
                    src={product.imageURL}
                    alt="Preview"
                    className="admin-img-preview mt-2 max-h-40 object-contain"
                  />
                )}
              </div>

              <div className="admin-checkbox col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={product.localPickupOnly}
                    onChange={(e) =>
                      handleChange(product.productId, "localPickupOnly", e.target.checked)
                    }
                  />
                  Local Pickup Only
                </label>
              </div>

              <div className="admin-actions col-span-2">
                <button className="save-btn" onClick={() => saveProduct(product)}>
                  💾 Save
                </button>
                <button
                  className={product.isArchived ? "recover-btn" : "delete-btn"}
                  onClick={() => toggleArchive(product)}
                >
                  {product.isArchived ? "♻️ Recover" : "🗃️ Archive"}
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










