"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/page-states";
import { useT } from "@/lib/i18n/client";
import { formatDate, formatCurrency } from "@/lib/i18n/format";
import { useLocale } from "@/lib/i18n/client";
import type { MunicipalApplicationListItem } from "../types";

function applicantLabel(item: MunicipalApplicationListItem, fallback: string) {
  return item.applicantOrganisation ?? item.applicantName ?? fallback;
}

const STATUS_FILTERS = ["ALL", "SUBMITTED", "UNDER_REVIEW", "CORRECTION_REQUESTED", "APPROVED", "REJECTED", "DECIDED"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

/**
 * Review queue for municipal staff: search by applicant or grant, filter by
 * status, and sort — all functional over the server-loaded queue.
 */
export function MunicipalApplicationList({ applications }: { applications: MunicipalApplicationListItem[] }) {
  const t = useT();
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sort, setSort] = useState<"submitted" | "amount" | "applicant">("submitted");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return applications
      .filter((item) => {
        const matchesTerm =
          !term ||
          applicantLabel(item, "").toLowerCase().includes(term) ||
          item.grantTitle.toLowerCase().includes(term);
        const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
        return matchesTerm && matchesStatus;
      })
      .sort((left, right) => {
        if (sort === "amount") return (right.fundingAmount ?? 0) - (left.fundingAmount ?? 0);
        if (sort === "applicant") return applicantLabel(left, "").localeCompare(applicantLabel(right, ""));
        return (left.submittedAt ?? "").localeCompare(right.submittedAt ?? "");
      });
  }, [applications, query, statusFilter, sort]);

  if (applications.length === 0) {
    return (
      <EmptyState
        title={t("municipality.noApplicationsToReview")}
        description={t("municipality.noApplicationsToReviewDescription")}
      />
    );
  }

  const showFilters = applications.length > 1 || query || statusFilter !== "ALL";

  const reviewLink = (item: MunicipalApplicationListItem) => (
    <Link href={`/municipality/applications/${item.id}`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
      {t("municipality.review")} <ArrowUpRight className="size-4" aria-hidden="true" />
    </Link>
  );

  return (
    <>
      {showFilters && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-medium">
            {t("common.search")}
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("municipality.searchByTitle")}
              className="mt-1"
            />
          </label>
          <label className="text-sm font-medium">
            {t("municipality.statusColumn")}
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="mt-1 font-normal">
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL" ? t("municipality.allStatuses") : status}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-medium">
            {t("grants.sortBy")}
            <Select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="mt-1 font-normal">
              <option value="submitted">{t("applications.submitted")}</option>
              <option value="amount">{t("municipality.requestedColumn")}</option>
              <option value="applicant">{t("municipality.applicantColumn")}</option>
            </Select>
          </label>
          {(query || statusFilter !== "ALL" || sort !== "submitted") && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setQuery("");
                setStatusFilter("ALL");
                setSort("submitted");
              }}
            >
              {t("common.clearFilters")}
            </Button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title={t("municipality.noGrantsFound")} description={t("municipality.tryDifferentFilter")} />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">{t("municipality.applicantColumn")}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t("applications.grant")}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t("municipality.requestedColumn")}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t("applications.status")}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t("applications.submitted")}</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">{t("common.open")}</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{applicantLabel(item, t("municipality.unnamedApplicant"))}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.grantTitle}</td>
                    <td className="px-4 py-3">{formatCurrency(locale, item.fundingAmount, item.fundingCurrency)}</td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(locale, item.submittedAt)}</td>
                    <td className="px-4 py-3 text-right">{reviewLink(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden">
            {filtered.map((item) => (
              <li key={item.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{applicantLabel(item, t("municipality.unnamedApplicant"))}</p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{item.grantTitle}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("municipality.requestedColumn")}</dt><dd className="mt-0.5 font-medium">{formatCurrency(locale, item.fundingAmount, item.fundingCurrency)}</dd></div>
                  <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("applications.submitted")}</dt><dd className="mt-0.5 font-medium">{formatDate(locale, item.submittedAt)}</dd></div>
                </dl>
                <div className="mt-3">{reviewLink(item)}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
