import React from 'react';

/**
 * Replaces "mais" (case insensitive) with a yellow "+" and styles existing "+" as yellow.
 */
export const BrandedText: React.FC<{ text: string; className?: string }> = ({ text, className = "" }) => {
  // Regex to match "mais" (whole word, case insensitive) OR "+"
  // We use capturing groups to keep the delimiters in the split array
  const parts = text.split(/(\bmais\b|\+)/gi);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const lower = part.toLowerCase();
        if (lower === 'mais' || lower === '+') {
          return (
            <span key={index} className="text-brand-yellow font-bold mx-0.5">
              +
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};
