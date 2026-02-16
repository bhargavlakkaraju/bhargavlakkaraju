"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import Modal from "@/components/ui/Modal";

const sampleProducts = [
  { id: "1", name: "Web Development Package", sku: "WEB-001", category: "Services", unitPrice: 3000, costPrice: 1200, quantity: 999, reorderLevel: 0, unit: "pkg", isActive: true },
  { id: "2", name: "SEO Optimization", sku: "SEO-001", category: "Services", unitPrice: 1500, costPrice: 600, quantity: 999, reorderLevel: 0, unit: "pkg", isActive: true },
  { id: "3", name: "Widget A", sku: "WGT-A01", category: "Hardware", unitPrice: 49.99, costPrice: 22.5, quantity: 8, reorderLevel: 25, unit: "pcs", isActive: true },
  { id: "4", name: "Widget B", sku: "WGT-B01", category: "Hardware", unitPrice: 89.99, costPrice: 42.0, quantity: 150, reorderLevel: 20, unit: "pcs", isActive: true },
  { id: "5", name: "Server Rack Unit", sku: "SRV-001", category: "Hardware", unitPrice: 299.99, costPrice: 180.0, quantity: 5, reorderLevel: 10, unit: "pcs", isActive: true },
  { id: "6", name: "Monthly Support Plan", sku: "SUP-001", category: "Services", unitPrice: 500, costPrice: 200, quantity: 999, reorderLevel: 0, unit: "mo", isActive: true },
  { id: "7", name: "USB-C Cable (3ft)", sku: "CBL-001", category: "Accessories", unitPrice: 12.99, costPrice: 4.5, quantity: 3, reorderLevel: 50, unit: "pcs", isActive: true },
  { id: "8", name: "Ethernet Patch Cable", sku: "CBL-002", category: "Accessories", unitPrice: 8.99, costPrice: 2.8, quantity: 200, reorderLevel: 30, unit: "pcs", isActive: false },
];

export default function InventoryPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const lowStockProducts = sampleProducts.filter(
    (p) => p.reorderLevel > 0 && p.quantity <= p.reorderLevel
  );

  const filtered = sampleProducts.filter((p) => {
    if (filter === "LOW_STOCK" && (p.reorderLevel === 0 || p.quantity > p.reorderLevel)) return false;
    if (filter === "ACTIVE" && !p.isActive) return false;
    if (filter === "INACTIVE" && p.isActive) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalInventoryValue = sampleProducts.reduce(
    (sum, p) => sum + p.quantity * p.costPrice,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">Manage products, stock levels, and pricing</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Product
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card">
          <p className="text-sm text-gray-500">Total Products</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{sampleProducts.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Inventory Value</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(totalInventoryValue)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Low Stock Items</p>
          <p className="mt-1 text-xl font-bold text-red-600">{lowStockProducts.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Categories</p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {new Set(sampleProducts.map((p) => p.category)).size}
          </p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <h3 className="font-semibold text-red-800">Low Stock Alert</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockProducts.map((p) => (
              <span key={p.id} className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">
                {p.name}: {p.quantity} left (reorder at {p.reorderLevel})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {["ALL", "ACTIVE", "LOW_STOCK", "INACTIVE"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f ? "bg-brand-100 text-brand-700" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {f === "ALL" ? "All" : f === "LOW_STOCK" ? "Low Stock" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-xs"
        />
      </div>

      {/* Products table */}
      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Product</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Category</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Price</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Cost</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Stock</th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((product) => {
              const isLowStock = product.reorderLevel > 0 && product.quantity <= product.reorderLevel;
              return (
                <tr key={product.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-500">{product.sku}</td>
                  <td className="px-6 py-4">
                    <span className="badge bg-gray-100 text-gray-700">{product.category}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(product.unitPrice)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-500">
                    {formatCurrency(product.costPrice)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-semibold ${isLowStock ? "text-red-600" : "text-gray-900"}`}>
                      {product.quantity} {product.unit}
                    </span>
                    {isLowStock && (
                      <p className="text-xs text-red-500">Below reorder level</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`badge ${product.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {product.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Edit">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Adjust stock">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Product" size="lg">
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Product Name</label>
              <input type="text" className="input" placeholder="Product name" />
            </div>
            <div>
              <label className="label">SKU</label>
              <input type="text" className="input" placeholder="SKU-001" />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} placeholder="Product description..." />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Unit Price</label>
              <input type="number" className="input" placeholder="0.00" min="0" step="0.01" />
            </div>
            <div>
              <label className="label">Cost Price</label>
              <input type="number" className="input" placeholder="0.00" min="0" step="0.01" />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input">
                <option value="">Select...</option>
                <option>Services</option>
                <option>Hardware</option>
                <option>Accessories</option>
                <option>Software</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Initial Stock</label>
              <input type="number" className="input" placeholder="0" min="0" />
            </div>
            <div>
              <label className="label">Reorder Level</label>
              <input type="number" className="input" placeholder="10" min="0" />
            </div>
            <div>
              <label className="label">Unit</label>
              <input type="text" className="input" placeholder="pcs" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add Product</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
