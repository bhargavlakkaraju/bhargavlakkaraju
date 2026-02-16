import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workflowSchema } from "@/lib/validations";
import { executeWorkflow, AIAction } from "@/lib/ai-engine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    const workflows = await db.workflow.findMany({
      where: { organizationId },
      include: {
        _count: { select: { logs: true } },
        logs: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = workflowSchema.parse(body);
    const organizationId = body.organizationId;

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    const workflow = await db.workflow.create({
      data: {
        name: data.name,
        description: data.description,
        trigger: data.trigger,
        actions: data.actions,
        isActive: data.isActive,
        organizationId,
      },
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Error creating workflow:", error);
    return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 });
  }
}

/**
 * Execute a workflow manually (POST /api/workflows/execute)
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { workflowId, context, userId } = body;

    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const actions: AIAction[] = JSON.parse(workflow.actions);

    // Create log entry
    const log = await db.workflowLog.create({
      data: {
        workflowId,
        status: "RUNNING",
        message: "Workflow execution started",
        triggeredById: userId,
      },
    });

    // Execute the workflow
    const result = await executeWorkflow({
      workflowId,
      trigger: workflow.trigger,
      actions,
      context: context || {},
    });

    // Update log with result
    await db.workflowLog.update({
      where: { id: log.id },
      data: {
        status: result.status,
        message: `Workflow completed with status: ${result.status}`,
        details: JSON.stringify(result.results),
      },
    });

    return NextResponse.json({ log, result });
  } catch (error) {
    console.error("Error executing workflow:", error);
    return NextResponse.json({ error: "Workflow execution failed" }, { status: 500 });
  }
}
