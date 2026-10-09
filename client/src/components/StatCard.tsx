import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  color: "blue" | "green" | "purple" | "orange";
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: StatCardProps) {
  return (
    <article className={`stat-card stat-card-${color}`}>
      <div className="stat-card-top">
        <span className="stat-card-title">{title}</span>

        <div className="stat-card-icon">
          <Icon size={21} strokeWidth={1.8} />
        </div>
      </div>

      <div className="stat-card-value">{value}</div>

      <p className="stat-card-subtitle">{subtitle}</p>
    </article>
  );
}

export default StatCard;
