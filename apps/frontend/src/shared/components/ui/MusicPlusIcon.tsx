import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMusic, faPlus } from "@fortawesome/free-solid-svg-icons";

type MusicPlusIconProps = {
  className?: string;
};

export default function MusicPlusIcon({ className = "" }: MusicPlusIconProps) {
  return (
    <span className={`relative inline-flex h-4 w-6 items-center ${className}`}>
      <FontAwesomeIcon icon={faMusic} className="absolute left-0" />
      <FontAwesomeIcon icon={faPlus} className="absolute right-0 top-1/2 -translate-y-1/2 text-[8px]" />
    </span>
  );
}
