"use client";

import { useState } from "react";
import StatCard from "@/components/ui/StatCard";
import { formatCurrency } from "@/lib/utils";

// Sample data for demonstration
const recentInvoices = [
  { id: "1", number: "INV-2024-001", customer: "Acme Corp", amount: 5250.0, status: "PAID", date: "2024-02-15" },
  { id: "2", number: "INV-2024-002", customer: "TechStart Inc", amount: 3750.0, status: "SENT", date: "2024-02-14" },
  { id: "3", number: "INV-2024-003", customer: "GlobalTrade LLC", amount: 12800.0, status: "OVERDUE", date: "2024-02-10" },
  { id: "4", number: "INV-2024-004", customer: "DesignHub", amount: 1900.0, status: "DRAFT", date: "2024-02-13" },
  { id: "5", number: "INV-2024-005", customer: "CloudNine", amount: 8400.0, status: "PARTIALLY_PAID", date: "2024-02-12" },
];

const recentPayments = [
  { id: "1", customer: "Acme Corp", amount: 5250.0, method: "BANK_TRANSFER", date: "2024-02-15" },
  { id: "2", customer: "DataFlow Inc", amount: 2100.0, method: "CREDIT_CARD", date: "2024-02-14" },
  { id: "3", customer: "NexGen Solutions", amount: 7500.0, method: "STRIPE", date: "2024-02-13" },
];

const upcomingReminders = [
  { id: "1", type: "PAYMENT_DUE", message: "Invoice #INV-2024-002 due in 3 days", date: "2024-02-18" },
  { id: "2", type: "PAYMENT_OVERDUE", message: "Invoice #INV-2024-003 is 5 days overdue", date: "2024-02-10" },
  { id: "3", type: "FOLLOW_UP", message: "Follow up with CloudNine on partial payment", date: "2024-02-19" },
];

const statusColors: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  SENT: "bg-blue-100 text-blue-700",
  OVERDUE: "bg-red-100 text-red-700",
  DRAFT: "bg-gray-100 text-gray-700",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-700",
};

const reminderIcons: Record<string, string> = {
  PAYMENT_DUE: "bg-yellow-100 text-yellow-600",
  PAYMENT_OVERDUE: "bg-red-100 text-red-600",
  FOLLOW_UP: "bg-blue-100 text-blue-600",
};

export default function DashboardPage() {
  const [period, setPeriod] = useState("month");

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Overview of your financial metrics</p>
        </div>
        <div className="flex items-center gap-2">
          {["week", "month", "quarter", "year"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                period === p
                  ? "bg-brand-100 text-brand-700"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(48750)}
          change="12.5% vs last month"
          changeType="positive"
          iconBg="bg-green-100"
          icon={
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Outstanding Invoices"
          value={formatCurrency(24950)}
          change="8 invoices pending"
          changeType="neutral"
          iconBg="bg-blue-100"
          icon={
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          }
        />
        <StatCard
          title="Overdue Payments"
          value={formatCurrency(12800)}
          change="3 overdue invoices"
          changeType="negative"
          iconBg="bg-red-100"
          icon={
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
        />
        <StatCard
          title="Expenses This Month"
          value={formatCurrency(8320)}
          change="5.2% vs last month"
          changeType="negative"
          iconBg="bg-purple-100"
          icon={
            <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          }
        />
      </div>

      {/* Revenue chart placeholder */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Revenue Overview</h2>
        </div>
        <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-48 items-end justify-center gap-2">
              {[40, 55, 45, 70, 65, 80, 60, 75, 85, 90, 70, 95].map((height, i) => (
                <div key={i} className="flex w-8 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-brand-500 transition-all hover:bg-brand-600"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-gray-400">
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Invoices */}
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Invoices</h2>
            <a href="/dashboard/invoices" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              View all
            </a>
          </div>
          <div className="space-y-3">
            {recentInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{invoice.number}</p>
                    <p className="text-xs text-gray-500">{invoice.customer}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(invoice.amount)}</p>
                  <span className={`badge ${statusColors[invoice.status]}`}>
                    {invoice.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: Reminders & Quick Actions */}
        <div className="space-y-6">
          {/* Upcoming Reminders */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Upcoming Reminders</h2>
            <div className="space-y-3">
              {upcomingReminders.map((reminder) => (
                <div key={reminder.id} className="flex gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${reminderIcons[reminder.type]}`}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">{reminder.message}</p>
                    <p className="text-xs text-gray-400">{reminder.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Payments */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Payments</h2>
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{payment.customer}</p>
                    <p className="text-xs text-gray-500">{payment.method.replace("_", " ")}</p>
                  </div>
                  <p className="text-sm font-semibold text-green-600">
                    +{formatCurrency(payment.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="card border-brand-200 bg-brand-50">
            <div className="mb-3 flex items-center gap-2">
              <svg className="h-5 w-5 text-brand-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              <h3 className="text-sm font-semibold text-brand-900">AI Insights</h3>
            </div>
            <ul className="space-y-2 text-sm text-brand-800">
              <li>3 invoices are overdue totaling $12,800</li>
              <li>Revenue is up 12.5% this month</li>
              <li>5 products are below reorder level</li>
              <li>Suggested: Send reminder to GlobalTrade LLC</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
