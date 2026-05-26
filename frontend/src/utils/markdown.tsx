import React from 'react';

function renderTextWithFormatting(text: string): React.ReactNode {
  if (!text) return '';

  // 1. Split by inline code blocks e.g. `code`
  const codeParts = text.split(/(`[^`]+`)/g);
  
  return codeParts.flatMap((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return [
        <code key={`code-${index}`} className="md-inline-code">
          {part.slice(1, -1)}
        </code>
      ];
    }
    
    // 2. Parse links: [text](url)
    const linkRegex = /(\[[^\]]+\]\([^)]+\))/g;
    const linkParts = part.split(linkRegex);
    
    return linkParts.flatMap((subPart, sIndex) => {
      if (subPart.startsWith('[') && subPart.includes('](')) {
        const labelMatch = subPart.match(/\[([^\]]+)\]/);
        const urlMatch = subPart.match(/\(([^)]+)\)/);
        if (labelMatch && urlMatch) {
          const label = labelMatch[1];
          const url = urlMatch[1];
          return [
            <a key={`link-${sIndex}`} href={url} target="_blank" rel="noopener noreferrer" className="md-link">
              {label}
            </a>
          ];
        }
      }
      
      // 3. Parse bold: **text** or __text__
      const boldParts = subPart.split(/(\*\*[^*]+\*\*|__[^\_]+__)/g);
      
      return boldParts.flatMap((boldPart, bIndex) => {
        if ((boldPart.startsWith('**') && boldPart.endsWith('**')) || (boldPart.startsWith('__') && boldPart.endsWith('__'))) {
          return [
            <strong key={`bold-${bIndex}`}>
              {boldPart.slice(2, -2)}
            </strong>
          ];
        }
        
        // 4. Parse italic: *text* or _text_
        const italicParts = boldPart.split(/(\*[^*]+\*|_[^\_]+_)/g);
        return italicParts.map((italicPart, iIndex) => {
          if ((italicPart.startsWith('*') && italicPart.endsWith('*')) || (italicPart.startsWith('_') && italicPart.endsWith('_'))) {
            return (
              <em key={`italic-${bIndex}-${iIndex}`}>
                {italicPart.slice(1, -1)}
              </em>
            );
          }
          return italicPart;
        });
      });
    });
  });
}

/**
 * A lightweight custom Markdown parser that renders:
 * - Fenced code blocks (```code```) supporting unclosed/streaming blocks
 * - Headings (# Heading)
 * - Bullet lists (- list item)
 * - Bold (**text**)
 * - Links ([label](url))
 * - Inline code blocks (`code`)
 */
export function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  // Match code blocks (either closed with ``` or unclosed/end of string)
  const parts = text.split(/(```[\s\S]*?(?:```|$))/g);

  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      const lines = part.split('\n');
      const hasClosing = part.endsWith('```') && part.length >= 6;
      const code = lines.slice(1, hasClosing ? lines.length - 1 : lines.length).join('\n');
      return (
        <pre key={index} className="md-code-block">
          <code>{code}</code>
        </pre>
      );
    } else {
      const lines = part.split('\n');
      const renderedLines: React.ReactNode[] = [];
      let listItems: React.ReactNode[] = [];

      const flushList = (key: string) => {
        if (listItems.length > 0) {
          renderedLines.push(
            <ul key={key} className="md-list" style={{ margin: '8px 0', paddingLeft: '20px' }}>
              {listItems}
            </ul>
          );
          listItems = [];
        }
      };

      lines.forEach((line, lineIdx) => {
        const trimmed = line.trim();
        
        // Headings
        if (trimmed.startsWith('#')) {
          flushList(`list-before-h-${lineIdx}`);
          const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
          if (headingMatch) {
            const level = headingMatch[1].length;
            const content = headingMatch[2];
            const HeadingTag = `h${level}` as any;
            renderedLines.push(
              <HeadingTag key={`h-${lineIdx}`} className={`md-h${level}`} style={{ margin: '12px 0 6px', fontWeight: 600 }}>
                {renderTextWithFormatting(content)}
              </HeadingTag>
            );
            return;
          }
        }

        // Unordered List Items
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.substring(2);
          listItems.push(
            <li key={`li-${lineIdx}`} className="md-list-item" style={{ marginBottom: '4px' }}>
              {renderTextWithFormatting(content)}
            </li>
          );
          return;
        }

        // Empty line
        if (!trimmed) {
          flushList(`list-before-empty-${lineIdx}`);
          renderedLines.push(<div key={`empty-${lineIdx}`} style={{ height: '8px' }} />);
          return;
        }

        // Standard line
        flushList(`list-before-p-${lineIdx}`);
        renderedLines.push(
          <p key={`p-${lineIdx}`} className="md-paragraph" style={{ marginBottom: '8px', lineHeight: '1.5' }}>
            {renderTextWithFormatting(line)}
          </p>
        );
      });

      flushList(`list-final-${index}`);
      return <React.Fragment key={index}>{renderedLines}</React.Fragment>;
    }
  });
}
