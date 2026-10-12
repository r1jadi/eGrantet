import type { Locale } from "@/lib/i18n/config";

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

const privacyEn: LegalDocument = {
  title: "Privacy Policy",
  updated: "Last updated: October 2026",
  intro:
    "eGrantet is a municipal grants and subsidies platform. This policy describes what personal data the platform actually collects, why it is collected, and how you can exercise your privacy rights. It is based on the real implementation of eGrantet — not on generic template text.",
  sections: [
    {
      heading: "Data controller",
      paragraphs: [
        "The data controller is the organization operating this eGrantet deployment — typically the municipality or public body publishing the grants. That operator decides which grant programmes exist and which staff may review applications.",
        "eGrantet itself does not sell personal data and does not use your data for advertising.",
      ],
    },
    {
      heading: "What we collect",
      paragraphs: [
        "Account data: your full name, email address, and sign-in credentials (managed securely by Supabase Auth). Business accounts additionally store the business NUI and the business details fetched from the ARBK registry for that number.",
        "Application data: the answers, budget figures, project descriptions, and other information you type into grant applications, together with application statuses and decision outcomes.",
        "Documents: the files you upload (PDF, PNG, or JPEG, up to 10 MB each), stored privately and linked to your application or business profile.",
        "Operational data: notification preferences, notification language, audit events (who did what and when), and your cookie-consent choice.",
      ],
    },
    {
      heading: "Why we collect it",
      paragraphs: [
        "Your data is used only to operate the grant lifecycle: creating accounts, publishing and discovering grants, submitting and reviewing applications, verifying eligibility with deterministic rules, assisting reviewers with AI, notifying you about status changes and decisions, and keeping a server-side audit trail of important actions.",
        "AI assistance (application summaries, document analysis) processes the application data you submitted. AI output is advisory only — funding decisions are always made by authorized humans.",
      ],
    },
    {
      heading: "Where data is stored and who can see it",
      paragraphs: [
        "Data is stored in Supabase (PostgreSQL database, authentication, and private file storage). Transactional emails are sent through Resend to your account email address. Fonts are delivered by Google Fonts when pages load.",
        "Access is strictly scoped: applicants see only their own applications and documents; municipal employees see only applications for grants of municipalities they belong to; evaluators see only applications explicitly assigned to them; platform administrators see platform-wide data needed to operate the service.",
        "Documents are kept in a private storage bucket and are never served through public URLs — access uses short-lived signed links after an authorization check.",
      ],
    },
    {
      heading: "Retention and deletion",
      paragraphs: [
        "Account, application, document, and audit records are kept while your account is active and for as long as the operating municipality must preserve grant records under applicable archiving rules. No fixed platform-wide retention period is currently defined in the software.",
        "You may update your profile name and notification preferences in account settings at any time. To request correction or deletion of your data, contact the operator that published the grant you applied to.",
      ],
    },
    {
      heading: "Cookies and consent",
      paragraphs: [
        "Essential cookies keep you signed in and the platform secure — the site cannot work without them. Preference storage remembers your language and light/dark theme on your device. eGrantet loads no analytics, advertising, or tracking scripts.",
        "Your consent choice is stored on your device. You can change it at any time with the “Cookie preferences” link in the footer.",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: [
        "You have the right to access the personal data held about you, to have inaccurate data corrected, and to request deletion where no legal archiving duty requires continued storage. To make a request, use your account settings or contact the operator of the grants you applied to, identifying your account email.",
      ],
    },
    {
      heading: "Security",
      paragraphs: [
        "eGrantet enforces authentication and authorization on the server for every sensitive operation, scopes database access with row-level security, validates uploads by type and size, and returns only safe error messages to users. Even so, no internet service can promise absolute security — protect your password and sign out on shared devices.",
      ],
    },
  ],
};

const privacySq: LegalDocument = {
  title: "Politika e Privatësisë",
  updated: "Përditësuar: tetor 2026",
  intro:
    "eGrantet është platforma e granteve dhe subvencioneve komunale. Kjo politikë përshkruan se çfarë të dhënash personale mbledh realisht platforma, pse mblidhen dhe si mund t'i ushtroni të drejtat tuaja për privatësinë. Ajo bazohet në zbatimin real të eGrantet — jo në tekst shabllon.",
  sections: [
    {
      heading: "Kontrolluesi i të dhënave",
      paragraphs: [
        "Kontrollues i të dhënave është organizata që operon këtë vendosje të eGrantet — zakonisht komuna ose organi publik që publikon grantet. Ai operator vendos se cilat programe grantesh ekzistojnë dhe cili staf mund të shqyrtojë aplikimet.",
        "Vetë eGrantet nuk shet të dhëna personale dhe nuk i përdor të dhënat tuaja për reklama.",
      ],
    },
    {
      heading: "Çfarë mbledhim",
      paragraphs: [
        "Të dhënat e llogarisë: emri juaj i plotë, adresa email dhe kredencialet e hyrjes (të menaxhuara në mënyrë të sigurt nga Supabase Auth). Llogaritë e biznesit ruajnë shtesë NUI-n e biznesit dhe të dhënat e biznesit të marra nga regjistri i ARBK-së për atë numër.",
        "Të dhënat e aplikimit: përgjigjet, shifrat e buxhetit, përshkrimet e projektit dhe informacione të tjera që shkruani në aplikimet për grante, së bashku me statuset e aplikimeve dhe rezultatet e vendimeve.",
        "Dokumentet: skedarët që ngarkoni (PDF, PNG ose JPEG, deri në 10 MB secili), të ruajtur privatisht dhe të lidhur me aplikimin ose profilin tuaj të biznesit.",
        "Të dhënat operative: preferencat e njoftimeve, gjuha e njoftimeve, ngjarjet e auditimit (kush bëri çfarë dhe kur) dhe zgjedhja juaj për cookies.",
      ],
    },
    {
      heading: "Pse i mbledhim",
      paragraphs: [
        "Të dhënat tuaja përdoren vetëm për funksionimin e ciklit të granteve: krijimin e llogarive, publikimin dhe zbulimin e granteve, dërgimin dhe shqyrtimin e aplikimeve, verifikimin e kushteve me rregulla deterministe, ndihmën e shqyrtuesve me AI, njoftimin për ndryshime statusesh dhe vendime, si dhe mbajtjen e gjurmës së auditimit në server për veprimet e rëndësishme.",
        "Ndihma me AI (përmbledhjet e aplikimeve, analiza e dokumenteve) përpunon të dhënat që keni dërguar. Rezultati i AI është vetëm ndihmës — vendimet për financim merren gjithmonë nga njerëz të autorizuar.",
      ],
    },
    {
      heading: "Ku ruhen të dhënat dhe kush i sheh",
      paragraphs: [
        "Të dhënat ruhen në Supabase (baza e të dhënave PostgreSQL, autentikimi dhe ruajtja private e skedarëve). Emailet transaksionale dërgohen përmes Resend në adresën email të llogarisë suaj. Fontet ofrohen nga Google Fonts kur ngarkohen faqet.",
        "Qasja është rreptësishtë e kufizuar: aplikuesit shohin vetëm aplikimet dhe dokumentet e veta; punonjësit e komunës shohin vetëm aplikimet për grantet e komunave ku bëjnë pjesë; vlerësuesit shohin vetëm aplikimet e caktuara shprehimisht atyre; administratorët e platformës shohin të dhënat e nevojshme për funksionimin e shërbimit.",
        "Dokumentet mbahen në një depo private dhe nuk shërbehen kurrë përmes lidhjeve publike — qasja bëhet me lidhje të përkohshme të nënshkruara pas kontrollit të autorizimit.",
      ],
    },
    {
      heading: "Ruajtja dhe fshirja",
      paragraphs: [
        "Regjistrimet e llogarisë, aplikimeve, dokumenteve dhe auditimit mbahen përderisa llogaria juaj është aktive dhe për aq kohë sa komuna operuese duhet t'i ruajë regjistrimet e granteve sipas rregullave të arkivimit. Aktualisht nuk është përcaktuar në softuer një afat fiks ruajtjeje për të gjithë platformën.",
        "Mund të përditësoni emrin e profilit dhe preferencat e njoftimeve në cilësimet e llogarisë në çdo kohë. Për të kërkuar korrigjimin ose fshirjen e të dhënave tuaja, kontaktoni operatorin që publikoi grantin për të cilin aplikuat.",
      ],
    },
    {
      heading: "Cookies dhe pëlqimi",
      paragraphs: [
        "Cookies thelbësore ju mbajnë të kyçur dhe platformën të sigurt — faqja nuk funksionon pa to. Ruajtja e preferencave mban mend gjuhën dhe temën dritë/errësirë në pajisjen tuaj. eGrantet nuk ngarkon skripte analitike, reklamash apo ndjekjeje.",
        "Zgjedhja juaj për pëlqimin ruhet në pajisjen tuaj. Mund ta ndryshoni në çdo kohë me lidhjen “Preferencat e cookies” në fundfaqe.",
      ],
    },
    {
      heading: "Të drejtat tuaja",
      paragraphs: [
        "Keni të drejtë të qaseni në të dhënat personale që mbahen për ju, të korrigjoni të dhënat e pasakta dhe të kërkoni fshirjen kur asnjë detyrim ligjor arkivimi nuk kërkon ruajtje të vazhdueshme. Për të bërë një kërkesë, përdorni cilësimet e llogarisë ose kontaktoni operatorin e granteve për të cilat aplikuat, duke identifikuar emailin e llogarisë suaj.",
      ],
    },
    {
      heading: "Siguria",
      paragraphs: [
        "eGrantet zbaton autentikimin dhe autorizimin në server për çdo veprim të ndjeshëm, kufizon qasjen në bazën e të dhënave me siguri në nivel rreshti, validon ngarkimet sipas llojit dhe madhësisë dhe kthen vetëm mesazhe të sigurta gabimi te përdoruesit. Megjithatë, asnjë shërbim interneti nuk mund të premtojë siguri absolute — mbroni fjalëkalimin tuaj dhe dilni nga llogaria në pajisjet e përbashkëta.",
      ],
    },
  ],
};

const privacySr: LegalDocument = {
  title: "Politika privatnosti",
  updated: "Ažurirano: oktobar 2026.",
  intro:
    "eGrantet je platforma za opštinske grantove i subvencije. Ova politika opisuje koje lične podatke platforma zaista prikuplja, zašto ih prikuplja i kako možete da ostvarite svoja prava. Zasniva se na stvarnoj implementaciji eGranteta — ne na generičkom tekstu.",
  sections: [
    {
      heading: "Rukovalac podacima",
      paragraphs: [
        "Rukovalac podacima je organizacija koja upravlja ovom instalacijom eGranteta — obično opština ili javni organ koji objavljuje grantove. Taj operator odlučuje koji programi postoje i koji kadar sme da razmatra prijave.",
        "Sam eGrantet ne prodaje lične podatke i ne koristi vaše podatke za oglašavanje.",
      ],
    },
    {
      heading: "Šta prikupljamo",
      paragraphs: [
        "Podaci o nalogu: vaše ime i prezime, email adresa i podaci za prijavu (kojima bezbedno upravlja Supabase Auth). Poslovni nalozi dodatno čuvaju NUI preduzeća i poslovne podatke preuzete iz registra ARBK za taj broj.",
        "Podaci o prijavi: odgovori, iznosi budžeta, opisi projekta i druge informacije koje unesete u prijave za grantove, zajedno sa statusima prijava i ishodima odluka.",
        "Dokumenti: fajlovi koje otpremite (PDF, PNG ili JPEG, do 10 MB svaki), čuvani privatno i povezani sa vašom prijavom ili poslovnim profilom.",
        "Operativni podaci: podešavanja obaveštenja, jezik obaveštenja, događaji revizije (ko je šta radio i kada) i vaš izbor o kolačićima.",
      ],
    },
    {
      heading: "Zašto ih prikupljamo",
      paragraphs: [
        "Vaši podaci koriste se samo za rad ciklusa grantova: naloge, objavljivanje i pronalaženje grantova, slanje i razmatranje prijava, proveru uslova determinističkim pravilima, pomoć recenzentima uz AI, obaveštenja o statusima i odlukama, i vođenje serverske evidencije važnih radnji.",
        "AI pomoć (rezimei prijava, analiza dokumenata) obrađuje podatke koje ste poslali. AI rezultat je samo savetodavan — odluke o finansiranju uvek donose ovlašćeni ljudi.",
      ],
    },
    {
      heading: "Gde se podaci čuvaju i ko ih vidi",
      paragraphs: [
        "Podaci se čuvaju u Supabase-u (PostgreSQL baza, autentikacija i privatno skladište fajlova). Transakcioni imejlovi šalju se preko Resend-a na email vašeg naloga. Fontove isporučuje Google Fonts pri učitavanju strana.",
        "Pristup je strogo ograničen: podnosioci vide samo svoje prijave i dokumente; zaposleni u opštini vide samo prijave za grantove svojih opština; evaluatori vide samo dodeljene im prijave; administratori platforme vide podatke potrebne za rad servisa.",
        "Dokumenti se čuvaju u privatnom skladištu i nikad se ne isporučuju javnim linkovima — pristup ide privremenim potpisanim linkovima nakon provere ovlašćenja.",
      ],
    },
    {
      heading: "Čuvanje i brisanje",
      paragraphs: [
        "Nalozi, prijave, dokumenti i evidencija čuvaju se dok je vaš nalog aktivan i dok opština mora da čuva evidenciju grantova po pravilima arhiviranja. Fiksni rok čuvanja za celu platformu trenutno nije definisan u softveru.",
        "Ime profila i podešavanja obaveštenja možete menjati u podešavanjima naloga u svakom trenutku. Za ispravku ili brisanje podataka obratite se operatoru koji je objavio grant za koji ste se prijavili.",
      ],
    },
    {
      heading: "Kolačići i saglasnost",
      paragraphs: [
        "Neophodni kolačići drže vas prijavljenim i platformu bezbednom — sajt ne radi bez njih. Podešavanja pamte vaš jezik i svetlu/tamnu temu na vašem uređaju. eGrantet ne učitava analitičke, reklamne ni trekere.",
        "Vaš izbor se čuva na vašem uređaju. Možete ga promeniti u svakom trenutku linkom „Podešavanja kolačića” u podnožju.",
      ],
    },
    {
      heading: "Vaša prava",
      paragraphs: [
        "Imate pravo da pristupite ličnim podacima o vama, da ispravite netačne podatke i da tražite brisanje gde zakonska obaveza arhiviranja ne zahteva dalje čuvanje. Za zahtev koristite podešavanja naloga ili kontaktirajte operatora grantova za koje ste se prijavili, uz navođenje emaila naloga.",
      ],
    },
    {
      heading: "Bezbednost",
      paragraphs: [
        "eGrantet proverava autentikaciju i autorizaciju na serveru za svaku osetljivu radnju, ograničava pristup bazi politikama na nivou redova, validira otpremanja po tipu i veličini i korisnicima vraća samo bezbedne poruke o greškama. Ipak, nijedan internet servis ne može garantovati apsolutnu bezbednost — čuvajte lozinku i odjavite se na deljenim uređajima.",
      ],
    },
  ],
};

const termsEn: LegalDocument = {
  title: "Terms and Conditions",
  updated: "Last updated: October 2026",
  intro:
    "These terms describe how eGrantet — the municipal grants and subsidies platform — may be used. By creating an account or submitting an application, you agree to these terms.",
  sections: [
    {
      heading: "Purpose and scope",
      paragraphs: [
        "eGrantet connects applicants with municipal grant programmes: grant discovery, eligibility pre-checks, online applications, document upload, review, evaluation, decisions, and post-award project tracking.",
        "eGrantet is a tool provided for grant administration. It is not, by itself, proof of any official government status — that depends on the organization operating the deployment.",
      ],
    },
    {
      heading: "Accounts and responsibilities",
      paragraphs: [
        "You must provide accurate information when registering, keep your password confidential, and keep your profile up to date. Business accounts must supply a correct business NUI; your registered business details are fetched from the ARBK registry.",
        "You are responsible for everything submitted under your account. If you apply on behalf of an organization, confirm you are authorized to do so.",
      ],
    },
    {
      heading: "Your submissions and documents",
      paragraphs: [
        "You confirm that the information in your applications is accurate and that you hold the rights to share every document you upload. Uploaded files may be processed for eligibility verification and AI-assisted document analysis.",
        "Only PDF, PNG, and JPEG files up to 10 MB each are accepted. Files that violate these limits, or that appear malicious, may be rejected.",
      ],
    },
    {
      heading: "Fair use and prohibited conduct",
      paragraphs: [
        "You must not submit false or misleading information, upload unlawful or harmful content, attempt to access other users' applications or documents, circumvent access controls, scrape or abuse the service, or interfere with other users.",
        "Municipal staff and administrators may suspend accounts or remove content that violates these terms, and violations are recorded in the audit trail.",
      ],
    },
    {
      heading: "How grant decisions work",
      paragraphs: [
        "Submitting an application — or passing an eligibility pre-check — does not guarantee funding. Deterministic rules verify requirements, AI assists reviewers with summaries and document analysis, and the final funding decision is always made by authorized humans at the municipality.",
        "Decisions are communicated through the platform and your notification email. Appeal rules, where the municipality offers them, are shown with the decision.",
      ],
    },
    {
      heading: "Availability and third-party services",
      paragraphs: [
        "The platform depends on third-party services (hosting, Supabase, transactional email, and the AI provider gateway). eGrantet aims for reliable operation but does not promise uninterrupted availability, and may change or suspend features for maintenance or security.",
      ],
    },
    {
      heading: "Limitations",
      paragraphs: [
        "To the extent permitted by law, eGrantet is provided as-is without warranties beyond what these terms state. Nothing here limits rights you hold under applicable consumer or data-protection law.",
        "These terms may be updated as the platform evolves; material changes will be reflected on this page with a new update date.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        "For questions about these terms, a specific grant, or a funding decision, contact the municipality or organization that published the grant. For privacy requests, see the Privacy Policy.",
      ],
    },
  ],
};

const termsSq: LegalDocument = {
  title: "Kushtet e Përdorimit",
  updated: "Përditësuar: tetor 2026",
  intro:
    "Këto kushte përshkruajnë se si mund të përdoret eGrantet — platforma e granteve dhe subvencioneve komunale. Duke krijuar një llogari ose duke dërguar një aplikim, ju pranoni këto kushte.",
  sections: [
    {
      heading: "Qëllimi dhe fushëveprimi",
      paragraphs: [
        "eGrantet lidh aplikuesit me programet e granteve komunale: zbulimin e granteve, parakontrollin e kushteve, aplikimet online, ngarkimin e dokumenteve, shqyrtimin, vlerësimin, vendimet dhe ndjekjen e projekteve pas mbështetjes.",
        "eGrantet është një mjet për administrimin e granteve. Në vetvete, nuk është provë e ndonjë statusi zyrtar qeveritar — kjo varet nga organizata që operon vendosjen.",
      ],
    },
    {
      heading: "Llogaritë dhe përgjegjësitë",
      paragraphs: [
        "Duhet të jepni informacione të sakta gjatë regjistrimit, ta mbani fjalëkalimin konfidencial dhe ta mbani profilin të përditësuar. Llogaritë e biznesit duhet të japin NUI të saktë të biznesit; të dhënat tuaja të regjistruara të biznesit merren nga regjistri i ARBK-së.",
        "Jeni përgjegjës për gjithçka që dërgohet nën llogarinë tuaj. Nëse aplikoni në emër të një organizate, konfirmoni se jeni të autorizuar ta bëni këtë.",
      ],
    },
    {
      heading: "Dërgesat dhe dokumentet tuaja",
      paragraphs: [
        "Konfirmoni se informatat në aplikimet tuaja janë të sakta dhe se keni të drejtat për të ndarë çdo dokument që ngarkoni. Skedarët e ngarkuar mund të përpunohen për verifikimin e kushteve dhe analizën e dokumenteve me ndihmën e AI.",
        "Pranohen vetëm skedarë PDF, PNG dhe JPEG deri në 10 MB secili. Skedarët që shkelin këto kufij, ose që duken keqdashës, mund të refuzohen.",
      ],
    },
    {
      heading: "Përdorimi i drejtë dhe sjelljet e ndaluara",
      paragraphs: [
        "Nuk duhet të dërgoni informacione të rreme ose mashtruese, të ngarkoni përmbajtje të paligjshme ose të dëmshme, të përpiqeni të qaseni në aplikimet ose dokumentet e përdoruesve të tjerë, të anashkaloni kontrollet e qasjes, të keqpërdorni shërbimin ose të pengoni përdoruesit e tjerë.",
        "Stafi i komunës dhe administratorët mund të pezullojnë llogari ose të heqin përmbajtje që shkelin këto kushte, dhe shkeljet regjistrohen në gjurmën e auditimit.",
      ],
    },
    {
      heading: "Si funksionojnë vendimet për grante",
      paragraphs: [
        "Dërgimi i një aplikimi — ose kalimi i një parakontrolli — nuk garanton financim. Rregullat deterministe verifikojnë kërkesat, AI ndihmon shqyrtuesit me përmbledhje dhe analizë dokumentesh, dhe vendimi përfundimtar për financim merret gjithmonë nga njerëz të autorizuar në komunë.",
        "Vendimet komunikohen përmes platformës dhe emailit tuaj të njoftimeve. Rregullat e ankesës, aty ku komuna i ofron, tregohen së bashku me vendimin.",
      ],
    },
    {
      heading: "Disponueshmëria dhe shërbimet e palëve të treta",
      paragraphs: [
        "Platforma varet nga shërbimet e palëve të treta (hosting, Supabase, email transaksional dhe porta e ofruesit të AI). eGrantet synon funksionim të besueshëm, por nuk premton disponueshmëri të pandërprerë dhe mund të ndryshojë ose pezullojë funksione për mirëmbajtje ose siguri.",
      ],
    },
    {
      heading: "Kufizimet",
      paragraphs: [
        "Në masën e lejuar me ligj, eGrantet ofrohet “siç është”, pa garanci përtej asaj që thuhet në këto kushte. Asgjë këtu nuk kufizon të drejtat që keni sipas ligjit të zbatueshëm për konsumatorin ose mbrojtjen e të dhënave.",
        "Këto kushte mund të përditësohen ndërsa platforma evoluon; ndryshimet materiale do të pasqyrohen në këtë faqe me një datë të re përditësimi.",
      ],
    },
    {
      heading: "Kontakti",
      paragraphs: [
        "Për pyetje rreth këtyre kushteve, një granti specifik ose një vendimi financimi, kontaktoni komunën ose organizatën që publikoi grantin. Për kërkesa privatësie, shihni Politikën e Privatësisë.",
      ],
    },
  ],
};

const termsSr: LegalDocument = {
  title: "Uslovi korišćenja",
  updated: "Ažurirano: oktobar 2026.",
  intro:
    "Ovi uslovi opisuju kako sme da se koristi eGrantet — platforma za opštinske grantove i subvencije. Pravljenjem naloga ili slanjem prijave prihvatate ove uslove.",
  sections: [
    {
      heading: "Svrha i obim",
      paragraphs: [
        "eGrantet povezuje podnosioce sa opštinskim programima grantova: pronalaženje grantova, predproveru uslova, onlajn prijave, otpremanje dokumenata, razmatranje, evaluaciju, odluke i praćenje projekata nakon dodele.",
        "eGrantet je alat za administraciju grantova. Sam po sebi nije dokaz zvaničnog statusa — to zavisi od organizacije koja upravlja instalacijom.",
      ],
    },
    {
      heading: "Nalozi i odgovornosti",
      paragraphs: [
        "Pri registraciji morate dati tačne podatke, čuvati lozinku i održavati profil ažurnim. Poslovni nalozi moraju dati tačan NUI preduzeća; registrovani poslovni podaci preuzimaju se iz registra ARBK.",
        "Odgovorni ste za sve poslato sa vašeg naloga. Ako se prijavljujete u ime organizacije, potvrdite da ste za to ovlašćeni.",
      ],
    },
    {
      heading: "Vaše prijave i dokumenti",
      paragraphs: [
        "Potvrđujete da su informacije u vašim prijavama tačne i da imate prava da delite svaki dokument koji otpremite. Otpremljeni fajlovi mogu se obrađivati radi provere uslova i AI analize dokumenata.",
        "Prihvataju se samo PDF, PNG i JPEG fajlovi do 10 MB svaki. Fajlovi koji krše ova ograničenja ili deluju zlonamerno mogu biti odbijeni.",
      ],
    },
    {
      heading: "Pravična upotreba i zabranjeno ponašanje",
      paragraphs: [
        "Ne smete slati lažne informacije, otpremati nezakonit ili štetan sadržaj, pokušavati pristup tuđim prijavama ili dokumentima, zaobilaziti kontrole pristupa, zloupotrebljavati servis niti ometati druge korisnike.",
        "Opštinski kadar i administratori mogu suspendovati naloge ili ukloniti sadržaj koji krši ove uslove, a prekršaji se beleže u evidenciji.",
      ],
    },
    {
      heading: "Kako funkcionišu odluke o grantovima",
      paragraphs: [
        "Slanje prijave — ni prolazak predprovere — ne garantuje finansiranje. Deterministička pravila proveravaju uslove, AI pomaže recenzentima rezimeima i analizom dokumenata, a konačnu odluku o finansiranju uvek donose ovlašćeni ljudi u opštini.",
        "Odluke se saopštavaju kroz platformu i imejl obaveštenja. Pravila žalbe, gde ih opština nudi, prikazuju se uz odluku.",
      ],
    },
    {
      heading: "Dostupnost i usluge trećih strana",
      paragraphs: [
        "Platforma zavisi od usluga trećih strana (hosting, Supabase, transakcioni imejl i AI gejtvej). eGrantet teži pouzdanom radu, ali ne garantuje neprekidan rad, i može menjati ili suspendovati funkcije radi održavanja ili bezbednosti.",
      ],
    },
    {
      heading: "Ograničenja",
      paragraphs: [
        "U meri dozvoljenoj zakonom, eGrantet se pruža „kakav jeste”, bez garancija izvan onoga što ovi uslovi navode. Ništa ovde ne ograničava prava koja imate po važećem potrošačkom pravu ili pravu o zaštiti podataka.",
        "Ovi uslovi mogu se ažurirati kako platforma evoluira; bitne izmene biće prikazane na ovoj strani sa novim datumom.",
      ],
    },
    {
      heading: "Kontakt",
      paragraphs: [
        "Za pitanja o ovim uslovima, konkretnom grantu ili odluci o finansiranju, kontaktirajte opštinu ili organizaciju koja je objavila grant. Za zahteve o privatnosti pogledajte Politiku privatnosti.",
      ],
    },
  ],
};

export function getPrivacyContent(locale: Locale): LegalDocument {
  switch (locale) {
    case "sq":
      return privacySq;
    case "sr":
      return privacySr;
    default:
      return privacyEn;
  }
}

export function getTermsContent(locale: Locale): LegalDocument {
  switch (locale) {
    case "sq":
      return termsSq;
    case "sr":
      return termsSr;
    default:
      return termsEn;
  }
}
