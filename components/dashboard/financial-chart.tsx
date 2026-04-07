'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ChartDataPoint {
  name: string;
  donations: number;
  expenses: number;
}

interface FinancialChartProps {
  data: ChartDataPoint[];
  title?: string;
  description?: string;
  onCardClick?: () => void;
}

const DONATIONS_COLOR = '#059669';
const EXPENSES_COLOR = '#f43f5e';

export function FinancialChart({ data, title = 'Financial Overview', description, onCardClick }: FinancialChartProps) {
  const donationsTotal = data.reduce((sum, row) => sum + Number(row.donations || 0), 0);
  const expensesTotal = data.reduce((sum, row) => sum + Number(row.expenses || 0), 0);

  return (
    <Card
      className={`border-border ${onCardClick ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}`}
      onClick={onCardClick}
      role={onCardClick ? 'button' : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onCardClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onCardClick();
        }
      }}
    >
      <CardHeader>
        <CardTitle className="text-foreground">{title}</CardTitle>
        {description && <CardDescription className="text-muted-foreground">{description}</CardDescription>}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <p className="font-medium text-emerald-600">
            Donations: ₹{donationsTotal.toLocaleString('en-IN')}
          </p>
          <p className="font-medium text-rose-500">
            Expenses: ₹{expensesTotal.toLocaleString('en-IN')}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-75 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDonations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DONATIONS_COLOR} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={DONATIONS_COLOR} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={EXPENSES_COLOR} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={EXPENSES_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `₹${value / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(value: number, name: string) => [
                  `${name === 'Donations' ? 'Donations' : 'Expenses'}: ₹${value.toLocaleString('en-IN')}`,
                  '',
                ]}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: value === 'Donations' ? DONATIONS_COLOR : EXPENSES_COLOR }}>
                    {value}
                  </span>
                )}
              />
              <Area
                type="monotone"
                dataKey="donations"
                name="Donations"
                stroke={DONATIONS_COLOR}
                fillOpacity={1}
                fill="url(#colorDonations)"
                strokeWidth={2}
                dot={{ r: 3, fill: DONATIONS_COLOR, strokeWidth: 0 }}
                activeDot={{ r: 4, fill: DONATIONS_COLOR }}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke={EXPENSES_COLOR}
                fillOpacity={1}
                fill="url(#colorExpenses)"
                strokeWidth={2}
                dot={{ r: 3, fill: EXPENSES_COLOR, strokeWidth: 0 }}
                activeDot={{ r: 4, fill: EXPENSES_COLOR }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
