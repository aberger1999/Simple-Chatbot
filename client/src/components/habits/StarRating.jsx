export default function StarRating({ value, onChange, max = 5 }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          className={`w-6 h-6 rounded-full text-xs font-bold transition-colors ${
            i < value
              ? 'bg-primary text-white'
              : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500'
          }`}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );
}
