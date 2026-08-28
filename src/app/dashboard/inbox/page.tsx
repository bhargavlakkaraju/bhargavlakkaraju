"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import GmailPanel from "@/components/dashboard/GmailPanel";

const errorMessages: Record<string, string> = {
  not_configured:
    "Gmail isn't configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment (see README).",
  access_denied: "Google access was denied. Try connecting again.",
  invalid_state: "The sign-in link expired. Try connecting again.",
  missing_code: "Google didn't return an authorization code. Try connecting again.",
  exchange_failed: "Couldn't complete the Google sign-in. Try connecting again.",
};

function InboxContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const connected = searchParams.get("connected");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
        <p className="text-sm text-gray-500">
          Your Gmail, right inside the dashboard. Click any email to open it in Gmail.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          {errorMessages[error] || `Something went wrong: ${error}`}
        </div>
      )}
      {connected && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Gmail connected successfully.
        </div>
      )}

      <div className="card mx-auto max-w-3xl">
        <GmailPanel limit={15} showDisconnect />
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense>
      <InboxContent />
    </Suspense>
  );
}
