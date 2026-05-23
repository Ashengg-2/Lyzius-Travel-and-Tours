import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
  FileDown,
  MoreHorizontal,
  Plane,
  Building2,
  CreditCard,
  Lock,
  FileText,
  Phone,
  Globe,
  Check,
  Receipt,
  User,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Landmark,
} from "lucide-react";

import { deriveMoneyTotals } from "../lib/itineraryMoney";
import type {
  CanRow,
  Flight,
  FormData,
  Itinerary,
  Passenger,
  Status,
  SupRow,
} from "./itineraryTypes";

import {
  buildItineraryPdfPageFactories,
  ItineraryPdfPageShell,
  PDF_PAGE_H,
  PDF_PAGE_W,
} from "./itineraryPdfPages";

import AccountingView from "./AccountingView";

const ITIN_STORAGE_KEY = "lyzius.itineraries.v1";

const isoDateRx = /^(\d{4})-(\d{2})-(\d{2})$/;

function isoToLocalDate(raw: string): Date | undefined {
  const iso = raw.trim();
  const m = iso.match(isoDateRx);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return undefined;
  const dt = new Date(y, mo - 1, d);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}

function formatDateDisp(raw: string): string {
  if (!raw.trim()) return "";
  const dt = isoToLocalDate(raw);
  if (!dt) return raw;
  return dt.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function passengerDisplayLine(p: Passenger): string {
  const fn = p.firstName.trim();
  const ln = p.lastName.trim();
  const honorRaw = (p.honorific ?? "").trim();
  const honor = honorRaw.replace(/\s+$/, "") || "MR.";
  if (!fn && !ln) return "";
  return [honor, fn, ln].filter(Boolean).join(" ");
}

/** Search text over all traveler fields + formatted dates */
function passengerSearchBlob(form: FormData): string {
  return form.passengers
    .map((p) =>
      [
        p.honorific,
        p.firstName,
        p.lastName,
        p.passengerType,
        p.nationality,
        p.passportNo,
        p.issuingCountry,
        formatDateDisp(p.birthdate),
        formatDateDisp(p.passportExpiry),
        formatDateDisp(p.dateIssued),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    )
    .join("|");
}

function deriveClient(form: FormData): string {
  const lines = form.passengers
    .map(passengerDisplayLine)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!lines.length) return "";
  const first = lines[0]!;
  if (lines.length === 1) return first;
  return `${first} +${lines.length - 1}`;
}

function deriveDestination(form: FormData): string {
  const route = form.outbound.route.trim();
  const seps = ["→", "\u2192", "->", "–", "—"];
  for (const sep of seps) {
    const i = route.indexOf(sep);
    if (i !== -1) {
      const after = route.slice(i + sep.length).trim();
      if (after) return after.replace(/\([^)]*\)/g, "").trim() || after;
    }
  }
  return form.hotelName.trim();
}

function deriveTravelWindow(form: FormData): {
  travelStart: string;
  travelEnd: string;
} {
  const startRaw = form.outbound.depDate.trim();
  const endRaw =
    form.returnFlight.arrDate.trim() ||
    form.returnFlight.depDate.trim();
  const startFmt = formatDateDisp(startRaw) || startRaw;
  const endFmt = formatDateDisp(endRaw) || endRaw;
  return {
    travelStart: startFmt,
    travelEnd: endFmt || startFmt,
  };
}

function deriveListSlice(form: FormData): Pick<
  Itinerary,
  "client" | "destination" | "travelStart" | "travelEnd"
> {
  const tw = deriveTravelWindow(form);
  return {
    client: deriveClient(form),
    destination: deriveDestination(form),
    travelStart: tw.travelStart,
    travelEnd: tw.travelEnd,
  };
}




function newPassengerId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function blankPassenger(): Passenger {
  return {
    id: newPassengerId(),
    honorific: "MR.",
    firstName: "",
    lastName: "",
    passengerType: "Adult",
    birthdate: "",
    nationality: "",
    passportNo: "",
    passportExpiry: "",
    issuingCountry: "",
    dateIssued: "",
  };
}

const blankFlight: Flight = {
  route: "",
  airline: "",
  flightNo: "",
  depAirport: "",
  depTerminal: "",
  depDate: "",
  depTime: "",
  arrAirport: "",
  arrTerminal: "",
  arrDate: "",
  arrTime: "",
  duration: "",
  baggage: "",
};

/** Shown beside the logo in the app chrome (defaults match itinerary form defaults). */
const BRAND_SHELL_NAME = "Lyzius Travel & Tours";

const blankForm: FormData = {
  agencyName: "Lyzius Travel & Tours",
  agencyTagline: "Curated Travel Experiences",
  agencyFooter:
    "This booking confirmation is prepared exclusively for the named passenger.",
  page1Heading: "Flight Details",
  outbound: { ...blankFlight },
  returnFlight: { ...blankFlight },
  hotelName: "",
  hotelAddress: "",
  hotelPhone: "",
  checkIn: "",
  checkOut: "",
  roomDesc: "",
  inclusions: "",
  supplements: [],
  cancellationRows: [],
  noShow: "",
  ratesConditions: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  passengers: [],
  adultBaseFare: "",
  adultOtherCharges: "",
  adultTotalFare: "",
  roomRate: "",
  roomTaxes: "",
  totalRoomRate: "",
  originalTotal: "",
  savings: "",
  totalDue: "",
  internalNotes: "",
  hidePricingOnPdf: false,
};

function coerceBoolStored(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    if (
      s === "1" ||
      s === "true" ||
      s === "yes" ||
      s === "on"
    )
      return true;
    if (
      s === "0" ||
      s === "false" ||
      s === "no" ||
      s === "off"
    )
      return false;
  }
  return fallback;
}

function strField(raw: unknown, fallback = ""): string {
  return typeof raw === "string" ? raw : fallback;
}

function coerceFlightStored(raw: unknown, template: Flight): Flight {
  if (!raw || typeof raw !== "object") return { ...template };
  const r = raw as Record<string, unknown>;
  const next: Flight = { ...template };
  (Object.keys(template) as (keyof Flight)[]).forEach((k) => {
    const v = r[k as string];
    if (typeof v === "string") next[k] = v;
  });
  return next;
}

function coerceSupRowStored(raw: unknown): SupRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id =
    typeof r.id === "string" ? r.id : `${Date.now()}_${Math.random()}`;
  return {
    id,
    desc: strField(r.desc),
    amount: strField(r.amount),
    chargeType: strField(r.chargeType, "Pay at hotel"),
  };
}

function coerceCanRowStored(raw: unknown): CanRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id =
    typeof r.id === "string" ? r.id : `${Date.now()}_${Math.random()}`;
  return {
    id,
    rule: strField(r.rule),
    charge: strField(r.charge),
  };
}

function coercePassenger(raw: unknown): Passenger {
  const r =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};
  const pid = strField(r.id).trim() || newPassengerId();
  return {
    id: pid,
    honorific: strField(r.honorific, "MR.") || "MR.",
    firstName: strField(r.firstName),
    lastName: strField(r.lastName),
    passengerType: strField(r.passengerType, "Adult") || "Adult",
    birthdate: strField(r.birthdate),
    nationality: strField(r.nationality),
    passportNo: strField(r.passportNo),
    passportExpiry: strField(r.passportExpiry),
    issuingCountry: strField(r.issuingCountry),
    dateIssued: strField(r.dateIssued),
  };
}

function normalizeStoredForm(raw: unknown): FormData {
  const p =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};

  let passengers =
    Array.isArray(p.passengers) && p.passengers.length > 0
      ? (p.passengers as unknown[]).map((x) =>
          coercePassenger(x),
        )
      : [];

  if (passengers.length === 0)
    passengers = [coercePassenger(p)];

  const supplements = Array.isArray(p.supplements)
    ? (p.supplements as unknown[])
        .map((x) => coerceSupRowStored(x))
        .filter((x): x is SupRow => x != null)
    : [...blankForm.supplements];

  const cancellationRows = Array.isArray(p.cancellationRows)
    ? (p.cancellationRows as unknown[])
        .map((x) => coerceCanRowStored(x))
        .filter((x): x is CanRow => x != null)
    : [...blankForm.cancellationRows];

  return {
    ...blankForm,
    agencyName: strField(p.agencyName, blankForm.agencyName),
    agencyTagline: strField(p.agencyTagline, blankForm.agencyTagline),
    agencyFooter: strField(p.agencyFooter, blankForm.agencyFooter),
    page1Heading: strField(p.page1Heading, blankForm.page1Heading),
    outbound: coerceFlightStored(p.outbound, blankFlight),
    returnFlight: coerceFlightStored(p.returnFlight, blankFlight),
    hotelName: strField(p.hotelName),
    hotelAddress: strField(p.hotelAddress),
    hotelPhone: strField(p.hotelPhone),
    checkIn: strField(p.checkIn),
    checkOut: strField(p.checkOut),
    roomDesc: strField(p.roomDesc),
    inclusions: strField(p.inclusions),
    supplements,
    cancellationRows,
    noShow: strField(p.noShow),
    ratesConditions: strField(p.ratesConditions),
    contactName: strField(p.contactName),
    contactPhone: strField(p.contactPhone),
    contactEmail: strField(p.contactEmail),
    passengers,
    adultBaseFare: strField(p.adultBaseFare),
    adultOtherCharges: strField(p.adultOtherCharges),
    adultTotalFare: strField(p.adultTotalFare),
    roomRate: strField(p.roomRate),
    roomTaxes: strField(p.roomTaxes),
    totalRoomRate: strField(p.totalRoomRate),
    originalTotal: strField(p.originalTotal),
    savings: strField(p.savings),
    totalDue: strField(p.totalDue),
    internalNotes: strField(p.internalNotes),
    hidePricingOnPdf: coerceBoolStored(
      p.hidePricingOnPdf,
      blankForm.hidePricingOnPdf,
    ),
  };
}

function loadStoredItineraries(): Itinerary[] {
  try {
    const raw = localStorage.getItem(ITIN_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];

    type RawItin = Omit<Itinerary, "form"> & { form?: unknown };
    const rows = data.filter(
      (row): row is RawItin =>
        row != null &&
        typeof row === "object" &&
        typeof (row as RawItin).id === "string" &&
        (row as RawItin).form != null &&
        typeof (row as RawItin).form === "object",
    );

    return rows.map((row) => ({
      ...row,
      form: normalizeStoredForm(row.form),
    })) as Itinerary[];
  } catch {
    return [];
  }
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

const inp =
  "w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent transition-colors";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function DatePickerInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const normalized = isoDateRx.test(value.trim())
    ? value.trim()
    : "";

  return (
    <div className="flex flex-wrap items-stretch gap-2">
      <input
        type="date"
        title={placeholder}
        className={`${inp} min-h-[2.375rem] min-w-[10rem] flex-1 font-mono text-sm tabular-nums scheme-light dark:scheme-dark`}
        value={normalized}
        onChange={(e) => onChange(e.target.value)}
      />
      {normalized ? (
        <button
          type="button"
          className="shrink-0 rounded-lg border border-border bg-background px-2.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => onChange("")}
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

function Sec({
  title,
  icon,
  children,
  open: defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-card hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
          <span className="text-accent">{icon}</span>
          {title}
        </div>
        {isOpen ? (
          <ChevronUp
            size={13}
            className="text-muted-foreground"
          />
        ) : (
          <ChevronDown
            size={13}
            className="text-muted-foreground"
          />
        )}
      </button>
      {isOpen && (
        <div className="px-5 py-5 bg-card border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide border ${
        status === "ready"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-amber-50 text-amber-600 border-amber-200"
      }`}
    >
      {status === "ready" ? (
        <Check size={10} />
      ) : (
        <FileText size={10} />
      )}
      {status === "ready" ? "Ready" : "Draft"}
    </span>
  );
}

// ─── PDF Preview (light multipage · matches downloaded PDF page count) ────────

function PDFPreview({ form }: { form: FormData }) {
  const [zoom, setZoom] = useState(0.65);
  const zoomLevels: [number, string][] = [
    [0.5, "50%"],
    [0.65, "65%"],
    [0.75, "75%"],
    [1.0, "100%"],
  ];

  const money = useMemo(
    () =>
      deriveMoneyTotals({
        adultBaseFare: form.adultBaseFare,
        adultOtherCharges: form.adultOtherCharges,
        roomRate: form.roomRate,
        roomTaxes: form.roomTaxes,
        savings: form.savings,
        supplements: form.supplements,
      }),
    [
      form.adultBaseFare,
      form.adultOtherCharges,
      form.roomRate,
      form.roomTaxes,
      form.savings,
      form.supplements,
    ],
  );

  const pageFactories = useMemo(
    () =>
      buildItineraryPdfPageFactories({
        form,
        money,
        formatDateDisp,
        passengerDisplayLine,
        hidePricing: form.hidePricingOnPdf,
      }),
    [form, money],
  );

  const pageCount = pageFactories.length;

  return (
    <div
      id="itinerary-pdf-print-root"
      className="flex flex-col h-full bg-zinc-100"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 shrink-0 bg-white">
        <span className="text-[11px] text-zinc-400 font-mono tracking-widest">
          A4 · {pageCount} page{pageCount === 1 ? "" : "s"}
          {form.hidePricingOnPdf ? " · prices hidden" : ""}
        </span>
        <div className="flex items-center gap-0.5">
          {zoomLevels.map(([z, label]) => (
            <button
              key={z}
              type="button"
              onClick={() => setZoom(z)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                zoom === z
                  ? "bg-zinc-200 text-zinc-800"
                  : "text-zinc-400 hover:text-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto py-8 flex flex-col items-center gap-6">
        {pageFactories.map((F, i) => (
          <div
            key={`pv-${i}`}
            style={{
              width: PDF_PAGE_W * zoom,
              height: PDF_PAGE_H * zoom,
              position: "relative",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
                boxShadow:
                  "0 12px 48px rgba(0,0,0,0.12)",
              }}
            >
              <ItineraryPdfPageShell>{F()}</ItineraryPdfPageShell>
            </div>
          </div>
        ))}
      </div>

      {/* Off-screen pages for raster PDF (matches preview page count exactly) */}
      <div
        className="fixed left-[-12000px] top-0 w-[595px]"
        aria-hidden
        style={{ zIndex: -10, opacity: 1 }}
      >
        <div className="flex flex-col gap-6">
          {pageFactories.map((F, i) => (
            <ItineraryPdfPageShell exportMarker key={`ex-${i}`}>
              {F()}
            </ItineraryPdfPageShell>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Flight form fields ───────────────────────────────────────────────────────

function FlightFields({
  f,
  onChange,
}: {
  f: Flight;
  onChange: (field: keyof Flight, val: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Route" className="col-span-2">
        <input
          className={inp}
          value={f.route}
          onChange={(e) => onChange("route", e.target.value)}
          placeholder="Manila (MNL) → Osaka (KIX)"
        />
      </Field>
      <Field label="Airline">
        <input
          className={inp}
          value={f.airline}
          onChange={(e) => onChange("airline", e.target.value)}
          placeholder="Philippine Airlines"
        />
      </Field>
      <Field label="Flight no.">
        <input
          className={inp}
          value={f.flightNo}
          onChange={(e) => onChange("flightNo", e.target.value)}
          placeholder="PR 519"
        />
      </Field>
      <Field label="Dep. airport">
        <input
          className={inp}
          value={f.depAirport}
          onChange={(e) =>
            onChange("depAirport", e.target.value)
          }
          placeholder="Ninoy Aquino International"
        />
      </Field>
      <Field label="Dep. terminal">
        <input
          className={inp}
          value={f.depTerminal}
          onChange={(e) =>
            onChange("depTerminal", e.target.value)
          }
          placeholder="Terminal 2"
        />
      </Field>
      <Field label="Dep. date">
        <DatePickerInput
          value={f.depDate}
          onChange={(v) => onChange("depDate", v)}
          placeholder="Departure date"
        />
      </Field>
      <Field label="Dep. time">
        <input
          className={inp}
          value={f.depTime}
          onChange={(e) => onChange("depTime", e.target.value)}
          placeholder="23:55"
        />
      </Field>
      <Field label="Arr. airport">
        <input
          className={inp}
          value={f.arrAirport}
          onChange={(e) =>
            onChange("arrAirport", e.target.value)
          }
          placeholder="Kansai International"
        />
      </Field>
      <Field label="Arr. terminal">
        <input
          className={inp}
          value={f.arrTerminal}
          onChange={(e) =>
            onChange("arrTerminal", e.target.value)
          }
          placeholder="Terminal 1"
        />
      </Field>
      <Field label="Arr. date">
        <DatePickerInput
          value={f.arrDate}
          onChange={(v) => onChange("arrDate", v)}
          placeholder="Arrival date"
        />
      </Field>
      <Field label="Arr. time">
        <input
          className={inp}
          value={f.arrTime}
          onChange={(e) => onChange("arrTime", e.target.value)}
          placeholder="04:35"
        />
      </Field>
      <Field label="Duration">
        <input
          className={inp}
          value={f.duration}
          onChange={(e) => onChange("duration", e.target.value)}
          placeholder="4h 40m"
        />
      </Field>
      <Field label="Baggage policy" className="col-span-2">
        <input
          className={inp}
          value={f.baggage}
          onChange={(e) => onChange("baggage", e.target.value)}
          placeholder="Carry-on: 7 kg · Checked: 23 kg"
        />
      </Field>
    </div>
  );
}

// ─── Editor view ──────────────────────────────────────────────────────────────

function EditorView({
  itinerary,
  onBack,
  onSave,
  onDuplicate,
}: {
  itinerary: Itinerary;
  onBack: () => void;
  onSave: (it: Itinerary) => void;
  onDuplicate: () => void;
}) {
  const [form, setForm] = useState<FormData>(itinerary.form);
  const [title, setTitle] = useState(itinerary.title);
  const [status, setStatus] = useState<Status>(
    itinerary.status,
  );
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [showPreview, setShowPreview] = useState(true);
  const [pdfExporting, setPdfExporting] = useState(false);
  const exportingPdfRef = useRef(false);

  const moneyDerived = useMemo(
    () =>
      deriveMoneyTotals({
        adultBaseFare: form.adultBaseFare,
        adultOtherCharges: form.adultOtherCharges,
        roomRate: form.roomRate,
        roomTaxes: form.roomTaxes,
        savings: form.savings,
        supplements: form.supplements,
      }),
    [
      form.adultBaseFare,
      form.adultOtherCharges,
      form.roomRate,
      form.roomTaxes,
      form.savings,
      form.supplements,
    ],
  );

  useEffect(() => {
    setForm((f) => {
      const next = {
        ...f,
        adultTotalFare: moneyDerived.adultTotalFareFmt,
        totalRoomRate: moneyDerived.totalRoomRateFmt,
        originalTotal: moneyDerived.originalTotalFmt,
        totalDue: moneyDerived.totalDueFmt,
      };
      if (
        f.adultTotalFare === next.adultTotalFare &&
        f.totalRoomRate === next.totalRoomRate &&
        f.originalTotal === next.originalTotal &&
        f.totalDue === next.totalDue
      )
        return f;
      return next;
    });
  }, [moneyDerived]);

  const exportPdf = useCallback(async () => {
    if (pdfExporting) return;
    setPdfExporting(true);
    try {
      setShowPreview(true);
      setTab("preview");
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve()),
        ),
      );
      const { exportItineraryPdfToFile } = await import(
        "./exportItineraryPdf"
      );
      await exportItineraryPdfToFile(
        title.trim() || "itinerary",
      );
    } catch (e) {
      console.error(e);
      window.alert(
        "Could not generate the PDF file. Try again or switch browsers if it keeps failing.",
      );
    } finally {
      setPdfExporting(false);
    }
  }, [title, pdfExporting]);

  const setF = (field: keyof FormData, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const setFlight = (
    which: "outbound" | "returnFlight",
    field: keyof Flight,
    val: string,
  ) =>
    setForm((f) => ({
      ...f,
      [which]: { ...f[which], [field]: val },
    }));

  const addSup = () =>
    setF("supplements", [
      ...form.supplements,
      {
        id: Date.now().toString(),
        desc: "",
        amount: "",
        chargeType: "Pay at hotel",
      },
    ]);
  const removeSup = (id: string) =>
    setF(
      "supplements",
      form.supplements.filter((s) => s.id !== id),
    );
  const updateSup = (
    id: string,
    field: keyof SupRow,
    val: string,
  ) =>
    setF(
      "supplements",
      form.supplements.map((s) =>
        s.id === id ? { ...s, [field]: val } : s,
      ),
    );

  const addCan = () =>
    setF("cancellationRows", [
      ...form.cancellationRows,
      { id: Date.now().toString(), rule: "", charge: "" },
    ]);
  const removeCan = (id: string) =>
    setF(
      "cancellationRows",
      form.cancellationRows.filter((c) => c.id !== id),
    );
  const updateCan = (
    id: string,
    field: keyof CanRow,
    val: string,
  ) =>
    setF(
      "cancellationRows",
      form.cancellationRows.map((c) =>
        c.id === id ? { ...c, [field]: val } : c,
      ),
    );

  const updatePassenger = (
    id: string,
    field: keyof Omit<Passenger, "id">,
    val: string,
  ) =>
    setForm((f) => ({
      ...f,
      passengers: f.passengers.map((p) =>
        p.id === id ? { ...p, [field]: val } : p,
      ),
    }));

  const addPassenger = () =>
    setForm((f) => ({
      ...f,
      passengers: [...f.passengers, blankPassenger()],
    }));

  const removePassenger = (id: string) =>
    setForm((f) => {
      if (f.passengers.length <= 1) return f;
      return {
        ...f,
        passengers: f.passengers.filter((p) => p.id !== id),
      };
    });

  const itineraryRef = useRef(itinerary);
  itineraryRef.current = itinerary;

  const persist = useCallback(() => {
    const lu = new Date().toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    onSave({
      ...itineraryRef.current,
      title,
      status,
      form,
      ...deriveListSlice(form),
      lastUpdated: lu,
    });
  }, [title, status, form, onSave]);

  useEffect(() => {
    const t = window.setTimeout(persist, 450);
    return () => window.clearTimeout(t);
  }, [persist]);

  const handleSave = () => {
    persist();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const ta = `${inp} resize-none`;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="bg-card border-b border-border flex items-center gap-3 px-4 h-[52px] shrink-0 z-20 shadow-sm print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline text-xs font-medium">
            Itineraries
          </span>
        </button>
        <div className="w-px h-4 bg-border shrink-0" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 min-w-0 text-sm font-semibold bg-transparent border-none outline-none text-foreground"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        />
        <button
          onClick={() =>
            setStatus((s) =>
              s === "draft" ? "ready" : "draft",
            )
          }
          className="shrink-0"
        >
          <StatusPill status={status} />
        </button>
        <button
          type="button"
          onClick={() => {
            setShowPreview((v) => {
              if (v) setTab("edit");
              return !v;
            });
          }}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border border-border rounded-lg hover:bg-muted transition-colors text-foreground shrink-0"
          title={
            showPreview
              ? "Hide PDF preview panel"
              : "Show PDF preview panel"
          }
        >
          {showPreview ? (
            <EyeOff size={13} className="text-muted-foreground" />
          ) : (
            <Eye size={13} className="text-muted-foreground" />
          )}
          <span>{showPreview ? "Hide preview" : "Preview"}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setShowPreview((v) => {
              if (v) setTab("edit");
              return !v;
            });
          }}
          className="sm:hidden flex items-center justify-center p-2 rounded-lg border border-border hover:bg-muted shrink-0 text-foreground"
          title={
            showPreview
              ? "Hide PDF preview"
              : "Show PDF preview"
          }
          aria-label={
            showPreview
              ? "Hide PDF preview"
              : "Show PDF preview"
          }
        >
          {showPreview ? (
            <EyeOff size={15} />
          ) : (
            <Eye size={15} />
          )}
        </button>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 text-xs font-semibold border border-border rounded-lg hover:bg-muted transition-colors text-foreground flex items-center gap-1.5"
          >
            {saved ? (
              <>
                <Check size={11} className="text-emerald-600" />{" "}
                Saved
              </>
            ) : (
              "Save draft"
            )}
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="px-3 py-1.5 text-xs font-semibold border border-border rounded-lg hover:bg-muted transition-colors text-foreground flex items-center gap-1.5"
          >
            <Copy size={11} /> Duplicate
          </button>
        </div>
        <button
          type="button"
          disabled={pdfExporting}
          onClick={() => void exportPdf()}
          className="flex items-center gap-1.5 bg-accent text-accent-foreground px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity shrink-0 disabled:opacity-60 disabled:pointer-events-none"
        >
          <FileDown size={13} />
          {pdfExporting ? "Building PDF…" : "Export PDF"}
        </button>
      </header>

      {/* Mobile tab bar — only when PDF preview is enabled */}
      {showPreview ? (
        <div className="lg:hidden flex border-b border-border bg-card shrink-0 print:hidden">
          {(["edit", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-colors ${
                tab === t
                  ? "text-foreground border-b-2 border-accent"
                  : "text-muted-foreground"
              }`}
            >
              {t === "edit" ? "Edit" : "Preview"}
            </button>
          ))}
        </div>
      ) : null}

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex min-h-0">
        {/* Form panel */}
        <div
          className={`flex-1 overflow-y-auto print:hidden ${
            showPreview && tab === "preview"
              ? "hidden lg:block"
              : ""
          }`}
        >
          <div
            className={`p-5 space-y-3 mx-auto pb-20 ${showPreview ? "max-w-3xl" : "max-w-4xl"}`}
          >
            {/* Agency & brand */}
            <Sec
              title="Agency & Brand"
              icon={<Globe size={14} />}
            >
              <div className="grid grid-cols-2 gap-3">
                <Field label="Agency display name">
                  <input
                    className={inp}
                    value={form.agencyName}
                    onChange={(e) =>
                      setF("agencyName", e.target.value)
                    }
                  />
                </Field>
                <Field label="Tagline">
                  <input
                    className={inp}
                    value={form.agencyTagline}
                    onChange={(e) =>
                      setF("agencyTagline", e.target.value)
                    }
                  />
                </Field>
                <Field
                  label="Page 1 heading"
                  className="col-span-2"
                >
                  <input
                    className={inp}
                    value={form.page1Heading}
                    onChange={(e) =>
                      setF("page1Heading", e.target.value)
                    }
                  />
                </Field>
                <Field
                  label="Footer disclaimer"
                  className="col-span-2"
                >
                  <textarea
                    className={ta}
                    rows={3}
                    value={form.agencyFooter}
                    onChange={(e) =>
                      setF("agencyFooter", e.target.value)
                    }
                  />
                </Field>
              </div>
            </Sec>

            {/* Outbound */}
            <Sec
              title="Outbound Flight"
              icon={<Plane size={14} />}
            >
              <FlightFields
                f={form.outbound}
                onChange={(field, val) =>
                  setFlight("outbound", field, val)
                }
              />
            </Sec>

            {/* Return */}
            <Sec
              title="Return Flight"
              icon={
                <Plane
                  size={14}
                  style={{ transform: "scaleX(-1)" }}
                />
              }
              open={false}
            >
              <FlightFields
                f={form.returnFlight}
                onChange={(field, val) =>
                  setFlight("returnFlight", field, val)
                }
              />
            </Sec>

            {/* Hotel */}
            <Sec title="Hotel" icon={<Building2 size={14} />}>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Hotel name"
                  className="col-span-2"
                >
                  <input
                    className={inp}
                    value={form.hotelName}
                    onChange={(e) =>
                      setF("hotelName", e.target.value)
                    }
                  />
                </Field>
                <Field label="Address" className="col-span-2">
                  <textarea
                    className={ta}
                    rows={2}
                    value={form.hotelAddress}
                    onChange={(e) =>
                      setF("hotelAddress", e.target.value)
                    }
                  />
                </Field>
                <Field label="Phone">
                  <input
                    className={inp}
                    value={form.hotelPhone}
                    onChange={(e) =>
                      setF("hotelPhone", e.target.value)
                    }
                    placeholder="+81 6 0000 0000"
                  />
                </Field>
                <div />
                <Field label="Check-in date">
                  <DatePickerInput
                    value={form.checkIn}
                    onChange={(v) => setF("checkIn", v)}
                    placeholder="Check-in date"
                  />
                </Field>
                <Field label="Check-out date">
                  <DatePickerInput
                    value={form.checkOut}
                    onChange={(v) =>
                      setF("checkOut", v)
                    }
                    placeholder="Check-out date"
                  />
                </Field>
                <Field
                  label="Room description"
                  className="col-span-2"
                >
                  <input
                    className={inp}
                    value={form.roomDesc}
                    onChange={(e) =>
                      setF("roomDesc", e.target.value)
                    }
                    placeholder="Deluxe Double · 1 Adult · 28 sqm"
                  />
                </Field>
                <Field
                  label="Inclusions"
                  className="col-span-2"
                >
                  <input
                    className={inp}
                    value={form.inclusions}
                    onChange={(e) =>
                      setF("inclusions", e.target.value)
                    }
                    placeholder="Free Wi-Fi · Daily breakfast"
                  />
                </Field>
              </div>
            </Sec>

            {/* Supplements */}
            <Sec
              title="Supplements & Fees"
              icon={<Receipt size={14} />}
              open={false}
            >
              <div className="space-y-2">
                {form.supplements.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2"
                  >
                    <input
                      className={`${inp} flex-1`}
                      value={s.desc}
                      onChange={(e) =>
                        updateSup(s.id, "desc", e.target.value)
                      }
                      placeholder="Description"
                    />
                    <input
                      className={`${inp} w-28 shrink-0`}
                      value={s.amount}
                      onChange={(e) =>
                        updateSup(
                          s.id,
                          "amount",
                          e.target.value,
                        )
                      }
                      placeholder="0.00 JPY"
                    />
                    <select
                      className={`${inp} w-36 shrink-0`}
                      value={s.chargeType}
                      onChange={(e) =>
                        updateSup(
                          s.id,
                          "chargeType",
                          e.target.value,
                        )
                      }
                    >
                      <option>Pay at hotel</option>
                      <option>Prepaid</option>
                    </select>
                    <button
                      onClick={() => removeSup(s.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addSup}
                  className="text-xs text-accent hover:opacity-75 font-semibold flex items-center gap-1 mt-1 transition-opacity"
                >
                  <Plus size={12} /> Add row
                </button>
              </div>
            </Sec>

            {/* Cancellation */}
            <Sec
              title="Cancellation & Policies"
              icon={<AlertCircle size={14} />}
              open={false}
            >
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                    Cancellation tiers
                  </p>
                  {form.cancellationRows.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2"
                    >
                      <input
                        className={`${inp} flex-1`}
                        value={c.rule}
                        onChange={(e) =>
                          updateCan(
                            c.id,
                            "rule",
                            e.target.value,
                          )
                        }
                        placeholder="Until 25 Oct 2026"
                      />
                      <input
                        className={`${inp} w-32 shrink-0`}
                        value={c.charge}
                        onChange={(e) =>
                          updateCan(
                            c.id,
                            "charge",
                            e.target.value,
                          )
                        }
                        placeholder="0.00 PHP"
                      />
                      <button
                        onClick={() => removeCan(c.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addCan}
                    className="text-xs text-accent hover:opacity-75 font-semibold flex items-center gap-1 transition-opacity"
                  >
                    <Plus size={12} /> Add tier
                  </button>
                </div>
                <Field label="No-show charges">
                  <input
                    className={inp}
                    value={form.noShow}
                    onChange={(e) =>
                      setF("noShow", e.target.value)
                    }
                    placeholder="100% of total booking value"
                  />
                </Field>
                <Field label="Rates & conditions">
                  <textarea
                    className={ta}
                    rows={5}
                    value={form.ratesConditions}
                    onChange={(e) =>
                      setF("ratesConditions", e.target.value)
                    }
                  />
                </Field>
              </div>
            </Sec>

            {/* Agency contact */}
            <Sec
              title="Agency Contact"
              icon={<Phone size={14} />}
              open={false}
            >
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Contact person"
                  className="col-span-2"
                >
                  <input
                    className={inp}
                    value={form.contactName}
                    onChange={(e) =>
                      setF("contactName", e.target.value)
                    }
                    placeholder="Maria Santos"
                  />
                </Field>
                <Field label="Phone">
                  <input
                    className={inp}
                    value={form.contactPhone}
                    onChange={(e) =>
                      setF("contactPhone", e.target.value)
                    }
                    placeholder="+63 917 555 0000"
                  />
                </Field>
                <Field label="Email">
                  <input
                    className={inp}
                    value={form.contactEmail}
                    onChange={(e) =>
                      setF("contactEmail", e.target.value)
                    }
                    placeholder="name@agency.com"
                  />
                </Field>
              </div>
            </Sec>

            {/* Passengers */}
            <Sec
              title="Passengers"
              icon={<User size={14} />}
              open={false}
            >
              <div className="space-y-5">
                {form.passengers.map((pas, pasIdx) => (
                  <div
                    key={pas.id}
                    className="rounded-xl border border-border bg-muted/20 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                        Traveler
                        {form.passengers.length > 1
                          ? ` ${pasIdx + 1}`
                          : ""}
                      </p>
                      {form.passengers.length > 1 ? (
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors shrink-0"
                          aria-label={`Remove traveler ${pasIdx + 1}`}
                          onClick={() => removePassenger(pas.id)}
                        >
                          <X size={13} />
                        </button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 grid grid-cols-[76px_1fr_1fr] gap-2">
                        <Field label="Title">
                          <select
                            className={inp}
                            value={pas.honorific}
                            onChange={(e) =>
                              updatePassenger(
                                pas.id,
                                "honorific",
                                e.target.value,
                              )
                            }
                          >
                            {[
                              "MR.",
                              "MS.",
                              "MRS.",
                              "DR.",
                              "PROF.",
                            ].map((h) => (
                              <option key={h}>{h}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="First name">
                          <input
                            className={inp}
                            value={pas.firstName}
                            onChange={(e) =>
                              updatePassenger(
                                pas.id,
                                "firstName",
                                e.target.value,
                              )
                            }
                          />
                        </Field>
                        <Field label="Last name">
                          <input
                            className={inp}
                            value={pas.lastName}
                            onChange={(e) =>
                              updatePassenger(
                                pas.id,
                                "lastName",
                                e.target.value,
                              )
                            }
                          />
                        </Field>
                      </div>
                      <Field label="Passenger type">
                        <select
                          className={inp}
                          value={pas.passengerType}
                          onChange={(e) =>
                            updatePassenger(
                              pas.id,
                              "passengerType",
                              e.target.value,
                            )
                          }
                        >
                          <option>Adult</option>
                          <option>Child</option>
                        </select>
                      </Field>
                      <Field label="Date of birth">
                        <DatePickerInput
                          value={pas.birthdate}
                          onChange={(v) =>
                            updatePassenger(
                              pas.id,
                              "birthdate",
                              v,
                            )
                          }
                          placeholder="Date of birth"
                        />
                      </Field>
                      <Field label="Nationality">
                        <input
                          className={inp}
                          value={pas.nationality}
                          onChange={(e) =>
                            updatePassenger(
                              pas.id,
                              "nationality",
                              e.target.value,
                            )
                          }
                          placeholder="PHL"
                        />
                      </Field>
                      <Field label="Passport no.">
                        <input
                          className={inp}
                          value={pas.passportNo}
                          onChange={(e) =>
                            updatePassenger(
                              pas.id,
                              "passportNo",
                              e.target.value,
                            )
                          }
                        />
                      </Field>
                      <Field label="Passport expiry">
                        <DatePickerInput
                          value={pas.passportExpiry}
                          onChange={(v) =>
                            updatePassenger(
                              pas.id,
                              "passportExpiry",
                              v,
                            )
                          }
                          placeholder="Passport expiry"
                        />
                      </Field>
                      <Field label="Issuing country">
                        <input
                          className={inp}
                          value={pas.issuingCountry}
                          onChange={(e) =>
                            updatePassenger(
                              pas.id,
                              "issuingCountry",
                              e.target.value,
                            )
                          }
                        />
                      </Field>
                      <Field label="Date issued">
                        <DatePickerInput
                          value={pas.dateIssued}
                          onChange={(v) =>
                            updatePassenger(
                              pas.id,
                              "dateIssued",
                              v,
                            )
                          }
                          placeholder="Passport issued on"
                        />
                      </Field>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPassenger}
                  className="text-xs text-accent hover:opacity-75 font-semibold flex items-center gap-1 transition-opacity"
                >
                  <Plus size={12} /> Add passenger
                </button>
              </div>
            </Sec>

            {/* Payment */}
            <Sec
              title="Payment & Fare Breakdown"
              icon={<CreditCard size={14} />}
              open={false}
            >
              <label className="flex items-start gap-2.5 cursor-pointer rounded-lg border border-border bg-muted/20 px-3 py-2.5 mb-4">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-border"
                  checked={form.hidePricingOnPdf}
                  onChange={(e) =>
                    setF("hidePricingOnPdf", e.target.checked)
                  }
                />
                <span className="text-xs leading-snug">
                  <span className="font-semibold text-foreground">
                    Hide prices on itinerary PDF
                  </span>
                  <span className="block text-muted-foreground mt-0.5">
                    Omits fares, totals, supplement amounts, and
                    penalty charges from the exported document.
                    Editors still show computed amounts here.
                  </span>
                </span>
              </label>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    Adult Fare
                  </p>
                  <div className="space-y-3">
                    <Field label="Base fare">
                      <input
                        className={inp}
                        value={form.adultBaseFare}
                        onChange={(e) =>
                          setF("adultBaseFare", e.target.value)
                        }
                        placeholder="18,450.00"
                      />
                    </Field>
                    <Field label="Other charges">
                      <input
                        className={inp}
                        value={form.adultOtherCharges}
                        onChange={(e) =>
                          setF(
                            "adultOtherCharges",
                            e.target.value,
                          )
                        }
                      />
                    </Field>
                    <Field label="Total adult fare (computed)">
                      <input
                        className={`${inp} font-mono bg-muted/50 cursor-default`}
                        readOnly
                        value={form.adultTotalFare}
                        title="Sum of base fare and other charges"
                      />
                    </Field>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    Room Rate
                  </p>
                  <div className="space-y-3">
                    <Field label="Room rate">
                      <input
                        className={inp}
                        value={form.roomRate}
                        onChange={(e) =>
                          setF("roomRate", e.target.value)
                        }
                        placeholder="28,500.00"
                      />
                    </Field>
                    <Field label="Taxes & fees">
                      <input
                        className={inp}
                        value={form.roomTaxes}
                        onChange={(e) =>
                          setF("roomTaxes", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Total room rate (computed)">
                      <input
                        className={`${inp} font-mono bg-muted/50 cursor-default`}
                        readOnly
                        value={form.totalRoomRate}
                        title="Room rate plus taxes and fees"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </Sec>

            {/* Summary */}
            <Sec
              title="Summary Totals"
              icon={<CreditCard size={14} />}
              open={false}
            >
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                <Field label="Original total — PHP (computed)">
                  <input
                    className={`${inp} font-mono line-through text-muted-foreground bg-muted/50 cursor-default`}
                    readOnly
                    value={form.originalTotal}
                    title="Adult fare + room + supplements (before savings)"
                  />
                </Field>
                <Field label="Bundle savings (PHP)">
                  <input
                    className={`${inp} font-mono text-red-600`}
                    value={form.savings}
                    onChange={(e) =>
                      setF("savings", e.target.value)
                    }
                    placeholder="0.00"
                  />
                </Field>
                <div className="pt-2 border-t border-border">
                  <Field label="Total due — PHP (computed)">
                    <input
                      className={`${inp} font-mono text-base font-bold bg-muted/50 cursor-default`}
                      readOnly
                      value={form.totalDue}
                      title="Original total minus bundle savings"
                    />
                  </Field>
                </div>
              </div>
            </Sec>

            {/* Internal notes */}
            <div className="rounded-xl border border-amber-200/70 overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3.5 bg-amber-50/70 border-b border-amber-200/70">
                <Lock size={12} className="text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">
                  Internal Notes
                </span>
                <span className="ml-1 text-xs text-amber-600/80">
                  — not visible on exported PDF
                </span>
              </div>
              <div className="px-5 py-4 bg-amber-50/30">
                <textarea
                  className={`${ta} bg-white/60 border-amber-200/60`}
                  rows={4}
                  value={form.internalNotes}
                  onChange={(e) =>
                    setF("internalNotes", e.target.value)
                  }
                  placeholder="Private notes for your reference only…"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview panel */}
        <div
          className={`shrink-0 border-l border-border overflow-hidden ${
            !showPreview
              ? "hidden"
              : tab === "edit"
                ? "w-[480px] xl:w-[560px] hidden lg:flex lg:flex-col"
                : "w-[480px] xl:w-[560px] flex flex-col"
          }`}
        >
          <PDFPreview form={form} />
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  search,
  onNew,
}: {
  search: string;
  onNew: () => void;
}) {
  return (
    <div className="mt-20 flex flex-col items-center text-center gap-4">
      {search ? (
        <>
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
            <Search
              size={20}
              className="text-muted-foreground/50"
            />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              No results for &ldquo;{search}&rdquo;
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Try a different client name, destination, or date
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <FileText
              size={24}
              className="text-muted-foreground/50"
            />
          </div>
          <div>
            <p
              className="text-lg font-semibold text-foreground"
              style={{
                fontFamily: "'Playfair Display', serif",
              }}
            >
              No itineraries yet
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first booking confirmation to get
              started
            </p>
          </div>
          <button
            onClick={onNew}
            className="flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={15} /> Create first itinerary
          </button>
        </>
      )}
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

function ListView({
  itineraries,
  onOpen,
  onNew,
  onDuplicate,
  onDelete,
}: {
  itineraries: Itinerary[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "draft" | "ready"
  >("all");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (menuId === null) return;
    const closeIfOutside = (e: PointerEvent) => {
      const root = document.querySelector(
        `[data-overflow-root="${menuId}"]`,
      );
      if (
        root &&
        e.target instanceof Node &&
        root.contains(e.target)
      ) {
        return;
      }
      setMenuId(null);
    };
    document.addEventListener("pointerdown", closeIfOutside);
    return () =>
      document.removeEventListener(
        "pointerdown",
        closeIfOutside,
      );
  }, [menuId]);

  const filtered = itineraries.filter((it) => {
    const matchFilter =
      filter === "all" || it.status === filter;
    const q = search.toLowerCase();
    const passengerLc = deriveClient(it.form).toLowerCase();
    const passengerBlob = passengerSearchBlob(it.form);
    const matchSearch =
      !q ||
      it.client.toLowerCase().includes(q) ||
      passengerLc.includes(q) ||
      passengerBlob.includes(q) ||
      it.destination.toLowerCase().includes(q) ||
      it.title.toLowerCase().includes(q) ||
      it.travelStart.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  return (
    <div className="flex min-h-full h-full flex-col overflow-y-auto bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-start justify-between">
          <div>
            <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <img
                src="/lyzius-logo.png"
                alt=""
                aria-hidden
                className="h-14 sm:h-[4.25rem] w-auto max-w-[200px] sm:max-w-[220px] object-contain object-left shrink-0"
                loading="eager"
                decoding="async"
              />
              <div className="min-w-0 sm:border-l sm:border-border sm:pl-4 pt-1 sm:pt-0">
                <p
                  className="text-[1.35rem] sm:text-2xl font-semibold text-foreground leading-snug text-balance"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    letterSpacing: "-0.025em",
                  }}
                >
                  {BRAND_SHELL_NAME}
                </p>
              </div>
            </div>
            <h1
              className="text-[26px] font-semibold text-foreground leading-tight"
              style={{
                fontFamily: "'Playfair Display', serif",
                letterSpacing: "-0.025em",
              }}
            >
              Itineraries
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Stored in your browser — drafts survive refresh on this device
            </p>
          </div>
          <button
            onClick={onNew}
            className="mt-1 flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={15} /> New itinerary
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-5">
        {/* Search + filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative max-w-sm flex-1 min-w-48">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client name, destination, dates…"
              className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent transition-colors placeholder:text-muted-foreground/55"
            />
          </div>
          <div className="flex gap-1.5">
            {(["all", "draft", "ready"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                  filter === f
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/25"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState search={search} onNew={onNew} />
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/25">
                  {[
                    "Client",
                    "Destination",
                    "Travel start",
                    "Travel end",
                    "Status",
                    "Last updated",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => (
                  <tr
                    key={it.id}
                    onClick={() => onOpen(it.id)}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-4">
                      <div className="text-sm font-semibold text-foreground">
                        {it.client}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                        {it.title}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-foreground">
                      {it.destination}
                    </td>
                    <td className="px-5 py-4 text-sm text-foreground font-mono tabular-nums">
                      {it.travelStart}
                    </td>
                    <td className="px-5 py-4 text-sm text-foreground font-mono tabular-nums">
                      {it.travelEnd}
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill status={it.status} />
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground font-mono">
                      {it.lastUpdated}
                    </td>
                    <td
                      data-overflow-root={it.id}
                      className="px-5 py-4 relative align-middle"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpen(it.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-accent text-accent-foreground rounded-md hover:opacity-80 transition-opacity"
                        >
                          Open
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            aria-expanded={menuId === it.id}
                            aria-haspopup="menu"
                            aria-label="More actions"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuId(
                                menuId === it.id ? null : it.id,
                              );
                            }}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                          >
                            <MoreHorizontal size={13} />
                          </button>
                          {menuId === it.id && (
                            <div
                              role="menu"
                              className="absolute right-0 top-full mt-1 z-[100] bg-card border border-border rounded-lg shadow-xl py-1 w-36"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  onDuplicate(it.id);
                                  setMenuId(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                <Copy size={12} /> Duplicate
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setDeleteId(it.id);
                                  setMenuId(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-80 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Trash2 size={18} className="text-destructive" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">
              Delete itinerary?
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              This action cannot be undone.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(deleteId);
                  setDeleteId(null);
                }}
                className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
type WorkspaceTab = "itineraries" | "accounting";

function WorkspaceBar({
  workspace,
  setWorkspace,
}: {
  workspace: WorkspaceTab;
  setWorkspace: (w: WorkspaceTab) => void;
}) {
  const seg =
    "inline-flex rounded-xl border border-border/80 bg-muted/50 p-1 gap-0.5";
  const activeSeg =
    "bg-background text-foreground shadow-sm ring-1 ring-black/5";
  const idleSeg =
    "text-muted-foreground hover:text-foreground hover:bg-muted/60";

  return (
    <header className="z-[100] shrink-0 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex h-[52px] max-w-[1800px] items-center justify-between gap-4 px-4">
        <div
          className="text-sm font-semibold tracking-tight text-foreground truncate max-w-[min(280px,50vw)]"
          style={{
            fontFamily: "'Playfair Display', serif",
          }}
        >
          {BRAND_SHELL_NAME}
        </div>
        <div className={seg} role="tablist" aria-label="Workspace">
          <button
            type="button"
            role="tab"
            aria-selected={workspace === "itineraries"}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              workspace === "itineraries" ? activeSeg : idleSeg
            }`}
            onClick={() => setWorkspace("itineraries")}
          >
            <Plane size={13} aria-hidden /> Itineraries
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={workspace === "accounting"}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              workspace === "accounting" ? activeSeg : idleSeg
            }`}
            onClick={() => setWorkspace("accounting")}
          >
            <Landmark size={13} aria-hidden /> Accounting
          </button>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const [workspace, setWorkspace] =
    useState<WorkspaceTab>("itineraries");
  const [itineraries, setItineraries] = useState<Itinerary[]>(
    loadStoredItineraries,
  );
  const [editingId, setEditingId] = useState<string | null>(
    null,
  );

  const current =
    itineraries.find((it) => it.id === editingId) ?? null;

  const handleNew = () => {
    const id = Date.now().toString();
    const nf: FormData = {
      ...blankForm,
      outbound: { ...blankFlight },
      returnFlight: { ...blankFlight },
      passengers: [blankPassenger()],
      supplements: [],
      cancellationRows: [],
    };
    const slice = deriveListSlice(nf);
    const it: Itinerary = {
      id,
      title: "New Itinerary",
      status: "draft",
      lastUpdated: "Just now",
      ...slice,
      form: nf,
    };
    setItineraries((prev) => [it, ...prev]);
    setEditingId(id);
  };

  const handleDuplicate = (id: string): string | null => {
    const src = itineraries.find((it) => it.id === id);
    if (!src) return null;
    const newId = Date.now().toString();
    const nf: FormData = {
      ...src.form,
      outbound: { ...src.form.outbound },
      returnFlight: { ...src.form.returnFlight },
      supplements: [...src.form.supplements],
      cancellationRows: [...src.form.cancellationRows],
      passengers: src.form.passengers.map((p) => ({
        ...p,
        id: newPassengerId(),
      })),
    };
    const slice = deriveListSlice(nf);
    const dup: Itinerary = {
      ...src,
      id: newId,
      title: `${src.title} (copy)`,
      status: "draft",
      lastUpdated: "Just now",
      ...slice,
      form: nf,
    };
    setItineraries((prev) => [dup, ...prev]);
    return newId;
  };

  const handleDelete = (id: string) => {
    setItineraries((prev) => prev.filter((it) => it.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const handleSave = (updated: Itinerary) => {
    setItineraries((prev) =>
      prev.map((it) => (it.id === updated.id ? updated : it)),
    );
  };

  useEffect(() => {
    try {
      localStorage.setItem(
        ITIN_STORAGE_KEY,
        JSON.stringify(itineraries),
      );
    } catch {
      // quota / private mode
    }
  }, [itineraries]);

  let workspaceMain: React.ReactNode;
  if (workspace === "accounting") {
    workspaceMain = <AccountingView />;
  } else if (current) {
    workspaceMain = (
      <EditorView
        key={current.id}
        itinerary={current}
        onBack={() => setEditingId(null)}
        onSave={handleSave}
        onDuplicate={() => {
          const newId = handleDuplicate(current.id);
          if (newId != null) setEditingId(newId);
        }}
      />
    );
  } else {
    workspaceMain = (
      <ListView
        itineraries={itineraries}
        onOpen={setEditingId}
        onNew={handleNew}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <WorkspaceBar
        workspace={workspace}
        setWorkspace={setWorkspace}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        {workspaceMain}
      </div>
    </div>
  );
}
