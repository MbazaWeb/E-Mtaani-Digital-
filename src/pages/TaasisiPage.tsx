/**
 * TaasisiPage — Institutions + Publications + News (merged)
 * Tabs: Taasisi (Institutions) | Machapisho (Publications) | Habari (News)
 * Old routes /machapisho and /habari redirect here with the correct tab.
 */
import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  TrendingUp, MapPin, BookOpen, Heart, Truck, Wifi, Shield, Leaf, Building2,
  Search, ExternalLink, Phone, Mail, ChevronRight, ArrowLeft, X,
  FileText, Download, Scale, Smartphone,
  Newspaper, Calendar, Radio, Megaphone,
} from "lucide-react";
import { CATEGORIES, type Category, type Taasisi } from "@/data/taasisi";

interface TaasisiPageProps {
  lang?: string;
}

type TabId = "institutions" | "publications" | "news";
const VALID_TABS: TabId[] = ["institutions", "publications", "news"];

const ICON_MAP: Record<string, React.ReactNode> = {
  TrendingUp: <TrendingUp size={22} />,
  MapPin: <MapPin size={22} />,
  BookOpen: <BookOpen size={22} />,
  Heart: <Heart size={22} />,
  Truck: <Truck size={22} />,
  Wifi: <Wifi size={22} />,
  Shield: <Shield size={22} />,
  Leaf: <Leaf size={22} />,
  Building2: <Building2 size={22} />,
};

const COLOR: Record<string, { bg: string; text: string; border: string; pill: string }> = {
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", pill: "bg-emerald-100 text-emerald-700" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   pill: "bg-amber-100 text-amber-700" },
  blue:    { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    pill: "bg-blue-100 text-blue-700" },
  red:     { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     pill: "bg-red-100 text-red-700" },
  orange:  { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200",  pill: "bg-orange-100 text-orange-700" },
  purple:  { bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200",  pill: "bg-purple-100 text-purple-700" },
  slate:   { bg: "bg-slate-50",   text: "text-slate-700",   border: "border-slate-200",   pill: "bg-slate-100 text-slate-700" },
  lime:    { bg: "bg-lime-50",    text: "text-lime-700",    border: "border-lime-200",    pill: "bg-lime-100 text-lime-700" },
  teal:    { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200",    pill: "bg-teal-100 text-teal-700" },
};

// ── Publications data ──────────────────────────────────────────────────────
const PUBLICATIONS = [
  {
    category: { sw: "Sheria na Kanuni", en: "Laws & Regulations" },
    icon: <Scale size={18} />, color: "emerald",
    items: [
      { title: { sw: "Sheria ya Serikali Mtandao, 2019", en: "Electronic Government Act, 2019" },
        desc: { sw: "Sheria inayosimamia utoaji wa huduma za serikali kwa njia ya kidijitali Tanzania.", en: "Act governing the provision of government services through digital means in Tanzania." },
        href: "https://www.ega.go.tz/documents", type: "PDF" },
      { title: { sw: "Sheria ya Uhifadhi wa Data, 2022", en: "Personal Data Protection Act, 2022" },
        desc: { sw: "Sheria inayolinda data za kibinafsi za wananchi katika mifumo ya kidijitali.", en: "Act protecting citizens' personal data in digital systems." },
        href: "https://www.tcra.go.tz", type: "PDF" },
      { title: { sw: "Sheria ya Serikali za Mitaa, Sura 287", en: "Local Government Act, Cap 287" },
        desc: { sw: "Sheria mama inayosimamia utendaji wa Serikali za Mitaa Tanzania.", en: "Principal act governing the operations of Local Government Authorities in Tanzania." },
        href: "https://www.tamisemi.go.tz", type: "PDF" },
    ],
  },
  {
    category: { sw: "Miongozo na Viwango", en: "Guidelines & Standards" },
    icon: <BookOpen size={18} />, color: "blue",
    items: [
      { title: { sw: "Mwongozo wa Kusimamia Tovuti za Serikali (OR-MUU, 2014)", en: "Government Website Management Guidelines (OR-MUU, 2014)" },
        desc: { sw: "Mwongozo rasmi unaosimamia muundo, maudhui na utendaji wa tovuti zote za serikali Tanzania.", en: "Official guidelines governing the structure, content and operation of all Tanzanian government websites." },
        href: "https://www.ega.go.tz/documents", type: "PDF" },
      { title: { sw: "Viwango vya eGA, 2025", en: "eGA Standards, 2025" },
        desc: { sw: "Viwango vya kiufundi vya mifumo ya serikali mtandao ikiwemo usalama, upatikanaji na muundo.", en: "Technical standards for e-government systems including security, accessibility and architecture." },
        href: "https://www.ega.go.tz/standard/3", type: "WEB" },
      { title: { sw: "Mwongozo wa Upatikanaji wa Huduma kwa Watu Wenye Ulemavu", en: "Accessibility Guidelines for Persons with Disabilities" },
        desc: { sw: "Viwango vya kuhakikisha mifumo ya kidijitali inaweza kutumika na watu wote, ikiwemo wenye ulemavu.", en: "Standards ensuring digital systems are usable by everyone, including persons with disabilities." },
        href: "https://www.ega.go.tz/documents", type: "PDF" },
    ],
  },
  {
    category: { sw: "Ripoti za Serikali", en: "Government Reports" },
    icon: <FileText size={18} />, color: "purple",
    items: [
      { title: { sw: "Ripoti ya Hali ya TEHAMA Tanzania, 2024", en: "Tanzania ICT Status Report, 2024" },
        desc: { sw: "Tathmini ya hali ya matumizi ya teknolojia ya habari na mawasiliano nchini Tanzania.", en: "Assessment of the state of information and communication technology use in Tanzania." },
        href: "https://www.ega.go.tz/documents", type: "PDF" },
      { title: { sw: "Mpango wa Maendeleo wa TEHAMA Tanzania, 2023-2028", en: "Tanzania ICT Development Plan, 2023-2028" },
        desc: { sw: "Mpango wa miaka mitano wa kuendeleza matumizi ya teknolojia katika sekta zote nchini Tanzania.", en: "Five-year plan for advancing technology use across all sectors in Tanzania." },
        href: "https://www.mcit.go.tz", type: "PDF" },
    ],
  },
  {
    category: { sw: "Miongozo ya Usalama", en: "Security Guidelines" },
    icon: <Shield size={18} />, color: "red",
    items: [
      { title: { sw: "Mwongozo wa Usalama wa Mtandao wa Serikali", en: "Government Cybersecurity Framework" },
        desc: { sw: "Mwongozo wa kulinda mifumo na data za serikali dhidi ya vitisho vya mtandao.", en: "Framework for protecting government systems and data against cyber threats." },
        href: "https://www.tcra.go.tz", type: "PDF" },
    ],
  },
  {
    category: { sw: "Mifumo ya Serikali Mtandao", en: "E-Government Systems" },
    icon: <Smartphone size={18} />, color: "orange",
    items: [
      { title: { sw: "Mfumo wa Malipo ya Serikali (GEPG)", en: "Government e-Payment Gateway (GEPG)" },
        desc: { sw: "Mfumo rasmi wa malipo ya serikali mtandaoni, unaounganisha benki na watoa huduma wa simu.", en: "Official government online payment system connecting banks and mobile money providers." },
        href: "https://gepg.go.tz", type: "WEB" },
      { title: { sw: "Mfumo wa Utambulisho wa Taifa (NIDA)", en: "National Identification System (NIDA)" },
        desc: { sw: "Mfumo wa utambulisho wa taifa unaotumika kuthibitisha utambulisho wa wananchi.", en: "National identification system used to verify citizens' identity in government services." },
        href: "https://www.nida.go.tz", type: "WEB" },
    ],
  },
];

const PUB_COLOR: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
};

// ── News data ──────────────────────────────────────────────────────────────
const NEWS = [
  { date: "2025-06-01", tag: { sw: "Uzinduzi", en: "Launch" }, tagColor: "emerald",
    title: { sw: "E-Mtaa Inazinduliwa Rasmi Tanzania", en: "E-Mtaa Officially Launched in Tanzania" },
    body: { sw: "Mfumo wa Mtaani Kiganjani umezinduliwa rasmi kwa wananchi wote wa Tanzania, ukiwezesha kuomba huduma za serikali ya mtaa bila kwenda ofisini. Huduma tisa za awali zinajumuisha cheti cha mkazi, vibali vya ujenzi, mazishi, sherehe, na zaidi.", en: "The Mtaani Kiganjani system has been officially launched for all Tanzanian citizens, enabling ward-level government service applications without visiting offices. Nine initial services include residency certificates, construction, burial and celebration permits, and more." } },
  { date: "2025-05-15", tag: { sw: "Sasisho", en: "Update" }, tagColor: "blue",
    title: { sw: "Malipo ya M-Pesa, Tigo Pesa na Airtel Money Sasa Yanafanya Kazi", en: "M-Pesa, Tigo Pesa and Airtel Money Payments Now Live" },
    body: { sw: "Wananchi wanaweza sasa kulipa ada za huduma kupitia M-Pesa, Tigo Pesa, au Airtel Money moja kwa moja ndani ya mfumo wa E-Mtaa. Malipo ya benki (NMB, CRDB, NBC) na kadi za Visa/Mastercard pia yanakubaliwa.", en: "Citizens can now pay service fees via M-Pesa, Tigo Pesa, or Airtel Money directly within E-Mtaa. Bank transfers (NMB, CRDB, NBC) and Visa/Mastercard payments are also accepted." } },
  { date: "2025-04-20", tag: { sw: "Ushirikiano", en: "Partnership" }, tagColor: "purple",
    title: { sw: "E-Mtaa Inaunganishwa na Mfumo wa NIDA", en: "E-Mtaa Integrated with NIDA System" },
    body: { sw: "Ushirikiano na Mamlaka ya Vitambulisho vya Taifa (NIDA) unawezesha uthibitishaji wa haraka wa utambulisho wa wananchi ndani ya mfumo, kuongeza usalama na kuzuia udanganyifu.", en: "Partnership with the National Identification Authority (NIDA) enables fast citizen identity verification within the system, enhancing security and preventing fraud." } },
  { date: "2025-03-10", tag: { sw: "Majaribio", en: "Pilot" }, tagColor: "orange",
    title: { sw: "Majaribio Yanakamilika Mafanikio Dar es Salaam", en: "Pilot Completes Successfully in Dar es Salaam" },
    body: { sw: "Kipindi cha majaribio katika wilaya tatu za Dar es Salaam kilikamilika kwa mafanikio, wakihusu wananchi 2,400 na maombi 1,800 yaliyoshughulikiwa kwa muda wa wiki nane.", en: "The pilot period across three Dar es Salaam districts concluded successfully, involving 2,400 citizens and 1,800 applications processed over eight weeks." } },
];

const TAG_COLOR: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  orange: "bg-orange-100 text-orange-700",
};

export function TaasisiPage({ lang = "sw" }: TaasisiPageProps) {
  const sw = lang === "sw";
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "institutions";
  const [tab, setTabState] = useState<TabId>(VALID_TABS.includes(initialTab) ? initialTab : "institutions");

  useEffect(() => {
    const urlTab = (searchParams.get("tab") as TabId) || "institutions";
    if (VALID_TABS.includes(urlTab) && urlTab !== tab) setTabState(urlTab);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const setTab = (t: TabId) => {
    setTabState(t);
    setSearchParams({ tab: t }, { replace: true });
  };

  const TABS: { id: TabId; sw: string; en: string; icon: React.ReactNode }[] = [
    { id: "institutions", sw: "Taasisi",     en: "Institutions", icon: <Building2 size={15} /> },
    { id: "publications", sw: "Machapisho",  en: "Publications", icon: <FileText size={15} /> },
    { id: "news",         sw: "Habari",      en: "News",         icon: <Newspaper size={15} /> },
  ];

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      <a href="/" className="inline-flex items-center gap-2 text-sm font-bold text-stone-500 hover:text-emerald-600 transition-colors group">
        <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
        {sw ? "Rudi Nyumbani" : "Back to Home"}
      </a>

      <div className="text-center space-y-2">
        <span className="inline-block px-3 py-1 bg-teal-100 text-teal-700 text-xs font-black uppercase tracking-widest rounded-full">
          {sw ? "Taasisi, Machapisho na Habari" : "Institutions, Publications & News"}
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          {sw ? "Kituo cha Taarifa" : "Information Centre"}
        </h1>
      </div>

      <div className="flex gap-1 bg-stone-100 rounded-2xl p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-fit flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              tab === t.id ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-800"
            }`}
          >
            {t.icon}
            {sw ? t.sw : t.en}
          </button>
        ))}
      </div>

      {tab === "institutions" && <InstitutionsTab sw={sw} />}
      {tab === "publications" && <PublicationsTab sw={sw} />}
      {tab === "news" && <NewsTab sw={sw} />}
    </div>
  );
}

// ── Institutions ──────────────────────────────────────────────────────────
function InstitutionsTab({ sw }: { sw: boolean }) {
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [selectedTaasisi, setSelectedTaasisi] = useState<Taasisi | null>(null);
  const [search, setSearch] = useState("");

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    const results: (Taasisi & { catColor: string; catName: string })[] = [];
    CATEGORIES.forEach((cat) => {
      cat.taasisi.forEach((t) => {
        if (t.name.toLowerCase().includes(q) || (t.nameFull || "").toLowerCase().includes(q) ||
            t.descSw.toLowerCase().includes(q) || t.descEn.toLowerCase().includes(q)) {
          results.push({ ...t, catColor: cat.color, catName: sw ? cat.nameSw : cat.nameEn });
        }
      });
    });
    return results;
  }, [search, sw]);

  const c = selectedCat ? COLOR[selectedCat.color] : COLOR.teal;

  if (selectedTaasisi && selectedCat) {
    const col = COLOR[selectedCat.color];
    return (
      <div className="space-y-5">
        <button onClick={() => setSelectedTaasisi(null)} className="inline-flex items-center gap-2 text-sm font-bold text-stone-500 hover:text-stone-800 transition-colors">
          <ArrowLeft size={15} /> {sw ? "Rudi kwenye orodha" : "Back to list"}
        </button>
        <div className={`rounded-3xl p-6 sm:p-8 border ${col.border} ${col.bg} space-y-5`}>
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black ${col.pill} shrink-0`}>
              {selectedTaasisi.name.slice(0, 2)}
            </div>
            <div>
              <h1 className="text-xl font-black text-stone-900">{selectedTaasisi.name}</h1>
              {selectedTaasisi.nameFull && <p className={`text-sm font-bold ${col.text} mt-0.5`}>{selectedTaasisi.nameFull}</p>}
              <span className={`inline-block mt-2 text-[10px] font-black px-2 py-0.5 rounded-full ${col.pill}`}>
                {sw ? selectedCat.nameSw : selectedCat.nameEn}
              </span>
            </div>
          </div>
          <p className="text-stone-600 text-sm leading-relaxed">{sw ? selectedTaasisi.descSw : selectedTaasisi.descEn}</p>
          <div className="space-y-2.5">
            {selectedTaasisi.location && <div className="flex items-center gap-2.5 text-sm text-stone-600"><MapPin size={15} className={col.text} />{selectedTaasisi.location}</div>}
            {selectedTaasisi.phone && <a href={`tel:${selectedTaasisi.phone}`} className="flex items-center gap-2.5 text-sm text-stone-600 hover:text-stone-900"><Phone size={15} className={col.text} />{selectedTaasisi.phone}</a>}
            {selectedTaasisi.email && <a href={`mailto:${selectedTaasisi.email}`} className="flex items-center gap-2.5 text-sm text-stone-600 hover:text-stone-900"><Mail size={15} className={col.text} />{selectedTaasisi.email}</a>}
          </div>
          <a href={selectedTaasisi.href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-2xl font-bold text-sm text-white bg-stone-800 hover:bg-stone-900 transition-colors">
            <ExternalLink size={15} />{sw ? "Tembelea Tovuti Rasmi" : "Visit Official Website"}
          </a>
        </div>
      </div>
    );
  }

  if (selectedCat) {
    return (
      <div className="space-y-5">
        <button onClick={() => setSelectedCat(null)} className="inline-flex items-center gap-2 text-sm font-bold text-stone-500 hover:text-stone-800 transition-colors">
          <ArrowLeft size={15} /> {sw ? "Rudi kwenye makundi" : "Back to categories"}
        </button>
        <div className={`rounded-2xl p-5 border ${c.border} ${c.bg} flex items-center gap-4`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.pill}`}>{ICON_MAP[selectedCat.icon]}</div>
          <div>
            <h1 className="text-lg font-black text-stone-900">{sw ? selectedCat.nameSw : selectedCat.nameEn}</h1>
            <p className="text-sm text-stone-500">{selectedCat.taasisi.length} {sw ? "taasisi" : "institutions"}</p>
          </div>
        </div>
        <div className="space-y-3">
          {selectedCat.taasisi.map((t) => (
            <button key={t.id} onClick={() => setSelectedTaasisi(t)} className="w-full text-left flex items-center gap-4 p-4 bg-white border border-stone-100 rounded-2xl hover:border-stone-300 hover:shadow-sm transition-all group">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-sm font-black ${c.pill} group-hover:scale-105 transition-transform`}>{t.name.slice(0, 2)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-stone-900 text-sm">{t.name}</p>
                {t.nameFull && <p className={`text-xs font-medium ${c.text} truncate`}>{t.nameFull}</p>}
                <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{sw ? t.descSw : t.descEn}</p>
              </div>
              <ChevronRight size={16} className="text-stone-300 group-hover:text-stone-500 shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={sw ? "Tafuta taasisi... (mfano: TRA, NIDA, Mahakama)" : "Search institutions... (e.g. TRA, NIDA, Police)"}
          className="w-full pl-11 pr-10 py-3 rounded-2xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"><X size={15} /></button>}
      </div>

      {search.trim() ? (
        <div className="space-y-2">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">{searchResults.length} {sw ? "matokeo" : "results"}</p>
          {searchResults.length === 0 ? (
            <div className="text-center py-10 text-stone-400 text-sm">{sw ? "Hakuna taasisi inayolingana na utafutaji wako." : "No institutions match your search."}</div>
          ) : searchResults.map((t) => {
            const cat = CATEGORIES.find((c) => c.taasisi.some((ti) => ti.id === t.id))!;
            const col = COLOR[t.catColor];
            return (
              <button key={t.id} onClick={() => { setSelectedCat(cat); setSelectedTaasisi(t); setSearch(""); }}
                className="w-full text-left flex items-center gap-3 p-4 bg-white border border-stone-100 rounded-2xl hover:border-stone-300 hover:shadow-sm transition-all group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${col.pill}`}>{t.name.slice(0, 2)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-stone-900 text-sm">{t.name}</p>
                  <p className={`text-xs font-bold ${col.text}`}>{t.catName}</p>
                </div>
                <ChevronRight size={15} className="text-stone-300 group-hover:text-stone-500 shrink-0" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => {
            const col = COLOR[cat.color];
            return (
              <button key={cat.id} onClick={() => setSelectedCat(cat)} className={`text-left p-5 rounded-2xl border ${col.border} ${col.bg} hover:shadow-md transition-all group space-y-3`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${col.pill} group-hover:scale-110 transition-transform`}>{ICON_MAP[cat.icon]}</div>
                <div>
                  <p className="font-black text-stone-900 text-sm leading-tight">{sw ? cat.nameSw : cat.nameEn}</p>
                  <p className={`text-xs font-bold mt-1 ${col.text}`}>{cat.taasisi.length} {sw ? "taasisi" : "institutions"}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-1">
                    {cat.taasisi.slice(0, 3).map((t) => (
                      <span key={t.id} className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black ${col.pill}`}>{t.name.slice(0, 1)}</span>
                    ))}
                    {cat.taasisi.length > 3 && <span className="w-6 h-6 rounded-full border-2 border-white bg-stone-200 flex items-center justify-center text-[9px] font-black text-stone-500">+{cat.taasisi.length - 3}</span>}
                  </div>
                  <ChevronRight size={15} className={`${col.text} group-hover:translate-x-1 transition-transform`} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Publications ──────────────────────────────────────────────────────────
function PublicationsTab({ sw }: { sw: boolean }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-stone-500 text-sm max-w-xl mx-auto leading-relaxed">
          {sw ? "Sheria, miongozo, viwango na ripoti zinazosimamia mfumo wa E-Mtaa na huduma za serikali za mitaa Tanzania." : "Laws, guidelines, standards and reports governing the E-Mtaa system and local government services in Tanzania."}
        </p>
        <a href="https://www.ega.go.tz/documents" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors">
          <ExternalLink size={14} />{sw ? "Tembelea Maktaba ya eGA" : "Visit eGA Document Library"}
        </a>
      </div>

      {PUBLICATIONS.map((cat, ci) => (
        <div key={ci} className="space-y-3">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold ${PUB_COLOR[cat.color]}`}>{cat.icon}{sw ? cat.category.sw : cat.category.en}</div>
          <div className="space-y-3">
            {cat.items.map((item, ii) => (
              <a key={ii} href={item.href} target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 p-4 bg-white border border-stone-100 rounded-2xl hover:border-emerald-200 hover:shadow-sm transition-all group">
                <div className="shrink-0 w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  {item.type === "PDF" ? <Download size={18} className="text-stone-500 group-hover:text-emerald-600" /> : <ExternalLink size={18} className="text-stone-500 group-hover:text-emerald-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-stone-900 text-sm group-hover:text-emerald-700 transition-colors">{sw ? item.title.sw : item.title.en}</p>
                    <span className="text-[10px] font-black px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded uppercase">{item.type}</span>
                  </div>
                  <p className="text-stone-500 text-xs mt-1 leading-relaxed">{sw ? item.desc.sw : item.desc.en}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-stone-900 rounded-2xl p-6 text-white text-center space-y-3">
        <BookOpen size={28} className="mx-auto text-emerald-400" />
        <h3 className="font-black text-lg">{sw ? "Maktaba Kamili ya eGA" : "Full eGA Document Library"}</h3>
        <p className="text-stone-400 text-sm">{sw ? "Tembelea tovuti ya eGA kupata machapisho yote, miongozo, na viwango vya serikali mtandao Tanzania." : "Visit the eGA website for all publications, guidelines and e-government standards for Tanzania."}</p>
        <a href="https://www.ega.go.tz/documents" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors text-sm">
          <ExternalLink size={14} />ega.go.tz/documents
        </a>
      </div>
    </div>
  );
}

// ── News ──────────────────────────────────────────────────────────────────
function NewsTab({ sw }: { sw: boolean }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-stone-500 text-sm max-w-xl mx-auto leading-relaxed">
          {sw ? "Habari za hivi karibuni, maboresho ya mfumo, na matangazo muhimu kuhusu huduma za E-Mtaa." : "Latest news, system updates and important announcements about E-Mtaa services."}
        </p>
        <a href="https://www.ega.go.tz/standard/3" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors">
          <ExternalLink size={14} />{sw ? "Habari za eGA" : "eGA News"}
        </a>
      </div>

      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Radio size={16} className="animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest text-emerald-200">{sw ? "Habari Mpya" : "Latest News"}</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black mb-3 leading-tight">
          {sw ? "E-Mtaa Sasa Inapatikana Mikoa Yote 31 ya Tanzania" : "E-Mtaa Now Available Across All 31 Regions of Tanzania"}
        </h2>
        <p className="text-emerald-100 text-sm leading-relaxed mb-5">
          {sw ? "Baada ya majaribio yaliyofanikisha katika mikoa ya Dar es Salaam, Dodoma na Arusha, mfumo wa E-Mtaa sasa unaweza kutumika na wananchi kutoka mikoa yote 31 ya Tanzania Bara na Zanzibar." : "Following successful pilots in Dar es Salaam, Dodoma and Arusha regions, the E-Mtaa system is now accessible to citizens from all 31 regions of mainland Tanzania and Zanzibar."}
        </p>
        <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold">
          <Calendar size={13} /><span>{sw ? "Juni 2025" : "June 2025"}</span>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-black text-stone-900 text-lg flex items-center gap-2">
          <Newspaper size={20} className="text-emerald-600" />{sw ? "Habari Zilizopita" : "Previous News"}
        </h2>
        {NEWS.map((item, i) => (
          <div key={i} className="bg-white border border-stone-100 rounded-2xl p-5 hover:border-emerald-200 hover:shadow-sm transition-all">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${TAG_COLOR[item.tagColor]}`}>{sw ? item.tag.sw : item.tag.en}</span>
              <span className="text-stone-400 text-xs flex items-center gap-1">
                <Calendar size={11} />
                {new Date(item.date).toLocaleDateString(sw ? "sw-TZ" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
            <h3 className="font-black text-stone-900 text-sm sm:text-base mb-2">{sw ? item.title.sw : item.title.en}</h3>
            <p className="text-stone-500 text-sm leading-relaxed">{sw ? item.body.sw : item.body.en}</p>
          </div>
        ))}
      </div>

      <div className="bg-stone-900 rounded-2xl p-6 text-white text-center space-y-3">
        <Megaphone size={28} className="mx-auto text-blue-400" />
        <h3 className="font-black text-lg">{sw ? "Habari Zaidi kutoka eGA" : "More News from eGA"}</h3>
        <p className="text-stone-400 text-sm">{sw ? "Tembelea tovuti ya Serikali Mtandao (eGA) kupata habari zote za serikali mtandao Tanzania." : "Visit the eGovernment Authority (eGA) website for all e-government news in Tanzania."}</p>
        <a href="https://www.ega.go.tz/standard/3" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors text-sm">
          <ExternalLink size={14} />{sw ? "Nenda eGA Kituo cha Habari" : "Go to eGA News Centre"}
        </a>
      </div>
    </div>
  );
}

export default TaasisiPage;