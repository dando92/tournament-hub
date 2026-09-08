import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faChartColumn,
  faListOl,
  faMusic,
  faCalendarDays,
  faSitemap,
  faUsers,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";

export type TreePage = {
  key: string;
  label: string;
  icon: IconDefinition;
  requiresControl?: boolean;
};

export const TOURNAMENT_TREE_PAGES: readonly TreePage[] = [
  { key: "schedule", label: "Schedule", icon: faCalendarDays },
  { key: "structure", label: "Structure", icon: faSitemap, requiresControl: true },
  { key: "participants", label: "Participants", icon: faUsers, requiresControl: true },
  { key: "songs", label: "Songs", icon: faMusic },
  { key: "control-room", label: "Control Room", icon: faSliders, requiresControl: true },
  { key: "stats", label: "Stats", icon: faChartColumn },
];

export const DIVISION_TREE_PAGES: readonly TreePage[] = [
  { key: "entrants", label: "Entrants", icon: faUsers },
  { key: "seeding", label: "Seeding", icon: faListOl },
];
