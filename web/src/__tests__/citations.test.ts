import { describe, it, expect } from 'vitest';
import {
  formatCitation,
  generateBibliography,
  CITATION_STYLES,
  exportBibliographyAsBibTeX,
  exportBibliographyAsRIS,
  insertCitation,
  type Source,
  type CitationStyle,
} from '../services/citations';

const sampleSource: Source = {
  id: 'test-doi-123',
  title: 'Machine Learning in Education',
  authors: ['John Smith', 'Jane Doe'],
  year: 2023,
  journal: 'Nature Education',
  volume: '5',
  issue: '2',
  pages: '100-115',
  doi: '10.1234/test.2023',
  citationCount: 42,
  type: 'article',
};

const singleAuthor: Source = {
  ...sampleSource,
  id: 'single-author',
  authors: ['Albert Einstein'],
};

describe('Citation Formatting', () => {
  it('formats APA 7 correctly with two authors', () => {
    const citation = formatCitation(sampleSource, 'apa7');
    expect(citation.formatted).toContain('(2023)');
    expect(citation.formatted).toContain('Machine Learning in Education');
    expect(citation.formatted).toContain('Nature Education');
    expect(citation.formatted).toContain('https://doi.org/10.1234/test.2023');
    expect(citation.inText).toContain('Smith');
    expect(citation.inText).toContain('Doe');
    expect(citation.style).toBe('apa7');
  });

  it('formats GOST correctly', () => {
    const citation = formatCitation(sampleSource, 'gost');
    expect(citation.formatted).toContain('//');
    expect(citation.formatted).toContain('Т. 5');
    expect(citation.formatted).toContain('№ 2');
    expect(citation.formatted).toContain('С. 100-115');
    expect(citation.inText).toMatch(/\[.*2023\]/);
  });

  it('formats MLA 9 correctly', () => {
    const citation = formatCitation(sampleSource, 'mla9');
    expect(citation.formatted).toContain('"Machine Learning in Education."');
    expect(citation.formatted).toContain('vol. 5');
    expect(citation.formatted).toContain('no. 2');
  });

  it('formats IEEE with numbered reference', () => {
    const citation = formatCitation(sampleSource, 'ieee');
    expect(citation.inText).toBe('[1]');
    expect(citation.formatted).toContain('vol. 5');
  });

  it('formats Vancouver style', () => {
    const citation = formatCitation(sampleSource, 'vancouver');
    expect(citation.inText).toBe('(1)');
    expect(citation.formatted).toContain(';5(2)');
  });

  it('handles single author for MLA in-text', () => {
    const citation = formatCitation(singleAuthor, 'mla9');
    expect(citation.inText).toBe('(Einstein)');
  });

  it('formats all 7 supported styles', () => {
    const styles: CitationStyle[] = ['apa7', 'mla9', 'chicago', 'harvard', 'gost', 'ieee', 'vancouver'];
    for (const style of styles) {
      const citation = formatCitation(sampleSource, style);
      expect(citation.formatted.length).toBeGreaterThan(10);
      expect(citation.inText.length).toBeGreaterThan(0);
      expect(citation.source).toBe(sampleSource);
      expect(citation.style).toBe(style);
    }
  });
});

describe('Bibliography Generation', () => {
  it('generates bibliography with custom title', () => {
    const bib = generateBibliography([sampleSource], 'apa7', 'References');
    expect(bib).toContain('References');
    expect(bib).toContain('Machine Learning in Education');
  });

  it('generates IEEE bibliography with numbered entries', () => {
    const bib = generateBibliography([sampleSource, singleAuthor], 'ieee');
    expect(bib).toContain('[1]');
    expect(bib).toContain('[2]');
  });
});

describe('BibTeX Export', () => {
  it('exports valid BibTeX format', () => {
    const bibtex = exportBibliographyAsBibTeX([sampleSource]);
    expect(bibtex).toContain('@article{');
    expect(bibtex).toContain('author = {John Smith and Jane Doe}');
    expect(bibtex).toContain('year = {2023}');
    expect(bibtex).toContain('doi = {10.1234/test.2023}');
  });
});

describe('RIS Export', () => {
  it('exports valid RIS format', () => {
    const ris = exportBibliographyAsRIS([sampleSource]);
    expect(ris).toContain('TY  - JOUR');
    expect(ris).toContain('AU  - John Smith');
    expect(ris).toContain('AU  - Jane Doe');
    expect(ris).toContain('PY  - 2023');
    expect(ris).toContain('ER  - ');
  });
});

describe('Citation Styles Metadata', () => {
  it('has 7 citation styles defined', () => {
    expect(CITATION_STYLES).toHaveLength(7);
  });

  it('each style has id, name, description, and example', () => {
    for (const style of CITATION_STYLES) {
      expect(style.id).toBeTruthy();
      expect(style.name).toBeTruthy();
      expect(style.description).toBeTruthy();
      expect(style.example).toBeTruthy();
    }
  });

  it('includes GOST for Russian users', () => {
    const gost = CITATION_STYLES.find(s => s.id === 'gost');
    expect(gost).toBeDefined();
    expect(gost?.name).toContain('ГОСТ');
  });
});

describe('insertCitation', () => {
  it('inserts citation at correct position', () => {
    const text = 'This is important.';
    const citation = formatCitation(sampleSource, 'apa7');
    const result = insertCitation(text, 17, citation);
    expect(result).toContain(citation.inText);
    expect(result.indexOf(citation.inText)).toBe(18);
  });
});
