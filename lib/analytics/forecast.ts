export type MonthlyPoint = {
  month: string;
  actual: number | null;
  forecast: number | null;
};

export type RevenueForecast = {
  currentRevenue: number;
  expectedRevenue: number;
  forecastRevenue: number;
  growthPercentage: number;
  series: MonthlyPoint[];
};

function monthLabel(date: Date) {
  return date.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

/**
 * Lightweight forecasting service.
 * Replace `forecastRevenueSeries` with a trained model later without changing callers.
 */
export function forecastRevenueSeries(
  monthlyActuals: { month: Date; revenue: number }[],
  horizon = 3,
): RevenueForecast {
  const values = monthlyActuals.map((item) => item.revenue);
  const currentRevenue = values.at(-1) ?? 0;
  const previous = values.at(-2) ?? currentRevenue;
  const growthPercentage =
    previous === 0 ? 0 : ((currentRevenue - previous) / previous) * 100;

  const n = values.length || 1;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((sum, value) => sum + value, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  const series: MonthlyPoint[] = monthlyActuals.map((item, index) => ({
    month: monthLabel(item.month),
    actual: item.revenue,
    forecast: index === monthlyActuals.length - 1 ? item.revenue : null,
  }));

  const lastDate = monthlyActuals.at(-1)?.month ?? new Date();
  let forecastRevenue = currentRevenue;
  for (let i = 1; i <= horizon; i += 1) {
    const date = new Date(lastDate);
    date.setMonth(date.getMonth() + i);
    const y = Math.max(0, intercept + slope * (n - 1 + i));
    forecastRevenue = y;
    series.push({
      month: monthLabel(date),
      actual: null,
      forecast: Math.round(y),
    });
  }

  const pipelineExpectation = monthlyActuals.reduce((sum, item) => sum + item.revenue, 0) / n;
  const expectedRevenue = Math.round((currentRevenue + pipelineExpectation + forecastRevenue) / 2);

  return {
    currentRevenue,
    expectedRevenue,
    forecastRevenue: Math.round(forecastRevenue),
    growthPercentage,
    series,
  };
}
