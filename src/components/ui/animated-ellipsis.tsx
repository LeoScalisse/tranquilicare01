import React from 'react';
import './animated-ellipsis.css';

interface AnimatedEllipsisProps {
  className?: string;
}

const AnimatedEllipsis: React.FC<AnimatedEllipsisProps> = ({ className = '' }) => (
  <span
    role='img'
    aria-label='...'
    className={`animated-ellipsis ${className}`}
  >
    <span className='animated-ellipsis__dot' />
    <span className='animated-ellipsis__dot' />
    <span className='animated-ellipsis__dot' />
  </span>
);

export default AnimatedEllipsis;
