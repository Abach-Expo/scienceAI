"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const pdf_lib_1 = require("pdf-lib");
const docx_1 = require("docx");
const index_1 = require("../index");
const auth_middleware_1 = require("../middleware/auth.middleware");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
// Export document as PDF
router.post('/pdf', [
    (0, express_validator_1.body)('documentId').notEmpty()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        const { documentId, includeMetadata } = req.body;
        const document = await index_1.prisma.document.findFirst({
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
        const pdfDoc = await pdf_lib_1.PDFDocument.create();
        const timesRomanFont = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.TimesRoman);
        const timesRomanBoldFont = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.TimesRomanBold);
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
        const lines = [];
        let currentLine = '';
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const textWidth = timesRomanFont.widthOfTextAtSize(testLine, fontSize);
            if (textWidth <= maxWidth) {
                currentLine = testLine;
            }
            else {
                if (currentLine)
                    lines.push(currentLine);
                currentLine = word;
            }
        }
        if (currentLine)
            lines.push(currentLine);
        // Create pages
        let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        let yPosition = pageHeight - margin;
        // Add title
        currentPage.drawText(document.title, {
            x: margin,
            y: yPosition,
            size: titleFontSize,
            font: timesRomanBoldFont,
            color: (0, pdf_lib_1.rgb)(0, 0, 0)
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
                color: (0, pdf_lib_1.rgb)(0.5, 0.5, 0.5)
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
                color: (0, pdf_lib_1.rgb)(0, 0, 0)
            });
            yPosition -= lineHeight;
        }
        // Generate PDF bytes
        const pdfBytes = await pdfDoc.save();
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${document.title.replace(/[^a-z0-9]/gi, '_')}.pdf"`);
        res.send(Buffer.from(pdfBytes));
    }
    catch (error) {
        logger_1.logger.error('PDF export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export PDF'
        });
    }
});
// Export document as DOCX
router.post('/docx', [
    (0, express_validator_1.body)('documentId').notEmpty()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        const { documentId, includeMetadata } = req.body;
        const document = await index_1.prisma.document.findFirst({
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
        const docChildren = [
            // Title
            new docx_1.Paragraph({
                children: [
                    new docx_1.TextRun({
                        text: document.title,
                        bold: true,
                        size: 36
                    })
                ],
                heading: docx_1.HeadingLevel.TITLE,
                alignment: docx_1.AlignmentType.CENTER,
                spacing: { after: 400 }
            })
        ];
        // Add metadata if requested
        if (includeMetadata) {
            docChildren.push(new docx_1.Paragraph({
                children: [
                    new docx_1.TextRun({
                        text: `Project: ${document.project.title}`,
                        italics: true,
                        size: 20,
                        color: '666666'
                    })
                ],
                spacing: { after: 100 }
            }), new docx_1.Paragraph({
                children: [
                    new docx_1.TextRun({
                        text: `Version: ${document.version} | Created: ${document.createdAt.toLocaleDateString()}`,
                        italics: true,
                        size: 20,
                        color: '666666'
                    })
                ],
                spacing: { after: 400 }
            }));
        }
        // Add content paragraphs
        for (const para of contentParagraphs) {
            const trimmedPara = para.trim();
            if (!trimmedPara)
                continue;
            // Check if it's a heading (starts with # or is all caps and short)
            const isHeading = trimmedPara.startsWith('#') ||
                (trimmedPara.length < 100 && trimmedPara === trimmedPara.toUpperCase());
            if (isHeading) {
                const headingText = trimmedPara.replace(/^#+\s*/, '');
                docChildren.push(new docx_1.Paragraph({
                    children: [
                        new docx_1.TextRun({
                            text: headingText,
                            bold: true,
                            size: 28
                        })
                    ],
                    heading: docx_1.HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                }));
            }
            else {
                docChildren.push(new docx_1.Paragraph({
                    children: [
                        new docx_1.TextRun({
                            text: trimmedPara,
                            size: 24
                        })
                    ],
                    spacing: { after: 200 },
                    alignment: docx_1.AlignmentType.JUSTIFIED
                }));
            }
        }
        // Create document
        const doc = new docx_1.Document({
            sections: [{
                    properties: {},
                    children: docChildren
                }]
        });
        // Generate DOCX buffer
        const buffer = await docx_1.Packer.toBuffer(doc);
        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${document.title.replace(/[^a-z0-9]/gi, '_')}.docx"`);
        res.send(buffer);
    }
    catch (error) {
        logger_1.logger.error('DOCX export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export DOCX'
        });
    }
});
// Export project with all documents
router.post('/project/:projectId', async (req, res) => {
    try {
        const { format } = req.body;
        const project = await index_1.prisma.project.findFirst({
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
                const authors = typeof ref.authors === 'string' ? ref.authors : ref.authors.join(', ');
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
                    return new docx_1.Paragraph({
                        children: [new docx_1.TextRun({ text: trimmed.replace(/^#+\s*/, ''), bold: true, size: 28 })],
                        heading: docx_1.HeadingLevel.HEADING_1
                    });
                }
                return new docx_1.Paragraph({
                    children: [new docx_1.TextRun({ text: trimmed, size: 24 })]
                });
            });
            const doc = new docx_1.Document({
                sections: [{ properties: {}, children: paragraphs }]
            });
            const buffer = await docx_1.Packer.toBuffer(doc);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${project.title.replace(/[^a-z0-9]/gi, '_')}.docx"`);
            res.send(buffer);
        }
        else {
            // Default to PDF
            const pdfDoc = await pdf_lib_1.PDFDocument.create();
            const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.TimesRoman);
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
    }
    catch (error) {
        logger_1.logger.error('Project export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export project'
        });
    }
});
exports.default = router;
//# sourceMappingURL=export.routes.js.map