import { PageHeader } from "@/components/ui/PageHeader";
import { CsvImporter } from "@/components/import/CsvImporter";

export default function ImportPage() {
  return (
    <div>
      <PageHeader
        title="Import sheets"
        description="Bring your existing Excel / Google Sheets tracking into the CRM. Rows are matched by email or phone, so re-importing an updated sheet never creates duplicates."
      />
      <CsvImporter />
    </div>
  );
}
