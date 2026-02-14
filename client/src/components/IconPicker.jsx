import {
  Book, Heart, Code, Music, Coffee, Star,
  Zap, Target, Pen, Brain, Leaf, Smile,
  Sun, Flame, Trophy, Clock, Camera, Globe,
  Palette, Headphones, Bike, BookOpen, Lightbulb, Gamepad2,
} from 'lucide-react';

const ICONS = [
  { name: 'Book', component: Book },
  { name: 'Heart', component: Heart },
  { name: 'Code', component: Code },
  { name: 'Music', component: Music },
  { name: 'Coffee', component: Coffee },
  { name: 'Star', component: Star },
  { name: 'Zap', component: Zap },
  { name: 'Target', component: Target },
  { name: 'Pen', component: Pen },
  { name: 'Brain', component: Brain },
  { name: 'Leaf', component: Leaf },
  { name: 'Smile', component: Smile },
  { name: 'Sun', component: Sun },
  { name: 'Flame', component: Flame },
  { name: 'Trophy', component: Trophy },
  { name: 'Clock', component: Clock },
  { name: 'Camera', component: Camera },
  { name: 'Globe', component: Globe },
  { name: 'Palette', component: Palette },
  { name: 'Headphones', component: Headphones },
  { name: 'Bike', component: Bike },
  { name: 'BookOpen', component: BookOpen },
  { name: 'Lightbulb', component: Lightbulb },
  { name: 'Gamepad2', component: Gamepad2 },
];

export function getIconComponent(name) {
  return ICONS.find((i) => i.name === name)?.component || Star;
}

export default function IconPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {ICONS.map(({ name, component: Icon }) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          className={`p-2 rounded-lg transition-all ${
            value === name
              ? 'ring-2 ring-primary bg-primary/10'
              : 'hover:bg-gray-100 dark:hover:bg-slate-700'
          }`}
        >
          <Icon size={18} className="text-gray-600 dark:text-gray-300 mx-auto" />
        </button>
      ))}
    </div>
  );
}
