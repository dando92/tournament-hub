import { useState } from "react";

import { countryName } from "@/shared/lib/countries";

export default function Flag({ nationality }: { nationality: string }) {
  const [missing, setMissing] = useState(false);
  const code = nationality.toLowerCase();

  if (!nationality || missing) {
    return <span className="inline-block h-[14px] w-[20px] shrink-0 rounded-[2px] border border-dashed border-ui-border-strong" title="No nationality" />;
  }

  return (
    <img
      src={`/flags/${code}.svg`}
      alt=""
      title={countryName(nationality)}
      onError={() => setMissing(true)}
      className="h-[14px] w-[20px] shrink-0 rounded-[2px] object-cover ring-1 ring-ui-text/15"
    />
  );
}
