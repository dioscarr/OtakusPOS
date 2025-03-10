import React, { useState } from 'react';

interface OcrPromptsBookProps {
  defaultPrompt: string;
  onSave?: (newPrompt: string) => void;
}

export function OcrPromptsBook({ defaultPrompt, onSave }: OcrPromptsBookProps) {
  const [promptText, setPromptText] = useState(defaultPrompt);

  return (
    <div className="bg-gray-800 p-4 rounded-md text-white">
      <h2 className="text-xl font-bold mb-2">OCR Prompt Editor</h2>
      <textarea
        className="w-full h-48 p-2 bg-gray-700 rounded-md"
        value={promptText}
        onChange={e => setPromptText(e.target.value)}
      />
      <button
        onClick={() => onSave?.(promptText)}
        className="mt-3 bg-slate-700 hover:bg-slate-800 px-4 py-2 rounded-md"
      >
        Save
      </button>
    </div>
  );
}
