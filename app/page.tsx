"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

interface DocumentSummary {
  id: string;
  name: string;
  chunks: number;
}

export default function Home() {
  const [fileName, setFileName] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isIngesting, setIsIngesting] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);

  useEffect(() => {
    async function loadDocuments() {
      try {
        const response = await fetch("/api/documents");
        if (!response.ok) return;
        const result = await response.json();
        setDocuments(result.documents ?? []);
      } catch {
        // The main workspace remains usable if the list cannot load.
      }
    }

    void loadDocuments();
  }, []);

  async function refreshDocuments() {
    const response = await fetch("/api/documents");
    if (response.ok) {
      const result = await response.json();
      setDocuments(result.documents ?? []);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setAnswer("");
    setError("");
    setStatus("Reading document...");
    setIsIngesting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/ingest", { method: "POST", body: formData });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Ingestion failed");
      setStatus(`Indexed ${result.chunks} chunk${result.chunks === 1 ? "" : "s"}.`);
      await refreshDocuments();
    } catch (ingestError) {
      setStatus("");
      setError(ingestError instanceof Error ? ingestError.message : "Ingestion failed");
    } finally {
      setIsIngesting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;

    setAnswer("");
    setError("");
    setIsAsking(true);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "GraphRAG query failed");
      }

      if (!response.body) throw new Error("The answer stream was not available");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedAnswer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        streamedAnswer += decoder.decode(value, { stream: true });
        setAnswer(streamedAnswer);
      }

      setAnswer(streamedAnswer + decoder.decode());
    } catch (askError) {
      setError(askError instanceof Error ? askError.message : "GraphRAG query failed");
    } finally {
      setIsAsking(false);
    }
  }

  async function handleDeleteDocument(document: DocumentSummary) {
    if (!window.confirm(`Remove ${document.name} and its indexed chunks?`)) return;

    setError("");
    setDeletingId(document.id);

    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(document.id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not delete document");
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      if (fileName === document.name) setFileName("");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete document");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0b0d10] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_42%,rgba(6,182,212,0.08),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(59,130,246,0.05),transparent_28%)]" />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-10">
        <header className="relative flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-cyan-400 text-sm font-bold text-slate-950">G</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-wide">GraphRAG</p>
              <p className="truncate text-xs text-zinc-500">Knowledge workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400"><span className="size-2 rounded-full bg-emerald-400" />Local workspace</div>
        </header>

        <section className="relative grid flex-1 items-start gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(460px,1.1fr)] lg:gap-20 lg:py-20">
          <div className="max-w-2xl lg:pt-10">
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.24em] text-cyan-400 sm:text-xs">Ask your knowledge graph</p>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-white sm:text-5xl lg:text-[4.25rem]">Find the thread between your documents.</h1>
            <p className="mt-6 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">Add a source, then ask a question. GraphRAG connects relevant context from your Neo4j knowledge graph before generating an answer.</p>
            <div className="mt-8 grid grid-cols-1 gap-2 text-xs text-zinc-500 min-[420px]:grid-cols-3 lg:max-w-lg">
              <span className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">Neo4j connected</span>
              <span className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">Embeddings ready</span>
              <span className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">Mastra workflow</span>
            </div>
          </div>

          <div className="w-full rounded-2xl border border-white/10 bg-[#111419]/95 p-4 shadow-2xl shadow-black/30 sm:p-6 lg:p-7">
            <div className="mb-5 flex items-start justify-between gap-4 sm:mb-6">
              <div className="min-w-0"><p className="text-sm font-medium text-white">Knowledge assistant</p><p className="mt-1 text-xs text-zinc-500">Ingest a file or start with a question</p></div>
              <span className="shrink-0 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-300">Ready</span>
            </div>

            <label className={`group block rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4 transition sm:p-5 ${isIngesting ? "cursor-wait opacity-70" : "cursor-pointer hover:border-cyan-400/50 hover:bg-cyan-400/[0.03]"}`}>
              <input type="file" accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown" className="sr-only" onChange={handleFileChange} disabled={isIngesting} />
              <div className="flex items-center gap-3 sm:gap-4"><div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/6 text-lg text-cyan-300">↑</div><div className="min-w-0"><p className="truncate text-sm font-medium text-zinc-200">{fileName || "Upload a document"}</p><p className="mt-1 text-xs text-zinc-500">PDF, TXT, or Markdown · click to browse</p></div></div>
            </label>
            {status && <p className="mt-3 text-xs text-emerald-300" aria-live="polite">{status}</p>}

            <div className="mt-5 border-t border-white/8 pt-4">
              <div className="mb-3 flex items-center justify-between"><p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Indexed documents</p><span className="text-xs text-zinc-600">{documents.length}</span></div>
              {documents.length === 0 ? <p className="text-xs text-zinc-600">No documents indexed yet.</p> : <div className="space-y-2">{documents.slice(0, 4).map((document) => <div key={document.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2.5 sm:gap-3"><p className="min-w-0 flex-1 truncate text-xs text-zinc-300">{document.name}</p><span className="hidden shrink-0 text-[11px] text-zinc-600 min-[420px]:inline">{document.chunks} chunks</span><button type="button" onClick={() => void handleDeleteDocument(document)} disabled={deletingId === document.id} className="shrink-0 rounded-md px-2 py-1 text-xs text-zinc-600 transition hover:bg-rose-400/10 hover:text-rose-300 disabled:cursor-wait disabled:opacity-40" aria-label={`Remove ${document.name}`}>{deletingId === document.id ? "..." : "×"}</button></div>)}</div>}
            </div>

            <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-zinc-600 sm:text-[11px]"><span className="h-px flex-1 bg-white/8" />or ask directly<span className="h-px flex-1 bg-white/8" /></div>
            <form onSubmit={handleSubmit}>
              <label htmlFor="question" className="mb-2 block text-xs font-medium text-zinc-400">Your question</label>
              <textarea id="question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What would you like to understand?" rows={4} className="min-h-28 w-full resize-y rounded-xl border border-white/10 bg-[#0b0d10] px-4 py-3 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10" />
              <button type="submit" className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200/60 disabled:cursor-not-allowed disabled:opacity-40" disabled={!question.trim() || isAsking}>{isAsking ? "Searching..." : "Ask GraphRAG"} {!isAsking && <span className="ml-2 text-base">-&gt;</span>}</button>
            </form>
            {answer && <div className="mt-5 max-h-96 overflow-y-auto rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-4 text-sm leading-7 text-zinc-300 sm:p-5" aria-live="polite"><p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-300">Answer</p><ReactMarkdown components={{ h1: ({ children }) => <h1 className="mb-3 mt-4 text-lg font-semibold text-white first:mt-0">{children}</h1>, h2: ({ children }) => <h2 className="mb-2 mt-4 text-base font-semibold text-white first:mt-0">{children}</h2>, p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>, strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>, ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>, ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>, code: ({ children }) => <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-xs text-cyan-200">{children}</code>, pre: ({ children }) => <pre className="mb-3 overflow-x-auto rounded-lg bg-black/30 p-3 text-xs leading-5">{children}</pre> }}>{answer}</ReactMarkdown></div>}
            {error && <div className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.04] p-4 text-sm leading-7 text-rose-300" role="alert">{error}</div>}
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between"><span>GraphRAG · private by design</span><span>Powered by Next.js · Neo4j · Mastra</span></footer>
      </div>
    </main>
  );
}
