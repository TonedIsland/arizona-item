import { useState, useEffect, useCallback, useRef, memo } from "react";
import { Search, ArrowLeft, X, Loader2, Wifi, WifiOff } from "lucide-react";

const IMG_BASE = "https://reserve-cdn.azresources.cloud/projects/arizona-rp/assets/images/donate/";
const API_URI = "https://server-api.arizona.games/client/json/table/get?project=arizona&server=0&key=inventory_items";
const BATCH_SIZE = 40;

interface Item { id: number; name?: string; }

/* ═══ Minimal grid background ═══ */
const GridBg = () => (
  <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.04]"
    style={{ backgroundImage: "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
);

/* ═══ Item Card — brutalist modern ═══ */
const ItemCard = memo(({ id, name, delay, onClick, onError }: {
  id: number; name: string; delay: number; onClick: () => void; onError: () => void;
}) => (
  <div
    className="opacity-0 cursor-pointer group"
    style={{ animation: `fade-up 0.4s ease-out ${delay}ms forwards` }}
    onClick={onClick}
  >
    <div className="relative border border-border bg-card transition-all duration-300 group-hover:border-foreground/30 group-hover:-translate-y-1 group-hover:shadow-[0_20px_40px_hsl(0_0%_0%_/_0.4)]">
      {/* Top accent line */}
      <div className="h-[2px] w-full bg-foreground/20 group-hover:bg-foreground transition-colors duration-300" />

      {/* ID tag */}
      <div className="absolute top-3 right-3 z-10">
        <span className="mono text-[10px] font-medium text-muted-foreground bg-background/80 border border-border px-2 py-0.5">
          {id}
        </span>
      </div>

      {/* Image */}
      <div className="flex items-center justify-center py-8 px-4 bg-background/50">
        <img
          src={`${IMG_BASE}${id}.webp`}
          alt={name}
          loading="lazy"
          onError={onError}
          className="max-w-[80px] h-auto transition-transform duration-500 group-hover:scale-110"
          style={{ filter: "drop-shadow(0 4px 12px hsl(0 0% 0% / 0.5))" }}
        />
      </div>

      {/* Name */}
      <div className="border-t border-border px-3 py-2.5">
        <p className="text-[11px] font-medium text-muted-foreground text-center leading-tight line-clamp-2 group-hover:text-foreground transition-colors mono">
          {name}
        </p>
      </div>
    </div>
  </div>
));
ItemCard.displayName = "ItemCard";

/* ═══ Modal ═══ */
const ItemModal = ({ isOpen, src, name, id, onClose }: {
  isOpen: boolean; src: string; name: string; id: number; onClose: () => void;
}) => {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", h); };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center"
      style={{ background: "hsl(0 0% 0% / 0.9)", backdropFilter: "blur(20px)" }}
      onClick={onClose}>
      <div className="relative max-w-[420px] w-[92vw] border border-border bg-card"
        onClick={e => e.stopPropagation()}>
        {/* Top bar */}
        <div className="h-[2px] w-full bg-foreground" />
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <span className="mono text-xs text-muted-foreground">ITEM_{id}</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Image */}
        <div className="flex items-center justify-center py-12 px-8 bg-background/50">
          <img src={src} alt={name}
            className="max-w-[220px] max-h-[220px] object-contain animate-float"
            style={{ filter: "drop-shadow(0 12px 30px hsl(0 0% 0% / 0.5))" }} />
        </div>

        {/* Info */}
        <div className="border-t border-border px-5 py-4 space-y-2">
          <h2 className="text-lg font-semibold text-foreground">{name}</h2>
          <span className="mono text-xs text-muted-foreground">ID: {id}</span>
        </div>
      </div>
    </div>
  );
};

/* ═══ Main Page ═══ */
const Index = () => {
  const [database, setDatabase] = useState<Item[]>([]);
  const [filtered, setFiltered] = useState<Item[]>([]);
  const [displayed, setDisplayed] = useState<Item[]>([]);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [apiReady, setApiReady] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [search, setSearch] = useState("");
  const [startId, setStartId] = useState(9760);
  const [endId, setEndId] = useState(10000);
  const [modal, setModal] = useState({ open: false, src: "", name: "", id: 0 });
  const idxRef = useRef(0);

  useEffect(() => {
    fetch(API_URI).then(r => r.json()).then((d: Item[]) => { setDatabase(d); setApiReady(true); }).catch(() => setApiError(true));
  }, []);

  const loadMore = useCallback(() => {
    setDisplayed(prev => { const next = filtered.slice(0, prev.length + BATCH_SIZE); idxRef.current = next.length; return next; });
  }, [filtered]);

  useEffect(() => {
    const h = () => { if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 800 && idxRef.current < filtered.length) loadMore(); };
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, [filtered, loadMore]);

  const doSearch = (q: string) => {
    setSearch(q);
    const v = q.toLowerCase().trim();
    if (v.length > 0) {
      const r = !isNaN(Number(v)) ? database.filter(i => i.id.toString().includes(v)) : database.filter(i => i.name?.toLowerCase().includes(v));
      setFiltered(r); setDisplayed(r.slice(0, BATCH_SIZE)); idxRef.current = Math.min(BATCH_SIZE, r.length);
      setMinimized(true); setShowGallery(true);
    } else { setMinimized(false); setShowGallery(false); }
  };

  const doRange = () => {
    const r = database.filter(i => i.id >= startId && i.id <= endId);
    setFiltered(r); setDisplayed(r.slice(0, BATCH_SIZE)); idxRef.current = Math.min(BATCH_SIZE, r.length);
    setShowWelcome(false); setShowGallery(true);
  };

  const goBack = () => { setShowWelcome(true); setShowGallery(false); setMinimized(false); setHidden(new Set()); };

  const visible = displayed.filter(i => !hidden.has(i.id));

  return (
    <div className="flex flex-col items-center min-h-screen relative">
      <GridBg />

      {/* Back */}
      {!showWelcome && (
        <button onClick={goBack}
          className="fixed top-5 left-5 z-50 bg-card border border-border hover:border-foreground/30 px-4 py-2 text-sm flex items-center gap-2 transition-all duration-200 mono">
          <ArrowLeft className="w-4 h-4" /> BACK
        </button>
      )}

      {/* ═══ Welcome Panel ═══ */}
      {showWelcome && (
        <div className={`relative z-10 w-full max-w-[480px] mx-4 transition-all duration-500 ${
          minimized ? "mt-6 mb-4" : "mt-24 mb-10"
        }`} style={{ animation: "fade-up 0.6s ease-out" }}>

          <div className="border border-border bg-card relative overflow-hidden">
            {/* Top accent */}
            <div className="h-[2px] w-full bg-foreground" />

            {/* Header bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-foreground" />
                <span className="mono text-[10px] text-muted-foreground uppercase tracking-widest">Arizona Items</span>
              </div>
              <div className="flex items-center gap-1.5">
                {apiError ? (
                  <><WifiOff className="w-3 h-3 text-destructive" /><span className="mono text-[9px] text-destructive">OFFLINE</span></>
                ) : apiReady ? (
                  <><Wifi className="w-3 h-3 text-foreground/50" /><span className="mono text-[9px] text-foreground/50">ONLINE</span></>
                ) : (
                  <><Loader2 className="w-3 h-3 text-muted-foreground animate-spin" /><span className="mono text-[9px] text-muted-foreground">SYNC</span></>
                )}
              </div>
            </div>

            {/* Content */}
            <div className={`${minimized ? "p-5" : "p-6 sm:p-8"}`}>
              {/* Title */}
              <div className="mb-6">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-none mb-1">
                  ARIZONA
                </h1>
                <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-muted-foreground leading-none">
                  ITEMS
                </h1>
                <div className="w-12 h-[2px] bg-foreground mt-4" />
              </div>

              {/* Search */}
              <div className="relative mb-4 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                <input
                  type="text" value={search} onChange={e => doSearch(e.target.value)}
                  placeholder="Поиск по имени или по ID..."
                  className="w-full bg-background border border-border pl-10 pr-4 py-3 text-sm text-foreground mono transition-all duration-200 focus:outline-none focus:border-foreground/40 placeholder:text-muted-foreground"
                />
              </div>

              {!minimized && (
                <>
                  {/* Divider */}
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-border" />
                    <span className="mono text-[9px] uppercase tracking-widest text-muted-foreground">диапазон id</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Range inputs */}
                  <div className="flex gap-3 mb-5">
                    <div className="flex-1">
                      <label className="mono text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5 block">От</label>
                      <input type="number" value={startId} onChange={e => setStartId(+e.target.value)}
                        className="w-full bg-background border border-border px-3 py-2.5 text-sm text-foreground mono transition-all duration-200 focus:outline-none focus:border-foreground/40" />
                    </div>
                    <div className="flex-1">
                      <label className="mono text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Дo</label>
                      <input type="number" value={endId} onChange={e => setEndId(+e.target.value)}
                        className="w-full bg-background border border-border px-3 py-2.5 text-sm text-foreground mono transition-all duration-200 focus:outline-none focus:border-foreground/40" />
                    </div>
                  </div>

                  {/* CTA */}
                  <button onClick={doRange} disabled={!apiReady}
                    className="w-full py-3.5 bg-foreground text-background font-semibold text-sm tracking-wider mono uppercase transition-all duration-200 hover:bg-foreground/90 active:bg-foreground/80 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {!apiReady && !apiError && <Loader2 className="w-4 h-4 animate-spin" />}
                    {apiReady ? "ОТКРЫТЬ" : apiError ? "ОШИБКА ПОДКЛЮЧЕНИЯ" : "ЗАГРУЗКА..."}
                  </button>
                </>
              )}
            </div>

            {/* Bottom accent */}
            <div className="h-[1px] w-full bg-border" />
            <div className="px-5 py-2 flex justify-between">
              <span className="mono text-[8px] text-muted-foreground/50 uppercase tracking-widest">prod by taynoe_logovo</span>
              <span className="mono text-[8px] text-muted-foreground/50">v2.0</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Gallery ═══ */}
      {showGallery && (
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 w-[94%] max-w-[1500px] pb-20 px-1">
          {visible.map((item, i) => (
            <ItemCard key={item.id} id={item.id} name={item.name || "—"} delay={(i % BATCH_SIZE) * 25}
              onClick={() => setModal({ open: true, src: `${IMG_BASE}${item.id}.webp`, name: item.name || "—", id: item.id })}
              onError={() => setHidden(p => new Set(p).add(item.id))} />
          ))}
        </div>
      )}

      <ItemModal isOpen={modal.open} src={modal.src} name={modal.name} id={modal.id} onClose={() => setModal(m => ({ ...m, open: false }))} />
    </div>
  );
};

export default Index;
