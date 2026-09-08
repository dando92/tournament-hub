import SeedingTab from "@/features/division/ui/SeedingTab";
import { useDivisionPageContext } from "@/features/division/model/DivisionPageContext";

export default function DivisionSeedingPage() {
  const { division, entrants, controls } = useDivisionPageContext();
  return <SeedingTab division={division} entrants={entrants} canEdit={controls} />;
}
