import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ManualFormProps {
  title: string;
  children: React.ReactNode;
}

export default function ManualForm({ title, children }: ManualFormProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-gray-100 rounded mb-6 shadow-sm">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center px-4 py-3 text-left font-semibold text-gray-700 hover:bg-gray-200"
      >
        {title}
        {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {/* Contenu */}
      {open && <div className="p-4 border-t">{children}</div>}
    </div>
  );
}
