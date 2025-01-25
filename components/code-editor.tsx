"use client";

import { useState } from "react";
import { Sandpack } from "@codesandbox/sandpack-react";
import { dracula } from "@codesandbox/sandpack-themes";
import * as shadcnComponents from "@/utils/shadcn";

interface CodeEditorProps {
  initialCode: string;
  onSave?: (code: string) => void;
  onModify?: (prompt: string) => void;
}

export default function CodeEditor({ initialCode, onSave, onModify }: CodeEditorProps) {
  const [code, setCode] = useState(initialCode);
  const [modifyPrompt, setModifyPrompt] = useState("");

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleModifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onModify && modifyPrompt.trim()) {
      onModify(modifyPrompt.trim());
      setModifyPrompt("");
    }
  };

  return (
    <div className="w-full h-full space-y-4">
      <div className="bg-gray-800 rounded-lg p-4">
        <form onSubmit={handleModifySubmit} className="flex gap-2">
          <input
            type="text"
            value={modifyPrompt}
            onChange={(e) => setModifyPrompt(e.target.value)}
            placeholder="Enter your modification prompt (e.g., 'Add a dark mode toggle')"
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!modifyPrompt.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Modify App
          </button>
        </form>
      </div>

      <Sandpack
        theme={dracula}
        template="react-ts"
        options={{
          showNavigator: true,
          showTabs: true,
          editorHeight: "70vh",
          classes: {
            "sp-wrapper": "custom-wrapper",
            "sp-layout": "custom-layout",
            "sp-editor": "custom-editor",
          },
        }}
        files={{
          "App.tsx": {
            code,
            active: true,
          },
          ...shadcnComponents,
        }}
        customSetup={{
          dependencies: {
            "react": "^18.0.0",
            "react-dom": "^18.0.0",
            "@types/react": "^18.0.0",
            "@types/react-dom": "^18.0.0",
            "tailwindcss": "^3.0.0",
            "@tailwindcss/typography": "^0.5.0",
            ...Object.keys(shadcnComponents).reduce((acc, key) => ({
              ...acc,
              [`@radix-ui/react-${key.toLowerCase()}`]: "latest",
            }), {}),
          },
        }}
      />
      {onSave && (
        <button
          onClick={() => onSave(code)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Save Changes
        </button>
      )}
    </div>
  );
} 