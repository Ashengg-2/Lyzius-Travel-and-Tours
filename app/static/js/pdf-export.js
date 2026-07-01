/** Rasterize marked PDF pages to A4 JPEG via html2canvas + jsPDF */
window.LyziusPdfExport = {
  async exportPages(selector, filenameBase) {
    const nodes = Array.from(document.querySelectorAll(selector));
    if (!nodes.length) throw new Error('No PDF pages found to export.');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const pageWmm = 210;
    const pageHmm = 297;
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWmm, pageHmm, undefined, 'FAST');
    }
    const safe = (filenameBase || 'document').replace(/[^\w\-]+/g, '_').slice(0, 80);
    pdf.save(`${safe || 'document'}.pdf`);
  },
};
