"use client";

import { useState } from "react";
import { formatDateTime, getStatusColor } from "@/lib/utils";
import Modal from "@/components/ui/Modal";

const sampleWorkflows = [
  {
    id: "1",
    name: "Auto-Send Payment Reminders",
    description: "Automatically send email reminders when invoices are approaching due date or overdue",
    trigger: "INVOICE_OVERDUE",
    isActive: true,
    actions: JSON.stringify([
      { type: "SEND_EMAIL", config: { template: "payment_reminder", daysBeforeDue: 3 } },
      { type: "SEND_EMAIL", config: { template: "overdue_notice", daysAfterDue: 1 } },
      { type: "CREATE_NOTIFICATION", config: { title: "Invoice overdue" } },
    ]),
    lastRun: "2024-02-15T10:30:00Z",
    runCount: 47,
  },
  {
    id: "2",
    name: "Low Stock Alert",
    description: "Notify team and create reorder suggestions when inventory falls below threshold",
    trigger: "LOW_STOCK",
    isActive: true,
    actions: JSON.stringify([
      { type: "CREATE_NOTIFICATION", config: { title: "Low stock alert", priority: "high" } },
      { type: "SEND_EMAIL", config: { template: "low_stock_alert", to: "operations@company.com" } },
      { type: "AI_SUGGEST", config: { task: "suggest_reorder_quantity" } },
    ]),
    lastRun: "2024-02-14T15:45:00Z",
    runCount: 12,
  },
  {
    id: "3",
    name: "Welcome New Customer",
    description: "Send a welcome email and create onboarding tasks when a new customer is added",
    trigger: "CUSTOMER_CREATED",
    isActive: true,
    actions: JSON.stringify([
      { type: "SEND_EMAIL", config: { template: "customer_welcome" } },
      { type: "CREATE_NOTIFICATION", config: { title: "New customer onboarding" } },
    ]),
    lastRun: "2024-02-13T09:15:00Z",
    runCount: 23,
  },
  {
    id: "4",
    name: "Monthly Financial Summary",
    description: "Generate and email a monthly financial summary report with AI insights",
    trigger: "SCHEDULED_MONTHLY",
    isActive: true,
    actions: JSON.stringify([
      { type: "AI_GENERATE_REPORT", config: { reportType: "monthly_summary" } },
      { type: "SEND_EMAIL", config: { template: "financial_summary", to: "management@company.com" } },
    ]),
    lastRun: "2024-02-01T00:00:00Z",
    runCount: 6,
  },
  {
    id: "5",
    name: "Auto-Categorize Expenses",
    description: "Use AI to automatically categorize new expenses based on description and vendor",
    trigger: "EXPENSE_ADDED",
    isActive: false,
    actions: JSON.stringify([
      { type: "AI_CATEGORIZE", config: { entity: "expense" } },
      { type: "CREATE_NOTIFICATION", config: { title: "Expense auto-categorized" } },
    ]),
    lastRun: "2024-02-10T11:20:00Z",
    runCount: 89,
  },
  {
    id: "6",
    name: "Payment Confirmation",
    description: "Send payment receipt and update records when a payment is received",
    trigger: "PAYMENT_RECEIVED",
    isActive: true,
    actions: JSON.stringify([
      { type: "SEND_EMAIL", config: { template: "payment_receipt" } },
      { type: "UPDATE_INVOICE_STATUS", config: {} },
      { type: "CREATE_NOTIFICATION", config: { title: "Payment received" } },
    ]),
    lastRun: "2024-02-15T14:22:00Z",
    runCount: 34,
  },
  {
    id: "7",
    name: "Weekly Cash Flow Forecast",
    description: "AI-powered weekly cash flow analysis and prediction based on outstanding invoices",
    trigger: "SCHEDULED_WEEKLY",
    isActive: true,
    actions: JSON.stringify([
      { type: "AI_FORECAST", config: { metric: "cash_flow", horizon: "30_days" } },
      { type: "CREATE_NOTIFICATION", config: { title: "Cash flow forecast ready" } },
    ]),
    lastRun: "2024-02-12T00:00:00Z",
    runCount: 18,
  },
];

const recentLogs = [
  { id: "1", workflowName: "Auto-Send Payment Reminders", status: "SUCCESS", message: "Sent reminder to GlobalTrade LLC for INV-2024-003", createdAt: "2024-02-15T10:30:00Z" },
  { id: "2", workflowName: "Payment Confirmation", status: "SUCCESS", message: "Payment receipt sent to Acme Corp for $5,250.00", createdAt: "2024-02-15T14:22:00Z" },
  { id: "3", workflowName: "Low Stock Alert", status: "SUCCESS", message: "Alert created for 3 products below reorder level", createdAt: "2024-02-14T15:45:00Z" },
  { id: "4", workflowName: "Auto-Send Payment Reminders", status: "FAILED", message: "Email delivery failed for CloudNine (invalid SMTP config)", createdAt: "2024-02-14T10:30:00Z" },
  { id: "5", workflowName: "Welcome New Customer", status: "SUCCESS", message: "Welcome email sent to DataFlow Inc", createdAt: "2024-02-13T09:15:00Z" },
];

const triggerLabels: Record<string, string> = {
  INVOICE_CREATED: "Invoice Created",
  INVOICE_OVERDUE: "Invoice Overdue",
  PAYMENT_RECEIVED: "Payment Received",
  LOW_STOCK: "Low Stock",
  EXPENSE_ADDED: "Expense Added",
  CUSTOMER_CREATED: "Customer Created",
  SCHEDULED_DAILY: "Daily Schedule",
  SCHEDULED_WEEKLY: "Weekly Schedule",
  SCHEDULED_MONTHLY: "Monthly Schedule",
};

const triggerColors: Record<string, string> = {
  INVOICE_CREATED: "bg-blue-100 text-blue-700",
  INVOICE_OVERDUE: "bg-red-100 text-red-700",
  PAYMENT_RECEIVED: "bg-green-100 text-green-700",
  LOW_STOCK: "bg-orange-100 text-orange-700",
  EXPENSE_ADDED: "bg-purple-100 text-purple-700",
  CUSTOMER_CREATED: "bg-teal-100 text-teal-700",
  SCHEDULED_DAILY: "bg-gray-100 text-gray-700",
  SCHEDULED_WEEKLY: "bg-gray-100 text-gray-700",
  SCHEDULED_MONTHLY: "bg-gray-100 text-gray-700",
};

export default function WorkflowsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState("");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Workflows</h1>
          <p className="text-sm text-gray-500">Automate your business processes with AI-powered workflows</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Workflow
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card">
          <p className="text-sm text-gray-500">Active Workflows</p>
          <p className="mt-1 text-xl font-bold text-green-600">
            {sampleWorkflows.filter((w) => w.isActive).length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total Executions</p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {sampleWorkflows.reduce((sum, w) => sum + w.runCount, 0)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Success Rate</p>
          <p className="mt-1 text-xl font-bold text-brand-600">96.8%</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">AI Actions Today</p>
          <p className="mt-1 text-xl font-bold text-purple-600">12</p>
        </div>
      </div>

      {/* Workflows grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sampleWorkflows.map((workflow) => (
          <div
            key={workflow.id}
            className={`card transition-shadow hover:shadow-md ${
              !workflow.isActive ? "opacity-60" : ""
            }`}
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
                  <svg className="h-5 w-5 text-brand-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
                  <span className={`badge ${triggerColors[workflow.trigger]}`}>
                    {triggerLabels[workflow.trigger]}
                  </span>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={workflow.isActive}
                  readOnly
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
              </label>
            </div>

            <p className="mb-4 text-sm text-gray-500">{workflow.description}</p>

            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <div className="flex gap-4 text-xs text-gray-400">
                <span>Runs: {workflow.runCount}</span>
                <span>Last: {workflow.lastRun ? formatDateTime(workflow.lastRun) : "Never"}</span>
              </div>
              <div className="flex gap-1">
                <button className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Edit">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                </button>
                <button className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600" title="Run now">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                  </svg>
                </button>
                <button className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="View logs">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Execution Logs */}
      <div className="card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Execution Logs</h2>
        <div className="space-y-3">
          {recentLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 rounded-lg border border-gray-100 p-3">
              <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                log.status === "SUCCESS" ? "bg-green-100" : "bg-red-100"
              }`}>
                {log.status === "SUCCESS" ? (
                  <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{log.workflowName}</p>
                  <span className={`badge ${getStatusColor(log.status)}`}>{log.status}</span>
                </div>
                <p className="text-sm text-gray-500">{log.message}</p>
                <p className="mt-1 text-xs text-gray-400">{formatDateTime(log.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Workflow Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create AI Workflow" size="lg">
        <form className="space-y-4">
          <div>
            <label className="label">Workflow Name</label>
            <input type="text" className="input" placeholder="e.g., Auto-send payment reminders" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} placeholder="What does this workflow do?" />
          </div>
          <div>
            <label className="label">Trigger Event</label>
            <select
              className="input"
              value={selectedTrigger}
              onChange={(e) => setSelectedTrigger(e.target.value)}
            >
              <option value="">Select a trigger...</option>
              {Object.entries(triggerLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Actions (AI will help configure)</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 p-3">
                <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                <span className="text-sm text-gray-700">Send email notification</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 p-3">
                <input type="checkbox" className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">Create in-app notification</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 p-3">
                <input type="checkbox" className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">AI-generated insights & suggestions</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 p-3">
                <input type="checkbox" className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">Update record status</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 p-3">
                <input type="checkbox" className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">Generate report</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-brand-900">
              <svg className="h-4 w-4 text-brand-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              AI will optimize this workflow
            </div>
            <p className="mt-1 text-xs text-brand-700">
              Our AI engine will analyze your data patterns and fine-tune the trigger conditions and action parameters for optimal results.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Workflow</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
