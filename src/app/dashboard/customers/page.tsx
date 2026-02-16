"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import Modal from "@/components/ui/Modal";

const sampleCustomers = [
  { id: "1", name: "Acme Corp", email: "billing@acme.com", phone: "+1 (555) 123-4567", company: "Acme Corporation", totalInvoiced: 15250, totalPaid: 15250, invoiceCount: 3 },
  { id: "2", name: "TechStart Inc", email: "finance@techstart.io", phone: "+1 (555) 234-5678", company: "TechStart", totalInvoiced: 8750, totalPaid: 5000, invoiceCount: 2 },
  { id: "3", name: "GlobalTrade LLC", email: "ap@globaltrade.com", phone: "+1 (555) 345-6789", company: "GlobalTrade", totalInvoiced: 25600, totalPaid: 12800, invoiceCount: 4 },
  { id: "4", name: "DesignHub", email: "pay@designhub.co", phone: "+1 (555) 456-7890", company: "DesignHub Studio", totalInvoiced: 4200, totalPaid: 4200, invoiceCount: 2 },
  { id: "5", name: "CloudNine", email: "billing@cloudnine.io", phone: "+1 (555) 567-8901", company: "CloudNine Technologies", totalInvoiced: 16800, totalPaid: 8400, invoiceCount: 3 },
  { id: "6", name: "DataFlow Inc", email: "finance@dataflow.com", phone: "+1 (555) 678-9012", company: "DataFlow", totalInvoiced: 9300, totalPaid: 9300, invoiceCount: 2 },
];

export default function CustomersPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = sampleCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">Manage your customer relationships</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Customer
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search customers by name, email, or company..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input max-w-md"
      />

      {/* Customer cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((customer) => (
          <div key={customer.id} className="card transition-shadow hover:shadow-md">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                {customer.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                <p className="text-xs text-gray-500">{customer.company}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                {customer.email}
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                {customer.phone}
              </div>
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-400">Invoices</p>
                  <p className="text-sm font-semibold text-gray-900">{customer.invoiceCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Invoiced</p>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(customer.totalInvoiced)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Paid</p>
                  <p className="text-sm font-semibold text-green-600">{formatCurrency(customer.totalPaid)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Customer Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Customer" size="lg">
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input type="text" className="input" placeholder="John Doe" />
            </div>
            <div>
              <label className="label">Company</label>
              <input type="text" className="input" placeholder="Company name" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="email@company.com" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input type="tel" className="input" placeholder="+1 (555) 000-0000" />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <input type="text" className="input" placeholder="Street address" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">City</label>
              <input type="text" className="input" placeholder="City" />
            </div>
            <div>
              <label className="label">State</label>
              <input type="text" className="input" placeholder="State" />
            </div>
            <div>
              <label className="label">ZIP Code</label>
              <input type="text" className="input" placeholder="00000" />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={3} placeholder="Internal notes about this customer..." />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add Customer</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
