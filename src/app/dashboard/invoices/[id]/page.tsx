"use client";

import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";

// Sample invoice detail
const invoice = {
  id: "1",
  invoiceNumber: "INV-2024-001",
  status: "PAID",
  issueDate: "2024-02-01",
  dueDate: "2024-02-20",
  subtotal: 5000.0,
  taxAmount: 500.0,
  discountAmount: 250.0,
  totalAmount: 5250.0,
  paidAmount: 5250.0,
  notes: "Thank you for your business!",
  terms: "Payment is due within 30 days of invoice date.",
  customer: {
    name: "Acme Corp",
    email: "billing@acme.com",
    address: "123 Business Ave",
    city: "San Francisco",
    state: "CA",
    zipCode: "94105",
  },
  lineItems: [
    { id: "1", description: "Web Development - Homepage Redesign", quantity: 1, unitPrice: 3000.0, taxRate: 10, amount: 3300.0 },
    { id: "2", description: "SEO Optimization Package", quantity: 1, unitPrice: 1500.0, taxRate: 10, amount: 1650.0 },
    { id: "3", description: "Content Writing - 5 Blog Posts", quantity: 5, unitPrice: 100.0, taxRate: 10, amount: 550.0 },
  ],
  payments: [
    { id: "1", amount: 5250.0, method: "BANK_TRANSFER", paidAt: "2024-02-15", reference: "TRF-98765" },
  ],
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-700",
};

export default function InvoiceDetailPage() {
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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
              <span className={`badge ${statusColors[invoice.status]}`}>{invoice.status}</span>
            </div>
            <p className="text-sm text-gray-500">Issued {formatDate(invoice.issueDate)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">
            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download PDF
          </button>
          <button className="btn-primary">
            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            Send to Customer
          </button>
        </div>
      </div>

      {/* Invoice content */}
      <div className="card">
        {/* From / To */}
        <div className="mb-8 grid grid-cols-2 gap-8">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-gray-400">From</p>
            <p className="font-semibold text-gray-900">Your Organization</p>
            <p className="text-sm text-gray-500">123 Business St, Suite 100</p>
            <p className="text-sm text-gray-500">San Francisco, CA 94105</p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Bill To</p>
            <p className="font-semibold text-gray-900">{invoice.customer.name}</p>
            <p className="text-sm text-gray-500">{invoice.customer.address}</p>
            <p className="text-sm text-gray-500">
              {invoice.customer.city}, {invoice.customer.state} {invoice.customer.zipCode}
            </p>
            <p className="text-sm text-gray-500">{invoice.customer.email}</p>
          </div>
        </div>

        {/* Dates */}
        <div className="mb-8 flex gap-8">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-400">Issue Date</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(invoice.issueDate)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-400">Due Date</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(invoice.dueDate)}</p>
          </div>
        </div>

        {/* Line items table */}
        <table className="mb-8 w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-3 text-left text-xs font-semibold uppercase text-gray-500">Description</th>
              <th className="pb-3 text-right text-xs font-semibold uppercase text-gray-500">Qty</th>
              <th className="pb-3 text-right text-xs font-semibold uppercase text-gray-500">Unit Price</th>
              <th className="pb-3 text-right text-xs font-semibold uppercase text-gray-500">Tax</th>
              <th className="pb-3 text-right text-xs font-semibold uppercase text-gray-500">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.lineItems.map((item) => (
              <tr key={item.id}>
                <td className="py-3 text-sm text-gray-900">{item.description}</td>
                <td className="py-3 text-right text-sm text-gray-500">{item.quantity}</td>
                <td className="py-3 text-right text-sm text-gray-500">{formatCurrency(item.unitPrice)}</td>
                <td className="py-3 text-right text-sm text-gray-500">{item.taxRate}%</td>
                <td className="py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tax</span>
              <span className="text-gray-900">{formatCurrency(invoice.taxAmount)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="text-red-600">-{formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">{formatCurrency(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount Paid</span>
              <span className="text-green-600">{formatCurrency(invoice.paidAmount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span className="text-gray-900">Balance Due</span>
              <span className="text-gray-900">{formatCurrency(invoice.totalAmount - invoice.paidAmount)}</span>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="mt-8 space-y-4 border-t border-gray-200 pt-6">
            {invoice.notes && (
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">Notes</p>
                <p className="mt-1 text-sm text-gray-600">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">Terms & Conditions</p>
                <p className="mt-1 text-sm text-gray-600">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Payment History</h2>
        <div className="space-y-3">
          {invoice.payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between rounded-lg bg-green-50 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(payment.amount)} via {payment.method.replace("_", " ")}
                  </p>
                  <p className="text-xs text-gray-500">
                    Ref: {payment.reference} - {formatDate(payment.paidAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
