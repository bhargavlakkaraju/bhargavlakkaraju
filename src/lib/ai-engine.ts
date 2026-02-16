/**
 * AI Workflow Engine
 *
 * Handles AI-powered automations including:
 * - Smart payment reminders based on customer behavior
 * - Expense auto-categorization
 * - Cash flow forecasting
 * - Invoice suggestions
 * - Anomaly detection
 */

export interface AIAction {
  type: string;
  config: Record<string, any>;
}

export interface WorkflowExecution {
  workflowId: string;
  trigger: string;
  actions: AIAction[];
  context: Record<string, any>;
}

/**
 * Execute a workflow's actions sequentially
 */
export async function executeWorkflow(execution: WorkflowExecution): Promise<{
  status: "SUCCESS" | "FAILED";
  results: Array<{ action: string; status: string; message: string }>;
}> {
  const results: Array<{ action: string; status: string; message: string }> = [];

  for (const action of execution.actions) {
    try {
      const result = await executeAction(action, execution.context);
      results.push({
        action: action.type,
        status: "SUCCESS",
        message: result.message,
      });
    } catch (error: any) {
      results.push({
        action: action.type,
        status: "FAILED",
        message: error.message || "Action execution failed",
      });
      return { status: "FAILED", results };
    }
  }

  return { status: "SUCCESS", results };
}

/**
 * Execute a single workflow action
 */
async function executeAction(
  action: AIAction,
  context: Record<string, any>
): Promise<{ message: string }> {
  switch (action.type) {
    case "SEND_EMAIL":
      return await handleSendEmail(action.config, context);
    case "CREATE_NOTIFICATION":
      return await handleCreateNotification(action.config, context);
    case "UPDATE_INVOICE_STATUS":
      return await handleUpdateInvoiceStatus(action.config, context);
    case "AI_CATEGORIZE":
      return await handleAICategorize(action.config, context);
    case "AI_SUGGEST":
      return await handleAISuggest(action.config, context);
    case "AI_FORECAST":
      return await handleAIForecast(action.config, context);
    case "AI_GENERATE_REPORT":
      return await handleAIGenerateReport(action.config, context);
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

async function handleSendEmail(
  config: Record<string, any>,
  context: Record<string, any>
): Promise<{ message: string }> {
  // In production, integrate with nodemailer/SendGrid/etc.
  const template = config.template || "generic";
  const to = config.to || context.customerEmail;
  return { message: `Email sent using template "${template}" to ${to}` };
}

async function handleCreateNotification(
  config: Record<string, any>,
  context: Record<string, any>
): Promise<{ message: string }> {
  // In production, create notification in database
  const title = config.title || "Workflow notification";
  return { message: `Notification created: "${title}"` };
}

async function handleUpdateInvoiceStatus(
  config: Record<string, any>,
  context: Record<string, any>
): Promise<{ message: string }> {
  const invoiceId = context.invoiceId;
  return { message: `Invoice ${invoiceId} status updated` };
}

async function handleAICategorize(
  config: Record<string, any>,
  context: Record<string, any>
): Promise<{ message: string }> {
  // In production, call AI API to categorize
  const entity = config.entity || "expense";
  return { message: `AI categorized ${entity} successfully` };
}

async function handleAISuggest(
  config: Record<string, any>,
  context: Record<string, any>
): Promise<{ message: string }> {
  const task = config.task || "generic_suggestion";
  return { message: `AI suggestion generated for task: ${task}` };
}

async function handleAIForecast(
  config: Record<string, any>,
  context: Record<string, any>
): Promise<{ message: string }> {
  const metric = config.metric || "cash_flow";
  const horizon = config.horizon || "30_days";
  return { message: `AI forecast generated for ${metric} over ${horizon}` };
}

async function handleAIGenerateReport(
  config: Record<string, any>,
  context: Record<string, any>
): Promise<{ message: string }> {
  const reportType = config.reportType || "summary";
  return { message: `AI report generated: ${reportType}` };
}

/**
 * AI-powered smart reminder scheduling
 * Analyzes customer payment history to determine optimal reminder timing
 */
export function calculateOptimalReminderTime(customerPaymentHistory: {
  avgDaysToPayment: number;
  lastPaymentDelay: number;
  totalInvoices: number;
}): { daysBeforeDue: number; frequency: string } {
  const { avgDaysToPayment, lastPaymentDelay, totalInvoices } = customerPaymentHistory;

  // Customers who pay early get gentle reminders
  if (avgDaysToPayment <= 0 && totalInvoices > 3) {
    return { daysBeforeDue: 1, frequency: "once" };
  }

  // Customers who pay on time get standard reminders
  if (avgDaysToPayment <= 5) {
    return { daysBeforeDue: 3, frequency: "once" };
  }

  // Customers who pay late get earlier, more frequent reminders
  if (avgDaysToPayment <= 15) {
    return { daysBeforeDue: 7, frequency: "twice" };
  }

  // High-risk customers get aggressive reminder schedule
  return { daysBeforeDue: 14, frequency: "weekly" };
}

/**
 * AI expense categorization logic
 */
export function suggestExpenseCategory(description: string, vendor: string): string {
  const lower = `${description} ${vendor}`.toLowerCase();

  const categoryRules: Array<{ keywords: string[]; category: string }> = [
    { keywords: ["rent", "lease", "office space"], category: "Rent" },
    { keywords: ["aws", "azure", "hosting", "server", "cloud"], category: "Technology" },
    { keywords: ["lunch", "dinner", "restaurant", "food", "coffee"], category: "Meals" },
    { keywords: ["license", "subscription", "saas", "software"], category: "Software" },
    { keywords: ["ads", "advertising", "marketing", "google ads", "facebook"], category: "Marketing" },
    { keywords: ["paper", "supplies", "staples", "office depot"], category: "Supplies" },
    { keywords: ["internet", "phone", "electricity", "water", "utility"], category: "Utilities" },
    { keywords: ["course", "training", "workshop", "conference", "udemy"], category: "Training" },
    { keywords: ["flight", "hotel", "taxi", "uber", "travel"], category: "Travel" },
    { keywords: ["insurance", "policy", "coverage"], category: "Insurance" },
  ];

  for (const rule of categoryRules) {
    if (rule.keywords.some((keyword) => lower.includes(keyword))) {
      return rule.category;
    }
  }

  return "Other";
}

/**
 * Simple cash flow projection
 */
export function projectCashFlow(params: {
  currentBalance: number;
  outstandingInvoices: Array<{ amount: number; dueDate: string; probability: number }>;
  recurringExpenses: Array<{ amount: number; frequency: "monthly" | "weekly" }>;
  daysToProject: number;
}): Array<{ date: string; projected: number; optimistic: number; pessimistic: number }> {
  const { currentBalance, outstandingInvoices, recurringExpenses, daysToProject } = params;
  const projections: Array<{ date: string; projected: number; optimistic: number; pessimistic: number }> = [];

  let balance = currentBalance;
  const today = new Date();

  for (let day = 0; day < daysToProject; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split("T")[0];

    // Check for expected invoice payments
    for (const inv of outstandingInvoices) {
      if (inv.dueDate === dateStr) {
        balance += inv.amount * inv.probability;
      }
    }

    // Deduct recurring expenses
    for (const expense of recurringExpenses) {
      if (expense.frequency === "monthly" && date.getDate() === 1) {
        balance -= expense.amount;
      }
      if (expense.frequency === "weekly" && date.getDay() === 1) {
        balance -= expense.amount;
      }
    }

    projections.push({
      date: dateStr,
      projected: Math.round(balance * 100) / 100,
      optimistic: Math.round(balance * 1.15 * 100) / 100,
      pessimistic: Math.round(balance * 0.85 * 100) / 100,
    });
  }

  return projections;
}
