"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/page-states";
import { useLocale, useT } from "@/lib/i18n/client";
import { GrantCard, type DirectoryGrant } from "./grant-card";

/**
 * Applicant-facing grant directory. The grant rows come from the published
 * grants in the database (server-loaded); search/category/sort run client-side
 * over that page of results.
 */
export function GrantDirectory({ grants, municipalities }: { grants: DirectoryGrant[]; municipalities: string[] }) {
  const t = useT();
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [municipality, setMunicipality] = useState("all");
  const [sort, setSort] = useState("deadline");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const grants_filtered = useMemo(() => grants
    .filter((grant) => {
      const matchesQuery = `${grant.title} ${grant.shortDescription} ${grant.municipalityName}`.toLowerCase().includes(query.toLowerCase());
      return matchesQuery && (municipality === "all" || grant.municipalityName === municipality);
    })
    .sort((a, b) => sort === "amount" ? (b.fundingAmount ?? 0) - (a.fundingAmount ?? 0) : (a.applicationDeadline ?? "9999").localeCompare(b.applicationDeadline ?? "9999")), [grants, municipality, query, sort]);
  const clearFilters = () => { setQuery(""); setMunicipality("all"); setSort("deadline"); };

  const hasActiveFilters = Boolean(query) || municipality !== "all" || sort !== "deadline";

  return <>
    <div className="mx-auto w-full max-w-3xl rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1"><span className="sr-only">{t("grants.searchLabel")}</span><Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("grants.searchPlaceholder")} className="pl-10" /></label>
        <Button type="button" variant="outline" className="md:hidden" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal className="size-4" />{t("common.filters")}</Button>
      </div>
      <div className={`${filtersOpen ? "grid" : "hidden"} mt-3 gap-3 sm:grid-cols-2 md:mt-4 md:flex md:items-end`}>
        <label className="text-sm font-medium">{t("grants.municipalityLabel")}<Select value={municipality} onChange={(event) => setMunicipality(event.target.value)} className="mt-1 font-normal"><option value="all">{t("grants.allMunicipalities")}</option>{municipalities.map((item) => <option key={item} value={item}>{item}</option>)}</Select></label>
        <label className="text-sm font-medium">{t("grants.sortBy")}<Select value={sort} onChange={(event) => setSort(event.target.value)} className="mt-1 font-normal"><option value="deadline">{t("grants.sortDeadline")}</option><option value="amount">{t("grants.sortAmount")}</option></Select></label>
        {hasActiveFilters && <Button type="button" variant="ghost" className="md:ml-auto" onClick={clearFilters}><X className="size-4" />{t("common.clearFilters")}</Button>}
      </div>
    </div>
    <div className="mt-7 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{grants_filtered.length}</span> {t("grants.grantsAvailable", { count: grants_filtered.length })}</p></div>
    {grants_filtered.length > 0 ? <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{grants_filtered.map((grant) => <GrantCard key={grant.id} grant={grant} locale={locale} />)}</div> : <div className="mt-4"><EmptyState title={t("grants.noMatchingGrants")} description={t("grants.noMatchingGrantsDescription")} action={<Button type="button" variant="outline" onClick={clearFilters}>{t("common.clearFilters")}</Button>} /></div>}
  </>;
}
