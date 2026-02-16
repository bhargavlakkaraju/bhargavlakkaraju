import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <span className="text-sm font-bold text-white">FF</span>
            </div>
            <span className="text-xl font-bold text-gray-900">FinFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Sign In
            </Link>
            <Link href="/register" className="btn-primary text-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
            AI-Powered Financial Management
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900">
            Finances, Billing & Invoices{" "}
            <span className="text-brand-600">Simplified</span>
          </h1>
          <p className="mb-8 text-lg text-gray-600">
            Complete SaaS platform for managing invoices, payments, inventory, and expenses.
            With AI-automated workflows and smart payment reminders, you can focus on growing
            your business.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register" className="btn-primary px-8 py-3 text-base">
              Start Free Trial
            </Link>
            <Link href="/dashboard" className="btn-secondary px-8 py-3 text-base">
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-100 bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">Everything You Need</h2>
            <p className="text-lg text-gray-600">
              One platform to manage all your financial operations
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Invoice Management",
                description: "Create, send, and track professional invoices. Automatic invoice numbering, PDF generation, and status tracking.",
                icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
              },
              {
                title: "Payment Tracking",
                description: "Record payments across multiple methods. Automatic invoice status updates and payment receipt generation.",
                icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
              },
              {
                title: "Inventory Control",
                description: "Track product stock levels, manage categories, and get automatic low-stock alerts with reorder suggestions.",
                icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
              },
              {
                title: "AI Workflows",
                description: "Automate repetitive tasks with AI-powered workflows. Smart categorization, forecasting, and report generation.",
                icon: "M13 10V3L4 14h7v7l9-11h-7z",
              },
              {
                title: "Smart Reminders",
                description: "AI analyzes customer payment patterns to schedule optimal reminder timing. Never chase a payment manually again.",
                icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
              },
              {
                title: "Expense Tracking",
                description: "Log and categorize business expenses. AI auto-categorization and spending analysis with visual breakdowns.",
                icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z",
              },
            ].map((feature) => (
              <div key={feature.title} className="card transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100">
                  <svg className="h-6 w-6 text-brand-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">Simple Pricing</h2>
            <p className="text-lg text-gray-600">Start free, scale as you grow</p>
          </div>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { name: "Starter", price: 19, features: ["50 invoices/mo", "Basic reports", "Email support", "1 user"] },
              { name: "Professional", price: 49, features: ["Unlimited invoices", "AI workflows", "Priority support", "5 users", "Custom branding"], popular: true },
              { name: "Enterprise", price: 99, features: ["Everything in Pro", "API access", "Dedicated support", "Unlimited users", "Custom integrations"] },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-8 ${
                  plan.popular ? "border-brand-300 bg-brand-50 shadow-lg" : "border-gray-200"
                }`}
              >
                {plan.popular && (
                  <span className="mb-4 inline-block rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-4xl font-bold text-gray-900">
                  ${plan.price}
                  <span className="text-base font-normal text-gray-500">/mo</span>
                </p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`mt-8 block w-full text-center ${plan.popular ? "btn-primary" : "btn-secondary"}`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                <span className="text-sm font-bold text-white">FF</span>
              </div>
              <span className="font-bold text-gray-900">FinFlow</span>
            </div>
            <p className="text-sm text-gray-500">
              SaaS Finance & Billing Platform with AI Automation
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
