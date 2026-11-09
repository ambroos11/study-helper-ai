'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type Card = { id: string; term: string; definition: string };
type StudySet = { id: string; title: string; subject: string; description: string; cards: Card[]; createdAt: string };
type Message = { role: 'user' | 'assistant'; content: string };
type View = 'home' | 'tutor' | 'flashcards' | 'sets' | 'practice';

const starterSets: StudySet[] = [
  { id: 'bio-1', title: 'Biologie – De cel', subject: 'Biologie', description: 'Belangrijke onderdelen van de cel en hun functies.', createdAt: 'Vandaag', cards: [
    { id: 'b1', term: 'Celkern', definition: 'Bevat het DNA en regelt de activiteiten van de cel.' },
    { id: 'b2', term: 'Mitochondriën', definition: 'Produceren energie voor de cel via celademhaling.' },
    { id: 'b3', term: 'Celmembraan', definition: 'Regelt welke stoffen de cel binnenkomen en verlaten.' },
    { id: 'b4', term: 'Cytoplasma', definition: 'De vloeistof in de cel waarin de celorganellen liggen.' },
    { id: 'b5', term: 'Ribosomen', definition: 'Maken eiwitten aan de hand van genetische informatie.' },
  ]},
  { id: 'his-1', title: 'Geschiedenis – Begrippen', subject: 'Geschiedenis', description: 'Een korte set met historische kernbegrippen.', createdAt: 'Gisteren', cards: [
    { id: 'h1', term: 'Monarchie', definition: 'Een staatsvorm waarbij een vorst, zoals een koning, het staatshoofd is.' },
    { id: 'h2', term: 'Democratie', definition: 'Een bestuursvorm waarbij de bevolking rechtstreeks of via verkozen vertegenwoordigers invloed heeft.' },
    { id: 'h3', term: 'Grondwet', definition: 'De belangrijkste wet die de basisregels van een staat vastlegt.' },
  ]},
  { id: 'fr-1', title: 'Frans – Dagelijkse woordenschat', subject: 'Frans', description: 'Handige Franse woorden om te herhalen.', createdAt: 'Deze week', cards: [
    { id: 'f1', term: 'Apprendre', definition: 'Leren' },
    { id: 'f2', term: 'Réussir', definition: 'Slagen / succesvol zijn' },
    { id: 'f3', term: 'Un devoir', definition: 'Een taak / huiswerk' },
  ]},
];

const uid = () => Math.random().toString(36).slice(2, 10);

export default function Home() {
  const [view, setView] = useState<View>('home');
  const [sets, setSets] = useState<StudySet[]>(starterSets);
  const [activeSetId, setActiveSetId] = useState('bio-1');
  const [loaded, setLoaded] = useState(false);
  const [language, setLanguage] = useState('nl');
  const [flipped, setFlipped] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceScore, setPracticeScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [practiceDone, setPracticeDone] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Algemeen');
  const [newCards, setNewCards] = useState('');
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');
  const [chat, setChat] = useState<Message[]>([{ role: 'assistant', content: 'Hallo! Ik ben Study Helper AI. Stel me een vraag over je leerstof, of plak je cursus hieronder. Ik help je stap voor stap begrijpen.' }]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('Study Helper AI-study-sets-v2');
      if (raw) {
        const parsed = JSON.parse(raw) as StudySet[];
        if (Array.isArray(parsed) && parsed.length) {
          setSets(parsed);
          setActiveSetId(parsed[0].id);
        }
      }
    } catch { /* use starter sets */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem('Study Helper AI-study-sets-v2', JSON.stringify(sets));
  }, [sets, loaded]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat, chatBusy]);

  const activeSet = sets.find(s => s.id === activeSetId) || sets[0];
  const activeCard = activeSet?.cards[cardIndex];
  const totalCards = sets.reduce((n, s) => n + s.cards.length, 0);
  const subjectCount = new Set(sets.map(s => s.subject)).size;

  const quiz = useMemo(() => {
    if (!activeSet) return [];
    return activeSet.cards.map((card, i) => {
      const distractors = activeSet.cards.filter((_, j) => j !== i).map(c => c.definition);
      const choices = [card.definition, ...distractors.slice(0, 3)].sort((a, b) => a.localeCompare(b));
      return { card, choices };
    });
  }, [activeSet]);
  const currentQuestion = quiz[practiceIndex];

  function go(next: View) {
    setView(next);
    setNotice('');
    if (next === 'flashcards') { setCardIndex(0); setFlipped(false); }
    if (next === 'practice') { setPracticeIndex(0); setPracticeScore(0); setSelectedAnswer(null); setPracticeDone(false); }
  }

  function chooseSet(id: string) {
    setActiveSetId(id); setCardIndex(0); setFlipped(false); setPracticeIndex(0); setPracticeScore(0); setSelectedAnswer(null); setPracticeDone(false);
  }

  function nextCard(direction: number) {
    if (!activeSet?.cards.length) return;
    setCardIndex((v) => (v + direction + activeSet.cards.length) % activeSet.cards.length);
    setFlipped(false);
  }

  function shuffleCards() {
    if (!activeSet) return;
    const shuffled = [...activeSet.cards].sort(() => Math.random() - .5);
    setSets(prev => prev.map(s => s.id === activeSet.id ? { ...s, cards: shuffled } : s));
    setCardIndex(0); setFlipped(false);
  }

  function createManualSet(e: FormEvent) {
    e.preventDefault();
    const cards = newCards.split('\n').map(line => line.split('|')).filter(parts => parts.length >= 2 && parts[0].trim() && parts.slice(1).join('|').trim()).map(parts => ({ id: uid(), term: parts[0].trim(), definition: parts.slice(1).join('|').trim() }));
    if (!newTitle.trim() || cards.length === 0) { setNotice('Vul een titel in en voeg minstens één kaart toe. Gebruik: begrip | uitleg.'); return; }
    const set: StudySet = { id: uid(), title: newTitle.trim(), subject: newSubject.trim() || 'Algemeen', description: `${cards.length} flashcards`, createdAt: 'Net gemaakt', cards };
    setSets(prev => [set, ...prev]); setActiveSetId(set.id); setNewTitle(''); setNewCards(''); setView('flashcards'); setCardIndex(0); setFlipped(false); setNotice('Je nieuwe leerbundel is opgeslagen op dit apparaat.');
  }

  async function generateCards(e: FormEvent) {
    e.preventDefault();
    if (sourceText.trim().length < 30) { setNotice('Plak eerst wat meer leerstof (minstens 30 tekens).'); return; }
    setAiBusy(true); setNotice('');
    try {
      const res = await fetch('/api/study', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'flashcards', text: sourceText, language }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI-generatie is mislukt.');
      const cards = (data.cards || []).filter((c: any) => c.term && c.definition).map((c: any) => ({ id: uid(), term: String(c.term), definition: String(c.definition) }));
      if (!cards.length) throw new Error('De AI gaf geen bruikbare kaarten terug. Probeer opnieuw.');
      const set: StudySet = { id: uid(), title: data.title || 'Nieuwe AI-leerbundel', subject: data.subject || 'Algemeen', description: 'Gegenereerd op basis van jouw cursus', createdAt: 'Net gemaakt', cards };
      setSets(prev => [set, ...prev]); setActiveSetId(set.id); setSourceText(''); setView('flashcards'); setCardIndex(0); setFlipped(false); setNotice(`${cards.length} flashcards gemaakt en opgeslagen.`);
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Er ging iets mis.'); }
    finally { setAiBusy(false); }
  }

  async function sendChat(e: FormEvent) {
    e.preventDefault();
    const question = chatInput.trim();
    if (!question || chatBusy) return;
    setChat(prev => [...prev, { role: 'user', content: question }]); setChatInput(''); setChatBusy(true);
    try {
      const form = new FormData(); form.append('message', question); form.append('language', language);
      const res = await fetch('/api/chat', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'De AI kon niet antwoorden.');
      setChat(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err) { setChat(prev => [...prev, { role: 'assistant', content: err instanceof Error ? err.message : 'Er ging iets mis.' }]); }
    finally { setChatBusy(false); }
  }

  function answerQuestion(answer: string) {
    if (!currentQuestion || selectedAnswer) return;
    setSelectedAnswer(answer);
    if (answer === currentQuestion.card.definition) setPracticeScore(v => v + 1);
  }

  function nextQuestion() {
    if (practiceIndex + 1 >= quiz.length) setPracticeDone(true);
    else { setPracticeIndex(v => v + 1); setSelectedAnswer(null); }
  }

  const nav = [
    { id: 'home' as View, icon: '⌂', label: 'Overzicht' },
    { id: 'tutor' as View, icon: '✦', label: 'AI Tutor' },
    { id: 'flashcards' as View, icon: '▤', label: 'Flashcards' },
    { id: 'sets' as View, icon: '▦', label: 'Mijn leerbundels' },
    { id: 'practice' as View, icon: '✓', label: 'Oefenen' },
  ];

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-logo">L</div><span>Study Helper AI</span><span className="brand-dot">✦</span></div>
      <div className="workspace-label">STUDIEOMGEVING</div>
      <nav className="nav-list">{nav.map(item => <button key={item.id} className={`nav-link ${view === item.id ? 'selected' : ''}`} onClick={() => go(item.id)}><span className="nav-icon">{item.icon}</span>{item.label}{item.id === 'sets' && <span className="nav-count">{sets.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="upgrade-card"><div className="upgrade-spark">✧</div><strong>Leer slimmer met Study Helper AI</strong><p>Jouw cursus. Jouw tempo. Jouw vooruitgang.</p><span className="mini-pill">AI STUDY SPACE</span></div>
        <div className="profile-row"><div className="avatar">S</div><div><strong>Student</strong><small>Mijn leeromgeving</small></div><span className="profile-dots">•••</span></div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb"> <span>/</span> {nav.find(n => n.id === view)?.label}</div><div className="top-actions"><span className="online-dot"/> <span className="top-status">Jouw persoonlijke studieplek</span><select value={language} onChange={e => setLanguage(e.target.value)} className="language-select" aria-label="Taal"><option value="nl">NL</option><option value="en">EN</option><option value="fr">FR</option></select><div className="top-avatar">S</div></div></header>
      <div className="page-content">
        {notice && <div className="notice" role="status"><span>✦</span>{notice}<button onClick={() => setNotice('')} aria-label="Melding sluiten">×</button></div>}

        {view === 'home' && <>
          <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> JOUW PERSOONLIJKE AI-STUDIEPLEK</div><h1>Studeer slimmer.<br/><span>Leer met vertrouwen.</span></h1><p className="lead">Van cursus naar kennis. Oefen met AI, onthoud met flashcards en ontdek wat je al beheerst.</p><div className="welcome-actions"><button className="btn-primary" onClick={() => go('tutor')}>Start met leren <span>→</span></button><button className="btn-quiet" onClick={() => go('sets')}>Bekijk leerbundels</button></div></div><div className="hero-art"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-core"><span>✦</span><strong></strong><small>LEARN • PRACTISE • GROW</small></div><div className="float-card float-a"><span className="float-icon purple">▤</span><div><b>Flashcards</b><small>Onthoud belangrijke info</small></div></div><div className="float-card float-b"><span className="float-icon green">✓</span><div><b>Jouw voortgang</b><small>Stap voor stap vooruit</small></div></div></div></section>
          <section className="stats-grid"><div className="stat-card"><span className="stat-icon violet">▦</span><div><small>Leerbundels</small><strong>{sets.length}</strong><em>Op dit apparaat opgeslagen</em></div></div><div className="stat-card"><span className="stat-icon blue">▤</span><div><small>Flashcards</small><strong>{totalCards}</strong><em>Om te herhalen</em></div></div><div className="stat-card"><span className="stat-icon mint">◈</span><div><small>Vakken</small><strong>{subjectCount}</strong><em>In jouw bibliotheek</em></div></div><div className="stat-card"><span className="stat-icon peach">✦</span><div><small>Studietools</small><strong>4</strong><em>AI en actief oefenen</em></div></div></section>
          <div className="section-heading"><div><h2>Wat wil je vandaag doen?</h2><p>Kies een tool en ga meteen aan de slag.</p></div></div>
          <section className="feature-grid"><button className="feature-card feature-ai" onClick={() => go('tutor')}><div className="feature-icon">✦</div><span className="feature-tag">AI-ASSISTENT</span><h3>Vraag het aan </h3><p>Stel vragen en krijg uitleg die past bij jouw leerstof.</p><span className="feature-arrow">Open AI Tutor ↗</span></button><button className="feature-card" onClick={() => go('flashcards')}><div className="feature-icon lilac">▤</div><span className="feature-tag">ACTIEF LEREN</span><h3>Oefen met flashcards</h3><p>Herhaal begrippen en definities met interactieve kaartjes.</p><span className="feature-arrow">Start herhalen ↗</span></button><button className="feature-card" onClick={() => go('sets')}><div className="feature-icon aqua">▦</div><span className="feature-tag">JOUW BIBLIOTHEEK</span><h3>Maak een leerbundel</h3><p>Bewaar je eigen kaartensets per vak of hoofdstuk.</p><span className="feature-arrow">Maak leerbundel ↗</span></button><button className="feature-card" onClick={() => go('practice')}><div className="feature-icon peach-bg">✓</div><span className="feature-tag">KENNIS TESTEN</span><h3>Test jezelf</h3><p>Beantwoord vragen en controleer wat je al kent.</p><span className="feature-arrow">Start oefening ↗</span></button></section>
          <div className="section-heading section-heading-spaced"><div><h2>Verder leren</h2><p>Ga verder met een van je recente leerbundels.</p></div><button className="text-button" onClick={() => go('sets')}>Alle bundels bekijken →</button></div>
          <div className="set-grid">{sets.slice(0, 3).map((s, i) => <button className="set-card" key={s.id} onClick={() => { chooseSet(s.id); go('flashcards'); }}><div className={`set-cover cover-${i % 3}`}><span>{s.subject.slice(0, 2).toUpperCase()}</span><i>✦</i></div><div className="set-info"><span className="subject-label">{s.subject}</span><strong>{s.title}</strong><small>{s.cards.length} kaarten · {s.createdAt}</small></div><span className="set-arrow">↗</span></button>)}</div>
        </>}

        {view === 'tutor' && <section className="tool-page"><div className="page-title-row"><div><div className="eyebrow">JOUW AI-STUDIECOACH</div><h1>Vraag het aan <span>.</span></h1><p>Stel je vraag, vraag om uitleg of laat je overhoren.</p></div><div className="ai-badge"><span/> AI TUTOR</div></div><div className="tutor-layout"><div className="chat-panel"><div className="chat-header"><div className="bot-avatar">✦</div><div><strong> Tutor</strong><small><span className="online-dot"/> Klaar om je te helpen</small></div><button className="icon-button" onClick={() => setChat([{ role: 'assistant', content: 'Nieuwe chat gestart! Waarmee kan ik je helpen?' }])}>＋ Nieuwe chat</button></div><div className="chat-messages">{chat.map((m, i) => <div className={`chat-message ${m.role}`} key={i}><div className="message-avatar">{m.role === 'assistant' ? '✦' : 'S'}</div><div className="message-bubble">{m.content}</div></div>)}{chatBusy && <div className="chat-message assistant"><div className="message-avatar">✦</div><div className="message-bubble typing"> denkt na <i/><i/><i/></div></div>}<div ref={chatEnd}/></div><form className="chat-compose" onSubmit={sendChat}><textarea value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Stel een vraag over je leerstof..." onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement)?.requestSubmit(); } }}/><div className="compose-bottom"><span>Enter om te versturen · Shift + Enter voor nieuwe regel</span><button className="btn-primary" disabled={chatBusy || !chatInput.trim()}>Verstuur ↑</button></div></form></div><aside className="tutor-side"><div className="side-panel"><span className="side-panel-icon">✧</span><h3>Waarmee kan ik helpen?</h3><p>Probeer een van deze opdrachten.</p>{['Leg dit eenvoudig uit met een voorbeeld.','Overhoor mij over de belangrijkste begrippen.','Maak een korte samenvatting van dit onderwerp.','Geef mij 5 oefenvragen met oplossingen.'].map(x => <button className="suggestion" key={x} onClick={() => setChatInput(x)}>{x}<span>↗</span></button>)}</div><div className="tip-panel"><strong>✦ Leertip</strong><p>Actief ophalen uit je geheugen helpt om leerstof beter te onthouden. Vraag  om je te overhoren in plaats van alleen te herlezen.</p></div></aside></div></section>}

        {view === 'flashcards' && <section className="tool-page"><div className="page-title-row"><div><div className="eyebrow">ACTIEF HERHALEN</div><h1>Leer met <span>flashcards.</span></h1><p>Bekijk een begrip, denk na en draai de kaart om voor de uitleg.</p></div><button className="btn-secondary" onClick={() => go('sets')}>＋ Nieuwe leerbundel</button></div>{sets.length > 0 && <div className="study-toolbar"><label>Leerbundel<select value={activeSet?.id || ''} onChange={e => chooseSet(e.target.value)}>{sets.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label><div className="study-toolbar-actions"><span>{activeSet?.subject}</span><button className="btn-quiet small" onClick={shuffleCards}>⇄ Schud kaarten</button></div></div>}{activeSet && activeSet.cards.length > 0 ? <div className="flashcard-workspace"><div className="flashcard-progress"><span>KAART {cardIndex + 1} <i>/</i> {activeSet.cards.length}</span><div className="progress-track"><span style={{ width: `${((cardIndex + 1) / activeSet.cards.length) * 100}%` }}/></div><span>{Math.round(((cardIndex + 1) / activeSet.cards.length) * 100)}%</span></div><button className={`flashcard ${flipped ? 'is-flipped' : ''}`} onClick={() => setFlipped(v => !v)}><span className="card-topline">{flipped ? 'UITLEG' : 'BEGRIP'} <span>✦ </span></span><strong>{flipped ? activeCard.definition : activeCard.term}</strong><span className="card-hint">{flipped ? 'Klik om terug te draaien' : 'Klik op de kaart om de uitleg te zien'}</span></button><div className="flashcard-controls"><button className="round-control" onClick={() => nextCard(-1)} aria-label="Vorige kaart">←</button><button className="btn-secondary" onClick={() => setFlipped(v => !v)}>↻ Draai kaart om</button><button className="round-control next" onClick={() => nextCard(1)} aria-label="Volgende kaart">→</button></div><div className="study-modes"><button onClick={() => go('practice')}><span>✓</span><b>Test jezelf</b><small>Oefen met deze bundel</small></button><button onClick={() => go('tutor')}><span>✦</span><b>Vraag AI Tutor</b><small>Vraag extra uitleg</small></button></div></div> : <div className="empty-state">Je leerbundel heeft nog geen kaarten. Maak er een aan bij Mijn leerbundels.</div>}</section>}

        {view === 'sets' && <section className="tool-page"><div className="page-title-row"><div><div className="eyebrow">JOUW PERSOONLIJKE BIBLIOTHEEK</div><h1>Mijn <span>leerbundels.</span></h1><p>Maak kaartensets zoals bij een flashcard-app en oefen ze wanneer je wilt.</p></div><span className="collection-count">{sets.length} bundels</span></div><div className="create-layout"><div className="create-panel"><div className="panel-heading"><div className="create-icon">＋</div><div><h2>Maak zelf een leerbundel</h2><p>Voeg begrippen en definities toe.</p></div></div><form onSubmit={createManualSet} className="create-form"><label>Titel van de leerbundel<input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Bijv. Biologie – Hoofdstuk 3"/></label><label>Vak<input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Bijv. Biologie"/></label><label>Flashcards <small>Gebruik één regel per kaart: begrip | uitleg</small><textarea className="cards-input" value={newCards} onChange={e => setNewCards(e.target.value)} placeholder={'Celkern | Bevat het DNA van de cel.\nMitochondriën | Produceren energie voor de cel.\nCelmembraan | Regelt transport in en uit de cel.'}/></label><button className="btn-primary" type="submit">Leerbundel opslaan <span>→</span></button></form></div><div className="ai-create-panel"><div className="ai-create-top"><span className="ai-star">✦</span><span className="ai-label">AI-GENERATOR</span></div><h2>Laat AI je flashcards maken.</h2><p>Plak je cursus of een stuk leerstof.  haalt de belangrijkste begrippen eruit en maakt vraag-antwoordkaarten.</p><form onSubmit={generateCards}><textarea value={sourceText} onChange={e => setSourceText(e.target.value)} placeholder="Plak hier je cursus, notities of leerstof..."/><div className="ai-create-bottom"><span>Minimaal 30 tekens · Houd persoonsgegevens uit je tekst.</span><button className="btn-primary" disabled={aiBusy || sourceText.trim().length < 30}>{aiBusy ? 'Bezig...' : '✦ Genereer kaarten'}</button></div></form></div></div><div className="section-heading section-heading-spaced"><div><h2>Alle leerbundels</h2><p>Je bundels worden lokaal in deze browser bewaard.</p></div></div><div className="library-grid">{sets.map((s, i) => <div className="library-card" key={s.id}><button className={`library-cover cover-${i % 3}`} onClick={() => { chooseSet(s.id); go('flashcards'); }}><span>{s.subject.slice(0, 2).toUpperCase()}</span><i>✦</i><b>OPEN BUNDEL ↗</b></button><div className="library-meta"><span className="subject-label">{s.subject}</span><strong>{s.title}</strong><small>{s.cards.length} flashcards · {s.createdAt}</small><div className="library-actions"><button onClick={() => { chooseSet(s.id); go('flashcards'); }}>Studeren →</button><button className="delete-button" onClick={() => { if (confirm(`Verwijder '${s.title}'?`)) { setSets(prev => prev.filter(x => x.id !== s.id)); if (activeSetId === s.id) setActiveSetId(sets.find(x => x.id !== s.id)?.id || ''); } }}>Verwijderen</button></div></div></div>)}</div></section>}

        {view === 'practice' && <section className="tool-page"><div className="page-title-row"><div><div className="eyebrow">KENNIS TESTEN</div><h1>Oefen en <span>onthoud.</span></h1><p>Test jezelf met meerkeuzevragen uit je eigen flashcards.</p></div><div className="ai-badge">✓ OEFENMODUS</div></div>{sets.length > 0 && <div className="study-toolbar"><label>Leerbundel<select value={activeSet?.id || ''} onChange={e => chooseSet(e.target.value)}>{sets.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label><span>{activeSet?.cards.length || 0} vragen mogelijk</span></div>}{currentQuestion && !practiceDone ? <div className="quiz-wrap"><div className="quiz-top"><span>VRAAG {practiceIndex + 1} VAN {quiz.length}</span><span>SCORE: {practiceScore}</span></div><div className="progress-track quiz-progress"><span style={{ width: `${((practiceIndex + 1) / quiz.length) * 100}%` }}/></div><div className="quiz-card"><span className="question-type">WAT BETEKENT DIT BEGRIP?</span><h2>{currentQuestion.card.term}</h2><p>Kies de juiste uitleg.</p><div className="answer-list">{currentQuestion.choices.map((choice, i) => <button key={i} disabled={!!selectedAnswer} className={`answer-option ${selectedAnswer && choice === currentQuestion.card.definition ? 'correct' : ''} ${selectedAnswer === choice && choice !== currentQuestion.card.definition ? 'incorrect' : ''}`} onClick={() => answerQuestion(choice)}><span>{String.fromCharCode(65 + i)}</span>{choice}{selectedAnswer && choice === currentQuestion.card.definition && <b>✓</b>}</button>)}</div>{selectedAnswer && <div className={`answer-feedback ${selectedAnswer === currentQuestion.card.definition ? 'good' : 'try-again'}`}>{selectedAnswer === currentQuestion.card.definition ? 'Goed gedaan! Dat is juist.' : 'Nog niet juist. Bekijk de correcte uitleg en probeer die te onthouden.'}</div>}<div className="quiz-footer"><span>{selectedAnswer ? 'Je antwoord is geregistreerd.' : 'Neem rustig de tijd.'}</span><button className="btn-primary" disabled={!selectedAnswer} onClick={nextQuestion}>{practiceIndex + 1 === quiz.length ? 'Resultaat bekijken' : 'Volgende vraag →'}</button></div></div></div> : practiceDone ? <div className="result-card"><div className="result-icon">✦</div><div className="eyebrow">OEFENING VOLTOOID</div><h2>Goed gewerkt!</h2><p>Je hebt {practiceScore} van de {quiz.length} vragen juist beantwoord.</p><div className="result-score">{Math.round((practiceScore / Math.max(quiz.length, 1)) * 100)}<small>%</small></div><div className="result-actions"><button className="btn-primary" onClick={() => { setPracticeIndex(0); setPracticeScore(0); setSelectedAnswer(null); setPracticeDone(false); }}>Opnieuw oefenen</button><button className="btn-quiet" onClick={() => go('flashcards')}>Flashcards herhalen</button></div></div> : <div className="empty-state">Maak eerst een leerbundel met flashcards om te oefenen.</div>}</section>}
      </div>
    </main>
  </div>;
}
