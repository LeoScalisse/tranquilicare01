import React, { useId } from 'react';

interface LoveHeartProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible label (e.g. "Salvar nos favoritos") */
  label?: string;
}

/**
 * Animated like / favorite heart — a CSS-art checkbox toggle: the outline heart
 * fills pink while a small ball rolls along its edge. Styles live in index.css
 * under `.love-heart-toggle`.
 *
 * Controlled: pass `checked` + `onChange`. Clicks are stopped from bubbling so
 * it can sit on top of a clickable card without triggering it.
 */
const LoveHeart: React.FC<LoveHeartProps> = ({ checked, onChange, label }) => {
  const id = useId();

  return (
    <span
      className="love-heart-toggle"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
      <label className="love-heart" htmlFor={id}>
        <i className="left" />
        <i className="right" />
        <i className="bottom" />
        <span className="round" />
      </label>
    </span>
  );
};

export default LoveHeart;
