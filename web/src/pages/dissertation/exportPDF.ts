import { Dissertation } from './types';
import { DOCUMENT_TYPES, SCIENCE_FIELDS } from './constants';
import { formatCitationGOST } from './utils';

// ================== ЭКСПОРТ В PDF ПО ГОСТ ==================
export const exportToPDF = async (dissertation: Dissertation) => {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const docType = DOCUMENT_TYPES[dissertation.documentType || 'dissertation'];
  
  // ============ ТИТУЛЬНАЯ СТРАНИЦА ПО ГОСТ ============
  pdf.setFont('helvetica');
  
  // Шапка - министерство/ведомство
  pdf.setFontSize(12);
  pdf.text('МИНИСТЕРСТВО НАУКИ И ВЫСШЕГО ОБРАЗОВАНИЯ', 105, 25, { align: 'center' });
  pdf.text('РОССИЙСКОЙ ФЕДЕРАЦИИ', 105, 32, { align: 'center' });
  
  // Название учреждения
  pdf.setFontSize(11);
  pdf.text('Федеральное государственное бюджетное образовательное учреждение', 105, 45, { align: 'center' });
  pdf.text('высшего образования', 105, 52, { align: 'center' });
  pdf.text('[НАЗВАНИЕ УНИВЕРСИТЕТА]', 105, 59, { align: 'center' });
  
  // Факультет/кафедра
  pdf.setFontSize(10);
  pdf.text(`Направление подготовки: ${SCIENCE_FIELDS.find(f => f.id === dissertation.scienceField)?.name || 'Не указано'}`, 105, 75, { align: 'center' });
  
  // Тип работы
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(docType.nameRu.toUpperCase(), 105, 100, { align: 'center' });
  
  // Тема
  pdf.setFontSize(14);
  const titleLines = pdf.splitTextToSize(dissertation.title || 'Название работы', 150);
  let titleY = 115;
  titleLines.forEach((line: string) => {
    pdf.text(line, 105, titleY, { align: 'center' });
    titleY += 8;
  });
  
  // Степень
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const degreeText = dissertation.degreeType === 'phd' ? 'кандидата наук' : 
                     dissertation.degreeType === 'master' ? 'магистра' : 'бакалавра';
  if (dissertation.documentType === 'dissertation') {
    pdf.text(`на соискание учёной степени ${degreeText}`, 105, titleY + 10, { align: 'center' });
  }
  
  // Научный руководитель
  pdf.text('Научный руководитель:', 20, 200);
  pdf.text('____________________', 70, 200);
  
  // Исполнитель
  pdf.text('Исполнитель:', 20, 215);
  pdf.text('____________________', 70, 215);
  
  // Город и год
  pdf.setFontSize(12);
  pdf.text(`Москва — ${new Date().getFullYear()}`, 105, 280, { align: 'center' });
  
  // ============ ОГЛАВЛЕНИЕ ============
  pdf.addPage();
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ОГЛАВЛЕНИЕ', 105, 25, { align: 'center' });
  
  let tocY = 45;
  let pageNum = 3;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  
  // Аннотация
  if (dissertation.abstract) {
    pdf.text('Аннотация', 20, tocY);
    pdf.text(String(pageNum), 190, tocY, { align: 'right' });
    pdf.setLineWidth(0.1);
    pdf.setLineDashPattern([1, 1], 0);
    pdf.line(50, tocY, 185, tocY);
    tocY += 8;
    pageNum++;
  }
  
  // Главы
  dissertation.chapters.forEach((chapter) => {
    if (tocY > 270) {
      pdf.addPage();
      tocY = 25;
    }
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(chapter.title, 20, tocY);
    pdf.text(String(pageNum), 190, tocY, { align: 'right' });
    tocY += 8;
    pageNum++;
    
    pdf.setFont('helvetica', 'normal');
    chapter.subchapters.forEach(sub => {
      if (tocY > 270) {
        pdf.addPage();
        tocY = 25;
      }
      pdf.text(`   ${sub.title}`, 25, tocY);
      pdf.text(String(pageNum), 190, tocY, { align: 'right' });
      tocY += 6;
      pageNum++;
    });
  });
  
  // ============ АННОТАЦИЯ ============
  if (dissertation.abstract) {
    pdf.addPage();
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('АННОТАЦИЯ', 105, 25, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    const abstractLines = pdf.splitTextToSize(dissertation.abstract, 170);
    let absY = 45;
    abstractLines.forEach((line: string) => {
      if (absY > 275) {
        pdf.addPage();
        absY = 25;
      }
      pdf.text(line, 20, absY);
      absY += 7;
    });
  }
  
  // ============ ОСНОВНОЙ ТЕКСТ ============
  let y = 25;
  
  dissertation.chapters.forEach(chapter => {
    pdf.addPage();
    y = 25;
    
    // Заголовок главы
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    const chapterTitleLines = pdf.splitTextToSize(chapter.title.toUpperCase(), 170);
    chapterTitleLines.forEach((line: string) => {
      pdf.text(line, 105, y, { align: 'center' });
      y += 8;
    });
    y += 10;
    
    // Содержимое главы
    if (chapter.content) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const lines = pdf.splitTextToSize(chapter.content, 170);
      lines.forEach((line: string) => {
        if (y > 275) {
          pdf.addPage();
          y = 25;
        }
        pdf.text(line, 20, y);
        y += 7;
      });
      y += 5;
    }
    
    // Подразделы
    chapter.subchapters.forEach(sub => {
      if (y > 250) {
        pdf.addPage();
        y = 25;
      }
      
      // Заголовок подраздела
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(sub.title, 20, y);
      y += 10;
      
      // Содержимое подраздела
      if (sub.content) {
        pdf.setFont('helvetica', 'normal');
        const lines = pdf.splitTextToSize(sub.content, 170);
        lines.forEach((line: string) => {
          if (y > 275) {
            pdf.addPage();
            y = 25;
          }
          // Красная строка (абзацный отступ)
          pdf.text(line, 25, y);
          y += 7;
        });
        y += 8;
      }
    });
  });
  
  // ============ СПИСОК ЛИТЕРАТУРЫ ============
  if (dissertation.citations && dissertation.citations.length > 0) {
    pdf.addPage();
    y = 25;
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ', 105, y, { align: 'center' });
    y += 15;
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    dissertation.citations.forEach((citation, idx) => {
      if (y > 270) {
        pdf.addPage();
        y = 25;
      }
      const citText = `${idx + 1}. ${formatCitationGOST(citation)}`;
      const citLines = pdf.splitTextToSize(citText, 170);
      citLines.forEach((line: string) => {
        if (y > 275) {
          pdf.addPage();
          y = 25;
        }
        pdf.text(line, 20, y);
        y += 6;
      });
      y += 2;
    });
  }
  
  // Сохранение
  const fileName = `${dissertation.title || docType.nameRu}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};
