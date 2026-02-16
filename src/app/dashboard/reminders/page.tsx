"use client";

import { useState } from "react";
import { formatDate, formatDateTime, getStatusColor } from "@/lib/utils";
import Modal from "@/components/ui/Modal";

const sampleReminders = [
  { id: "1", type: "PAYMENT_DUE", message: "Invoice INV-2024-002 payment due in 3 days", invoiceNumber: "INV-2024-002", customer: "TechStart Inc", scheduledFor: "2024-02-22T09:00:00Z", status: "PENDING", sentAt: null },
  { id: "2", type: "PAYMENT_OVERDUE", message: "Invoice INV-2024-003 is 5 days overdue", invoiceNumber: "INV-2024-003", customer: "GlobalTrade LLC", scheduledFor: "2024-02-15T09:00:00Z", status: "SENT", sentAt: "2024-02-15T09:01:23Z" },
  { id: "3", type: "FOLLOW_UP", message: "Follow up on partial payment for INV-2024-005", invoiceNumber: "INV-2024-005", customer: "CloudNine", scheduledFor: "2024-02-19T10:00:00Z", status: "PENDING", sentAt: null },
  { id: "4", type: "PAYMENT_DUE", message: "Invoice INV-2024-006 payment due in 7 days", invoiceNumber: "INV-2024-006", customer: "DataFlow Inc", scheduledFor: "2024-02-26T09:00:00Z", status: "PENDING", sentAt: null },
  { id: "5", type: "PAYMENT_OVERDUE", message: "Second reminder: INV-2024-003 is still unpaid", invoiceNumber: "INV-2024-003", customer: "GlobalTrade LLC", scheduledFor: "2024-02-20T09:00:00Z", status: "PENDING", sentAt: null },
  { id: "6", type: "CUSTOM", message: "Review Q1 financial projections with team", invoiceNumber: null, customer: null, scheduledFor: "2024-02-18T14:00:00Z", status: "PENDING", sentAt: null },
  { id: "7", type: "PAYMENT_DUE", message: "Invoice INV-2024-005 remaining balance due", invoiceNumber: "INV-2024-005", customer: "CloudNine", scheduledFor: "2024-02-25T09:00:00Z", status: "CANCELLED", sentAt: null },
];

const typeLabels: Record<string, string> = {
  PAYMENT_DUE: "Payment Due",
  PAYMENT_OVERDUE: "Overdue",
  FOLLOW_UP: "Follow Up",
  CUSTOM: "Custom",
};

const typeColors: Record<string, string> = {
  PAYMENT_DUE: "bg-yellow-100 text-yellow-700",
  PAYMENT_OVERDUE: "bg-red-100 text-red-700",
  FOLLOW_UP: "bg-blue-100 text-blue-700",
  CUSTOM: "bg-purple-100 text-purple-700",
};

const statusLabels: Record<string, string> = {
  PENDING: "Scheduled",
  SENT: "Sent",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export default function RemindersPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState("ALL");

  const filtered = sampleReminders.filter(
    (r) => filter === "ALL" || r.status === filter
  );

  const pendingCount = sampleReminders.filter((r) => r.status === "PENDING").length;
  const sentCount = sampleReminders.filter((r) => r.status === "SENT").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
          <p className="text-sm text-gray-500">Automated payment reminders and follow-ups</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Reminder
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card">
          <p className="text-sm text-gray-500">Scheduled</p>
          <p className="mt-1 text-xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Sent This Month</p>
          <p className="mt-1 text-xl font-bold text-green-600">{sentCount}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Overdue Invoices</p>
          <p className="mt-1 text-xl font-bold text-red-600">3</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Auto-generated</p>
          <p className="mt-1 text-xl font-bold text-brand-600">5</p>
        </div>
      </div>

      {/* AI Recommendation */}
      <div className="card border-brand-200 bg-brand-50">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100">
            <svg className="h-5 w-5 text-brand-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-brand-900">AI Recommendations</h3>
            <ul className="mt-2 space-y-1 text-sm text-brand-800">
              <li>GlobalTrade LLC has a pattern of paying 7-10 days late. Consider calling directly.</li>
              <li>CloudNine made a partial payment 4 days ago. AI suggests a friendly follow-up.</li>
              <li>3 invoices will be overdue this week - reminders have been auto-scheduled.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["ALL", "PENDING", "SENT", "FAILED", "CANCELLED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === s ? "bg-brand-100 text-brand-700" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {s === "ALL" ? "All" : statusLabels[s] || s}
          </button>
        ))}
      </div>

      {/* Reminders list */}
      <div className="space-y-3">
        {filtered.map((reminder) => (
          <div key={reminder.id} className="card flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                reminder.type === "PAYMENT_OVERDUE" ? "bg-red-100" :
                reminder.type === "PAYMENT_DUE" ? "bg-yellow-100" :
                reminder.type === "FOLLOW_UP" ? "bg-blue-100" : "bg-purple-100"
              }`}>
                <svg className={`h-4 w-4 ${
                  reminder.type === "PAYMENT_OVERDUE" ? "text-red-600" :
                  reminder.type === "PAYMENT_DUE" ? "text-yellow-600" :
                  reminder.type === "FOLLOW_UP" ? "text-blue-600" : "text-purple-600"
                }`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{reminder.message}</p>
                <div className="mt-1 flex items-center gap-3">
                  <span className={`badge ${typeColors[reminder.type]}`}>{typeLabels[reminder.type]}</span>
                  {reminder.customer && (
                    <span className="text-xs text-gray-500">{reminder.customer}</span>
                  )}
                  {reminder.invoiceNumber && (
                    <span className="text-xs font-mono text-gray-400">{reminder.invoiceNumber}</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {reminder.status === "SENT"
                    ? `Sent: ${formatDateTime(reminder.sentAt!)}`
                    : `Scheduled: ${formatDateTime(reminder.scheduledFor)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${getStatusColor(reminder.status)}`}>
                {statusLabels[reminder.status]}
              </span>
              {reminder.status === "PENDING" && (
                <div className="flex gap-1">
                  <button className="rounded p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600" title="Send now">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                  <button className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Cancel">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Reminder Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Reminder">
        <form className="space-y-4">
          <div>
            <label className="label">Type</label>
            <select className="input">
              <option value="PAYMENT_DUE">Payment Due</option>
              <option value="PAYMENT_OVERDUE">Payment Overdue</option>
              <option value="FOLLOW_UP">Follow Up</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>
          <div>
            <label className="label">Related Invoice (optional)</label>
            <select className="input">
              <option value="">No linked invoice</option>
              <option>INV-2024-002 - TechStart Inc</option>
              <option>INV-2024-003 - GlobalTrade LLC</option>
              <option>INV-2024-005 - CloudNine</option>
              <option>INV-2024-006 - DataFlow Inc</option>
            </select>
          </div>
          <div>
            <label className="label">Message</label>
            <textarea className="input" rows={3} placeholder="Reminder message..." />
          </div>
          <div>
            <label className="label">Scheduled For</label>
            <input type="datetime-local" className="input" />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Reminder</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
