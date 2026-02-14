import { Droplets, Minus, Plus } from 'lucide-react';

export default function GlassCounter({ value, onChange, max = 8 }) {
  const count = value || 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {Array.from({ length: max }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i < count ? i : i + 1)}
            className="transition-colors"
          >
            <Droplets
              size={20}
              className={i < count
                ? 'text-blue-500 fill-blue-500/30'
                : 'text-gray-300 dark:text-slate-600'
              }
            />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, count - 1))}
          className="p-1 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
        >
          <Minus size={14} />
        </button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 min-w-[60px] text-center">
          {count}/{max} glasses
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, count + 1))}
          className="p-1 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
