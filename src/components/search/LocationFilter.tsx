import Link from "next/link";
import Form from "next/form";
import { LocationFields } from "./LocationFields";
import { getV4Rows } from "@/lib/v4/queries";
import { getUiStrings } from "@/lib/i18n/server";

export async function LocationFilter({
  filters,
  action,
}: {
  filters: Record<string, string | undefined>;
  action: string;
}) {
  const [places, { kn }] = await Promise.all([
    getV4Rows("places"),
    getUiStrings(),
  ]);
  const preserved = Object.entries(filters).filter(
    ([key, value]) =>
      value && !["state", "district", "city", "place", "page"].includes(key),
  );
  return (
    <Form action={action} className="filters location-filter">
      {preserved.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <LocationFields
        key={[filters.state, filters.district, filters.city].join("/")}
        places={places}
        filters={filters}
      />
      <div className="filter-actions">
        <button className="button button-ember">{kn.filter}</button>
        <Link
          className="button button-outline"
          href={
            action +
            (preserved.length
              ? "?" + new URLSearchParams(preserved as [string, string][])
              : "")
          }
        >
          {kn.clear}
        </Link>
      </div>
    </Form>
  );
}
