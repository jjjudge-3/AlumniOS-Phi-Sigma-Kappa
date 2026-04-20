"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function BarBreakdown({ data, dataKey = "value", color = "#1d4ed8" }: { data: Array<Record<string, string | number>>; dataKey?: string; color?: string }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#7f8a9d" }} interval={0} angle={-20} textAnchor="end" height={70} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#7f8a9d" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "#0f1724",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#f3f6fb",
              borderRadius: "12px",
            }}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
