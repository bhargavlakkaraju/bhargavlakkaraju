import { z } from "zod";

// ─── Auth ───────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  organizationName: z.string().min(2, "Organization name is required"),
});

// ─── Customer ───────────────────────────────────────────────────────

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().default("US"),
  notes: z.string().optional(),
});

// ─── Invoice ────────────────────────────────────────────────────────

export const invoiceLineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  taxRate: z.number().min(0).max(100).default(0),
  productId: z.string().optional(),
});

export const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  dueDate: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
  terms: z.string().optional(),
  discountAmount: z.number().min(0).default(0),
  lineItems: z.array(invoiceLineItemSchema).min(1, "At least one line item is required"),
});

// ─── Payment ────────────────────────────────────────────────────────

export const paymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  method: z.enum([
    "CASH",
    "CHECK",
    "BANK_TRANSFER",
    "CREDIT_CARD",
    "DEBIT_CARD",
    "PAYPAL",
    "STRIPE",
    "OTHER",
  ]),
  reference: z.string().optional(),
  notes: z.string().optional(),
  paidAt: z.string().optional(),
});

// ─── Product ────────────────────────────────────────────────────────

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional(),
  description: z.string().optional(),
  unitPrice: z.number().min(0, "Price must be non-negative"),
  costPrice: z.number().min(0).default(0),
  quantity: z.number().int().min(0).default(0),
  reorderLevel: z.number().int().min(0).default(10),
  unit: z.string().default("pcs"),
  categoryId: z.string().optional(),
  isActive: z.boolean().default(true),
});

// ─── Expense ────────────────────────────────────────────────────────

export const expenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  date: z.string().optional(),
  vendor: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Workflow ───────────────────────────────────────────────────────

export const workflowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  trigger: z.enum([
    "INVOICE_CREATED",
    "INVOICE_OVERDUE",
    "PAYMENT_RECEIVED",
    "LOW_STOCK",
    "EXPENSE_ADDED",
    "CUSTOMER_CREATED",
    "SCHEDULED_DAILY",
    "SCHEDULED_WEEKLY",
    "SCHEDULED_MONTHLY",
  ]),
  actions: z.string().min(1, "At least one action is required"),
  isActive: z.boolean().default(true),
});

// ─── Types ──────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type WorkflowInput = z.infer<typeof workflowSchema>;
