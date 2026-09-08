import Sidebar from "@/shared/components/layout/Sidebar";

export default function BrowsePage() {
  return (
    <div className="-m-4 -mb-20 flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] flex-col md:hidden">
      <Sidebar showFooter={false} />
    </div>
  );
}
