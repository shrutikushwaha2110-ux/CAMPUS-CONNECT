interface FilterChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}

export function FilterChip({ label, selected = false, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center px-4 rounded-full text-sm font-medium transition-colors border"
      style={{
        height: 44,
        backgroundColor: selected ? '#4637D2' : '#fff',
        color: selected ? '#fff' : '#454242',
        borderColor: selected ? '#4637D2' : '#E2E8F0',
      }}
    >
      {label}
    </button>
  );
}
