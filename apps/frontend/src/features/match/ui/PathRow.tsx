type PathRowProps = {
  ordinalLabel: string;
  sourceMatchName: string;
  colSpan: number;
  isSelected?: boolean;
  onToggle?: () => void;
};

export default function PathRow({ ordinalLabel, sourceMatchName, colSpan, isSelected = false, onToggle }: PathRowProps) {
  const canToggle = Boolean(onToggle);

  return (
    <tr
      className={`border-t border-ui-separator bg-ui-row transition-colors ${
        isSelected
          ? "bg-ui-selected"
          : canToggle
            ? "cursor-pointer hover:bg-ui-raised"
            : ""
      }`}
      onClick={onToggle}
    >
      <td
        colSpan={colSpan}
        className={`px-3 py-2 text-center text-sm italic ${
          isSelected ? "text-ui-text-soft font-medium" : "text-ui-text-mute"
        }`}
      >
        {ordinalLabel} of {sourceMatchName}
      </td>
    </tr>
  );
}
