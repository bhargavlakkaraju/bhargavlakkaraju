"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Modal from "@/components/ui/Modal";

const sampleExpenses = [
  { id: "1", description: "Office Rent - February", amount: 2500, category: "Rent", vendor: "BuildingCo", date: "2024-02-01" },
  { id: "2", description: "Cloud Hosting - AWS", amount: 847.32, category: "Technology", vendor: "Amazon Web Services", date: "2024-02-03" },
  { id: "3", description: "Team Lunch", amount: 156.5, category: "Meals", vendor: "The Garden Restaurant", date: "2024-02-05" },
  { id: "4", description: "Software License - Figma", amount: 75, category: "Software", vendor: "Figma Inc", date: "2024-02-07" },
  { id: "5", description: "Marketing - Google Ads", amount: 1200, category: "Marketing", vendor: "Google", date: "2024-02-10" },
  { id: "6", description: "Office Supplies", amount: 342.18, category: "Supplies", vendor: "Staples", date: "2024-02-12" },
  { id: "7", description: "Internet Service", amount: 199, category: "Utilities", vendor: "Comcast Business", date: "2024-02-14" },
  { id: "8", description: "Professional Development - Course", amount: 499, category: "Training", vendor: "Udemy", date: "2024-02-15" },
];

const categories = ["Rent", "Technology", "Meals", "Software", "Marketing", "Supplies", "Utilities", "Training", "Travel", "Other"];

export default function ExpensesPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const filtered = sampleExpenses.filter(
    (e) => selectedCategory === "ALL" || e.category === selectedCategory
  );

  const totalByCategory = sampleExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const totalExpenses = sampleExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500">Track and categorize your business expenses</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Expense
        </button>
      </div>

      {/* Stats & Category Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Expense Breakdown</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(totalByCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([category, total]) => (
                <div
                  key={category}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                    selectedCategory === category
                      ? "border-brand-300 bg-brand-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedCategory(selectedCategory === category ? "ALL" : category)}
                >
                  <p className="text-xs text-gray-500">{category}</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(total)}</p>
                  <p className="text-xs text-gray-400">
                    {((total / totalExpenses) * 100).toFixed(1)}%
                  </p>
                </div>
              ))}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Summary</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Total This Month</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Avg Daily</span>
                <span className="font-medium">{formatCurrency(totalExpenses / 28)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Categories</span>
                <span className="font-medium">{Object.keys(totalByCategory).length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Transactions</span>
                <span className="font-medium">{sampleExpenses.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses table */}
      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Description</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Category</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Amount</th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((expense) => (
              <tr key={expense.id} className="transition-colors hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{expense.description}</td>
                <td className="px-6 py-4">
                  <span className="badge bg-gray-100 text-gray-700">{expense.category}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{expense.vendor}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{formatDate(expense.date)}</td>
                <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                  {formatCurrency(expense.amount)}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Edit">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                    </button>
                    <button className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600" title="Delete">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Expense">
        <form className="space-y-4">
          <div>
            <label className="label">Description</label>
            <input type="text" className="input" placeholder="What was this expense for?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount</label>
              <input type="number" className="input" placeholder="0.00" min="0" step="0.01" />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input">
                <option value="">Select category...</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Vendor</label>
              <input type="text" className="input" placeholder="Vendor name" />
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} placeholder="Additional notes..." />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add Expense</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
