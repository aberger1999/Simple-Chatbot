export default function IntensityToggle({ value, onChange }) {
  const levels = ['low', 'medium', 'high'];
  return (
    <div className="flex gap-1">
      {levels.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={`px-3 py-1 text-xs rounded-lg capitalize transition-colors ${
            value === l
              ? 'bg-primary text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
