import React, { useMemo } from "react";
import { PDF_PAGE_H, PDF_PAGE_W } from "./itineraryPdfPages";
import type { AccountingLine, AccountingSnapshot } from "./accountingTypes";
import { formatMoneyPhp, parseMoneyPhp } from "../lib/itineraryMoney";

const P = {
  pageBg: "#ffffff",
  ink: "#1c1917",
  muted: "#57534e",
  faint: "#78716c",
  border: "#e7e5e4",
  borderStrong: "#d6d3d1",
  thead: "#f5f5f4",
  rose: "#9f1239",
  emerald: "#047857",
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

/** Usable vertical space inside padded page (~770px). */
const PAGE_BODY_H = PDF_PAGE_H - 72;

type PdfUnit =
  | { kind: "banner"; title: string; dateLine: string }
  | { kind: "continuation" }
  | { kind: "client"; snapshot: AccountingSnapshot }
  | { kind: "snapshotTotals"; payable: number; receivable: number; net: number }
  | { kind: "sectionHead"; label: string; tint: "rose" | "emerald" }
  | { kind: "ledgerRow"; label: AccountingLine };

const H: Record<PdfUnit["kind"], number> = {
  banner: 42,
  continuation: 26,
  client: 128,
  snapshotTotals: 86,
  sectionHead: 30,
  ledgerRow: 22,
};

function computeTotals(snapshot: AccountingSnapshot) {
  let payableSum = 0;
  let receivableSum = 0;
  for (const row of snapshot.payables) {
    payableSum += Math.abs(parseMoneyPhp(row.amount));
  }
  for (const row of snapshot.receivables) {
    receivableSum += Math.abs(parseMoneyPhp(row.amount));
  }
  return {
    payableSum,
    receivableSum,
    net: receivableSum - payableSum,
  };
}

function nonEmptyLedgerRows(rows: AccountingLine[]) {
  return rows.filter((r) => {
    const s = `${r.description}\t${r.counterparty}\t${r.amount}`.trim();
    return s.length > 0;
  });
}

function buildPdfUnits(
  snapshot: AccountingSnapshot,
  totals: ReturnType<typeof computeTotals>,
  dateLine: string,
  bannerTitle: string,
): PdfUnit[] {
  const payRows = nonEmptyLedgerRows(snapshot.payables);
  const recRows = nonEmptyLedgerRows(snapshot.receivables);

  const out: PdfUnit[] = [
    { kind: "banner", title: bannerTitle, dateLine },
    { kind: "client", snapshot },
    {
      kind: "snapshotTotals",
      payable: totals.payableSum,
      receivable: totals.receivableSum,
      net: totals.net,
    },
  ];

  if (payRows.length === 0) {
    out.push({
      kind: "sectionHead",
      label: "Payables — no lines",
      tint: "rose",
    });
  } else {
    out.push({
      kind: "sectionHead",
      label: "Payables",
      tint: "rose",
    });
    for (const row of payRows) out.push({ kind: "ledgerRow", label: row });
  }

  if (recRows.length === 0) {
    out.push({
      kind: "sectionHead",
      label: "Receivables — no lines",
      tint: "emerald",
    });
  } else {
    out.push({
      kind: "sectionHead",
      label: "Receivables",
      tint: "emerald",
    });
    for (const row of recRows) out.push({ kind: "ledgerRow", label: row });
  }

  return out;
}

/** Greedy pagination; continuation markers on pages after the first. */
function packUnitsIntoPages(units: PdfUnit[]): PdfUnit[][] {
  const pagesOut: PdfUnit[][] = [];
  let bucket: PdfUnit[] = [];
  let usedPx = 0;

  const flush = () => {
    if (!bucket.length) return;
    pagesOut.push(bucket);
    bucket = [];
    usedPx = 0;
  };

  const openFreshBucket = () => {
    if (!pagesOut.length) return;
    bucket.push({ kind: "continuation" });
    usedPx = H.continuation;
  };

  for (const u of units) {
    let placed = false;
    while (!placed) {
      if (!bucket.length && pagesOut.length) openFreshBucket();

      const hu = H[u.kind];
      if (usedPx + hu <= PAGE_BODY_H) {
        bucket.push(u);
        usedPx += hu;
        placed = true;
        continue;
      }

      /** Full page → break; lone continuation header is dropped via flush emptiness */
      if (bucket.length > 0) {
        flush();
        continue;
      }

      bucket.push(u);
      usedPx += hu;
      placed = true;
    }
  }

  flush();
  return pagesOut.length ? pagesOut : [[]];
}

function LedgerRowPdf({ row }: { row: AccountingLine }) {
  const amtRaw = parseMoneyPhp(row.amount);
  const amt = formatMoneyPhp(Math.abs(amtRaw));
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 104px",
        gap: "6px",
        alignItems: "stretch",
        fontSize: 8.55,
        lineHeight: 1.35,
        borderBottom: `1px solid ${P.border}`,
        paddingBottom: "3px",
        marginBottom: "3px",
        minHeight: 14,
      }}
    >
      <div style={{ color: P.ink }}>
        {(row.description || "—").trim() || "—"}
      </div>
      <div style={{ color: P.muted }}>{row.counterparty.trim() || "—"}</div>
      <div
        style={{
          fontFamily:
            "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 8.45,
          textAlign: "right",
          whiteSpace: "nowrap",
          color: P.ink,
        }}
      >
        PHP{" "}
        {amtRaw < 0 ? `(${amt})` : amt}
      </div>
    </div>
  );
}

function PdfUnitRenderer({ unit }: { unit: PdfUnit }) {
  switch (unit.kind) {
    case "banner":
      return (
        <header style={{ marginBottom: 14, borderBottom: `1px solid ${P.border}` }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: P.ink,
            }}
          >
            {unit.title}
          </div>
          <div style={{ marginTop: 4, fontSize: 9, color: P.muted }}>
            Generated {unit.dateLine}
          </div>
        </header>
      );
    case "continuation":
      return (
        <div
          style={{
            marginBottom: 10,
            fontSize: 9.5,
            fontWeight: 600,
            color: P.faint,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Accounting summary — continued
        </div>
      );
    case "client": {
      const c = unit.snapshot;
      const cellLabel: React.CSSProperties = {
        fontSize: 7,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: P.faint,
        marginBottom: 2,
      };
      const notes = (c.clientNotes || "").trim();
      const notesShort =
        notes.length > 560 ? `${notes.slice(0, 557)}\u2026` : notes;
      return (
        <section style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              marginBottom: 10,
              color: P.ink,
            }}
          >
            Client
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              columnGap: 16,
              rowGap: 8,
              fontSize: 8.85,
              lineHeight: 1.4,
              border: `1px solid ${P.border}`,
              padding: "10px 12px",
              borderRadius: "6px",
              backgroundColor: "#fafafa",
            }}
          >
            <div>
              <div style={cellLabel}>Name</div>
              <div>{c.clientName.trim() || "—"}</div>
            </div>
            <div>
              <div style={cellLabel}>Company</div>
              <div>{c.clientCompany.trim() || "—"}</div>
            </div>
            <div>
              <div style={cellLabel}>Email</div>
              <div>{c.clientEmail.trim() || "—"}</div>
            </div>
            <div>
              <div style={cellLabel}>Phone</div>
              <div>{c.clientPhone.trim() || "—"}</div>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={cellLabel}>Notes</div>
              <div style={{ color: P.muted, whiteSpace: "pre-wrap" }}>
                {notesShort || "—"}
              </div>
            </div>
          </div>
        </section>
      );
    }
    case "snapshotTotals":
      return (
        <section style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              marginBottom: 8,
              color: P.ink,
            }}
          >
            Snapshot
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
            }}
          >
            {([
              ["Total payables", unit.payable, P.rose],
              ["Total receivables", unit.receivable, P.emerald],
            ] as const).map(([label, val, col]) => (
              <div
                key={label}
                style={{
                  border: `1px solid ${P.border}`,
                  borderRadius: "6px",
                  padding: "8px 10px",
                  backgroundColor: "#fff",
                }}
              >
                <div
                  style={{
                    fontSize: 7,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: P.faint,
                    marginBottom: 4,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontFamily:
                      "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 13,
                    fontWeight: 700,
                    color: col,
                  }}
                >
                  PHP {formatMoneyPhp(val)}
                </div>
              </div>
            ))}
            <div
              style={{
                border: `1px solid ${P.borderStrong}`,
                borderRadius: "6px",
                padding: "8px 10px",
                backgroundColor: "#f0fdf4",
              }}
            >
              <div
                style={{
                  fontSize: 7,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: P.faint,
                  marginBottom: 4,
                }}
              >
                Net income
              </div>
              <div
                style={{
                  fontFamily:
                    "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 14,
                  fontWeight: 800,
                  color: unit.net >= 0 ? P.emerald : "#b91c1c",
                }}
              >
                PHP {formatMoneyPhp(unit.net)}
              </div>
              <div style={{ marginTop: 4, fontSize: 7, color: P.muted }}>
                Receivables − Payables
              </div>
            </div>
          </div>
        </section>
      );
    case "sectionHead": {
      const bg = unit.tint === "rose" ? "#fff1f2" : "#ecfdf5";
      const fg = unit.tint === "rose" ? P.rose : P.emerald;
      return (
        <div
          style={{
            marginTop: 4,
            marginBottom: 6,
            padding: "6px 10px",
            borderRadius: "6px",
            backgroundColor: bg,
            border: `1px solid ${P.border}`,
            fontSize: 10,
            fontWeight: 700,
            color: fg,
          }}
        >
          {unit.label}
        </div>
      );
    }
    case "ledgerRow":
      return <LedgerRowPdf row={unit.label} />;
    default:
      return null;
  }
}

/** Mount off-screen beside the main layout; queried by exportAccountingPdfToFile. */
export function AccountingPdfExportSurface({
  snapshot,
}: {
  snapshot: AccountingSnapshot;
}) {
  const dateLine = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date()),
    [],
  );

  const pages = useMemo(() => {
    const totals = computeTotals(snapshot);
    const clientSlug = snapshot.clientName.trim();
    const bannerTitle = clientSlug
      ? `Accounting — ${clientSlug}`
      : "Accounting summary";

    let packed = packUnitsIntoPages(
      buildPdfUnits(snapshot, totals, dateLine, bannerTitle),
    );
    packed = packed.filter((pg) => pg.length > 0);
    if (!packed.length) {
      packed = [
        [{ kind: "banner", title: bannerTitle, dateLine }],
      ];
    }
    return packed;
  }, [snapshot, dateLine]);

  return (
    <div
      className="fixed left-[-12000px] top-0 flex flex-col gap-6 w-[595px]"
      aria-hidden
      style={{ zIndex: -10, opacity: 1 }}
    >
      {pages.map((pg, pageIdx) => (
        <div
          key={pageIdx}
          data-accounting-export-page=""
          style={pageFrame}
        >
          {pg.map((u, i) => (
            <PdfUnitRenderer key={`${pageIdx}-${i}-${u.kind}`} unit={u} />
          ))}
        </div>
      ))}
    </div>
  );
}
