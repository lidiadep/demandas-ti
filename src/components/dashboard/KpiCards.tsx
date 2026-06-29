import type { ReactNode } from "react";

type Color =
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "cyan";

interface Props {
  icon: ReactNode;
  title: string;
  value: number | string;
  subtitle: string;
  color: Color;
}

const styles = {
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    bar: "bg-blue-600",
  },

  green: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    bar: "bg-emerald-500",
  },

  orange: {
    bg: "bg-orange-50",
    text: "text-orange-600",
    bar: "bg-orange-500",
  },

  purple: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    bar: "bg-purple-500",
  },

  cyan: {
    bg: "bg-cyan-50",
    text: "text-cyan-600",
    bar: "bg-cyan-500",
  },
};

export function KpiCard({
  icon,
  title,
  value,
  subtitle,
  color,
}: Props) {
  const style = styles[color];

  return (
    <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all">

      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center ${style.bg} ${style.text}`}
      >
        {icon}
      </div>

      <p className="mt-5 text-xs uppercase tracking-widest font-semibold text-slate-500">
        {title}
      </p>

      <h2 className="mt-2 text-5xl font-bold text-slate-900">
        {value}
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        {subtitle}
      </p>

      <div className="mt-6 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full w-2/5 ${style.bar}`}
        />
      </div>

    </div>
  );
}