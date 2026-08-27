"use client";

import { useEffect, useState } from "react";
import { timeAgo, truncate } from "@/lib/utils";

interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  fromName: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
}

interface InboxData {
  connected: boolean;
  configured: boolean;
  email?: string;
  unreadCount?: number;
  messages?: GmailMessage[];
  error?: string;
}

export default function GmailPanel({ limit = 5, showDisconnect = false }: { limit?: number; showDisconnect?: boolean }) {
  const [data, setData] = useState<InboxData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch("/api/gmail/inbox");
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disconnect = async () => {
    await fetch("/api/gmail/disconnect", { method: "POST" });
    setLoading(true);
    await load();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (!data || !data.connected) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Connect your Gmail</p>
          <p className="mt-1 text-xs text-gray-500">
            See client emails right here on your dashboard.
          </p>
        </div>
        {data && !data.configured ? (
          <p className="rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
            Set <code className="font-mono">GOOGLE_CLIENT_ID</code> and{" "}
            <code className="font-mono">GOOGLE_CLIENT_SECRET</code> in your environment first
            (see README for setup).
          </p>
        ) : (
          <a href="/api/gmail/connect" className="btn-primary text-sm">
            Connect Gmail
          </a>
        )}
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="space-y-3 py-2 text-center">
        <p className="text-sm text-gray-600">{data.error}</p>
        <a href="/api/gmail/connect" className="btn-secondary text-sm">
          Reconnect Gmail
        </a>
      </div>
    );
  }

  const messages = (data.messages || []).slice(0, limit);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
        <span className="truncate">{data.email}</span>
        <div className="flex items-center gap-2">
          {typeof data.unreadCount === "number" && data.unreadCount > 0 && (
            <span className="badge bg-red-100 text-red-700">{data.unreadCount} unread</span>
          )}
          {showDisconnect && (
            <button onClick={disconnect} className="text-gray-400 hover:text-red-600">
              Disconnect
            </button>
          )}
        </div>
      </div>
      {messages.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">Inbox is empty.</p>
      ) : (
        <div className="space-y-1">
          {messages.map((msg) => (
            <a
              key={msg.id}
              href={`https://mail.google.com/mail/u/0/#inbox/${msg.threadId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg p-2.5 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`truncate text-sm ${
                    msg.isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                  }`}
                >
                  {msg.fromName}
                </p>
                <span className="shrink-0 text-xs text-gray-400">
                  {msg.date ? timeAgo(msg.date) : ""}
                </span>
              </div>
              <p className={`truncate text-sm ${msg.isUnread ? "text-gray-800" : "text-gray-600"}`}>
                {msg.subject}
              </p>
              <p className="truncate text-xs text-gray-400">{truncate(msg.snippet, 80)}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
