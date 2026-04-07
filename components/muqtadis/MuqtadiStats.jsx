import { Card, CardContent } from '@/components/ui/card';

export default function MuqtadiStats({ stats }) {
  const items = [
    { label: 'Total Households', value: stats.totalHouseholds },
    { label: 'Total Muqtadies', value: stats.totalMuqtadies },
    { label: 'Target Muqtadies', value: stats.target },
    { label: 'Remaining', value: stats.remaining },
    { label: 'Verified', value: stats.verified, valueClass: 'text-green-700' },
    { label: 'Pending', value: stats.pending, valueClass: 'text-amber-700' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 px-4 md:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className={`text-xl font-semibold ${item.valueClass ?? ''}`}>{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
