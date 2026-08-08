import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

// Hex to RGB helper
function hex2rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

function safeText(s: string): string {
  return (s || '').replace(/[^\x20-\x7E]/g, '');
}

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async generatePdfReport(projectId: string): Promise<Buffer> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        versions: {
          orderBy: { version_number: 'desc' },
          include: {
            comments: {
              include: { replies: true },
              orderBy: { timestamp_seconds: 'asc' },
            },
          },
        },
      },
    });

    if (!project) throw new NotFoundException('Project tidak ditemukan');

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 0, size: 'A4' });
        const buffers: Buffer[] = [];
        doc.on('data', (b: Buffer) => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const W = 595.28;
        const H = 841.89;
        const PAD = 40;
        const CONTENT_W = W - PAD * 2;

        // ── COLORS ─────────────────────────────────────────────────────────
        const BG_DARK   = '#07090e';
        const PANEL     = '#111827';
        const CYAN      = '#00f0c9';
        const AMBER     = '#f59e0b';
        const RED       = '#ef4444';
        const TEXT_PRI  = '#ffffff';
        const TEXT_SEC  = '#94a3b8';
        const BORDER    = '#1e293b';

        // Background fill for first page
        doc.rect(0, 0, W, H).fill(BG_DARK);

        // ── HEADER SECTION ─────────────────────────────────────────────────
        // Dark header band
        doc.rect(0, 0, W, 130).fill('#0f172a');

        // Cyan accent bar top
        doc.rect(0, 0, W, 5).fill(CYAN);

        // App Brand & Subtitle
        doc.fontSize(18).font('Helvetica-Bold').fillColor(CYAN)
           .text('REVIEWII', PAD, 20, { width: 200 });

        doc.fontSize(8).font('Helvetica-Bold').fillColor(TEXT_SEC)
           .text('LAPORAN RESMI REVISI PROJECT', PAD, 38, { width: 300 });

        // Date right aligned
        doc.fontSize(8.5).font('Helvetica').fillColor(TEXT_SEC)
           .text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, W - PAD - 150, 24, { width: 150, align: 'right' });

        // Project Title
        doc.fontSize(15).font('Helvetica-Bold').fillColor(TEXT_PRI)
           .text(safeText(project.title), PAD, 56, { width: CONTENT_W - 110 });

        // Status Badge
        const statusLabel = project.status === 'approved' ? 'APPROVED'
          : project.status === 'revisi' ? 'PERLU REVISI' : 'PENDING REVIEW';
        const statusColor = project.status === 'approved' ? CYAN
          : project.status === 'revisi' ? RED : AMBER;

        const badgeW = 95;
        const badgeH = 22;
        const badgeX = W - PAD - badgeW;
        const badgeY = 54;
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 6).fill(statusColor);
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff')
           .text(statusLabel, badgeX, badgeY + 6, { width: badgeW, align: 'center' });

        // Metadata Subheader Row
        doc.fontSize(8.5).font('Helvetica').fillColor(TEXT_SEC)
           .text(
             `Klien: ${safeText(project.client_name)}    |    Kontak: ${safeText(project.client_contact || '-')}    |    No. Editor: ${safeText(project.editor_phone || '087824006766')}`,
             PAD, 92, { width: CONTENT_W }
           );

        // Cyan Bottom Divider line
        doc.rect(PAD, 118, CONTENT_W, 1.5).fill(CYAN);

        // ── BODY STARTS ───────────────────────────────────────────────────
        let y = 138;

        const allComments: any[] = [];
        for (const ver of project.versions) {
          for (const c of ver.comments || []) {
            allComments.push({ ...c, version_number: ver.version_number, file_type: ver.file_type });
          }
        }

        // Summary stats row
        const approved_count = allComments.filter(c => c.replies?.length > 0).length;
        const stats = [
          { label: 'Total Catatan', val: String(allComments.length), color: CYAN },
          { label: 'Ditanggapi', val: String(approved_count), color: '#10b981' },
          { label: 'Belum Ditanggapi', val: String(allComments.length - approved_count), color: AMBER },
          { label: 'Versi', val: String(project.versions.length), color: '#8a77ff' },
        ];

        const statW = CONTENT_W / stats.length - 4;
        stats.forEach((st, i) => {
          const sx = PAD + i * (statW + 5.3);
          doc.roundedRect(sx, y, statW, 44, 6).fill(PANEL);
          doc.rect(sx, y, statW, 3).fill(st.color);
          doc.fontSize(18).font('Helvetica-Bold').fillColor(st.color).text(st.val, sx, y + 9, { width: statW, align: 'center' });
          doc.fontSize(7.5).font('Helvetica').fillColor(TEXT_SEC).text(st.label, sx, y + 30, { width: statW, align: 'center' });
        });
        y += 60;

        // ── REVISION NOTES LIST ──────────────────────────────────────────
        if (allComments.length === 0) {
          doc.roundedRect(PAD, y, CONTENT_W, 50, 8).fill(PANEL);
          doc.fontSize(10).font('Helvetica').fillColor(TEXT_SEC)
             .text('Belum ada catatan revisi pada project ini.', PAD, y + 18, { width: CONTENT_W, align: 'center' });
          y += 58;
        } else {
          doc.fontSize(10).font('Helvetica-Bold').fillColor(TEXT_PRI).text('DAFTAR CATATAN REVISI', PAD, y);
          doc.rect(PAD, y + 14, CONTENT_W, 1).fill(BORDER);
          y += 22;

          allComments.forEach((c, idx) => {
            const rowH = 46 + (c.content ? 14 : 0) + (c.replies?.length ? c.replies.length * 14 : 0);

            // Page break guard
            if (y + rowH > H - 60) {
              doc.addPage();
              doc.rect(0, 0, W, H).fill(BG_DARK);
              y = PAD;
            }

            // Row card
            doc.roundedRect(PAD, y, CONTENT_W, rowH, 6).fill(PANEL);
            // Left accent strip (color by status)
            const stripColor = c.replies?.length > 0 ? CYAN : RED;
            doc.rect(PAD, y, 3, rowH).fill(stripColor);

            // Index & timestamp badge
            doc.fontSize(8).font('Helvetica-Bold').fillColor(TEXT_SEC)
               .text(`#${idx + 1}`, PAD + 10, y + 8);

            const tsLabel = `${fmtTime(c.timestamp_seconds)}${c.timestamp_end_seconds ? ` - ${fmtTime(c.timestamp_end_seconds)}` : ''}`;
            const tsBadgeW = tsLabel.length * 5.5 + 10;
            doc.roundedRect(PAD + 26, y + 6, tsBadgeW, 14, 4).fill(`${CYAN}28`);
            doc.fontSize(8).font('Helvetica-Bold').fillColor(CYAN)
               .text(tsLabel, PAD + 26, y + 10, { width: tsBadgeW, align: 'center' });

            // Category tag
            if (c.category) {
              const catX = PAD + 26 + tsBadgeW + 6;
              const catW = c.category.length * 5 + 10;
              doc.roundedRect(catX, y + 6, catW, 14, 4).fill(`${AMBER}28`);
              doc.fontSize(7.5).font('Helvetica-Bold').fillColor(AMBER)
                 .text(safeText(c.category), catX, y + 10, { width: catW, align: 'center' });
            }

            // Author & type
            doc.fontSize(7.5).font('Helvetica').fillColor(TEXT_SEC)
               .text(`${safeText(c.author_name)} | ${c.comment_type}`, W - PAD - 100, y + 10, { width: 90, align: 'right' });

            let rowY = y + 26;

            // Content
            if (c.content) {
              doc.fontSize(9).font('Helvetica').fillColor(TEXT_PRI)
                 .text(`"${safeText(c.content)}"`, PAD + 12, rowY, { width: CONTENT_W - 24, lineGap: 2 });
              rowY += 16;
            }

            // Attachments tag
            if (c.attachment_url) {
              const atts = c.attachment_url.split(',').filter(Boolean);
              if (atts.length > 0) {
                doc.fontSize(7.5).font('Helvetica').fillColor(CYAN)
                   .text(`  Lampiran (${atts.length} file)`, PAD + 12, rowY);
                rowY += 13;
              }
            }

            // Replies
            if (c.replies?.length > 0) {
              c.replies.forEach((r: any) => {
                doc.fontSize(8).font('Helvetica').fillColor(CYAN)
                   .text(`  Editor: `, PAD + 16, rowY, { continued: true });
                doc.fillColor(TEXT_SEC).text(safeText(r.content), { continued: false });
                rowY += 13;
              });
            }

            y += rowH + 6;
          });
        }

        // ── FOOTER ─────────────────────────────────────────────────────────
        const footerY = H - 36;
        doc.rect(0, footerY - 5, W, 41).fill(BG_DARK);
        doc.rect(0, footerY - 5, W, 1).fill(BORDER);
        doc.fontSize(7.5).font('Helvetica').fillColor(TEXT_SEC)
           .text(
             `Reviewii Platform  |  Vibe Coded By Abaalwi  |  Dicetak: ${new Date().toLocaleString('id-ID')}`,
             PAD, footerY + 2, { width: CONTENT_W, align: 'center' }
           );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
