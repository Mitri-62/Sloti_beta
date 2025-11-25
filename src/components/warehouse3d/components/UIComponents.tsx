import { FC, ReactNode } from 'react';

interface BtnProps {
  icon: ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
  variant?: 'default' | 'warning' | 'success';
}

export const Btn: FC<BtnProps> = ({ icon, onClick, title, active, variant = 'default' }) => {
  const getClasses = () => {
    if (variant === 'warning' && active) return 'bg-amber-500 text-white';
    if (variant === 'success' && active) return 'bg-green-500 text-white';
    if (active) return 'bg-blue-600 text-white';
    return 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200';
  };

  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg shadow-sm transition-all ${getClasses()}`}
    >
      {icon}
    </button>
  );
};

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
}

export const Slider: FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit = ''
}) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
      {label}: <span className="font-semibold text-blue-500">{value}{unit}</span>
    </label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(+e.target.value)}
      className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer dark:bg-slate-700"
    />
  </div>
);