'use client';

type ContentJobDetailUploadSummaryCardProps = {
  label: string;
  value: string;
};

export function ContentJobDetailUploadSummaryCard({
  label,
  value,
}: ContentJobDetailUploadSummaryCardProps) {
  return (
    <div className="rounded-lg border p-3 text-sm">
      <p className="font-medium">{label}</p>
      <p className="mt-1 text-muted-foreground">{value}</p>
    </div>
  );
}
