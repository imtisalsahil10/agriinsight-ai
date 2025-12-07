import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Simple regex-based formatter for demonstration. 
  // In a production app, use 'react-markdown' library.
  
  const formatText = (text: string) => {
    let formatted = text;

    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Headers
    formatted = formatted.replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mt-2 mb-1">$1</h3>');
    formatted = formatted.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-3 mb-2">$1</h2>');
    formatted = formatted.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');

    // Lists (unordered)
    formatted = formatted.replace(/^\- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br />');

    return formatted;
  };

  return (
    <div 
      className="prose prose-sm max-w-none dark:prose-invert leading-relaxed text-inherit"
      dangerouslySetInnerHTML={{ __html: formatText(content) }} 
    />
  );
};

export default MarkdownRenderer;