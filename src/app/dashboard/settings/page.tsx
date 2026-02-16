"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("organization");

  const tabs = [
    { id: "organization", label: "Organization" },
    { id: "billing", label: "Billing & Plans" },
    { id: "notifications", label: "Notifications" },
    { id: "integrations", label: "Integrations" },
    { id: "ai", label: "AI Settings" },
    { id: "team", label: "Team" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your organization and application settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Organization Settings */}
      {activeTab === "organization" && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Organization Details</h2>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Organization Name</label>
                  <input type="text" className="input" defaultValue="Acme Corp" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" defaultValue="admin@acme.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Phone</label>
                  <input type="tel" className="input" defaultValue="+1 (555) 000-0000" />
                </div>
                <div>
                  <label className="label">Website</label>
                  <input type="url" className="input" placeholder="https://example.com" />
                </div>
              </div>
              <div>
                <label className="label">Address</label>
                <input type="text" className="input" defaultValue="123 Business Ave, Suite 100" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">City</label>
                  <input type="text" className="input" defaultValue="San Francisco" />
                </div>
                <div>
                  <label className="label">State</label>
                  <input type="text" className="input" defaultValue="CA" />
                </div>
                <div>
                  <label className="label">ZIP</label>
                  <input type="text" className="input" defaultValue="94105" />
                </div>
                <div>
                  <label className="label">Country</label>
                  <select className="input">
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Default Currency</label>
                  <select className="input">
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                  </select>
                </div>
                <div>
                  <label className="label">Default Tax Rate (%)</label>
                  <input type="number" className="input" defaultValue="10" min="0" max="100" step="0.1" />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>

          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Invoice Defaults</h2>
            <form className="space-y-4">
              <div>
                <label className="label">Invoice Prefix</label>
                <input type="text" className="input max-w-xs" defaultValue="INV" />
              </div>
              <div>
                <label className="label">Default Payment Terms</label>
                <select className="input max-w-xs">
                  <option>Net 15</option>
                  <option selected>Net 30</option>
                  <option>Net 45</option>
                  <option>Net 60</option>
                  <option>Due on Receipt</option>
                </select>
              </div>
              <div>
                <label className="label">Default Notes</label>
                <textarea className="input" rows={2} defaultValue="Thank you for your business!" />
              </div>
              <div>
                <label className="label">Default Terms & Conditions</label>
                <textarea className="input" rows={3} defaultValue="Payment is due within 30 days of invoice date. Late payments may be subject to a 1.5% monthly interest charge." />
              </div>
              <div className="pt-2">
                <button type="submit" className="btn-primary">Save Defaults</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Billing & Plans */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Current Plan</h2>
            <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 p-4">
              <div>
                <h3 className="text-lg font-bold text-brand-900">Professional Plan</h3>
                <p className="text-sm text-brand-700">Unlimited invoices, AI workflows, team management</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-brand-900">$49<span className="text-sm font-normal">/mo</span></p>
                <button className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-700">Upgrade Plan</button>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Available Plans</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { name: "Starter", price: 19, features: ["50 invoices/mo", "Basic reports", "Email support", "1 user"] },
                { name: "Professional", price: 49, features: ["Unlimited invoices", "AI workflows", "Priority support", "5 users", "Custom branding"], current: true },
                { name: "Enterprise", price: 99, features: ["Everything in Pro", "API access", "Dedicated support", "Unlimited users", "Custom integrations", "SLA guarantee"] },
              ].map((plan) => (
                <div key={plan.name} className={`rounded-xl border p-5 ${plan.current ? "border-brand-300 bg-brand-50" : "border-gray-200"}`}>
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <p className="mt-1 text-3xl font-bold text-gray-900">
                    ${plan.price}<span className="text-sm font-normal text-gray-500">/mo</span>
                  </p>
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button className={`mt-4 w-full ${plan.current ? "btn-secondary" : "btn-primary"}`}>
                    {plan.current ? "Current Plan" : "Upgrade"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notification Settings */}
      {activeTab === "notifications" && (
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Notification Preferences</h2>
          <div className="space-y-4">
            {[
              { label: "Payment received", description: "Get notified when a customer makes a payment", email: true, push: true },
              { label: "Invoice overdue", description: "Alert when an invoice passes its due date", email: true, push: true },
              { label: "Low stock alerts", description: "Notification when products fall below reorder level", email: true, push: false },
              { label: "New customer added", description: "When a new customer is created", email: false, push: true },
              { label: "Workflow execution", description: "Status updates on AI workflow runs", email: false, push: true },
              { label: "Weekly summary", description: "Weekly financial summary report", email: true, push: false },
              { label: "Monthly report", description: "Monthly detailed financial report", email: true, push: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" className="rounded border-gray-300" defaultChecked={item.email} />
                    Email
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" className="rounded border-gray-300" defaultChecked={item.push} />
                    In-app
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-2">
            <button className="btn-primary">Save Preferences</button>
          </div>
        </div>
      )}

      {/* Integrations */}
      {activeTab === "integrations" && (
        <div className="space-y-4">
          {[
            { name: "Stripe", description: "Accept online payments via Stripe", connected: true, icon: "S" },
            { name: "PayPal", description: "Accept PayPal payments", connected: false, icon: "P" },
            { name: "QuickBooks", description: "Sync with QuickBooks accounting", connected: false, icon: "Q" },
            { name: "Slack", description: "Get notifications in Slack channels", connected: true, icon: "S" },
            { name: "Gmail/SMTP", description: "Send invoices and reminders via email", connected: true, icon: "G" },
            { name: "Zapier", description: "Connect with 5000+ apps via Zapier", connected: false, icon: "Z" },
          ].map((integration) => (
            <div key={integration.name} className="card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-lg font-bold text-gray-600">
                  {integration.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                  <p className="text-sm text-gray-500">{integration.description}</p>
                </div>
              </div>
              <button className={integration.connected ? "btn-secondary" : "btn-primary"}>
                {integration.connected ? "Configure" : "Connect"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* AI Settings */}
      {activeTab === "ai" && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">AI Configuration</h2>
            <form className="space-y-4">
              <div>
                <label className="label">AI Provider</label>
                <select className="input max-w-xs">
                  <option>OpenAI (GPT-4o)</option>
                  <option>Anthropic (Claude)</option>
                  <option>Custom endpoint</option>
                </select>
              </div>
              <div>
                <label className="label">API Key</label>
                <input type="password" className="input" placeholder="sk-..." defaultValue="sk-proj-****" />
              </div>
              <div className="pt-2">
                <button className="btn-primary">Save AI Settings</button>
              </div>
            </form>
          </div>

          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">AI Features</h2>
            <div className="space-y-3">
              {[
                { label: "Auto-categorize expenses", description: "AI automatically categorizes new expenses", enabled: true },
                { label: "Smart payment reminders", description: "AI optimizes reminder timing based on customer behavior", enabled: true },
                { label: "Cash flow forecasting", description: "Predict future cash flow based on historical data", enabled: true },
                { label: "Invoice suggestions", description: "AI suggests line items and pricing based on history", enabled: false },
                { label: "Customer insights", description: "AI-generated customer payment behavior analysis", enabled: true },
                { label: "Anomaly detection", description: "Flag unusual transactions or expense patterns", enabled: false },
              ].map((feature) => (
                <div key={feature.label} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{feature.label}</p>
                    <p className="text-xs text-gray-500">{feature.description}</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" className="peer sr-only" defaultChecked={feature.enabled} />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">AI Usage This Month</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-brand-600">247</p>
                <p className="text-xs text-gray-500">API Calls</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-brand-600">12.4K</p>
                <p className="text-xs text-gray-500">Tokens Used</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-brand-600">$3.82</p>
                <p className="text-xs text-gray-500">Estimated Cost</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team */}
      {activeTab === "team" && (
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
            <button className="btn-primary text-sm">Invite Member</button>
          </div>
          <div className="space-y-3">
            {[
              { name: "John Doe", email: "john@acme.com", role: "OWNER", status: "active" },
              { name: "Jane Smith", email: "jane@acme.com", role: "ADMIN", status: "active" },
              { name: "Bob Johnson", email: "bob@acme.com", role: "MEMBER", status: "active" },
              { name: "Alice Brown", email: "alice@acme.com", role: "VIEWER", status: "invited" },
            ].map((member) => (
              <div key={member.email} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${
                    member.status === "active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {member.status}
                  </span>
                  <select className="input max-w-[120px] text-sm" defaultValue={member.role}>
                    <option value="OWNER">Owner</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBER">Member</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
