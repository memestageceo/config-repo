import React from 'react';
import CodeBlock from '@theme/CodeBlock';

export default function YamlCodeBlock({ children }) {
  return (
    <CodeBlock language="yaml">{children}</CodeBlock>
  );
}
