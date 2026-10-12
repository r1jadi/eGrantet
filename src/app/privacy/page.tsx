import { ApplicantShell } from "@/modules/grants/components/applicant-shell";
import { getPrivacyContent } from "@/components/legal/legal-content";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata = {
  title: "Privacy Policy | eGrantet",
  description:
    "How eGrantet collects, uses, stores, and protects your personal data — accounts, applications, documents, cookies, and your privacy rights.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const locale = await getServerLocale();
  const doc = getPrivacyContent(locale);

  return (
    <ApplicantShell>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">eGrantet</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{doc.updated}</p>
        <p className="mt-4 leading-7 text-muted-foreground">{doc.intro}</p>
        {doc.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-xl font-bold tracking-tight">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 48)} className="mt-3 leading-7 text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </main>
    </ApplicantShell>
  );
}
