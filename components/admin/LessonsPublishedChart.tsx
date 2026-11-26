import { Card } from "@/components/shared/Card";

// MOCK DATA is passed in from the School Admin dashboard until the usage RPC is ready.
const chart = {
  left: 44,
  right: 620,
  top: 20,
  bottom: 184,
  width: 640,
  height: 232,
};

export function LessonsPublishedChart({
  dailyCounts,
}: {
  dailyCounts: number[];
}) {
  const maxCount = Math.max(1, ...dailyCounts);
  const points = dailyCounts.map((count, index) => {
    const x =
      chart.left +
      (index * (chart.right - chart.left)) / Math.max(1, dailyCounts.length - 1);
    const y =
      chart.bottom - (count / maxCount) * (chart.bottom - chart.top);
    return { x, y, count, day: index + 1 };
  });
  const linePoints = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const tickDays = [1, 5, 10, 15, 20, 25, 30].filter(
    (day) => day <= dailyCounts.length,
  );

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-ink">
            Lessons Published (Last 30 Days)
          </h3>
          <p className="mt-1 text-sm text-ink-secondary">Daily publishing activity</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-brand-border bg-brand-subtle px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-primary">
            Preview Data
          </span>
          <p className="text-xs font-medium text-ink-muted">LESSONS / DAY</p>
        </div>
      </div>

      <div className="mt-4 w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Line chart of daily lessons published over the last 30 days"
          className="h-52 w-full overflow-visible text-ink-muted"
        >
          {[0, 1, 2, 3, 4].map((tick) => {
            const y = chart.bottom - (tick / 4) * (chart.bottom - chart.top);
            return (
              <g key={tick}>
                <line
                  x1={chart.left}
                  x2={chart.right}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="3 5"
                  className="opacity-25"
                />
                <text
                  x={chart.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="currentColor"
                >
                  {Math.round((tick / 4) * maxCount)}
                </text>
              </g>
            );
          })}
          <polyline
            points={linePoints}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-brand-primary"
          />
          {points.map(({ x, y, day }) =>
            day % 5 === 0 || day === 1 || day === points.length ? (
              <circle
                key={day}
                cx={x}
                cy={y}
                r="3.5"
                className="fill-brand-primary"
              />
            ) : null,
          )}
          {tickDays.map((day) => {
            const x =
              chart.left +
              ((day - 1) * (chart.right - chart.left)) /
                Math.max(1, dailyCounts.length - 1);
            return (
              <text
                key={day}
                x={x}
                y={chart.height - 4}
                textAnchor="middle"
                fontSize="11"
                fill="currentColor"
              >
                {day}
              </text>
            );
          })}
        </svg>
        <p className="mt-1 text-right text-xs text-ink-muted">Day in 30-day period</p>
      </div>
    </Card>
  );
}
