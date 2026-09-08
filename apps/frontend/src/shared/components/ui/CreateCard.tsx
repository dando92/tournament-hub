import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { btnCreate } from "@/styles/buttonStyles";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

type CreateCardProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

export default function CreateCard({ label, onClick, disabled = false, className = "" }: CreateCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 py-6 ${btnCreate} ${className}`}
    >
      <FontAwesomeIcon icon={faPlus} className="text-lg" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
