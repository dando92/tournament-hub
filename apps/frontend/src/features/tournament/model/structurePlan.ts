import type { PlanNode, PlanNodeKind, StructurePlan } from "@/features/tournament/model/types";
import type { Status } from "@/shared/components/ui/status";


export function planNodesOfKind(plan: StructurePlan, kind: PlanNodeKind): PlanNode[] {
  return plan.nodes.filter((node) => node.kind === kind);
}

export type PlanKindCounts = {
  create: number;
  link: number;
  skip: number;
  total: number;
};

export function planCounts(plan: StructurePlan, kind: PlanNodeKind): PlanKindCounts {
  const nodes = planNodesOfKind(plan, kind);

  return {
    create: nodes.filter((node) => node.action === "create").length,
    link: nodes.filter((node) => node.action === "link").length,
    skip: nodes.filter((node) => node.action === "skip").length,
    total: nodes.length,
  };
}

export function planActionLabel(node: PlanNode): string {
  if (node.action === "skip") {
    return "Left out";
  }

  if (node.action === "link") {
    if (node.linkEvidence === "name") {
      return node.kind === "participant" ? "Match existing participant" : node.kind === "entrant" ? "Match existing entrant" : "Match existing";
    }

    return "Mapped";
  }

  switch (node.kind) {
    case "division":
      return "Create division";
    case "phase":
      return "Create phase";
    case "phaseGroup":
      return "Create pool";
    case "match":
      return "Create match";
    case "entrant":
      return node.entrantType === "team" ? "Create team entrant" : "Create entrant";
    case "participant":
      return node.localPlayerId ? "Create participant" : "Create player + participant";
  }
}

export function planActionStatus(node: PlanNode): Status {
  if (node.needsAttention) return "pending";
  if (node.action === "skip") return "idle";

  return node.action === "link" ? "done" : "running";
}
