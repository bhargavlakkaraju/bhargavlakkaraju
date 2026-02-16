"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

const sampleInvoices = [
  { id: "1", invoiceNumber: "INV-2024-001", customer: { name: "Acme Corp", email: "billing@acme.com" }, status: "PAID", totalAmount: 5250.0, paidAmount: 5250.0, dueDate: "2024-02-20", issueDate: "2024-02-01" },
  { id: "2", invoiceNumber: "INV-2024-002", customer: { name: "TechStart Inc", email: "finance@techstart.io" }, status: "SENT", totalAmount: 3750.0, paidAmount: 0, dueDate: "2024-02-25", issueDate: "2024-02-05" },
  { id: "3", invoiceNumber: "INV-2024-003", customer: { name: "GlobalTrade LLC", email: "ap@globaltrade.com" }, status: "OVERDUE", totalAmount: 12800.0, paidAmount: 0, dueDate: "2024-02-10", issueDate: "2024-01-25" },
  { id: "4", invoiceNumber: "INV-2024-004", customer: { name: "DesignHub", email: "pay@designhub.co" }, status: "DRAFT", totalAmount: 1900.0, paidAmount: 0, dueDate: "2024-03-01", issueDate: "2024-02-13" },
  { id: "5", invoiceNumber: "INV-2024-005", customer: { name: "CloudNine", email: "billing@cloudnine.io" }, status: "PARTIALLY_PAID", totalAmount: 8400.0, paidAmount: 4200.0, dueDate: "2024-02-28", issueDate: "2024-02-08" },
  { id: "6", invoiceNumber: "INV-2024-006", customer: { name: "DataFlow Inc", email: "finance@dataflow.com" }, status: "SENT", totalAmount: 6300.0, paidAmount: 0, dueDate: "2024-03-05", issueDate: "2024-02-12" },
  { id: "7", invoiceNumber: "INV-2024-007", customer: { name: "NexGen Solutions", email: "ap@nexgen.io" }, status: "PAID", totalAmount: 7500.0, paidAmount: 7500.0, dueDate: "2024-02-18", issueDate: "2024-02-03" },
];

export default function InvoicesPage() {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const filteredInvoices = sampleInvoices.filter((inv) => {
    if (filter !== "ALL" && inv.status !== filter) return false;
    if (search && !inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) && !inv.customer.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusCounts = {
    ALL: sampleInvoices.length,
    DRAFT: sampleInvoices.filter((i) => i.status === "DRAFT").length,
    SENT: sampleInvoices.filter((i) => i.status === "SENT").length,
    PAID: sampleInvoices.filter((i) => i.status === "PAID").length,
    OVERDUE: sampleInvoices.filter((i) => i.status === "OVERDUE").length,
    PARTIALLY_PAID: sampleInvoices.filter((i) => i.status === "PARTIALLY_PAID").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500">Manage and track all your invoices</p>
        </div>
        <Link href="/dashboard/invoices/new" className="btn-primary">
          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Invoice
        </Link>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card">
          <p className="text-sm text-gray-500">Total Invoiced</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(45900)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total Collected</p>
          <p className="mt-1 text-xl font-bold text-green-600">{formatCurrency(16950)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Outstanding</p>
          <p className="mt-1 text-xl font-bold text-blue-600">{formatCurrency(16150)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Overdue</p>
          <p className="mt-1 text-xl font-bold text-red-600">{formatCurrency(12800)}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === status
                  ? "bg-brand-100 text-brand-700"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {status === "ALL" ? "All" : status.replace("_", " ")}{" "}
              <span className="ml-1 text-xs">({count})</span>
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search invoices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-xs"
        />
      </div>

      {/* Invoices table */}
      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Invoice</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Issue Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Due Date</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Amount</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Paid</th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredInvoices.map((invoice) => (
              <tr key={invoice.id} className="transition-colors hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link href={`/dashboard/invoices/${invoice.id}`} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                    {invoice.invoiceNumber}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-900">{invoice.customer.name}</p>
                  <p className="text-xs text-gray-500">{invoice.customer.email}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`badge ${getStatusColor(invoice.status)}`}>
                    {invoice.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{formatDate(invoice.issueDate)}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{formatDate(invoice.dueDate)}</td>
                <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                  {formatCurrency(invoice.totalAmount)}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium text-green-600">
                  {formatCurrency(invoice.paidAmount)}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Send">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                    </button>
                    <button className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Download PDF">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
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
    </div>
  );
}
