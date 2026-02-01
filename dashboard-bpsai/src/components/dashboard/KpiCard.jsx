import React from "react";

export const KpiCardSkeleton = () => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
    <div className="h-8 bg-gray-300 rounded w-1/2"></div>
  </div>
);

export default function KpiCard({ title, value, subtitle, icon, bgIcon }) {
  const subtitleColor =
    subtitle === "pesan per sesi"
      ? "text-blue-600"
      : subtitle?.includes("↗")
      ? "text-green-600"
      : subtitle?.includes("↘")
      ? "text-red-600"
      : "text-gray-500";

  return (
    <div className="kpi-card hover-lift p-6 rounded-xl shadow-sm bg-white border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className={`text-xs mt-2 font-medium ${subtitleColor}`}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 ${bgIcon} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
