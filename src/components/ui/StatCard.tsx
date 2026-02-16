import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ReactNode;
  iconBg: string;
}

export default function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  iconBg,
}: StatCardProps) {
  return (
    <div className="card flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        {change && (
          <p
            className={cn(
              "mt-1 text-sm font-medium",
              changeType === "positive" && "text-green-600",
              changeType === "negative" && "text-red-600",
              changeType === "neutral" && "text-gray-500"
            )}
          >
            {changeType === "positive" && "+"}
            {change}
          </p>
        )}
      </div>
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl",
          iconBg
        )}
      >
        {icon}
      </div>
    </div>
  );
}
