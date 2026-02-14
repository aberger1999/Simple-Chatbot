const MOODS = [
  { value: 1, emoji: '\u{1F614}', label: 'Bad' },
  { value: 2, emoji: '\u{1F615}', label: 'Meh' },
  { value: 3, emoji: '\u{1F610}', label: 'Okay' },
  { value: 4, emoji: '\u{1F60A}', label: 'Good' },
  { value: 5, emoji: '\u{1F601}', label: 'Great' },
];

export const MOOD_EMOJI_MAP = Object.fromEntries(MOODS.map((m) => [m.value, m.emoji]));

export default function MoodSelector({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {MOODS.map((mood) => (
        <button
          key={mood.value}
          type="button"
          onClick={() => onChange(mood.value)}
          className={`flex flex-col items-center gap-0.5 p-2 rounded-lg transition-all ${
            value === mood.value
              ? 'ring-2 ring-primary bg-primary/10 scale-110'
              : 'hover:bg-gray-100 dark:hover:bg-slate-700'
          }`}
        >
          <span className="text-xl">{mood.emoji}</span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">{mood.label}</span>
        </button>
      ))}
    </div>
  );
}
