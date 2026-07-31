import React from 'react';

interface StoryPunctuationProps {
  children: React.ReactNode;
  className: string;
}

const PUNCTUATION = /([.,!?;:…])/g;
const ONLY_PUNCTUATION = /^[.,!?;:…]$/;

const colorizeNode = (
  node: React.ReactNode,
  className: string,
  keyPrefix: string,
): React.ReactNode => {
  if (typeof node === 'string') {
    return node.split(PUNCTUATION).map((part, index) => (
      ONLY_PUNCTUATION.test(part)
        ? <span className={className} key={`${keyPrefix}-${index}`}>{part}</span>
        : part
    ));
  }

  if (Array.isArray(node)) {
    return node.map((child, index) => colorizeNode(child, className, `${keyPrefix}-${index}`));
  }

  if (React.isValidElement<{ children?: React.ReactNode }>(node) && node.props.children !== undefined) {
    return React.cloneElement(
      node,
      undefined,
      colorizeNode(node.props.children, className, `${keyPrefix}-child`),
    );
  }

  return node;
};

const StoryPunctuation: React.FC<StoryPunctuationProps> = ({ children, className }) => (
  <>{colorizeNode(children, className, 'punctuation')}</>
);

export default StoryPunctuation;
