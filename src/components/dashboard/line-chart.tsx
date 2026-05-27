type LineChartPoint = {
  label: string;
  value: number;
};

type LineChartProps = {
  title: string;
  subtitle?: string;
  points: LineChartPoint[];
};

export function LineChart({ title, subtitle, points }: LineChartProps) {
  const width = 640;
  const height = 220;
  const padding = { top: 24, right: 24, bottom: 36, left: 24 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  const coordinates = points.map((point, index) => {
    const x =
      points.length === 1
        ? padding.left + innerWidth / 2
        : padding.left + (index / (points.length - 1)) * innerWidth;
    const y = padding.top + innerHeight - (point.value / maxValue) * innerHeight;
    return { ...point, x, y };
  });

  const linePath = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${coordinates.at(-1)?.x ?? padding.left} ${padding.top + innerHeight} L ${coordinates[0]?.x ?? padding.left} ${padding.top + innerHeight} Z`;

  return (
    <section className="group rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-zinc-500">{subtitle}</p> : null}
        </div>
        <div className="rounded-full bg-gradient-to-r from-[#161823] via-[#2b2f3a] to-[#161823] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
          Trend
        </div>
      </div>

      {points.length ? (
        <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-auto w-full" role="img" aria-label={title}>
          <defs>
            <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#25f4ee" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#fe2c55" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="chartLine" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#25f4ee" />
              <stop offset="100%" stopColor="#fe2c55" />
            </linearGradient>
          </defs>

          {[0, 1, 2, 3].map((step) => {
            const y = padding.top + (step / 3) * innerHeight;
            return (
              <line
                key={step}
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="rgba(15,23,42,0.08)"
                strokeDasharray="4 6"
              />
            );
          })}

          <path d={areaPath} fill="url(#chartFill)" />
          <path d={linePath} fill="none" stroke="url(#chartLine)" strokeWidth="3" strokeLinecap="round" />

          {coordinates.map((point) => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="5" fill="#fff" stroke="#fe2c55" strokeWidth="2" />
              <text x={point.x} y={height - 8} textAnchor="middle" fontSize="10" fill="#71717a">
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-zinc-200 px-4 py-10 text-center text-sm text-zinc-500">
          暂无视频趋势数据
        </div>
      )}
    </section>
  );
}
