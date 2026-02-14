import { useState } from 'react';

const ACTIVITIES = ['Running', 'Weights', 'Yoga', 'Cycling', 'Swimming', 'Other'];

export default function ActivityChips({ value, onChange }) {
  const [customText, setCustomText] = useState('');
  const isOther = value && !ACTIVITIES.slice(0, -1).includes(value);
  const selected = isOther ? 'Other' : value;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {ACTIVITIES.map((activity) => (
          <button
            key={activity}
            type="button"
            onClick={() => {
              if (activity === 'Other') {
                onChange(customText || 'Other');
              } else {
                onChange(activity);
              }
            }}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              selected === activity
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            {activity}
          </button>
        ))}
      </div>
      {selected === 'Other' && (
        <input
          type="text"
          value={isOther && value !== 'Other' ? value : customText}
          onChange={(e) => {
            setCustomText(e.target.value);
            onChange(e.target.value || 'Other');
          }}
          placeholder="Type activity..."
          className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
        />
      )}
    </div>
  );
}
