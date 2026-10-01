import type { Grant } from "./types";

export type GrantCategory = "Community" | "Culture" | "Environment" | "Business" | "Youth";

export interface ApplicantGrant extends Grant {
  category: GrantCategory;
  location: string;
  organization: string;
  coverClassName: string;
  shortDescription: string;
  eligibilitySummary: string;
  highlights: string[];
}

export const mockGrants: ApplicantGrant[] = [
  {
    id: "green-neighbourhoods-2026",
    municipalityId: "budapest-13",
    title: "Green neighbourhoods fund",
    shortDescription: "Turn local ideas into greener, more welcoming streets and shared spaces.",
    description: "The Green neighbourhoods fund supports resident groups, schools, and local non-profits that want to improve public spaces through planting, small-scale climate adaptation, and community-led stewardship.",
    status: "PUBLISHED",
    fundingAmount: 5000,
    fundingCurrency: "EUR",
    applicationDeadline: "2026-11-18",
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-20T08:00:00.000Z",
    category: "Environment",
    location: "District XIII",
    organization: "District XIII Municipality",
    coverClassName: "from-emerald-700 to-teal-600",
    eligibilitySummary: "Open to local associations, schools, and informal resident groups with a project in District XIII.",
    highlights: ["Up to €5,000 in funding", "Co-design support available", "Projects begin in spring 2027"],
  },
  {
    id: "culture-in-the-square",
    municipalityId: "budapest-13",
    title: "Culture in the square",
    shortDescription: "Bring free arts, music, and storytelling to public spaces across the district.",
    description: "This programme funds accessible cultural events that create connection between neighbours. We welcome proposals for performances, workshops, exhibitions, and intergenerational activities in public spaces.",
    status: "PUBLISHED",
    fundingAmount: 8000,
    fundingCurrency: "EUR",
    applicationDeadline: "2026-10-29",
    createdAt: "2026-09-02T08:00:00.000Z",
    updatedAt: "2026-09-20T08:00:00.000Z",
    category: "Culture",
    location: "District XIII",
    organization: "District XIII Municipality",
    coverClassName: "from-violet-700 to-fuchsia-600",
    eligibilitySummary: "Open to registered cultural organisations and community groups serving District XIII residents.",
    highlights: ["Up to €8,000 in funding", "Free public access required", "Events from April to October 2027"],
  },
  {
    id: "youth-makers-lab",
    municipalityId: "budapest-13",
    title: "Youth makers lab",
    shortDescription: "Help young people design, make, and share their ideas with the community.",
    description: "Youth makers lab backs practical, hands-on programmes for people aged 13–25. Grants can cover materials, mentoring, venue hire, and outreach for activities that build confidence and future-ready skills.",
    status: "PUBLISHED",
    fundingAmount: 3500,
    fundingCurrency: "EUR",
    applicationDeadline: "2026-12-05",
    createdAt: "2026-09-04T08:00:00.000Z",
    updatedAt: "2026-09-20T08:00:00.000Z",
    category: "Youth",
    location: "Budapest",
    organization: "Budapest Youth Office",
    coverClassName: "from-amber-500 to-orange-600",
    eligibilitySummary: "Open to youth organisations, schools, and non-profits with programmes for Budapest residents aged 13–25.",
    highlights: ["Up to €3,500 in funding", "Young people must shape the project", "Flexible delivery formats"],
  },
  {
    id: "local-business-innovation",
    municipalityId: "budapest-13",
    title: "Local business innovation grant",
    shortDescription: "Small investments for local businesses creating better services and local jobs.",
    description: "The Local business innovation grant helps small enterprises test an improvement that benefits their customers, staff, or neighbourhood. Funding can support equipment, digital tools, accessibility, or new service pilots.",
    status: "PUBLISHED",
    fundingAmount: 10000,
    fundingCurrency: "EUR",
    applicationDeadline: "2026-11-10",
    createdAt: "2026-09-07T08:00:00.000Z",
    updatedAt: "2026-09-20T08:00:00.000Z",
    category: "Business",
    location: "District XIII",
    organization: "District XIII Municipality",
    coverClassName: "from-sky-700 to-blue-600",
    eligibilitySummary: "Open to registered small businesses operating in District XIII for at least one year.",
    highlights: ["Up to €10,000 in funding", "50% co-financing required", "Decisions within six weeks"],
  },
  {
    id: "connected-communities",
    municipalityId: "budapest-13",
    title: "Connected communities",
    shortDescription: "Create welcoming activities that help neighbours meet, contribute, and belong.",
    description: "Connected communities funds small local initiatives that reduce isolation and strengthen everyday connections. Applications are welcome from resident-led groups, charities, and social organisations.",
    status: "PUBLISHED",
    fundingAmount: 2500,
    fundingCurrency: "EUR",
    applicationDeadline: "2026-10-22",
    createdAt: "2026-09-08T08:00:00.000Z",
    updatedAt: "2026-09-20T08:00:00.000Z",
    category: "Community",
    location: "District XIII",
    organization: "District XIII Municipality",
    coverClassName: "from-rose-600 to-pink-500",
    eligibilitySummary: "Open to community groups and non-profits delivering inclusive activities in District XIII.",
    highlights: ["Up to €2,500 in funding", "Simple application form", "Priority for inclusive ideas"],
  },
];

export function getMockGrant(id: string) {
  return mockGrants.find((grant) => grant.id === id);
}
