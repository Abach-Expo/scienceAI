import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { prisma } from '../index';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

router.use(authMiddleware);

// Export document as PDF
router.post(
  '/pdf',
  [
    body('documentId').notEmpty()
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { documentId, includeMetadata } = req.body;

      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          userId: req.userId
        },
        include: {
          project: true
        }
      });

      if (!document) {
        res.status(404).json({
          success: false,
          message: 'Document not found'
        });
        return;
      }

      // Create PDF
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

      const fontSize = 12;
      const titleFontSize = 18;
      const lineHeight = fontSize * 1.5;
      const margin = 72; // 1 inch
      const pageWidth = 612; // Letter size
      const pageHeight = 792;
      const maxWidth = pageWidth - 2 * margin;

      // Split content into lines
      const content = document.content;
      const words = content.split(/\s+/);
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = timesRomanFont.widthOfTextAtSize(testLine, fontSize);
        
        if (textWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);

      // Create pages
      let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      let yPosition = pageHeight - margin;

      // Add title
      currentPage.drawText(document.title, {
        x: margin,
        y: yPosition,
        size: titleFontSize,
        font: timesRomanBoldFont,
        color: rgb(0, 0, 0)
      });
      yPosition -= titleFontSize * 2;

      // Add metadata if requested
      if (includeMetadata) {
        const metaText = `Project: ${document.project.title} | Version: ${document.version} | Created: ${document.createdAt.toLocaleDateString()}`;
        currentPage.drawText(metaText, {
          x: margin,
          y: yPosition,
          size: 10,
          font: timesRomanFont,
          color: rgb(0.5, 0.5, 0.5)
        });
        yPosition -= 30;
      }

      // Add content
      for (const line of lines) {
        if (yPosition < margin + lineHeight) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          yPosition = pageHeight - margin;
        }

        currentPage.drawText(line, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: timesRomanFont,
          color: rgb(0, 0, 0)
        });
        yPosition -= lineHeight;
      }

      // Generate PDF bytes
      const pdfBytes = await pdfDoc.save();

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${document.title.replace(/[^a-z0-9]/gi, '_')}.pdf"`);
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      logger.error('PDF export error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export PDF'
      });
    }
  }
);

// Export document as DOCX
router.post(
  '/docx',
  [
    body('documentId').notEmpty()
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { documentId, includeMetadata } = req.body;

      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          userId: req.userId
        },
        include: {
          project: true
        }
      });

      if (!document) {
        res.status(404).json({
          success: false,
          message: 'Document not found'
        });
        return;
      }

      // Parse content into paragraphs
      const contentParagraphs = document.content.split(/\n\n+/);
      
      const docChildren: Paragraph[] = [
        // Title
        new Paragraph({
          children: [
            new TextRun({
              text: document.title,
              bold: true,
              size: 36
            })
          ],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      ];

      // Add metadata if requested
      if (includeMetadata) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Project: ${document.project.title}`,
                italics: true,
                size: 20,
                color: '666666'
              })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Version: ${document.version} | Created: ${document.createdAt.toLocaleDateString()}`,
                italics: true,
                size: 20,
                color: '666666'
              })
            ],
            spacing: { after: 400 }
          })
        );
      }

      // Add content paragraphs
      for (const para of contentParagraphs) {
        const trimmedPara = para.trim();
        if (!trimmedPara) continue;

        // Check if it's a heading (starts with # or is all caps and short)
        const isHeading = trimmedPara.startsWith('#') || 
          (trimmedPara.length < 100 && trimmedPara === trimmedPara.toUpperCase());

        if (isHeading) {
          const headingText = trimmedPara.replace(/^#+\s*/, '');
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: headingText,
                  bold: true,
                  size: 28
                })
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            })
          );
        } else {
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: trimmedPara,
                  size: 24
                })
              ],
              spacing: { after: 200 },
              alignment: AlignmentType.JUSTIFIED
            })
          );
        }
      }

      // Create document
      const doc = new Document({
        sections: [{
          properties: {},
          children: docChildren
        }]
      });

      // Generate DOCX buffer
      const buffer = await Packer.toBuffer(doc);

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${document.title.replace(/[^a-z0-9]/gi, '_')}.docx"`);
      res.send(buffer);
    } catch (error) {
      logger.error('DOCX export error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export DOCX'
      });
    }
  }
);

// Export project with all documents
router.post(
  '/project/:projectId',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { format } = req.body;

      const project = await prisma.project.findFirst({
        where: {
          id: req.params.projectId,
          userId: req.userId
        },
        include: {
          documents: {
            orderBy: { createdAt: 'asc' }
          },
          references: true,
          outlines: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found'
        });
        return;
      }

      // Combine all document content
      const combinedContent = project.documents
        .map(doc => `# ${doc.title}\n\n${doc.content}`)
        .join('\n\n---\n\n');

      // Add references section
      const referencesSection = project.references.length > 0
        ? '\n\n# References\n\n' + project.references
            .map((ref, i) => {
              const authors = typeof ref.authors === 'string' ? ref.authors : (ref.authors as string[]).join(', ');
              return `[${i + 1}] ${authors} (${ref.year || 'n.d.'}). ${ref.title}. ${ref.url || ''}`;
            })
            .join('\n')
        : '';

      const fullContent = combinedContent + referencesSection;

      if (format === 'docx') {
        // Create DOCX
        const paragraphs = fullContent.split(/\n\n+/).map(para => {
          const trimmed = para.trim();
          if (trimmed.startsWith('#')) {
            return new Paragraph({
              children: [new TextRun({ text: trimmed.replace(/^#+\s*/, ''), bold: true, size: 28 })],
              heading: HeadingLevel.HEADING_1
            });
          }
          return new Paragraph({
            children: [new TextRun({ text: trimmed, size: 24 })]
          });
        });

        const doc = new Document({
          sections: [{ properties: {}, children: paragraphs }]
        });

        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${project.title.replace(/[^a-z0-9]/gi, '_')}.docx"`);
        res.send(buffer);
      } else {
        // Default to PDF
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        
        let page = pdfDoc.addPage();
        const { height } = page.getSize();
        let y = height - 72;

        const lines = fullContent.split('\n');
        for (const line of lines) {
          if (y < 72) {
            page = pdfDoc.addPage();
            y = height - 72;
          }
          page.drawText(line.substring(0, 80), { x: 72, y, size: 12, font });
          y -= 18;
        }

        const pdfBytes = await pdfDoc.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${project.title.replace(/[^a-z0-9]/gi, '_')}.pdf"`);
        res.send(Buffer.from(pdfBytes));
      }
    } catch (error) {
      logger.error('Project export error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export project'
      });
    }
  }
);

export default router;
