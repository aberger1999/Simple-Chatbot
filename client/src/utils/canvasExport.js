import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

function getViewportElement() {
  return document.querySelector('.react-flow__viewport');
}

function filterNode(node) {
  // Exclude minimap, controls, and attribution from export
  const exclude = ['react-flow__minimap', 'react-flow__controls', 'react-flow__attribution'];
  return !exclude.some((cls) => node.classList?.contains(cls));
}

/**
 * Export the canvas as a PNG image at 2x resolution.
 */
export async function exportAsPng(boardName) {
  const el = getViewportElement();
  if (!el) return;

  const dataUrl = await toPng(el, {
    pixelRatio: 2,
    filter: filterNode,
  });

  const link = document.createElement('a');
  link.download = `${boardName || 'canvas'}.png`;
  link.href = dataUrl;
  link.click();
}

/**
 * Export the canvas as a PDF with auto-detected orientation.
 */
export async function exportAsPdf(boardName) {
  const el = getViewportElement();
  if (!el) return;

  const dataUrl = await toPng(el, {
    pixelRatio: 2,
    filter: filterNode,
  });

  // Load image to get dimensions
  const img = new Image();
  img.src = dataUrl;
  await new Promise((resolve) => { img.onload = resolve; });

  const orientation = img.width > img.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'px', format: [img.width, img.height] });
  pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
  pdf.save(`${boardName || 'canvas'}.pdf`);
}
