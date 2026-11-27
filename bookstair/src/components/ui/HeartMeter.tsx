interface HeartMeterProps {
  value: number;
  max: number;
}

/** 친밀도 표시 (하트 n개) */
export function HeartMeter({ value, max }: HeartMeterProps) {
  return (
    <span className="inline-flex gap-0.5 text-sm leading-none" role="img" aria-label={`친밀도 ${value} / ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < value ? 'text-rose-deep' : 'text-beige-300'}>
          ♥
        </span>
      ))}
    </span>
  );
}
