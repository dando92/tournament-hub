import { gradeBandText, gradeOf } from "@/features/stats/model/grade";

function Star({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M10 1.6 12.12 7.09 17.99 7.4 13.42 11.11 14.94 16.8 10 13.6 5.06 16.8 6.58 11.11 2.01 7.4 7.88 7.09Z" />
    </svg>
  );
}

export default function GradeMark({
  percentage,
  isFailed = false,
  size = 13,
}: {
  percentage: number | null;
  isFailed?: boolean;
  size?: number;
}) {
  if (percentage === null && !isFailed) {
    return null;
  }

  const grade = gradeOf(percentage ?? 0, isFailed);
  const tone = gradeBandText[grade.band];

  if (grade.kind === "stars") {
    return (
      <span className={`inline-flex items-center gap-px ${tone}`} title={`${grade.stars} star${grade.stars === 1 ? "" : "s"}`}>
        {Array.from({ length: grade.stars }, (_, index) => (
          <Star key={index} size={size} />
        ))}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-baseline font-extrabold tracking-tight ${tone}`} style={{ fontSize: `${size + 2}px` }}>
      {grade.letter}
      {grade.sign ? <span style={{ fontSize: `${size - 3}px` }}>{grade.sign}</span> : null}
    </span>
  );
}
