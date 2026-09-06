import { useMemo, useState } from 'react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  Accessibility, ArrowLeft, ArrowRight, Building2, Check, ChevronDown, CircleHelp,
  Clock3, Compass, DoorOpen, Footprints, Info, Layers3, LocateFixed,
  MapPin, Menu, Minus, Navigation, Plus, Route as RouteIcon, Search, Star, X,
} from 'lucide-react';
import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import './index.css';

type Floor = { id: string; label: string; level: number; assetPath: string };
type Place = { id: string; name: string; type: string; floorId: string; code: string; x: number; y: number };
type RouteResult = { from: Place; to: Place; steps: string[]; distance: string; accessible: boolean };

const floors: Floor[] = [
  { id: 'ground', label: 'Ground', level: 0, assetPath: '/floorplans/rendered/ground.png' },
  { id: 'first', label: 'First', level: 1, assetPath: '/floorplans/rendered/first-floor.png' },
  { id: 'second', label: 'Second', level: 2, assetPath: '/floorplans/rendered/second-floor.png' },
  { id: 'third', label: 'Third', level: 3, assetPath: '/floorplans/rendered/third-floor.png' },
];

const places: Place[] = [
  { id: 'north-entry', name: 'North Entrance', type: 'Entrance', floorId: 'ground', code: 'G-01', x: 16, y: 78 },
  { id: 'atrium', name: 'Central Atrium', type: 'Landmark', floorId: 'ground', code: 'G-12', x: 52, y: 47 },
  { id: 'cafe', name: 'The Common Room', type: 'Food & drink', floorId: 'ground', code: 'G-18', x: 73, y: 32 },
  { id: 'library', name: 'Hawthorne Library', type: 'Study', floorId: 'first', code: '1-14', x: 69, y: 39 },
  { id: 'student-services', name: 'Student Services', type: 'Services', floorId: 'first', code: '1-03', x: 27, y: 61 },
  { id: 'makerspace', name: 'Makerspace', type: 'Lab', floorId: 'second', code: '2-21', x: 64, y: 28 },
  { id: 'lecture-theatre', name: 'Lecture Theatre B', type: 'Lecture', floorId: 'second', code: '2-08', x: 32, y: 54 },
  { id: 'wellness', name: 'Wellness Studio', type: 'Wellbeing', floorId: 'third', code: '3-06', x: 52, y: 38 },
  { id: 'roof-garden', name: 'Roof Garden', type: 'Outdoor', floorId: 'third', code: '3-22', x: 77, y: 69 },
];

const typeIcons: Record<string, typeof Building2> = {
  Entrance: DoorOpen, Landmark: Compass, 'Food & drink': Star, Study: Layers3,
  Services: Info, Lab: Building2, Lecture: RouteIcon, Wellbeing: Accessibility, Outdoor: LocateFixed,
};

function PlaceIcon({ type, size = 14 }: { type: string; size?: number }) {
  const Icon = typeIcons[type] ?? MapPin;
  return <Icon size={size} strokeWidth={1.8} />;
}

function Brand() {
  return (
    <Link href="/" className="brand-lockup" data-testid="link-home">
      <span className="brand-mark"><Compass size={19} strokeWidth={2.4} /></span>
      <span className="brand-copy"><span className="brand-name">Northstar</span><span className="brand-sub">Campus wayfinding</span></span>
    </Link>
  );
}

function Topbar() {
  const [location] = useLocation();
  return (
    <header className="topbar">
      <Brand />
      <nav className="topnav" aria-label="Primary navigation">
        <Link href="/" className={location === '/' ? 'active' : ''} data-testid="link-map"><MapPin size={14} />Live map</Link>
        <Link href="/about" className={location === '/about' ? 'active' : ''} data-testid="link-about"><CircleHelp size={14} />How it works</Link>
        <button type="button" data-testid="button-menu"><Menu size={17} /><span className="hidden sm:inline">Campus index</span></button>
      </nav>
    </header>
  );
}

function FloorRail({ floorId, onChange }: { floorId: string; onChange: (id: string) => void }) {
  return (
    <div className="floor-rail" aria-label="Choose floor">
      {floors.map((floor) => (
        <button type="button" key={floor.id} className={`floor-button ${floor.id === floorId ? 'active' : ''}`} onClick={() => onChange(floor.id)} data-testid={`button-floor-${floor.id}`}>
          <span className="floor-level">{floor.level === 0 ? 'G' : floor.level}</span>
          <span className="floor-label">{floor.label}</span>
        </button>
      ))}
    </div>
  );
}

function MapCanvas({ floorId, selected, route, onSelect, onFloorChange }: { floorId: string; selected?: Place; route?: RouteResult; onSelect: (place: Place) => void; onFloorChange: (id: string) => void }) {
  const floor = floors.find((item) => item.id === floorId) ?? floors[0];
  const visiblePlaces = places.filter((place) => place.floorId === floorId);
  return (
    <div className="map-card" data-testid="map-canvas">
      <div className="map-toolbar">
        <button type="button" className="toolbar-button" onClick={() => onSelect(places.find((p) => p.id === 'atrium')!)} data-testid="button-locate"><LocateFixed size={14} />Locate me</button>
        <button type="button" className="icon-button" aria-label="Zoom out" data-testid="button-zoom-out"><Minus size={15} /></button>
        <button type="button" className="icon-button" aria-label="Zoom in" data-testid="button-zoom-in"><Plus size={15} /></button>
      </div>
      <FloorRail floorId={floorId} onChange={onFloorChange} />
      <div className="map-canvas">
        <img className="map-image" src={floor.assetPath} alt={`${floor.label} floor plan`} data-testid={`img-floorplan-${floor.id}`} />
        <div className="map-wash" />
        <div className="marker-layer">
          {visiblePlaces.map((place) => (
            <button key={place.id} type="button" className={`place-marker ${selected?.id === place.id ? 'selected selected-marker' : ''}`} style={{ left: `${place.x}%`, top: `${place.y}%` }} onClick={() => onSelect(place)} aria-label={`Show ${place.name}`} data-testid={`marker-place-${place.id}`}><span>{place.code.split('-')[1]}</span></button>
          ))}
          {route?.from.floorId === floorId && route?.to.floorId === floorId && (
            <svg className="route-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Route line">
              <path className="route-line" d={`M ${route.from.x} ${route.from.y} C 38 48, 59 57, ${route.to.x} ${route.to.y}`} />
              <circle cx={route.from.x} cy={route.from.y} r="1.8" /><circle cx={route.to.x} cy={route.to.y} r="1.8" />
            </svg>
          )}
        </div>
      </div>
      <div className="map-caption"><Layers3 size={12} />{floor.label} floor · {visiblePlaces.length} mapped places</div>
    </div>
  );
}

function SearchPanel({ query, setQuery, onSelect }: { query: string; setQuery: (value: string) => void; onSelect: (place: Place) => void }) {
  const results = useMemo(() => places.filter((place) => `${place.name} ${place.type} ${place.code}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6), [query]);
  return (
    <section className="panel panel-pad" aria-label="Find a place">
      <div className="panel-title"><span>Find a place</span><small>{places.length} locations</small></div>
      <div className="search-wrap">
        <Search size={15} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} className="search-input" placeholder="Search rooms, services, landmarks" aria-label="Search places" data-testid="input-search-places" />
        {query && <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label="Clear search" data-testid="button-clear-search"><X size={14} /></button>}
      </div>
      <div className="results-list" data-testid="list-search-results">
        {results.length ? results.map((place) => (
          <button type="button" key={place.id} className="place-result" onClick={() => onSelect(place)} data-testid={`result-place-${place.id}`}>
            <span className="place-icon"><PlaceIcon type={place.type} /></span>
            <span className="place-result-copy"><span className="place-result-name">{place.name}</span><span className="place-result-meta">{place.type} · {place.code}</span></span>
            <ArrowRight size={13} className="ml-auto text-muted-foreground" />
          </button>
        )) : <div className="empty-search" data-testid="empty-search-results">No places match that search.</div>}
      </div>
    </section>
  );
}

function PlaceSelect({ label, value, onClick }: { label: string; value?: Place; onClick: () => void }) {
  return (
    <label className="field-label">{label}
      <button type="button" className="select-like" onClick={onClick} data-testid={`button-select-${label.toLowerCase()}`}>
        <span className="select-copy">{value ? <><strong>{value.name}</strong><span>{value.code} · {value.type}</span></> : <strong className="text-muted-foreground">Choose a place</strong>}</span><ChevronDown size={15} />
      </button>
    </label>
  );
}

function RoutePanel({ from, to, setFrom, setTo, accessible, setAccessible, onRoute }: { from?: Place; to?: Place; setFrom: (place?: Place) => void; setTo: (place?: Place) => void; accessible: boolean; setAccessible: (value: boolean) => void; onRoute: () => void }) {
  const [selecting, setSelecting] = useState<'from' | 'to' | null>(null);
  const choose = (place: Place) => { if (selecting === 'from') setFrom(place); if (selecting === 'to') setTo(place); setSelecting(null); };
  return (
    <section className="panel panel-pad" aria-label="Plan a route">
      <div className="panel-title"><span>Plan a route</span><small>Step by step</small></div>
      <div className="route-fields">
        <PlaceSelect label="Start" value={from} onClick={() => setSelecting('from')} />
        <div className="swap-row"><button type="button" className="swap-button" onClick={() => { setFrom(to); setTo(from); }} aria-label="Swap start and destination" data-testid="button-swap-route"><ArrowRight size={13} className="rotate-90" /></button></div>
        <PlaceSelect label="Destination" value={to} onClick={() => setSelecting('to')} />
        {selecting && <div className="results-list rise-in" data-testid="list-route-choices">{places.map((place) => <button type="button" className="place-result" key={place.id} onClick={() => choose(place)} data-testid={`route-choice-${place.id}`}><span className="place-icon"><PlaceIcon type={place.type} size={13} /></span><span className="place-result-copy"><span className="place-result-name">{place.name}</span><span className="place-result-meta">{place.code} · {place.type}</span></span></button>)}</div>}
        <button type="button" className="primary-button" onClick={onRoute} disabled={!from || !to || from.id === to.id} data-testid="button-generate-route"><Navigation size={15} />Show route</button>
      </div>
      <div className="access-toggle"><span className="flex items-center gap-2"><Accessibility size={14} />Step-free route</span><button type="button" className={`switch ${accessible ? 'on' : ''}`} onClick={() => setAccessible(!accessible)} aria-label="Toggle step-free route" data-testid="toggle-accessible-route"><span /></button></div>
    </section>
  );
}

function DetailCard({ place, onFrom, onTo }: { place?: Place; onFrom: () => void; onTo: () => void }) {
  if (!place) return <section className="detail-card rise-in" data-testid="empty-place-detail"><div className="detail-kicker"><span>Selected location</span><MapPin size={15} /></div><h2>Choose a place to begin.</h2><p>Tap a marker on the plan or search by room, service, or landmark.</p><div className="detail-meta"><span className="detail-chip">Multi-floor map</span><span className="detail-chip">Live guide</span></div></section>;
  return <section className="detail-card rise-in" data-testid={`detail-place-${place.id}`}><div className="detail-kicker"><span>{place.type}</span><span>{place.code}</span></div><h2>{place.name}</h2><p>Mapped on the {floors.find((floor) => floor.id === place.floorId)?.label.toLowerCase()} floor. Use it as your starting point or destination.</p><div className="detail-meta"><span className="detail-chip"><MapPin size={10} className="inline mr-1" />{place.code}</span><span className="detail-chip"><Check size={10} className="inline mr-1" />Verified</span></div><div className="detail-actions"><button type="button" className="ghost-button" onClick={onFrom} data-testid="button-use-as-start">Use as start</button><button type="button" className="ghost-button" onClick={onTo} data-testid="button-use-as-destination">Set destination</button></div></section>;
}

function RouteResultCard({ result }: { result: RouteResult }) {
  return <section className="panel panel-pad rise-in" data-testid="route-result"><div className="route-result-head"><h3>Best route</h3><span className="distance">{result.distance}</span></div><div className="route-summary"><span className="flex items-center gap-1"><Clock3 size={12} />{result.steps.length * 2 + 1} min</span><span className="flex items-center gap-1">{result.accessible ? <Accessibility size={12} /> : <Footprints size={12} />}{result.accessible ? 'Step-free' : 'Standard'}</span></div><div className="step-list">{result.steps.map((step, index) => <div className="step" key={`${step}-${index}`}><span className="step-index">{index + 1}</span><span className="step-copy">{step}</span></div>)}</div></section>;
}

function LiveMap() {
  const [floorId, setFloorId] = useState('ground');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Place>();
  const [from, setFrom] = useState<Place>();
  const [to, setTo] = useState<Place>();
  const [accessible, setAccessible] = useState(false);
  const [route, setRoute] = useState<RouteResult>();
  const makeRoute = () => {
    if (!from || !to) return;
    const sameFloor = from.floorId === to.floorId;
    const steps = sameFloor
      ? [`Begin at ${from.name}.`, `Follow the main corridor toward ${to.name}.`, `Arrive at ${to.code}.`]
      : [`Begin at ${from.name} and take the ${accessible ? 'accessible lift' : 'central lift or stairs'}.`, `Travel from ${floors.find((f) => f.id === from.floorId)?.label} to ${floors.find((f) => f.id === to.floorId)?.label} floor.`, `Follow signs to ${to.name}.`];
    setRoute({ from, to, steps, distance: sameFloor ? '86 m' : '164 m', accessible });
    setFloorId(from.floorId);
  };
  const reset = () => { setQuery(''); setSelected(undefined); setFrom(undefined); setTo(undefined); setRoute(undefined); setFloorId('ground'); setAccessible(false); };
  const selectPlace = (place: Place) => { setSelected(place); setFloorId(place.floorId); };
  return (
    <main className="page-frame">
      <div className="map-header"><div><div className="eyebrow">Northstar / Live map</div><h1 className="display">Find your next<br />right turn.</h1><p>Indoor wayfinding for the Hawthorne campus building.</p></div><div className="status-pill" data-testid="status-map-ready"><span className="status-dot" />Map data current</div></div>
      <div className="workspace">
        <MapCanvas floorId={floorId} selected={selected} route={route} onSelect={selectPlace} onFloorChange={setFloorId} />
        <aside className="side-stack">
          <SearchPanel query={query} setQuery={setQuery} onSelect={selectPlace} />
          <RoutePanel from={from} to={to} setFrom={setFrom} setTo={setTo} accessible={accessible} setAccessible={setAccessible} onRoute={makeRoute} />
          {route && <RouteResultCard result={route} />}
          <DetailCard place={selected} onFrom={() => setFrom(selected)} onTo={() => setTo(selected)} />
          <button type="button" className="toolbar-button w-full justify-center" onClick={reset} data-testid="button-reset-map"><ArrowLeft size={14} />Reset map</button>
        </aside>
      </div>
    </main>
  );
}

function About() {
  return <main className="about-page"><div className="about-hero"><div><div className="eyebrow">Northstar / A calmer way through</div><h1 className="display">The building<br /><em>makes sense.</em></h1><p>Northstar turns a complex multi-floor campus into one clear next step. Search a room, set a destination, and let the map carry the mental load.</p><Link href="/" className="primary-button inline-flex mt-7" data-testid="link-start-mapping"><MapPin size={15} />Open the live map</Link></div><div className="atlas-block"><div className="atlas-grid" /><div className="atlas-label"><span>Field note 001</span><strong>Every unfamiliar hallway has a landmark.</strong></div></div></div><div className="about-sections"><section><span className="about-section-number">01 / SEARCH</span><h2>Start with a name.</h2><p>Look up rooms, services, and landmarks from the live map. Results include their floor and campus code, so you know you have the right door.</p></section><section><span className="about-section-number">02 / ORIENT</span><h2>Read one floor at a time.</h2><p>Switch between Ground, First, Second, and Third floors without losing your place. The plan stays familiar as your route changes.</p></section><section><span className="about-section-number">03 / MOVE</span><h2>Take the next right turn.</h2><p>Set a start and destination for a short route summary. Turn on step-free routing when lifts and accessible paths matter.</p></section></div><div className="about-note"><p>Built for students, staff, and visitors who have somewhere to be.</p><Link href="/" className="about-link" data-testid="link-about-back">Back to the map <ArrowRight size={13} className="inline ml-1" /></Link></div></main>;
}

function Router() {
  return <><Topbar /><ErrorBoundary resetKey={useLocation()[0]}><Switch><Route path="/" component={LiveMap} /><Route path="/about" component={About} /><Route component={NotFound} /></Switch></ErrorBoundary></>;
}

const queryClient = new QueryClient();
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;