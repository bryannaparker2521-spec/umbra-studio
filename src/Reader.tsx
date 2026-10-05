import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export function prose(value: unknown): string {
  if (typeof value === 'string') return value.replace(/^\s*===\s*UMBRA_RECORD_(?:BEGIN|END)\s*===\s*$/gim, '').replace(/^\s*(?:NAME|TYPE|DESTINATION|SLUG|CANON_STATUS|IMPORT_ACTION|CANONICAL_ID|ID)\s*:.*$/gm, '').replace(/^([A-Z][A-Z_ ]{1,60}):/gm, (_, label: string) => label.replace(/_/g, ' ').toLowerCase() + ':').replace(/https?:\/\/\S+/g, '').replace(/^\s*#{1,6}\s+/gm, '').replace(/\*\*|__|`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
  if (Array.isArray(value)) return value.map(prose).filter(Boolean).join('\n\n');
  if (value && typeof value === 'object') return Object.entries(value).filter(([k]) => !/(^id$|_id$|url|slug|_at$|^status$|workflow_status|canon_status|is_public|is_complete|classification|source_heading|smart_ingest|import_metadata|source_text|imported_source|structured_sections|unresolved_relationships)/i.test(k)).map(([, v]) => prose(v)).filter(Boolean).join('\n\n');
  return '';
}
export function readingSections(text: string): string[] {
  return prose(text).split(/\n\s*\n/).filter(Boolean).flatMap(paragraph => {
    const sentences = paragraph.match(/[^.!?]+(?:[.!?]+(?:["'”’])?|$)/g) || [paragraph];
    const sections: string[] = []; let part = '';
    for (const sentence of sentences) {
      if (part.length + sentence.length > 1100 && part) { sections.push(part.trim()); part = ''; }
      part += sentence;
    }
    if (part.trim()) sections.push(part.trim());
    return sections;
  });
}
type Reader = { read: (title: string, content: unknown) => void; stop: () => void; supported: boolean };
const ReaderContext = createContext<Reader>({ read: () => {}, stop: () => {}, supported: false });
export const useReader = () => useContext(ReaderContext);
export function ReadButton({ title, content, label = 'Read' }: { title: string; content: unknown; label?: string }) {
  const reader = useReader();
  return <button type="button" className="reader-read" disabled={!reader.supported || !prose(content)} title={reader.supported ? `Read ${title} aloud` : 'Speech is unavailable in this environment'} onClick={() => reader.read(title, content)}>🔊 {label}</button>;
}
export default function ReaderProvider({ children }: { children: ReactNode }) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState(() => localStorage.getItem('umbra-reader-voice') || '');
  const [rate, setRate] = useState(() => Number(localStorage.getItem('umbra-reader-speed')) || 1);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'stopped' | 'playing' | 'paused'>('stopped');
  const [index, setIndex] = useState(0);
  const [error, setError] = useState('');
  const sections = useRef<string[]>([]);
  const generation = useRef(0);
  const current = useRef(0);
  const preferences = useRef({ voices, voiceURI, rate }); preferences.current = { voices, voiceURI, rate };
  useEffect(() => {
    if (!supported) return;
    const refresh = () => setVoices(window.speechSynthesis.getVoices().sort((a,b) => voiceScore(b) - voiceScore(a)));
    refresh(); window.speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => { window.speechSynthesis.removeEventListener('voiceschanged', refresh); generation.current++; window.speechSynthesis.cancel(); };
  }, [supported]);
  function stop() { generation.current++; if (supported) window.speechSynthesis.cancel(); setStatus('stopped'); }
  function speak(position: number) {
    if (!supported || position < 0 || position >= sections.current.length) return;
    const token = ++generation.current;
    window.speechSynthesis.cancel(); current.current = position; setIndex(position); setStatus('playing'); setError('');
    const p = preferences.current;
    const utterance = new SpeechSynthesisUtterance(sections.current[position]);
    utterance.voice = p.voices.find(v => v.voiceURI === p.voiceURI) || p.voices[0] || null;
    utterance.lang = utterance.voice?.lang || 'en-US'; utterance.rate = p.rate;
    utterance.onend = () => {
      if (generation.current !== token) return;
      if (position + 1 < sections.current.length) setTimeout(() => { if (generation.current === token) speak(position + 1); }, 220); else setStatus('stopped');
    };
    utterance.onerror = event => { if (generation.current === token && event.error !== 'canceled' && event.error !== 'interrupted') { setError(`Voice could not speak (${event.error}). Choose another installed voice.`); setStatus('stopped'); } };
    window.speechSynthesis.speak(utterance);
  }
  function read(nextTitle: string, content: unknown) {
    stop(); sections.current = readingSections(prose(content)); setTitle(nextTitle);
    if (sections.current.length) speak(0);
  }
  return <ReaderContext.Provider value={{ read, stop, supported }}>{children}
    {title && <aside className="reader-bar" aria-label="Read Aloud controls">
      <span aria-live="polite"><strong>{title}</strong><small>{status} · Section {index + 1} / {sections.current.length}</small></span>
      <button onClick={() => speak(Math.max(0, current.current - 1))}>Previous section</button>
      {status === 'playing' ? <button onClick={() => { window.speechSynthesis.pause(); setStatus('paused'); }}>Pause</button> : <button onClick={() => { if (status === 'paused') { window.speechSynthesis.resume(); setStatus('playing'); } else speak(current.current); }}>{status === 'paused' ? 'Resume' : 'Play'}</button>}
      <button onClick={stop}>Stop</button>
      <button disabled={index + 1 >= sections.current.length} onClick={() => speak(current.current + 1)}>Next section</button>
      <label>Speed<select aria-label="Playback speed" value={rate} onChange={e => { const next = Number(e.target.value); preferences.current.rate = next; setRate(next); localStorage.setItem('umbra-reader-speed', String(next)); if (status !== 'stopped') speak(current.current); }}>{[.75,1,1.25,1.5,2].map(v => <option key={v} value={v}>{v}×</option>)}</select></label>
      <label>Voice<select aria-label="Reader voice" value={voiceURI} onChange={e => { preferences.current.voiceURI = e.target.value; setVoiceURI(e.target.value); localStorage.setItem('umbra-reader-voice', e.target.value); if (status !== 'stopped') speak(current.current); }}><option value="">Best available English system voice</option>{voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang}){v.localService ? ' · installed' : ''}</option>)}</select></label>
      <button aria-label="Close reader" onClick={() => { stop(); setTitle(''); }}>×</button>
      {error && <p role="alert">{error}</p>}
    </aside>}
  </ReaderContext.Provider>;
}
function voiceScore(voice: SpeechSynthesisVoice) {
  return (/^en[-_]/i.test(voice.lang) ? 100 : 0) + (voice.localService ? 30 : 0) + (/natural|neural|premium|enhanced/i.test(voice.name) ? 70 : 0) + (voice.default ? 5 : 0);
}
