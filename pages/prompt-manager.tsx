'use client';
import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PromptEditor, { emptyPromptDraft, promptToDraft } from '@/components/PromptEditor';
import PromptList from '@/components/PromptList';
import type { PromptCategory, PromptRecord } from '@/lib/promptStore';

type PromptDraft = ReturnType<typeof emptyPromptDraft> & {
  id?: string;
  version?: number;
  created_at?: string;
  updated_at?: string;
};

export default function PromptManagerPage() {
  const [prompts, setPrompts] = useState<PromptRecord[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptRecord | null>(null);
  const [draft, setDraft] = useState<PromptDraft | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | PromptCategory>('All');
  const [selectedTag, setSelectedTag] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function fetchPrompts() {
    const res = await fetch('/api/prompts');
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? 'Failed to load prompts');
    setPrompts(data as PromptRecord[]);
  }

  useEffect(() => {
    fetchPrompts().catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selectedPrompt) return;
    const refreshed = prompts.find((prompt) => prompt.id === selectedPrompt.id) ?? null;
    setSelectedPrompt(refreshed);
    setDraft(refreshed ? promptToDraft(refreshed) : null);
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
    return prompts.filter((prompt) => {
      const matchesCategory = selectedCategory === 'All' || prompt.category === selectedCategory;
      const matchesTag = !selectedTag || prompt.tags.includes(selectedTag);
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        prompt.name.toLowerCase().includes(query) ||
        prompt.content.toLowerCase().includes(query) ||
        prompt.tags.some((tag) => tag.toLowerCase().includes(query));
      return matchesCategory && matchesTag && matchesSearch;
    });
  }, [prompts, searchQuery, selectedCategory, selectedTag]);

  const categoriesCount = useMemo(() => {
    return {
      builder: prompts.filter((p) => p.category === 'builder').length,
      troubleshooter: prompts.filter((p) => p.category === 'troubleshooter').length,
      designer: prompts.filter((p) => p.category === 'designer').length,
      routing: prompts.filter((p) => p.category === 'routing').length,
    };
  }, [prompts]);

  const topTags = useMemo(() => {
    const counter: Record<string, number> = {};
    for (const prompt of prompts) {
      for (const tag of prompt.tags) counter[tag] = (counter[tag] ?? 0) + 1;
    }
    return Object.entries(counter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [prompts]);

  function handleCreatePrompt() {
    setSelectedPrompt(null);
    setDraft(emptyPromptDraft());
    setError(null);
  }

  async function handleUpdatePrompt() {
    if (!draft) return;
    setError(null);
    const tags = draft.tagsText.split(',').map((item) => item.trim()).filter(Boolean);

    if (!draft.name.trim() || !draft.content.trim()) {
      setError('Name and content are required.');
      return;
    }

    if (draft.id) {
      const res = await fetch('/api/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draft.id,
          updates: {
            name: draft.name,
            category: draft.category,
            content: draft.content,
            tags,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Failed to update prompt.');
        return;
      }
    } else {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          category: draft.category,
          content: draft.content,
          tags,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Failed to create prompt.');
        return;
      }
      setSelectedPrompt(data as PromptRecord);
    }

    await fetchPrompts();
  }

  async function handleDeletePrompt() {
    if (!draft?.id) return;
    setError(null);
    const res = await fetch(`/api/prompts?id=${encodeURIComponent(draft.id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? 'Failed to delete prompt.');
      return;
    }
    setSelectedPrompt(null);
    setDraft(null);
    await fetchPrompts();
  }

  async function handleExportJson() {
    const res = await fetch('/api/prompts?action=export');
    const data = await res.json();
    if (!res.ok) {
      setError((data as { error?: string })?.error ?? 'Failed to export prompts.');
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prompts.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        setError('Import file must be a JSON array of prompts.');
        return;
      }
      const res = await fetch('/api/prompts?action=import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts: parsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Failed to import prompts.');
        return;
      }
      setPrompts(data as PromptRecord[]);
      setSelectedPrompt(null);
      setDraft(null);
    } catch {
      setError('Invalid JSON file.');
    }
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', padding: '1rem' }}>
        <div style={{ maxWidth: '1320px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', marginBottom: '.75rem' }}>
            <button onClick={handleCreatePrompt} style={primaryBtn}>Create Prompt</button>
            <button onClick={handleExportJson} style={secondaryBtn}>Export JSON</button>
            <label style={{ ...secondaryBtn, cursor: 'pointer' }}>
              Import JSON
              <input type="file" accept=".json,application/json" onChange={handleImportJson} style={{ display: 'none' }} />
            </label>
          </div>

          {error && <p style={{ color: '#ff8f8f', margin: '0 0 .8rem 0', fontSize: '.85rem' }}>{error}</p>}

          <div style={{ display: 'grid', gridTemplateColumns: '220px 360px minmax(0,1fr)', gap: '.75rem' }}>
            <aside style={panelStyle}>
              <h3 style={panelTitle}>Categories</h3>
              <div style={{ display: 'grid', gap: '.3rem', fontSize: '.82rem', color: 'rgba(255,255,255,.8)' }}>
                <span>Builder: {categoriesCount.builder}</span>
                <span>Troubleshooter: {categoriesCount.troubleshooter}</span>
                <span>Designer: {categoriesCount.designer}</span>
                <span>Routing: {categoriesCount.routing}</span>
              </div>
              <h3 style={{ ...panelTitle, marginTop: '.9rem' }}>Tags</h3>
              <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
                {topTags.length === 0 ? (
                  <span style={{ color: 'rgba(255,255,255,.45)', fontSize: '.8rem' }}>No tags yet</span>
                ) : (
                  topTags.map(([tag, count]) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      style={{
                        background: selectedTag === tag ? 'rgba(91,211,255,.16)' : 'rgba(255,255,255,.05)',
                        color: '#e8f0fe',
                        border: '1px solid rgba(255,255,255,.14)',
                        borderRadius: '999px',
                        padding: '.2rem .55rem',
                        fontSize: '.72rem',
                        cursor: 'pointer',
                      }}
                    >
                      {tag} ({count})
                    </button>
                  ))
                )}
              </div>
              {selectedTag && (
                <button onClick={() => setSelectedTag('')} style={{ ...secondaryBtn, marginTop: '.6rem', width: '100%' }}>
                  Clear Tag Filter
                </button>
              )}
            </aside>

            <section style={panelStyle}>
              <h3 style={panelTitle}>Prompt List</h3>
              <PromptList
                prompts={filteredPrompts}
                selectedPromptId={selectedPrompt?.id ?? null}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                selectedTag={selectedTag}
                onSearchChange={setSearchQuery}
                onCategoryChange={setSelectedCategory}
                onTagChange={setSelectedTag}
                onSelectPrompt={(prompt) => {
                  setSelectedPrompt(prompt);
                  setDraft(promptToDraft(prompt));
                }}
              />
            </section>

            <section style={panelStyle}>
              <h3 style={panelTitle}>Prompt Editor</h3>
              <PromptEditor
                draft={draft}
                onChange={setDraft}
                onSave={handleUpdatePrompt}
                onDelete={handleDeletePrompt}
              />
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

const panelStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,.03)',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: '8px',
  padding: '.75rem',
};

const panelTitle: React.CSSProperties = {
  margin: '0 0 .7rem 0',
  color: '#fff',
  fontSize: '.82rem',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
};

const primaryBtn: React.CSSProperties = {
  background: '#5bd3ff',
  color: '#06111f',
  border: 'none',
  borderRadius: '6px',
  padding: '.55rem .9rem',
  fontWeight: 700,
  fontSize: '.75rem',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const secondaryBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,.08)',
  color: '#e8f0fe',
  border: '1px solid rgba(255,255,255,.15)',
  borderRadius: '6px',
  padding: '.55rem .9rem',
  fontWeight: 700,
  fontSize: '.75rem',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
};

