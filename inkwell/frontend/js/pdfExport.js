// ============================
// INKWELL PRO — PDF EXPORT
// ============================

export async function downloadBookAsPDF(book, t) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // 1. Couverture avant
  if (book.coverImage) {
    doc.addImage(book.coverImage, 'PNG', 0, 0, pageWidth, pageHeight);
    doc.addPage();
  }

  // 2. Page de titre
  doc.setFontSize(32); doc.setFont("helvetica", "bold");
  doc.text(book.title, pageWidth / 2, pageHeight / 3, { align: "center" });
  if (book.author) {
    doc.setFontSize(18); doc.setFont("helvetica", "normal");
    doc.text(book.author, pageWidth / 2, pageHeight / 3 + 12, { align: "center" });
  }
  doc.setFontSize(14); doc.setFont("helvetica", "italic");
  doc.text(`${book.genre}${book.genre2 ? ' / ' + book.genre2 : ''}`, pageWidth / 2, pageHeight / 3 + 25, { align: "center" });
  doc.setFontSize(12); doc.setFont("helvetica", "normal");
  doc.text(new Date(book.createdAt).toLocaleDateString(), pageWidth / 2, pageHeight / 3 + 40, { align: "center" });
  doc.addPage();

  // 3. Sommaire (page réservée)
  const tocPageIndex = doc.getNumberOfPages();
  doc.setFontSize(24); doc.setFont("helvetica", "bold");
  doc.text(t('toc'), margin, 30);

  // 4. Chapitres
  const chapterLog = [];
  let currentLogicalPage = 0;
  let physicalFirstChapterPage = 0;

  book.chapters.forEach((ch, idx) => {
    doc.addPage();
    const currentPhysical = doc.getNumberOfPages();
    if (idx === 0) physicalFirstChapterPage = currentPhysical;
    currentLogicalPage++;
    chapterLog.push({ title: ch.title, logicalPage: currentLogicalPage });

    let y = 40;
    doc.setFontSize(22); doc.setFont("helvetica", "bold");
    doc.text(ch.title, pageWidth / 2, y, { align: "center" });
    y += 20;
    doc.setFontSize(12); doc.setFont("helvetica", "normal");

    const paragraphs = ch.content.split('\n');
    paragraphs.forEach(para => {
      if (!para.trim()) { y += 5; return; }
      const splitText = doc.splitTextToSize(para, contentWidth);
      splitText.forEach((line, lineIdx) => {
        if (y > pageHeight - 30) { doc.addPage(); currentLogicalPage++; y = 30; }
        const isLast = lineIdx === splitText.length - 1;
        doc.text(line, margin, y, { align: isLast ? 'left' : 'justify', maxWidth: contentWidth });
        y += 7;
      });
      y += 5;
    });
  });

  // 5. Couverture arrière
  if (book.backCoverImage) {
    doc.addPage();
    doc.addImage(book.backCoverImage, 'PNG', 0, 0, pageWidth, pageHeight);
  }

  // 6. Remplir sommaire
  doc.setPage(tocPageIndex);
  doc.setFontSize(12); doc.setFont("helvetica", "normal");
  let tocY = 45;
  chapterLog.forEach(cp => {
    doc.text(cp.title, margin, tocY);
    doc.text(String(cp.logicalPage), pageWidth - margin, tocY, { align: "right" });
    const titleW = doc.getTextWidth(cp.title);
    const pageW = doc.getTextWidth(String(cp.logicalPage));
    const dotsW = contentWidth - titleW - pageW - 10;
    if (dotsW > 0) {
      let dots = "";
      while (doc.getTextWidth(dots + ".") < dotsW) dots += ".";
      doc.text(dots, margin + titleW + 5, tocY);
    }
    tocY += 8;
  });

  // 7. Numéros de page
  const totalPhysical = doc.getNumberOfPages();
  let logicalCounter = 1;
  for (let i = physicalFirstChapterPage; i <= totalPhysical; i++) {
    if (book.backCoverImage && i === totalPhysical) continue;
    doc.setPage(i);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`${t('page')} ${logicalCounter}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    logicalCounter++;
  }

  doc.save(`${book.title}.pdf`);
}
