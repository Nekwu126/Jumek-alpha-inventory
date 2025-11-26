import React from "react";
import {useState, useEffect} from 'react';
import "./Inventory.css";

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    stock: "",
    price: "",
    lowStockAlert: 10,
  });
  const [editingProduct, setEditingProduct] = useState(null);

  // Fetch products
  const fetchProducts = async () => {
    try {
      const res = await fetch("https://inventory-backend-u69e.onrender.com/api/products");
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle inputs
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const url = editingProduct
      ? `https://inventory-backend-u69e.onrender.com/api/products/${editingProduct._id}`
      : "https://inventory-backend-u69e.onrender.com/api/products";

    const method = editingProduct ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.message);
        return;
      }

      setForm({ name: "", sku: "", stock: "", price: "", lowStockAlert: 10 });
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      console.error("Error saving product:", err);
    }
  };

  // Delete product
const deleteProduct = async (id) => {
  if (!window.confirm("Are you sure you want to delete this product?")) return;

  try {
    const res = await fetch(`https://inventory-backend-u69e.onrender.com/api/products/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const error = await res.json();
      alert(error.message);
      return;
    }

    fetchProducts(); // refresh list
  } catch (err) {
    console.error("Error deleting product:", err);
  }
};


  // Load product into form for editing
  const startEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      sku: product.sku,
      stock: product.stock,
      price: product.price,
      lowStockAlert: product.lowStockAlert,
    });
  };

  return (
    <>
      <div className="inventory-container">
        <h1>Inventory Manager</h1>

        {/* Product Form */}
        <form className="inventory-form" onSubmit={handleSubmit}>
          <h2>{editingProduct ? "Edit Product" : "Add New Product"}</h2>

          <input
            type="text"
            name="name"
            placeholder="Product Name"
            value={form.name}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="sku"
            placeholder="SKU"
            value={form.sku}
            onChange={handleChange}
            required
          />

          <input
            type="number"
            name="stock"
            placeholder="Stock"
            value={form.stock}
            onChange={handleChange}
            required
          />

          <input
            type="number"
            name="price"
            placeholder="Price"
            value={form.price}
            onChange={handleChange}
            required
          />

          <input
            type="number"
            name="lowStockAlert"
            placeholder="Low Stock Alert"
            value={form.lowStockAlert}
            onChange={handleChange}
            required
          />

          <button type="submit">
            {editingProduct ? "Update Product" : "Add Product"}
          </button>

          {editingProduct && (
            <button
              type="button"
              className="cancel-btn"
              onClick={() => {
                setEditingProduct(null);
                setForm({
                  name: "",
                  sku: "",
                  stock: "",
                  price: "",
                  lowStockAlert: 10,
                });
              }}
            >
              Cancel Edit
            </button>
          )}
        </form>

        {/* Products Table */}
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Stock</th>
              <th>Price</th>
              <th>Low Stock?</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty">
                  No products yet
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr
                  key={p._id}
                  className={p.stock <= p.lowStockAlert ? "low-stock" : ""}
                >
                  <td>{p.name}</td>
                  <td>{p.sku}</td>
                  <td>{p.stock}</td>
                  <td>₦{p.price}</td>
                  <td>{p.stock <= p.lowStockAlert ? "⚠️ Yes" : "No"}</td>

                  <td>
                    <button className="edit-btn" onClick={() => startEdit(p)}>
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => deleteProduct(p._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      ); 
    </>
  );
}
