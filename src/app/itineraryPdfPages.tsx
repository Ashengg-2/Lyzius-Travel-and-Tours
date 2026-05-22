import React from "react";
import type { FormData, Flight, Passenger } from "./itineraryTypes";
import type { MoneyTotals } from "../lib/itineraryMoney";

export const PDF_PAGE_W = 595;
export const PDF_PAGE_H = 842;

const P = {
  pageBg: "#ffffff",
  ink: "#1c1917",
  muted: "#57534e",
  faint: "#78716c",
  border: "#e7e5e4",
  borderStrong: "#d6d3d1",
  thead: "#f5f5f4",
  savings: "#b91c1c",
} as const;

const pageFrame: React.CSSProperties = {
  width: PDF_PAGE_W,
  height: PDF_PAGE_H,
  backgroundColor: P.pageBg,
  color: P.ink,
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 9.5,
  padding: "36px 40px",
  boxSizing: "border-box",
  position: "relative",
  overflow: "hidden",
};

export interface ItineraryPdfContext {
  form: FormData;
  money: MoneyTotals;
  formatDateDisp: (raw: string) => string;
  passengerDisplayLine: (p: Passenger) => string;
  hidePricing: boolean;
}

function PdfRow({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  const pad = compact ? "3px 8px" : "5px 10px";
  const fs = compact ? 7.85 : 8.5;
  const lh = compact ? 1.35 : 1.5;
  return (
    <tr>
      <td
        style={{
          padding: pad,
          color: P.muted,
          fontSize: fs,
          width: "38%",
          borderBottom: `1px solid ${P.border}`,
          verticalAlign: "top",
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: pad,
          color: P.ink,
          borderBottom: `1px solid ${P.border}`,
          verticalAlign: "top",
          lineHeight: lh,
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
  compact,
}: {
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div style={{ marginBottom: compact ? 8 : 14 }}>
      <div
        style={{
          fontSize: compact ? 7 : 7.5,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase" as const,
          color: P.faint,
          marginBottom: compact ? 3 : 5,
        }}
      >
        {title}
      </div>
      <div
        style={{
          border: `1px solid ${P.borderStrong}`,
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
  formatDateDisp,
}: {
  title: string;
  f: Flight;
  formatDateDisp: (raw: string) => string;
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
              [formatDateDisp(f.depDate), f.depTime]
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
              [formatDateDisp(f.arrDate), f.arrTime]
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

function PdfBrandBlock({ form }: { form: FormData }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <img
        src="/lyzius-logo.png"
        alt=""
        style={{
          height: 42,
          width: "auto",
          maxWidth: 120,
          objectFit: "contain",
          objectPosition: "left center",
          flexShrink: 0,
        }}
        loading="eager"
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: P.ink,
            fontFamily: "'Playfair Display', serif",
            letterSpacing: "-0.02em",
          }}
        >
          {form.agencyName || "Agency Name"}
        </div>
        {form.agencyTagline ? (
          <div
            style={{
              fontSize: 8,
              color: P.faint,
              marginTop: 2,
              letterSpacing: "0.08em",
            }}
          >
            {form.agencyTagline}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function chunkPassengers<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size)
    out.push(arr.slice(i, i + size));
  return out;
}

/** Two travelers per passenger sheet — split across pages without 1:1 page inflation */
const PASSENGERS_PER_PAGE = 2;

export function countItineraryPdfPages(passengerCount: number): number {
  const chunks = Math.max(
    1,
    Math.ceil(
      Math.max(passengerCount, 1) / PASSENGERS_PER_PAGE,
    ),
  );
  return 1 + chunks + 1;
}

export function buildItineraryPdfPageFactories(
  ctx: ItineraryPdfContext,
): Array<() => React.ReactElement> {
  const {
    form,
    money,
    formatDateDisp,
    passengerDisplayLine,
    hidePricing,
  } = ctx;

  const paxChunks = chunkPassengers(
    form.passengers,
    PASSENGERS_PER_PAGE,
  );
  const pageTotal = 1 + paxChunks.length + 1;

  const headerBookingStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
    paddingBottom: 14,
    borderBottom: `1px solid ${P.borderStrong}`,
  };

  /** Slightly tighter header on passenger sheets to fit two traveler blocks */
  const headerPassengerStyle: React.CSSProperties = {
    ...headerBookingStyle,
    marginBottom: 16,
    paddingBottom: 10,
  };

  const factories: Array<() => React.ReactElement> = [];

  factories.push(() => {
    const pageIndex = 0;
    return (
      <>
        {/* Booking details */}
        <div style={headerBookingStyle}>
          <PdfBrandBlock form={form} />
          <div style={{ textAlign: "right" as const }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: P.ink,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
              }}
            >
              {form.page1Heading || "Flight Details"}
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 9,
                color: P.faint,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Page {pageIndex + 1} of {pageTotal}
            </div>
          </div>
        </div>

        <PdfFlightBlock
          title="Outbound Flight"
          f={form.outbound}
          formatDateDisp={formatDateDisp}
        />
        <PdfFlightBlock
          title="Return Flight"
          f={form.returnFlight}
          formatDateDisp={formatDateDisp}
        />

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
                  form.hotelAddress.replace(/\n/g, ", ") ||
                  "—"
                }
              />
              <PdfRow
                label="Phone"
                value={form.hotelPhone || "—"}
              />
              <PdfRow
                label="Check-in"
                value={
                  formatDateDisp(form.checkIn) || "—"
                }
              />
              <PdfRow
                label="Check-out"
                value={
                  formatDateDisp(form.checkOut) || "—"
                }
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

        {form.supplements.length > 0 && (
          <PdfBlock title="Supplements & Fees">
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: P.thead }}>
                  {(
                    hidePricing
                      ? ["Description", "Charge Type"]
                      : ["Description", "Amount", "Charge Type"]
                  ).map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "5px 10px",
                          textAlign: "left" as const,
                          fontSize: 7.5,
                          color: P.faint,
                          fontWeight: 600,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase" as const,
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {form.supplements.map((s) => (
                  <tr key={s.id}>
                    <td
                      style={{
                        padding: "5px 10px",
                        color: P.ink,
                        borderTop: `1px solid ${P.border}`,
                      }}
                    >
                      {s.desc}
                    </td>
                    {hidePricing ? null : (
                      <td
                        style={{
                          padding: "5px 10px",
                          color: P.ink,
                          fontFamily: "'DM Mono', monospace",
                          borderTop: `1px solid ${P.border}`,
                        }}
                      >
                        {s.amount}
                      </td>
                    )}
                    <td
                      style={{
                        padding: "5px 10px",
                        color: P.muted,
                        borderTop: `1px solid ${P.border}`,
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

        {form.cancellationRows.length > 0 && (
          <PdfBlock title="Cancellation Policy">
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: P.thead }}>
                  {["Period / Condition", "Charge"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "5px 10px",
                        textAlign: "left" as const,
                        fontSize: 7.5,
                        color: P.faint,
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase" as const,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.cancellationRows.map((c) => (
                  <tr key={c.id}>
                    <td
                      style={{
                        padding: "5px 10px",
                        color: P.ink,
                        borderTop: `1px solid ${P.border}`,
                      }}
                    >
                      {c.rule}
                    </td>
                    <td
                      style={{
                        padding: "5px 10px",
                        color: P.ink,
                        fontFamily: "'DM Mono', monospace",
                        borderTop: `1px solid ${P.border}`,
                      }}
                    >
                      {hidePricing ? "—" : c.charge}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PdfBlock>
        )}

        {form.ratesConditions ? (
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 7.5,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase" as const,
                color: P.faint,
                marginBottom: 6,
              }}
            >
              Rates & Conditions
            </div>
            <p
              style={{
                fontSize: 8.5,
                color: P.muted,
                lineHeight: 1.75,
                maxWidth: "95%",
              }}
            >
              {form.ratesConditions}
            </p>
          </div>
        ) : null}
      </>
    );
  });

  for (let c = 0; c < paxChunks.length; c++) {
    const chunk = paxChunks[c];
    const pageIndex = 1 + c;
    factories.push(() => {
      return (
        <>
          <div style={headerPassengerStyle}>
            <PdfBrandBlock form={form} />
            <div style={{ textAlign: "right" as const }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: P.ink,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                }}
              >
                Passengers
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 9,
                  color: P.faint,
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                Page {pageIndex + 1} of {pageTotal}
              </div>
            </div>
          </div>

          {chunk.map((pas, idxWithin) => (
            <PdfBlock
              compact
              key={pas.id}
              title={
                form.passengers.length > 1
                  ? `Traveler ${c * PASSENGERS_PER_PAGE + idxWithin + 1}`
                  : "Passenger Information"
              }
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <tbody>
                  <PdfRow
                    compact
                    label="Full name"
                    value={
                      passengerDisplayLine(pas) || "—"
                    }
                  />
                  <PdfRow
                    compact
                    label="Passenger type"
                    value={
                      pas.passengerType.trim() || "—"
                    }
                  />
                  <PdfRow
                    compact
                    label="Date of birth"
                    value={
                      formatDateDisp(pas.birthdate) || "—"
                    }
                  />
                  <PdfRow
                    compact
                    label="Nationality"
                    value={
                      pas.nationality.trim() || "—"
                    }
                  />
                  <PdfRow
                    compact
                    label="Passport no."
                    value={
                      pas.passportNo.trim() || "—"
                    }
                  />
                  <PdfRow
                    compact
                    label="Passport expiry"
                    value={
                      formatDateDisp(pas.passportExpiry) ||
                      "—"
                    }
                  />
                  <PdfRow
                    compact
                    label="Issuing country"
                    value={
                      pas.issuingCountry.trim() || "—"
                    }
                  />
                  <PdfRow
                    compact
                    label="Date issued"
                    value={
                      formatDateDisp(pas.dateIssued) || "—"
                    }
                  />
                </tbody>
              </table>
            </PdfBlock>
          ))}
        </>
      );
    });
  }

  factories.push(() => {
    const pageIndex = 1 + paxChunks.length;
    const headerPaymentStyle: React.CSSProperties = {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 22,
      paddingBottom: 14,
      borderBottom: `1px solid ${P.borderStrong}`,
    };

    return (
      <>
        <div style={headerPaymentStyle}>
          <PdfBrandBlock form={form} />
          <div
            style={{
              textAlign: "right" as const,
              fontSize: 8.5,
              color: P.muted,
              lineHeight: 1.8,
            }}
          >
            <div
              style={{
                fontWeight: 600,
                color: P.ink,
                marginBottom: 1,
              }}
            >
              {form.contactName || "—"}
            </div>
            <div>{form.contactPhone || "—"}</div>
            <div>{form.contactEmail || "—"}</div>
            <div
              style={{
                marginTop: 8,
                fontSize: 9,
                color: P.faint,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Page {pageIndex + 1} of {pageTotal}
            </div>
          </div>
        </div>

        {hidePricing ? (
          <PdfBlock title="Fare & rates">
            <p
              style={{
                margin: 0,
                padding: "10px 12px",
                fontSize: 9,
                color: P.muted,
                lineHeight: 1.75,
              }}
            >
              Itemized pricing has been omitted on this itinerary PDF. Contact{" "}
              <span style={{ color: P.ink, fontWeight: 600 }}>
                {form.contactEmail?.trim() ||
                  form.contactPhone?.trim() ||
                  form.contactName?.trim() ||
                  "your travel consultant"}
              </span>{" "}
              for a full quotation.
            </p>
          </PdfBlock>
        ) : (
          <>
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
                        value={`PHP ${money.adultBaseFareFmt}`}
                      />
                      <PdfRow
                        label="Other charges"
                        value={`PHP ${money.adultOtherChargesFmt}`}
                      />
                      <tr>
                        <td
                          style={{
                            padding: "6px 10px",
                            color: P.muted,
                            fontSize: 8.5,
                            borderTop: `1px solid ${P.borderStrong}`,
                            fontWeight: 600,
                          }}
                        >
                          Total adult fare
                        </td>
                        <td
                          style={{
                            padding: "6px 10px",
                            color: P.ink,
                            fontFamily: "'DM Mono', monospace",
                            fontWeight: 700,
                            borderTop: `1px solid ${P.borderStrong}`,
                          }}
                        >
                          PHP {money.adultTotalFareFmt}
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
                        value={`PHP ${money.roomRateFmt}`}
                      />
                      <PdfRow
                        label="Taxes & fees"
                        value={`PHP ${money.roomTaxesFmt}`}
                      />
                      <tr>
                        <td
                          style={{
                            padding: "6px 10px",
                            color: P.muted,
                            fontSize: 8.5,
                            borderTop: `1px solid ${P.borderStrong}`,
                            fontWeight: 600,
                          }}
                        >
                          Total room rate
                        </td>
                        <td
                          style={{
                            padding: "6px 10px",
                            color: P.ink,
                            fontFamily: "'DM Mono', monospace",
                            fontWeight: 700,
                            borderTop: `1px solid ${P.borderStrong}`,
                          }}
                        >
                          PHP {money.totalRoomRateFmt}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </PdfBlock>
              </div>
            </div>

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
                        color: P.muted,
                        fontSize: 9,
                        borderBottom: `1px solid ${P.border}`,
                      }}
                    >
                      Original total
                    </td>
                    <td
                      style={{
                        padding: "6px 10px",
                        color: P.muted,
                        fontFamily: "'DM Mono', monospace",
                        textAlign: "right" as const,
                        textDecoration: "line-through",
                        borderBottom: `1px solid ${P.border}`,
                      }}
                    >
                      PHP {money.originalTotalFmt}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: "6px 10px",
                        color: P.savings,
                        fontSize: 9,
                        borderBottom: `1px solid ${P.border}`,
                      }}
                    >
                      Bundle savings
                    </td>
                    <td
                      style={{
                        padding: "6px 10px",
                        color: P.savings,
                        fontFamily: "'DM Mono', monospace",
                        textAlign: "right" as const,
                        fontWeight: 600,
                        borderBottom: `1px solid ${P.border}`,
                      }}
                    >
                      − PHP {money.savingsFmt}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: "10px 10px",
                        color: P.ink,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Total due
                    </td>
                    <td
                      style={{
                        padding: "10px 10px",
                        color: P.ink,
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 15,
                        fontWeight: 700,
                        textAlign: "right" as const,
                      }}
                    >
                      PHP {money.totalDueFmt}
                    </td>
                  </tr>
                </tbody>
              </table>
            </PdfBlock>
          </>
        )}

        <div
          style={{
            position: "absolute",
            bottom: 34,
            left: 40,
            right: 40,
          }}
        >
          {form.agencyFooter ? (
            <p
              style={{
                fontSize: 7.5,
                color: P.faint,
                lineHeight: 1.9,
                marginBottom: 14,
                borderTop: `1px solid ${P.border}`,
                paddingTop: 12,
              }}
            >
              {form.agencyFooter}
            </p>
          ) : null}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div style={{ fontSize: 7.5, color: P.faint }}>
              <p style={{ marginBottom: 18 }}>
                I hereby certify that the information above is
                correct and accurate.
              </p>
              <div
                style={{
                  borderTop: `1px solid ${P.borderStrong}`,
                  paddingTop: 4,
                  width: 210,
                }}
              >
                Signature over printed name
              </div>
            </div>
            <div style={{ fontSize: 7.5, color: P.faint }}>
              <div style={{ marginBottom: 18, opacity: 0 }}>
                _
              </div>
              <div
                style={{
                  borderTop: `1px solid ${P.borderStrong}`,
                  paddingTop: 4,
                  width: 140,
                }}
              >
                Date
              </div>
            </div>
          </div>
        </div>
      </>
    );
  });

  return factories;
}

export function ItineraryPdfPageShell({
  children,
  exportMarker,
}: {
  children: React.ReactNode;
  /** Raster export targets elements with this marker (no zoom transform). */
  exportMarker?: boolean;
}) {
  return (
    <div
      data-itinerary-export-page={exportMarker ? "" : undefined}
      style={pageFrame}
    >
      {children}
    </div>
  );
}
