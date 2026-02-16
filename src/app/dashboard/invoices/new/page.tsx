"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export default function NewInvoicePage() {
  const [customerId, setCustomerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("Payment is due within 30 days of invoice date.");
  const [discount, setDiscount] = useState(0);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0, taxRate: 0 },
  ]);

  function addLineItem() {
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), description: "", quantity: 1, unitPrice: 0, taxRate: 0 },
    ]);
  }

  function removeLineItem(id: string) {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((item) => item.id !== id));
  }

  function updateLineItem(id: string, field: keyof LineItem, value: string | number) {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const totalTax = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * (item.taxRate / 100),
    0
  );
  const total = subtotal + totalTax - discount;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/invoices" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
            <p className="text-sm text-gray-500">Fill in the details to generate a new invoice</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">Save as Draft</button>
          <button className="btn-primary">Create & Send</button>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main form */}
        <div className="space-y-6 lg:col-span-2">
          {/* Customer selection */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Customer</h2>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="input"
            >
              <option value="">Select a customer...</option>
              <option value="1">Acme Corp - billing@acme.com</option>
              <option value="2">TechStart Inc - finance@techstart.io</option>
              <option value="3">GlobalTrade LLC - ap@globaltrade.com</option>
              <option value="4">DesignHub - pay@designhub.co</option>
              <option value="5">CloudNine - billing@cloudnine.io</option>
            </select>
          </div>

          {/* Line items */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Line Items</h2>
            <div className="space-y-4">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold uppercase text-gray-500">
                <div className="col-span-5">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Price</div>
                <div className="col-span-2">Tax %</div>
                <div className="col-span-1" />
              </div>

              {lineItems.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                      className="input"
                      placeholder="Item description"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                      className="input"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="input"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.taxRate}
                      onChange={(e) => updateLineItem(item.id, "taxRate", parseFloat(e.target.value) || 0)}
                      className="input"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                  <div className="col-span-1 flex items-center">
                    <button
                      onClick={() => removeLineItem(item.id)}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      disabled={lineItems.length <= 1}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              <button onClick={addLineItem} className="btn-ghost text-sm text-brand-600">
                <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Line Item
              </button>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Additional Info</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="Notes visible to customer..."
                />
              </div>
              <div>
                <label className="label">Terms & Conditions</label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="input"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar summary */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Invoice Details</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Discount</label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="input"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span className="font-medium text-gray-900">{formatCurrency(totalTax)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount</span>
                  <span className="font-medium text-red-600">-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-base font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI suggestion */}
          <div className="card border-brand-200 bg-brand-50">
            <div className="mb-2 flex items-center gap-2">
              <svg className="h-4 w-4 text-brand-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <span className="text-sm font-semibold text-brand-900">AI Suggestions</span>
            </div>
            <ul className="space-y-1 text-xs text-brand-800">
              <li>Set due date to Net 30 for this customer</li>
              <li>This customer typically pays within 15 days</li>
              <li>Consider adding a 2% early payment discount</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
