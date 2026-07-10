'use client';
import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import KnowledgeEditor, { emptyKnowledgeDraft, knowledgeToDraft } from '@/components/KnowledgeEditor';
import KnowledgeList from '@/components/KnowledgeList';
import KnowledgeViewer from '@/components/KnowledgeViewer';
import type { KnowledgeCategory, KnowledgeEntry } from '@/lib/knowledgeStore';

type KnowledgeDraft = ReturnType<typeof emptyKnowledgeDraft> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

const ALLOWED_UPLOAD_TYPES = ['text/plain', 'application/json'];

export default function KnowledgeVaultPage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);
  const [draft, setDraft] = useState<KnowledgeDraft | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | KnowledgeCategory>('All');
  const [selectedTag, setSelectedTag] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function fetchEntries() {
    const res = await fetch('/api/knowledge');
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? 'Failed to load knowledge entries');
    setEntries(data as KnowledgeEntry[]);
  }

  useEffect(() => {
    fetchEntries().catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selectedEntry) return;
    const refreshed = entries.find((entry) => entry.id === selectedEntry.id) ?? null;
    setSelectedEntry(refreshed);
    setDraft(refreshed ? knowledgeToDraft(refreshed) : null);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesCategory = selectedCategory === 'All' || entry.category === selectedCategory;
      const matchesTag = !selectedTag || entry.tags.includes(selectedTag);
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        entry.title.toLowerCase().includes(query) ||
        entry.content.toLowerCase().includes(query) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(query));
      return matchesCategory && matchesTag && matchesSearch;
    });
  }, [entries, searchQuery, selectedCategory, selectedTag]);

  const categoryCounts = useMemo(() => {
    return {
      general: entries.filter((e) => e.category === 'general').length,
      contact_center: entries.filter((e) => e.category === 'contact_center').length,
      routing: entries.filter((e) => e.category === 'routing').length,
      scripts: entries.filter((e) => e.category === 'scripts').length,
      prompts: entries.filter((e) => e.category === 'prompts').length,
    };
  }, [entries]);

  const topTags = useMemo(() => {
    const counter: Record<string, number> = {};
    for (const entry of entries) {
      for (const tag of entry.tags) counter[tag] = (counter[tag] ?? 0) + 1;
    }
    return Object.entries(counter).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [entries]);

  function handleCreateEntry() {
    setSelectedEntry(null);
    setDraft(emptyKnowledgeDraft());
    setError(null);
  }

  async function handleUpdateEntry() {
    if (!draft) return;
    setError(null);
    const tags = draft.tagsText.split(',').map((tag) => tag.trim()).filter(Boolean);

    if (!draft.title.trim() || !draft.content.trim()) {
      setError('Title and content are required.');
      return;
    }

    if (draft.id) {
      const res = await fetch('/api/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draft.id,
          updates: {
            title: draft.title,
            category: draft.category,
            content: draft.content,
            tags,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Failed to update entry.');
        return;
      }
    } else {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          category: draft.category,
          content: draft.content,
          tags,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Failed to create entry.');
        return;
      }
      setSelectedEntry(data as KnowledgeEntry);
    }

    await fetchEntries();
  }

  async function handleDeleteEntry() {
    if (!draft?.id) return;
    setError(null);
    const res = await fetch(`/api/knowledge?id=${encodeURIComponent(draft.id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? 'Failed to delete entry.');
      return;
    }
    setSelectedEntry(null);
    setDraft(null);
    await fetchEntries();
  }

  async function handleExportJson() {
    const res = await fetch('/api/knowledge?action=export');
    const data = await res.json();
    if (!res.ok) {
      setError((data as { error?: string })?.error ?? 'Failed to export knowledge.');
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'knowledge.json';
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
        setError('Import file must be a JSON array of knowledge entries.');
        return;
      }
      const res = await fetch('/api/knowledge?action=import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: parsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Failed to import knowledge.');
        return;
      }
      setEntries(data as KnowledgeEntry[]);
      setSelectedEntry(null);
      setDraft(null);
    } catch {
      setError('Invalid JSON file.');
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const extension = file.name.toLowerCase().split('.').pop();
    const allowedExtension = extension === 'txt' || extension === 'json';
    const allowedType = ALLOWED_UPLOAD_TYPES.includes(file.type) || file.type === '';
    if (!allowedExtension || !allowedType) {
      setError('Only .txt and .json files are supported for MVP.');
      return;
    }

    try {
      const content = await file.text();
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file.name,
          category: 'general',
          content,
          tags: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Failed to upload knowledge file.');
        return;
      }
      await fetchEntries();
      setSelectedEntry(data as KnowledgeEntry);
      setDraft(knowledgeToDraft(data as KnowledgeEntry));
    } catch {
      setError('Failed to read uploaded file.');
    }
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', padding: '1rem' }}>
        <div style={{ maxWidth: '1420px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', marginBottom: '.75rem' }}>
            <button onClick={handleCreateEntry} style={primaryBtn}>Add Knowledge</button>
            <button onClick={handleExportJson} style={secondaryBtn}>Export JSON</button>
            <label style={{ ...secondaryBtn, cursor: 'pointer' }}>
              Import JSON
              <input type="file" accept=".json,application/json" onChange={handleImportJson} style={{ display: 'none' }} />
            </label>
            <label style={{ ...secondaryBtn, cursor: 'pointer' }}>
              Upload File (.txt/.json)
              <input type="file" accept=".txt,.json,text/plain,application/json" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>

          {error && <p style={{ color: '#ff8f8f', margin: '0 0 .8rem 0', fontSize: '.85rem' }}>{error}</p>}

          <div style={{ display: 'grid', gridTemplateColumns: '220px 340px 360px minmax(0,1fr)', gap: '.75rem' }}>
            <aside style={panelStyle}>
              <h3 style={panelTitle}>Categories</h3>
              <div style={{ display: 'grid', gap: '.3rem', fontSize: '.82rem', color: 'rgba(255,255,255,.8)' }}>
                <span>General: {categoryCounts.general}</span>
                <span>Contact Center: {categoryCounts.contact_center}</span>
                <span>Routing: {categoryCounts.routing}</span>
                <span>Scripts: {categoryCounts.scripts}</span>
                <span>Prompts: {categoryCounts.prompts}</span>
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
              <h3 style={panelTitle}>Knowledge List</h3>
              <KnowledgeList
                entries={filteredEntries}
                selectedEntryId={selectedEntry?.id ?? null}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                selectedTag={selectedTag}
                onSearchChange={setSearchQuery}
                onCategoryChange={setSelectedCategory}
                onTagChange={setSelectedTag}
                onSelectEntry={(entry) => {
                  setSelectedEntry(entry);
                  setDraft(knowledgeToDraft(entry));
                }}
              />
            </section>

            <section style={panelStyle}>
              <h3 style={panelTitle}>Knowledge Editor</h3>
              <KnowledgeEditor
                draft={draft}
                onChange={setDraft}
                onSave={handleUpdateEntry}
                onDelete={handleDeleteEntry}
              />
            </section>

            <section style={panelStyle}>
              <h3 style={panelTitle}>Knowledge Viewer</h3>
              <KnowledgeViewer entry={selectedEntry} />
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

