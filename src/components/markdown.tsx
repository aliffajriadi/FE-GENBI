import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Render markdown aman: react-markdown tidak mengeksekusi HTML mentah dari penulis.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ node: _n, ...p }) => <a {...p} target="_blank" rel="noopener noreferrer" /> }}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
