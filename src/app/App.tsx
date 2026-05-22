import React, { useState, useEffect } from "react";
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
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "draft" | "ready";

interface Flight {
  route: string;
  airline: string;
  flightNo: string;
  depAirport: string;
  depTerminal: string;
  depDate: string;
  depTime: string;
  arrAirport: string;
  arrTerminal: string;
  arrDate: string;
  arrTime: string;
  duration: string;
  baggage: string;
}

interface SupRow {
  id: string;
  desc: string;
  amount: string;
  chargeType: string;
}
interface CanRow {
  id: string;
  rule: string;
  charge: string;
}

interface FormData {
  agencyName: string;
  agencyTagline: string;
  agencyFooter: string;
  page1Heading: string;
  outbound: Flight;
  returnFlight: Flight;
  hotelName: string;
  hotelAddress: string;
  hotelPhone: string;
  checkIn: string;
  checkOut: string;
  roomDesc: string;
  inclusions: string;
  supplements: SupRow[];
  cancellationRows: CanRow[];
  noShow: string;
  ratesConditions: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  honorific: string;
  firstName: string;
  lastName: string;
  passengerType: string;
  birthdate: string;
  nationality: string;
  passportNo: string;
  passportExpiry: string;
  issuingCountry: string;
  dateIssued: string;
  adultBaseFare: string;
  adultOtherCharges: string;
  adultTotalFare: string;
  roomRate: string;
  roomTaxes: string;
  totalRoomRate: string;
  originalTotal: string;
  savings: string;
  totalDue: string;
  internalNotes: string;
}

interface Itinerary {
  id: string;
  title: string;
  client: string;
  destination: string;
  travelStart: string;
  travelEnd: string;
  status: Status;
  lastUpdated: string;
  form: FormData;
}

// ─── Default blanks (new itineraries) ────────────────────────────────────────

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
};

const initialItineraries: Itinerary[] = [];

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
    <div className="rounded-xl border border-border overflow-hidden shadow-sm">
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

// ─── PDF Preview ──────────────────────────────────────────────────────────────

const PAGE_W = 595;
const PAGE_H = 842;

function PdfRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <tr>
      <td
        style={{
          padding: "5px 10px",
          color: "#8C8780",
          fontSize: 8.5,
          width: "38%",
          borderBottom: "1px solid rgba(255,255,255,0.055)",
          verticalAlign: "top",
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: "5px 10px",
          color: "#EDE9E2",
          borderBottom: "1px solid rgba(255,255,255,0.055)",
          verticalAlign: "top",
          lineHeight: 1.5,
        }}
      >
        {value}
      </td>
    </tr>
  );
}

function PdfBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 7.5,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase" as const,
          color: "#7A7470",
          marginBottom: 5,
        }}
      >
        {title}
      </div>
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function PdfFlightBlock({
  title,
  f,
}: {
  title: string;
  f: Flight;
}) {
  return (
    <PdfBlock title={title}>
      <table
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
        <tbody>
          <PdfRow label="Route" value={f.route || "—"} />
          <PdfRow
            label="Airline / Flight No."
            value={
              [f.airline, f.flightNo]
                .filter(Boolean)
                .join(" · ") || "—"
            }
          />
          <PdfRow
            label="Departure"
            value={
              [f.depAirport, f.depTerminal]
                .filter(Boolean)
                .join(", ") || "—"
            }
          />
          <PdfRow
            label="Dep. Date / Time"
            value={
              [f.depDate, f.depTime]
                .filter(Boolean)
                .join("  ") || "—"
            }
          />
          <PdfRow
            label="Arrival"
            value={
              [f.arrAirport, f.arrTerminal]
                .filter(Boolean)
                .join(", ") || "—"
            }
          />
          <PdfRow
            label="Arr. Date / Time"
            value={
              [f.arrDate, f.arrTime]
                .filter(Boolean)
                .join("  ") || "—"
            }
          />
          <PdfRow label="Duration" value={f.duration || "—"} />
          <PdfRow label="Baggage" value={f.baggage || "—"} />
        </tbody>
      </table>
    </PdfBlock>
  );
}

function PDFPreview({ form }: { form: FormData }) {
  const [zoom, setZoom] = useState(0.65);
  const zoomLevels: [number, string][] = [
    [0.5, "50%"],
    [0.65, "65%"],
    [0.75, "75%"],
    [1.0, "100%"],
  ];

  const pageStyle: React.CSSProperties = {
    width: PAGE_W,
    height: PAGE_H,
    backgroundColor: "#1C1A18",
    color: "#EDE9E2",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 9.5,
    padding: "36px 40px",
    boxSizing: "border-box",
    position: "relative",
  };

  const headerBorder: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
    paddingBottom: 14,
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  };

  return (
    <div className="flex flex-col h-full bg-[#161412]">
      {/* Zoom controls */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 shrink-0">
        <span className="text-[11px] text-white/30 font-mono tracking-widest">
          A4 · PREVIEW
        </span>
        <div className="flex items-center gap-0.5">
          {zoomLevels.map(([z, label]) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                zoom === z
                  ? "bg-white/12 text-white/80"
                  : "text-white/30 hover:text-white/55"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable canvas */}
      <div className="flex-1 overflow-auto py-8 flex flex-col items-center gap-6">
        {/* Page 1 */}
        <div
          style={{
            width: PAGE_W * zoom,
            height: PAGE_H * zoom,
            flexShrink: 0,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
            }}
          >
            <div style={pageStyle}>
              {/* Header */}
              <div style={headerBorder}>
                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#EDE9E2",
                      fontFamily: "'Playfair Display', serif",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {form.agencyName || "Agency Name"}
                  </div>
                  {form.agencyTagline && (
                    <div
                      style={{
                        fontSize: 8,
                        color: "#7A7470",
                        marginTop: 2,
                        letterSpacing: "0.08em",
                      }}
                    >
                      {form.agencyTagline}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#EDE9E2",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase" as const,
                  }}
                >
                  {form.page1Heading || "Flight Details"}
                </div>
              </div>

              {/* Outbound flight */}
              <PdfFlightBlock
                title="Outbound Flight"
                f={form.outbound}
              />
              {/* Return flight */}
              <PdfFlightBlock
                title="Return Flight"
                f={form.returnFlight}
              />

              {/* Hotel */}
              <PdfBlock title="Hotel">
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <tbody>
                    <PdfRow
                      label="Hotel"
                      value={form.hotelName || "—"}
                    />
                    <PdfRow
                      label="Address"
                      value={
                        form.hotelAddress.replace(
                          /\n/g,
                          ", ",
                        ) || "—"
                      }
                    />
                    <PdfRow
                      label="Phone"
                      value={form.hotelPhone || "—"}
                    />
                    <PdfRow
                      label="Check-in"
                      value={form.checkIn || "—"}
                    />
                    <PdfRow
                      label="Check-out"
                      value={form.checkOut || "—"}
                    />
                    <PdfRow
                      label="Room"
                      value={form.roomDesc || "—"}
                    />
                    <PdfRow
                      label="Inclusions"
                      value={form.inclusions || "—"}
                    />
                  </tbody>
                </table>
              </PdfBlock>

              {/* Supplements */}
              {form.supplements.length > 0 && (
                <PdfBlock title="Supplements & Fees">
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor:
                            "rgba(255,255,255,0.035)",
                        }}
                      >
                        {[
                          "Description",
                          "Amount",
                          "Charge Type",
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "5px 10px",
                              textAlign: "left" as const,
                              fontSize: 7.5,
                              color: "#7A7470",
                              fontWeight: 600,
                              letterSpacing: "0.1em",
                              textTransform:
                                "uppercase" as const,
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {form.supplements.map((s) => (
                        <tr key={s.id}>
                          <td
                            style={{
                              padding: "5px 10px",
                              color: "#EDE9E2",
                              borderTop:
                                "1px solid rgba(255,255,255,0.055)",
                            }}
                          >
                            {s.desc}
                          </td>
                          <td
                            style={{
                              padding: "5px 10px",
                              color: "#EDE9E2",
                              fontFamily:
                                "'DM Mono', monospace",
                              borderTop:
                                "1px solid rgba(255,255,255,0.055)",
                            }}
                          >
                            {s.amount}
                          </td>
                          <td
                            style={{
                              padding: "5px 10px",
                              color: "#8C8780",
                              borderTop:
                                "1px solid rgba(255,255,255,0.055)",
                            }}
                          >
                            {s.chargeType}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </PdfBlock>
              )}

              {/* Cancellation */}
              {form.cancellationRows.length > 0 && (
                <PdfBlock title="Cancellation Policy">
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor:
                            "rgba(255,255,255,0.035)",
                        }}
                      >
                        {["Period / Condition", "Charge"].map(
                          (h) => (
                            <th
                              key={h}
                              style={{
                                padding: "5px 10px",
                                textAlign: "left" as const,
                                fontSize: 7.5,
                                color: "#7A7470",
                                fontWeight: 600,
                                letterSpacing: "0.1em",
                                textTransform:
                                  "uppercase" as const,
                              }}
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {form.cancellationRows.map((c) => (
                        <tr key={c.id}>
                          <td
                            style={{
                              padding: "5px 10px",
                              color: "#EDE9E2",
                              borderTop:
                                "1px solid rgba(255,255,255,0.055)",
                            }}
                          >
                            {c.rule}
                          </td>
                          <td
                            style={{
                              padding: "5px 10px",
                              color: "#EDE9E2",
                              fontFamily:
                                "'DM Mono', monospace",
                              borderTop:
                                "1px solid rgba(255,255,255,0.055)",
                            }}
                          >
                            {c.charge}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </PdfBlock>
              )}

              {/* Rates & conditions */}
              {form.ratesConditions && (
                <div style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      fontSize: 7.5,
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase" as const,
                      color: "#7A7470",
                      marginBottom: 6,
                    }}
                  >
                    Rates & Conditions
                  </div>
                  <p
                    style={{
                      fontSize: 8.5,
                      color: "#B8B3AB",
                      lineHeight: 1.75,
                      maxWidth: "95%",
                    }}
                  >
                    {form.ratesConditions}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className="text-white/20 font-mono"
          style={{ fontSize: 10 }}
        >
          Page 1 of 2
        </div>

        {/* Page 2 */}
        <div
          style={{
            width: PAGE_W * zoom,
            height: PAGE_H * zoom,
            flexShrink: 0,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
            }}
          >
            <div style={pageStyle}>
              {/* Header */}
              <div style={headerBorder}>
                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#EDE9E2",
                      fontFamily: "'Playfair Display', serif",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {form.agencyName || "Agency Name"}
                  </div>
                  {form.agencyTagline && (
                    <div
                      style={{
                        fontSize: 8,
                        color: "#7A7470",
                        marginTop: 2,
                        letterSpacing: "0.08em",
                      }}
                    >
                      {form.agencyTagline}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    textAlign: "right" as const,
                    fontSize: 8.5,
                    color: "#8C8780",
                    lineHeight: 1.8,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: "#EDE9E2",
                      marginBottom: 1,
                    }}
                  >
                    {form.contactName || "—"}
                  </div>
                  <div>{form.contactPhone || "—"}</div>
                  <div>{form.contactEmail || "—"}</div>
                </div>
              </div>

              {/* Passenger */}
              <PdfBlock title="Passenger Information">
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <tbody>
                    <PdfRow
                      label="Full name"
                      value={
                        [
                          form.honorific,
                          form.firstName,
                          form.lastName,
                        ]
                          .filter(Boolean)
                          .join(" ") || "—"
                      }
                    />
                    <PdfRow
                      label="Passenger type"
                      value={form.passengerType || "—"}
                    />
                    <PdfRow
                      label="Date of birth"
                      value={form.birthdate || "—"}
                    />
                    <PdfRow
                      label="Nationality"
                      value={form.nationality || "—"}
                    />
                    <PdfRow
                      label="Passport no."
                      value={form.passportNo || "—"}
                    />
                    <PdfRow
                      label="Passport expiry"
                      value={form.passportExpiry || "—"}
                    />
                    <PdfRow
                      label="Issuing country"
                      value={form.issuingCountry || "—"}
                    />
                    <PdfRow
                      label="Date issued"
                      value={form.dateIssued || "—"}
                    />
                  </tbody>
                </table>
              </PdfBlock>

              {/* Payment breakdown */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div style={{ flex: 1 }}>
                  <PdfBlock title="Adult Fare">
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                      }}
                    >
                      <tbody>
                        <PdfRow
                          label="Base fare (1 adult)"
                          value={`PHP ${form.adultBaseFare || "0.00"}`}
                        />
                        <PdfRow
                          label="Other charges"
                          value={`PHP ${form.adultOtherCharges || "0.00"}`}
                        />
                        <tr>
                          <td
                            style={{
                              padding: "6px 10px",
                              color: "#8C8780",
                              fontSize: 8.5,
                              borderTop:
                                "1px solid rgba(255,255,255,0.12)",
                              fontWeight: 600,
                            }}
                          >
                            Total adult fare
                          </td>
                          <td
                            style={{
                              padding: "6px 10px",
                              color: "#EDE9E2",
                              fontFamily:
                                "'DM Mono', monospace",
                              fontWeight: 700,
                              borderTop:
                                "1px solid rgba(255,255,255,0.12)",
                            }}
                          >
                            PHP {form.adultTotalFare || "0.00"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </PdfBlock>
                </div>
                <div style={{ flex: 1 }}>
                  <PdfBlock title="Room Rate">
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                      }}
                    >
                      <tbody>
                        <PdfRow
                          label="Room rate"
                          value={`PHP ${form.roomRate || "0.00"}`}
                        />
                        <PdfRow
                          label="Taxes & fees"
                          value={`PHP ${form.roomTaxes || "0.00"}`}
                        />
                        <tr>
                          <td
                            style={{
                              padding: "6px 10px",
                              color: "#8C8780",
                              fontSize: 8.5,
                              borderTop:
                                "1px solid rgba(255,255,255,0.12)",
                              fontWeight: 600,
                            }}
                          >
                            Total room rate
                          </td>
                          <td
                            style={{
                              padding: "6px 10px",
                              color: "#EDE9E2",
                              fontFamily:
                                "'DM Mono', monospace",
                              fontWeight: 700,
                              borderTop:
                                "1px solid rgba(255,255,255,0.12)",
                            }}
                          >
                            PHP {form.totalRoomRate || "0.00"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </PdfBlock>
                </div>
              </div>

              {/* Summary totals */}
              <PdfBlock title="Summary">
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          padding: "6px 10px",
                          color: "#8C8780",
                          fontSize: 9,
                          borderBottom:
                            "1px solid rgba(255,255,255,0.055)",
                        }}
                      >
                        Original total
                      </td>
                      <td
                        style={{
                          padding: "6px 10px",
                          color: "#8C8780",
                          fontFamily: "'DM Mono', monospace",
                          textAlign: "right" as const,
                          textDecoration: "line-through",
                          borderBottom:
                            "1px solid rgba(255,255,255,0.055)",
                        }}
                      >
                        PHP {form.originalTotal || "0.00"}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: "6px 10px",
                          color: "#C0453A",
                          fontSize: 9,
                          borderBottom:
                            "1px solid rgba(255,255,255,0.055)",
                        }}
                      >
                        Bundle savings
                      </td>
                      <td
                        style={{
                          padding: "6px 10px",
                          color: "#C0453A",
                          fontFamily: "'DM Mono', monospace",
                          textAlign: "right" as const,
                          fontWeight: 600,
                          borderBottom:
                            "1px solid rgba(255,255,255,0.055)",
                        }}
                      >
                        − PHP {form.savings || "0.00"}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: "10px 10px",
                          color: "#EDE9E2",
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        Total due
                      </td>
                      <td
                        style={{
                          padding: "10px 10px",
                          color: "#EDE9E2",
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 15,
                          fontWeight: 700,
                          textAlign: "right" as const,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        PHP {form.totalDue || "0.00"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </PdfBlock>

              {/* Footer */}
              <div
                style={{
                  position: "absolute",
                  bottom: 34,
                  left: 40,
                  right: 40,
                }}
              >
                {form.agencyFooter && (
                  <p
                    style={{
                      fontSize: 7.5,
                      color: "#5A5652",
                      lineHeight: 1.9,
                      marginBottom: 14,
                      borderTop:
                        "1px solid rgba(255,255,255,0.07)",
                      paddingTop: 12,
                    }}
                  >
                    {form.agencyFooter}
                  </p>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                  }}
                >
                  <div
                    style={{ fontSize: 7.5, color: "#5A5652" }}
                  >
                    <p style={{ marginBottom: 18 }}>
                      I hereby certify that the information
                      above is correct and accurate.
                    </p>
                    <div
                      style={{
                        borderTop:
                          "1px solid rgba(255,255,255,0.18)",
                        paddingTop: 4,
                        width: 210,
                      }}
                    >
                      Signature over printed name
                    </div>
                  </div>
                  <div
                    style={{ fontSize: 7.5, color: "#5A5652" }}
                  >
                    <div
                      style={{ marginBottom: 18, opacity: 0 }}
                    >
                      _
                    </div>
                    <div
                      style={{
                        borderTop:
                          "1px solid rgba(255,255,255,0.18)",
                        paddingTop: 4,
                        width: 140,
                      }}
                    >
                      Date
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="text-white/20 font-mono pb-8"
          style={{ fontSize: 10 }}
        >
          Page 2 of 2
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
  const ta = `${inp} resize-none`;
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
        <input
          className={inp}
          value={f.depDate}
          onChange={(e) => onChange("depDate", e.target.value)}
          placeholder="25 Oct 2026"
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
        <input
          className={inp}
          value={f.arrDate}
          onChange={(e) => onChange("arrDate", e.target.value)}
          placeholder="26 Oct 2026"
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
}: {
  itinerary: Itinerary;
  onBack: () => void;
  onSave: (it: Itinerary) => void;
}) {
  const [form, setForm] = useState<FormData>(itinerary.form);
  const [title, setTitle] = useState(itinerary.title);
  const [status, setStatus] = useState<Status>(
    itinerary.status,
  );
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [showPreview, setShowPreview] = useState(true);

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

  const handleSave = () => {
    onSave({
      ...itinerary,
      title,
      status,
      form,
      lastUpdated: "Just now",
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const ta = `${inp} resize-none`;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="bg-card border-b border-border flex items-center gap-3 px-4 h-[52px] shrink-0 z-20 shadow-sm">
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
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <button
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
          <button className="px-3 py-1.5 text-xs font-semibold border border-border rounded-lg hover:bg-muted transition-colors text-foreground flex items-center gap-1.5">
            <Copy size={11} /> Duplicate
          </button>
        </div>
        <button className="flex items-center gap-1.5 bg-accent text-accent-foreground px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity shrink-0">
          <FileDown size={13} />
          Export PDF
        </button>
      </header>

      {/* Mobile tab bar — only when PDF preview is enabled */}
      {showPreview ? (
        <div className="lg:hidden flex border-b border-border bg-card shrink-0">
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
          className={`flex-1 overflow-y-auto ${
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
                  <input
                    className={inp}
                    value={form.checkIn}
                    onChange={(e) =>
                      setF("checkIn", e.target.value)
                    }
                    placeholder="26 Oct 2026"
                  />
                </Field>
                <Field label="Check-out date">
                  <input
                    className={inp}
                    value={form.checkOut}
                    onChange={(e) =>
                      setF("checkOut", e.target.value)
                    }
                    placeholder="01 Nov 2026"
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

            {/* Passenger */}
            <Sec
              title="Passenger"
              icon={<User size={14} />}
              open={false}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 grid grid-cols-[76px_1fr_1fr] gap-2">
                  <Field label="Title">
                    <select
                      className={inp}
                      value={form.honorific}
                      onChange={(e) =>
                        setF("honorific", e.target.value)
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
                      value={form.firstName}
                      onChange={(e) =>
                        setF("firstName", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Last name">
                    <input
                      className={inp}
                      value={form.lastName}
                      onChange={(e) =>
                        setF("lastName", e.target.value)
                      }
                    />
                  </Field>
                </div>
                <Field label="Passenger type">
                  <select
                    className={inp}
                    value={form.passengerType}
                    onChange={(e) =>
                      setF("passengerType", e.target.value)
                    }
                  >
                    <option>Adult</option>
                    <option>Child</option>
                  </select>
                </Field>
                <Field label="Date of birth">
                  <input
                    className={inp}
                    value={form.birthdate}
                    onChange={(e) =>
                      setF("birthdate", e.target.value)
                    }
                    placeholder="14 Mar 1987"
                  />
                </Field>
                <Field label="Nationality">
                  <input
                    className={inp}
                    value={form.nationality}
                    onChange={(e) =>
                      setF("nationality", e.target.value)
                    }
                    placeholder="PHL"
                  />
                </Field>
                <Field label="Passport no.">
                  <input
                    className={inp}
                    value={form.passportNo}
                    onChange={(e) =>
                      setF("passportNo", e.target.value)
                    }
                  />
                </Field>
                <Field label="Passport expiry">
                  <input
                    className={inp}
                    value={form.passportExpiry}
                    onChange={(e) =>
                      setF("passportExpiry", e.target.value)
                    }
                    placeholder="30 Jun 2031"
                  />
                </Field>
                <Field label="Issuing country">
                  <input
                    className={inp}
                    value={form.issuingCountry}
                    onChange={(e) =>
                      setF("issuingCountry", e.target.value)
                    }
                  />
                </Field>
                <Field label="Date issued">
                  <input
                    className={inp}
                    value={form.dateIssued}
                    onChange={(e) =>
                      setF("dateIssued", e.target.value)
                    }
                    placeholder="01 Jul 2021"
                  />
                </Field>
              </div>
            </Sec>

            {/* Payment */}
            <Sec
              title="Payment & Fare Breakdown"
              icon={<CreditCard size={14} />}
              open={false}
            >
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
                    <Field label="Total adult fare">
                      <input
                        className={`${inp} font-mono`}
                        value={form.adultTotalFare}
                        onChange={(e) =>
                          setF("adultTotalFare", e.target.value)
                        }
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
                    <Field label="Total room rate">
                      <input
                        className={`${inp} font-mono`}
                        value={form.totalRoomRate}
                        onChange={(e) =>
                          setF("totalRoomRate", e.target.value)
                        }
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
                <Field label="Original total (PHP)">
                  <input
                    className={`${inp} font-mono line-through text-muted-foreground`}
                    value={form.originalTotal}
                    onChange={(e) =>
                      setF("originalTotal", e.target.value)
                    }
                  />
                </Field>
                <Field label="Bundle savings (PHP)">
                  <input
                    className={`${inp} font-mono text-red-600`}
                    value={form.savings}
                    onChange={(e) =>
                      setF("savings", e.target.value)
                    }
                  />
                </Field>
                <div className="pt-2 border-t border-border">
                  <Field label="Total due (PHP)">
                    <input
                      className={`${inp} font-mono text-base font-bold`}
                      value={form.totalDue}
                      onChange={(e) =>
                        setF("totalDue", e.target.value)
                      }
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
    const matchSearch =
      !q ||
      it.client.toLowerCase().includes(q) ||
      it.destination.toLowerCase().includes(q) ||
      it.title.toLowerCase().includes(q) ||
      it.travelStart.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-start justify-between">
          <div>
            <div className="mb-3">
              <img
                src="/lyzius-logo.png"
                alt="Lyzius Travel and Tours — Crafting Journeys, Creating Memories"
                className="h-14 sm:h-[4.25rem] w-auto max-w-[min(100%,340px)] object-contain object-left"
                loading="eager"
                decoding="async"
              />
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
              Drafts are private to this device
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

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [itineraries, setItineraries] = useState<Itinerary[]>(
    initialItineraries,
  );
  const [editingId, setEditingId] = useState<string | null>(
    null,
  );

  const current =
    itineraries.find((it) => it.id === editingId) ?? null;

  const handleNew = () => {
    const id = Date.now().toString();
    const it: Itinerary = {
      id,
      title: "New Itinerary",
      client: "",
      destination: "",
      travelStart: "",
      travelEnd: "",
      status: "draft",
      lastUpdated: "Just now",
      form: { ...blankForm },
    };
    setItineraries((prev) => [it, ...prev]);
    setEditingId(id);
  };

  const handleDuplicate = (id: string) => {
    const src = itineraries.find((it) => it.id === id);
    if (!src) return;
    const dup: Itinerary = {
      ...src,
      id: Date.now().toString(),
      title: `${src.title} (copy)`,
      status: "draft",
      lastUpdated: "Just now",
    };
    setItineraries((prev) => [dup, ...prev]);
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

  if (current) {
    return (
      <EditorView
        itinerary={current}
        onBack={() => setEditingId(null)}
        onSave={handleSave}
      />
    );
  }

  return (
    <ListView
      itineraries={itineraries}
      onOpen={setEditingId}
      onNew={handleNew}
      onDuplicate={handleDuplicate}
      onDelete={handleDelete}
    />
  );
}