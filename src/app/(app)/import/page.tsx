import { PageHeader } from "@/components/ui/PageHeader";
import { CsvImporter } from "@/components/import/CsvImporter";

export default function ImportPage() {
  return (
    <div>
      <PageHeader
        title="Import prospect lists"
        description="Bring in any prospect list — exported sheets, Apollo/Lusha exports, conference attendee lists. Rows are matched by email or phone, so re-importing never creates duplicates."
      />
      <CsvImporter />
    </div>
  );
}
