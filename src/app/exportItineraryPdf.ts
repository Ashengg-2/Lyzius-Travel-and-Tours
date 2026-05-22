import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Rasterize each `[data-itinerary-export-page]` node into sequential A4 pages.
 * Expects nodes to be ~595×842 CSS px (aligned with jsPDF mm layout).
 */
export async function exportItineraryPdfToFile(filenameBase: string) {
  const nodes = Array.from(
    document.querySelectorAll("[data-itinerary-export-page]"),
  ) as HTMLElement[];
  if (nodes.length === 0) {
    throw new Error("No PDF pages found to export.");
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWmm = 210;
  const pageHmm = 297;

  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, 0, pageWmm, pageHmm, undefined, "FAST");
  }

  const safe = filenameBase.replace(/[^\w\-]+/g, "_").slice(0, 80);
  pdf.save(`${safe || "itinerary"}.pdf`);
}
