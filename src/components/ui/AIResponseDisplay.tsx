import React from 'react';

interface AIResponseDisplayProps {
  content: string;
  isPreview?: boolean;
}

const AIResponseDisplay: React.FC<AIResponseDisplayProps> = ({ 
  content, 
  isPreview = false 
}) => {
  // Function to parse markdown-style tables and format them
  const formatContent = (text: string) => {
    // Split content into sections
    const sections = text.split(/(\*\*[^*]+\*\*)/g);
    
    return sections.map((section, index) => {
      // Check if this is a header (bold text)
      if (section.startsWith('**') && section.endsWith('**')) {
        const headerText = section.slice(2, -2);
        return (
          <h3 key={index} className="text-lg font-bold text-notWhite mt-4 mb-2">
            {headerText}
          </h3>
        );
      }
      
        // Check if this section contains a table (look for pipe characters or tab-separated data)
  if (section.includes('|') || (section.includes('\t') && section.includes('http'))) {
    return <TableSection key={index} content={section} />;
  }
      
      // Check if this section contains bullet points
      if (section.includes('- ')) {
        return <BulletListSection key={index} content={section} />;
      }
      
      // Regular text
      return (
        <p key={index} className="text-sm text-lightPurple mb-2 leading-relaxed">
          {section}
        </p>
      );
    });
  };

  return (
    <div className="mt-4 text-lightPurple bg-purplePanel rounded-lg p-4 border border-limeGreenOpacity/20 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl text-notWhite font-bold">
            {isPreview ? '🎯 Match Preview' : '📊 Fantasy Impact'}
          </h2>

        </div>

      </div>
      
      <div className="space-y-4">
        {formatContent(content)}
      </div>
    </div>
  );
};

// Function to format cell content based on column type
const formatCellContent = (content: string, columnHeader: string) => {
  const cell = content.trim();
  
  // Guard against undefined columnHeader
  if (!columnHeader) {
    return cell;
  }
  
  // Format risk levels
  if (columnHeader.toLowerCase().includes('risk')) {
    if (cell.toLowerCase().includes('low')) {
      return <span className="text-green-400 font-medium">{cell}</span>;
    } else if (cell.toLowerCase().includes('medium')) {
      return <span className="text-yellow-400 font-medium">{cell}</span>;
    } else if (cell.toLowerCase().includes('high')) {
      return <span className="text-red-400 font-medium">{cell}</span>;
    }
  }
  
  // Format form ratings
  if (columnHeader.toLowerCase().includes('form')) {
    const formValue = parseFloat(cell);
    if (!isNaN(formValue)) {
      if (formValue >= 7) {
        return <span className="text-green-400 font-bold">{cell}</span>;
      } else if (formValue >= 5) {
        return <span className="text-yellow-400 font-medium">{cell}</span>;
      } else {
        return <span className="text-red-400">{cell}</span>;
      }
    }
  }
  
  // Format ownership percentages
  if (columnHeader.toLowerCase().includes('ownership')) {
    const ownershipValue = parseFloat(cell.replace('%', ''));
    if (!isNaN(ownershipValue)) {
      if (ownershipValue >= 20) {
        return <span className="text-blue-400 font-bold">{cell}</span>;
      } else if (ownershipValue >= 10) {
        return <span className="text-cyan-400 font-medium">{cell}</span>;
      } else {
        return <span className="text-gray-400">{cell}</span>;
      }
    }
  }
  
  // Handle image URLs (format: "imageUrl|text" or "imageUrl text")
  if ((cell.startsWith('http') || cell.startsWith('/')) && (cell.includes('|') || cell.includes(' '))) {
    let imageUrl, text;
    if (cell.includes('|')) {
      [imageUrl, text] = cell.split('|');
    } else {
      // Split by space and take the first part as URL, rest as text
      const parts = cell.split(' ');
      imageUrl = parts[0];
      text = parts.slice(1).join(' ');
    }
    
    // Check if this is a player column (has position info like GK, DEF, MID, FWD)
    const isPlayerColumn = text.includes('GK') || text.includes('DEF') || text.includes('MID') || text.includes('FWD');
    
    if (isPlayerColumn) {
      // Player column: team logo, name, team abbreviation, position
      const textParts = text.split(' ');
      const position = textParts[textParts.length - 1]; // Last part is position
      const teamAbbr = textParts[textParts.length - 2]; // Second to last part is team abbreviation
      const playerName = textParts.slice(0, -2).join(' '); // Everything except last two parts is name
      
      return (
        <div className="flex items-center gap-1 min-w-0">
          <img
            src={imageUrl}
            alt={teamAbbr}
            className="w-6 h-6 rounded-full object-cover flex-shrink-0"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/defifa_spinner.gif';
            }}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-lightPurple text-sm font-medium truncate">{playerName}</span>
            <span className="text-gray-400 text-xs">{teamAbbr} • {position}</span>
          </div>
        </div>
      );
    } else {
      // Team column: image and abbreviation
      return (
        <div className="flex items-center gap-1">
          <img
            src={imageUrl}
            alt={text}
            className="w-6 h-6 rounded-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/defifa_spinner.gif';
            }}
          />
          <span className="text-lightPurple text-sm">{text}</span>
        </div>
      );
    }
  }
  
  // Default formatting
  return cell;
};

// Component to render table sections
const TableSection: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.trim().split('\n');
  
  // Find lines that look like table rows (contain | or tabs and have reasonable content)
  const tableLines = lines.filter(line => {
    const trimmed = line.trim();
    return (trimmed.includes('|') || trimmed.includes('\t')) && 
           trimmed.length > 5 && 
           !trimmed.startsWith('---') &&
           !trimmed.match(/^[|\s-]+$/); // Not just separators
  });
  
  if (tableLines.length === 0) {
    // If no proper table found, render as regular text
    return (
      <p className="text-sm text-lightPurple mb-1 leading-relaxed">
        {content}
      </p>
    );
  }
  
  // Try to extract headers from the first line that looks like a header
  let headers: string[] = [];
  let dataRows: string[] = [];
  
  // Look for a line that might be headers (contains common header words)
  const headerCandidates = tableLines.filter(line => 
    line.toLowerCase().includes('player') || 
    line.toLowerCase().includes('team') || 
    line.toLowerCase().includes('form') ||
    line.toLowerCase().includes('risk')
  );
  
  if (headerCandidates.length > 0) {
    const headerLine = headerCandidates[0];
    headers = headerLine.includes('\t') 
      ? headerLine.split('\t').map(h => h.trim()).filter(h => h)
      : headerLine.split('|').map(h => h.trim()).filter(h => h);
    dataRows = tableLines.filter(line => line !== headerCandidates[0]);
  } else {
    // If no clear headers, use first line as headers
    const firstLine = tableLines[0];
    headers = firstLine.includes('\t')
      ? firstLine.split('\t').map(h => h.trim()).filter(h => h)
      : firstLine.split('|').map(h => h.trim()).filter(h => h);
    dataRows = tableLines.slice(1);
  }
  
  // Clean up data rows and fix malformed tables
  dataRows = dataRows.map(row => {
    // Fix common malformed table issues
    let fixedRow = row;
    
    if (row.includes('\t')) {
      // Handle tab-separated data
      return fixedRow;
    } else {
      // Handle pipe-separated data
      // Fix missing spaces after pipes
      fixedRow = fixedRow.replace(/\|([^|])/g, '| $1');
      
      // Fix missing spaces before pipes
      fixedRow = fixedRow.replace(/([^|])\|/g, '$1 |');
      
      // Fix double pipes
      fixedRow = fixedRow.replace(/\|\|/g, '| |');
    }
    
    return fixedRow;
  });
  
  return (
    <div className="overflow-x-auto rounded-lg border border-limeGreenOpacity/30">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-gray-800 to-gray-700">
            {headers.map((header, index) => (
              <th key={index} className={`px-4 py-3 text-left text-sm font-semibold text-notWhite border-b-2 border-limeGreenOpacity/50 ${
                header.toLowerCase() === 'player' ? 'w-1/3 min-w-[200px]' : ''
              }`}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, rowIndex) => {
            const cells = row.includes('\t') 
              ? row.split('\t').map(c => c.trim()).filter(c => c)
              : row.split('|').map(c => c.trim()).filter(c => c);
            
            // Check if this row has a MATCH_PLAYER marker
            const isMatchPlayer = cells.includes('MATCH_PLAYER');
            const displayCells = cells.filter(cell => cell !== 'MATCH_PLAYER');
            
            return (
              <tr 
                key={rowIndex} 
                className={`hover:bg-gray-700/30 transition-colors border-b border-limeGreenOpacity/20 ${
                  isMatchPlayer ? 'bg-gradient-to-r from-green-900/30 to-green-800/20 border-l-4 border-green-400' : ''
                }`}
              >
                {displayCells.map((cell, cellIndex) => (
                  <td key={cellIndex} className={`px-4 py-3 text-sm text-lightPurple ${
                    headers[cellIndex]?.toLowerCase() === 'player' ? 'whitespace-nowrap' : ''
                  }`}>
                    {formatCellContent(cell, headers[cellIndex])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Component to render bullet list sections
const BulletListSection: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n').filter(line => line.trim());
  
  return (
    <ul className="list-disc list-inside space-y-1">
      {lines.map((line, index) => {
        const cleanLine = line.replace(/^-\s*/, '').trim();
        if (cleanLine) {
          return (
            <li key={index} className="text-sm text-lightPurple">
              {cleanLine}
            </li>
          );
        }
        return null;
      })}
    </ul>
  );
};

export default AIResponseDisplay;
