"use client";

import { useState } from "react";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import Modal from "@/components/ui/Modal";

const samplePayments = [
  { id: "1", invoiceNumber: "INV-2024-001", customer: "Acme Corp", amount: 5250.0, method: "BANK_TRANSFER", status: "COMPLETED", paidAt: "2024-02-15", reference: "TRF-98765" },
  { id: "2", invoiceNumber: "INV-2024-007", customer: "NexGen Solutions", amount: 7500.0, method: "STRIPE", status: "COMPLETED", paidAt: "2024-02-13", reference: "pi_3OhKj2" },
  { id: "3", invoiceNumber: "INV-2024-005", customer: "CloudNine", amount: 4200.0, method: "CREDIT_CARD", status: "COMPLETED", paidAt: "2024-02-12", reference: "CC-44821" },
  { id: "4", invoiceNumber: "INV-2024-008", customer: "DataFlow Inc", amount: 2100.0, method: "PAYPAL", status: "PENDING", paidAt: null, reference: "PP-29384" },
  { id: "5", invoiceNumber: "INV-2024-003", customer: "GlobalTrade LLC", amount: 12800.0, method: "BANK_TRANSFER", status: "FAILED", paidAt: null, reference: "TRF-10293" },
];

export default function PaymentsPage() {
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [filter, setFilter] = useState("ALL");

  const filtered = samplePayments.filter(
    (p) => filter === "ALL" || p.status === filter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500">Track and manage all payment transactions</p>
        </div>
        <button onClick={() => setShowRecordModal(true)} className="btn-primary">
          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Record Payment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card">
          <p className="text-sm text-gray-500">Total Received</p>
          <p className="mt-1 text-xl font-bold text-green-600">{formatCurrency(16950)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="mt-1 text-xl font-bold text-yellow-600">{formatCurrency(2100)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Failed</p>
          <p className="mt-1 text-xl font-bold text-red-600">{formatCurrency(12800)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">This Month</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(31850)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["ALL", "COMPLETED", "PENDING", "FAILED", "REFUNDED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === s ? "bg-brand-100 text-brand-700" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Payments table */}
      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Invoice</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Method</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Reference</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((payment) => (
              <tr key={payment.id} className="transition-colors hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-brand-600">{payment.invoiceNumber}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{payment.customer}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{payment.method.replace("_", " ")}</td>
                <td className="px-6 py-4 text-sm text-gray-500 font-mono">{payment.reference}</td>
                <td className="px-6 py-4">
                  <span className={`badge ${getStatusColor(payment.status)}`}>{payment.status}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {payment.paidAt ? formatDate(payment.paidAt) : "—"}
                </td>
                <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                  {formatCurrency(payment.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      <Modal isOpen={showRecordModal} onClose={() => setShowRecordModal(false)} title="Record Payment" size="md">
        <form className="space-y-4">
          <div>
            <label className="label">Invoice</label>
            <select className="input">
              <option value="">Select an invoice...</option>
              <option>INV-2024-002 - TechStart Inc ($3,750.00)</option>
              <option>INV-2024-003 - GlobalTrade LLC ($12,800.00)</option>
              <option>INV-2024-005 - CloudNine ($4,200.00 remaining)</option>
              <option>INV-2024-006 - DataFlow Inc ($6,300.00)</option>
            </select>
          </div>
          <div>
            <label className="label">Amount</label>
            <input type="number" className="input" placeholder="0.00" min="0" step="0.01" />
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select className="input">
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="DEBIT_CARD">Debit Card</option>
              <option value="CASH">Cash</option>
              <option value="CHECK">Check</option>
              <option value="PAYPAL">PayPal</option>
              <option value="STRIPE">Stripe</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Reference Number</label>
            <input type="text" className="input" placeholder="Transaction reference" />
          </div>
          <div>
            <label className="label">Payment Date</label>
            <input type="date" className="input" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} placeholder="Optional notes..." />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setShowRecordModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Record Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
