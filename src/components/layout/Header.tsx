"use client";

import { useState } from "react";

export default function Header() {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Search */}
      <div className="flex flex-1 items-center">
        <div className="relative w-full max-w-md">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search invoices, customers, products..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger-500" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Notifications</h3>
              <div className="space-y-3">
                <div className="flex gap-3 rounded-lg p-2 hover:bg-gray-50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning-50">
                    <span className="text-xs text-warning-500">!</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">Invoice #INV-001 is overdue</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-lg p-2 hover:bg-gray-50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-50">
                    <span className="text-xs text-success-500">$</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">Payment of $1,500 received</p>
                    <p className="text-xs text-gray-500">5 hours ago</p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-lg p-2 hover:bg-gray-50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-50">
                    <span className="text-xs text-danger-500">!</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">Low stock alert: Widget A</p>
                    <p className="text-xs text-gray-500">1 day ago</p>
                  </div>
                </div>
              </div>
              <button className="mt-3 w-full text-center text-sm font-medium text-brand-600 hover:text-brand-700">
                View all notifications
              </button>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <button className="btn-primary text-sm">
          <svg
            className="mr-1.5 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Invoice
        </button>
      </div>
    </header>
  );
}
