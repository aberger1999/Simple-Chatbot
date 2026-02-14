export default function WeekDots({ weekDates, isCompletedForDate }) {
  return (
    <div className="flex gap-1">
      {weekDates.map((d) => (
        <div
          key={d}
          className={`w-3 h-3 rounded-full ${
            isCompletedForDate(d)
              ? 'bg-green-500'
              : 'bg-gray-200 dark:bg-slate-700'
          }`}
        />
      ))}
    </div>
  );
}
