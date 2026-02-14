export default function CircularTimer({ timeLeft, totalTime, progress, isRunning, isPaused }) {
  const size = 200;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const done = totalTime > 0 && timeLeft === 0 && !isRunning;
  let strokeColor = 'var(--color-primary)';
  if (isPaused) strokeColor = '#f59e0b';
  if (done) strokeColor = '#22c55e';

  let textColor = 'text-gray-900 dark:text-white';
  if (isPaused) textColor = 'text-amber-500';
  if (done) textColor = 'text-green-500';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-slate-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-4xl font-bold tabular-nums ${textColor}`}>
          {display}
        </span>
      </div>
    </div>
  );
}
