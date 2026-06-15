import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { stoerungsApi, behinderungsanzeigeApi, kausalitaetApi, stoerungsanlageApi } from "@/api/stoerungen";
import { aiApi } from "@/api/client";
import CausalityMatrix from "@/components/stoerungen/CausalityMatrix";
import AuditLogTimeline from "@/components/stoerungen/AuditLogTimeline";
import { DisruptionStatusBadge } from "@/components/stoerungen/DisruptionStatusBadge";
import { EvidenceTrafficLight } from "@/components/stoerungen/EvidenceTrafficLight";
import type { StoerungStatus } from "@/types/stoerung";

type Tab = "uebersicht" | "anzeigen" | "anlagen" | "kausalitaet" | "protokoll";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  entwurf:              ["offen", "verworfen"],
  offen:                ["angezeigt", "in_beobachtung", "verworfen"],
  angezeigt:            ["in_beobachtung", "teilweise_behoben", "behoben", "verworfen"],
  in_beobachtung:       ["teilweise_behoben", "behoben", "angezeigt", "verworfen"],
  teilweise_behoben:    ["behoben", "in_beobachtung", "verworfen"],
  behoben:              ["abgemeldet", "in_beobachtung"],
  abgemeldet:           ["in_anspruchspruefung", "behoben"],
  in_anspruchspruefung: ["abgeschlossen", "offen"],
};

const STATUS_LABELS: Record<string, string> = {
  offen: "Offen", angezeigt: "Angezeigt", in_beobachtung: "In Beobachtung",
  teilweise_behoben: "Teilw. behoben", behoben: "Behoben", abgemeldet: "Abgemeldet",
  in_anspruchspruefung: "Anspruchsprüfung", abgeschlossen: "Abgeschlossen", verworfen: "Verworfen",
};

const DOKUMENT_TYPEN = [
  { value: "maengelanzeige",   label: "Mängelanzeige",           par: "§ 13 VOB/B" },
  { value: "bedenkenanmeldung", label: "Bedenkenanmeldung",      par: "§ 4 Abs. 3 VOB/B" },
  { value: "nachtragsforderung", label: "Nachtragsforderung",    par: "§ 2 Nr. 5/6 VOB/B" },
  { value: "abmahnung_verzug", label: "Abmahnung Leistungsverzug", par: "§ 5 Abs. 3/4 VOB/B" },
];

type AiPanelState = {
  loading: boolean;
  text: string | null;
  label?: string;
  par?: string;
};

const EMPTY_AI: AiPanelState = { loading: false, text: null };

export default function DisruptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const stoerungId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("uebersicht");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTyp, setUploadTyp] = useState("sonstiges");

  // AI state per feature
  const [aiVob, setAiVob] = useState<AiPanelState>(EMPTY_AI);
  const [aiZusammenfassung, setAiZusammenfassung] = useState<AiPanelState>(EMPTY_AI);
  const [aiBauzeit, setAiBauzeit] = useState<AiPanelState>(EMPTY_AI);
  const [aiDokument, setAiDokument] = useState<AiPanelState>(EMPTY_AI);
  const [dokTyp, setDokTyp] = useState("maengelanzeige");
  type KausalitaetVorschlag = {
    ereignis: string;
    verantwortungsbereich: string;
    geplante_leistung?: string;
    tatsaechliche_leistung?: string;
    unmittelbare_auswirkung_json?: string;
    mittelbare_auswirkung?: string;
    bewertung?: string;
  };
  const [aiKausalitaet, setAiKausalitaet] = useState<{
    loading: boolean;
    vorschlaege: KausalitaetVorschlag[];
    hinweis: string;
  }>({ loading: false, vorschlaege: [], hinweis: "" });

  const { data: stoerung, isLoading } = useQuery({
    queryKey: ["stoerung", stoerungId],
    queryFn: () => stoerungsApi.get(stoerungId),
  });
  const { data: dropdowns } = useQuery({ queryKey: ["stoerung-dropdowns"], queryFn: stoerungsApi.dropdowns });
  const { data: anzeigen } = useQuery({
    queryKey: ["behinderungsanzeigen", stoerungId],
    queryFn: () => behinderungsanzeigeApi.list(stoerungId),
    enabled: tab === "anzeigen",
  });
  const { data: kausalitaeten } = useQuery({
    queryKey: ["kausalitaeten", stoerungId],
    queryFn: () => kausalitaetApi.list(stoerungId),
    enabled: tab === "kausalitaet",
  });

  const transitionMutation = useMutation({
    mutationFn: (toStatus: string) => stoerungsApi.transition(stoerungId, toStatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stoerung", stoerungId] }),
  });

  const uploadMutation = useMutation({
    mutationFn: () => stoerungsanlageApi.upload(stoerungId, uploadFile!, uploadTyp),
    onSuccess: () => {
      setUploadFile(null);
      queryClient.invalidateQueries({ queryKey: ["stoerung", stoerungId] });
    },
  });

  const deleteAnlageMutation = useMutation({
    mutationFn: stoerungsanlageApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stoerung", stoerungId] }),
  });

  const versendeMutation = useMutation({
    mutationFn: behinderungsanzeigeApi.versenden,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["behinderungsanzeigen", stoerungId] }),
  });

  const createKausalitaetMutation = useMutation({
    mutationFn: (data: Parameters<typeof kausalitaetApi.create>[0]) => kausalitaetApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kausalitaeten", stoerungId] });
      toast.success("Kausalitätseintrag übernommen");
    },
    onError: () => toast.error("Fehler beim Übernehmen"),
  });

  if (isLoading) return <div className="p-8 text-gray-500">Lade Störung…</div>;
  if (!stoerung) return <div className="p-8 text-red-600">Störung nicht gefunden.</div>;

  const allowed = ALLOWED_TRANSITIONS[stoerung.status] ?? [];

  const TabBtn = ({ t, label }: { t: Tab; label: string }) => (
    <button
      onClick={() => setTab(t)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        tab === t ? "border-primary-700 text-primary-700" : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
    </button>
  );

  const AiPanel = ({ state, onCopy }: { state: AiPanelState; onCopy?: () => void }) => {
    if (!state.text && !state.loading) return null;
    return (
      <div className="border border-violet-200 rounded-lg bg-violet-50 p-4 mt-3">
        {state.label && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
              {state.label} {state.par && <span className="font-normal text-violet-500">({state.par})</span>}
            </span>
            {state.text && (
              <button
                onClick={() => { navigator.clipboard.writeText(state.text!); toast.success("Kopiert"); }}
                className="text-xs text-violet-600 hover:text-violet-800"
              >
                In Zwischenablage
              </button>
            )}
          </div>
        )}
        {!state.label && state.text && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">KI-generierter Text</span>
            <button
              onClick={() => { navigator.clipboard.writeText(state.text!); toast.success("Kopiert"); }}
              className="text-xs text-violet-600 hover:text-violet-800"
            >
              In Zwischenablage
            </button>
          </div>
        )}
        {state.loading
          ? <p className="text-sm text-violet-600 animate-pulse">KI generiert…</p>
          : <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{state.text}</pre>
        }
      </div>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-gray-500 font-mono text-sm">{stoerung.stoerung_number}</span>
            <DisruptionStatusBadge status={stoerung.status as StoerungStatus} />
            <EvidenceTrafficLight ampel={stoerung.nachweis_ampel} />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">{stoerung.titel}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            to={`/stoerungen/${stoerungId}/bearbeiten`}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
          >
            Bearbeiten
          </Link>
          <a
            href={stoerungsApi.pdfUrl(stoerungId)}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
          >
            PDF Export
          </a>
        </div>
      </div>

      {allowed.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Statuswechsel:</span>
          {allowed.map((s) => (
            <button
              key={s}
              onClick={() => transitionMutation.mutate(s)}
              disabled={transitionMutation.isPending}
              className="px-3 py-1 text-xs font-medium rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 transition-colors disabled:opacity-50"
            >
              → {STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>
      )}

      <div className="border-b border-gray-200 mb-6 flex gap-0">
        <TabBtn t="uebersicht" label="Übersicht" />
        <TabBtn t="anzeigen" label={`Anzeigen (${stoerung.anzeigen_count})`} />
        <TabBtn t="anlagen" label={`Anlagen (${stoerung.anlagen_count})`} />
        <TabBtn t="kausalitaet" label="Kausalität" />
        <TabBtn t="protokoll" label="Protokoll" />
      </div>

      {/* ── Übersicht ── */}
      {tab === "uebersicht" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              ["Störungsart", stoerung.stoerungsart],
              ["Kritikalität", stoerung.kritikalitaet],
              ["Verantwortung", stoerung.verantwortungsbereich],
              ["Verursacher", stoerung.verursacher],
              ["Betroffener Bereich", stoerung.betroffener_bereich],
              ["Störungsbeginn", stoerung.stoerungsbeginn ? new Date(stoerung.stoerungsbeginn).toLocaleDateString("de-DE") : null],
              ["Störungsende", stoerung.stoerungsende ? new Date(stoerung.stoerungsende).toLocaleDateString("de-DE") : "Andauernd"],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label as string}</dt>
                <dd className="mt-0.5 text-sm text-gray-900">{(value as string) || "–"}</dd>
              </div>
            ))}
            {stoerung.beschreibung && (
              <div className="md:col-span-2">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Beschreibung</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{stoerung.beschreibung}</dd>
              </div>
            )}
            {stoerung.hindernde_wirkung && (
              <div className="md:col-span-2">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Hindernde Wirkung</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{stoerung.hindernde_wirkung}</dd>
              </div>
            )}
            {stoerung.sofortmassnahme && (
              <div className="md:col-span-2">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sofortmaßnahme</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{stoerung.sofortmassnahme}</dd>
              </div>
            )}
          </div>

          {/* KI-Zusammenfassung */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">KI-Zusammenfassung</span>
              <button
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white rounded text-xs hover:bg-violet-700 disabled:opacity-50"
                disabled={aiZusammenfassung.loading}
                onClick={async () => {
                  setAiZusammenfassung({ loading: true, text: null });
                  try {
                    const r = await aiApi.generateZusammenfassung(stoerungId);
                    setAiZusammenfassung({ loading: false, text: r.text });
                  } catch {
                    setAiZusammenfassung({ loading: false, text: "Fehler beim Generieren." });
                  }
                }}
              >
                {aiZusammenfassung.loading ? "⏳ Generiert…" : "✨ Zusammenfassung generieren"}
              </button>
            </div>
            {aiZusammenfassung.loading && (
              <p className="text-sm text-violet-600 animate-pulse py-2">KI generiert…</p>
            )}
            {aiZusammenfassung.text && !aiZusammenfassung.loading && (
              <div className="border border-violet-200 rounded-lg bg-violet-50 p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">KI-generierte Zusammenfassung</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(aiZusammenfassung.text!); toast.success("Kopiert"); }}
                    className="text-xs text-violet-600 hover:text-violet-800"
                  >
                    Kopieren
                  </button>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">{aiZusammenfassung.text}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Anzeigen ── */}
      {tab === "anzeigen" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/behinderungsanzeigen/neu?stoerung_id=${stoerungId}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-700 text-white rounded text-sm hover:bg-primary-800"
            >
              + Neue Anzeige
            </Link>
          </div>

          {/* KI-Bereich Anzeigen */}
          <div className="border border-violet-200 rounded-xl p-4 bg-violet-50 space-y-3">
            <p className="text-xs font-semibold text-violet-800 uppercase tracking-wide">✨ KI-Assistenz</p>

            {/* VOB-Text */}
            <div>
              <button
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white rounded text-xs hover:bg-violet-700 disabled:opacity-50"
                disabled={aiVob.loading}
                onClick={async () => {
                  setAiVob({ loading: true, text: null, label: "Behinderungsanzeige", par: "§ 6 Abs. 1 VOB/B" });
                  try {
                    const r = await aiApi.generateVobText(stoerungId);
                    setAiVob({ loading: false, text: r.text, label: "Behinderungsanzeige", par: "§ 6 Abs. 1 VOB/B" });
                  } catch {
                    setAiVob({ loading: false, text: "Fehler beim Generieren.", label: "Behinderungsanzeige", par: "§ 6 Abs. 1 VOB/B" });
                  }
                }}
              >
                {aiVob.loading ? "⏳ Generiert…" : "Behinderungsanzeige (§ 6 VOB/B)"}
              </button>
              <AiPanel state={aiVob} />
            </div>

            {/* Bauzeitverlängerung */}
            <div>
              <button
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white rounded text-xs hover:bg-violet-700 disabled:opacity-50"
                disabled={aiBauzeit.loading}
                onClick={async () => {
                  setAiBauzeit({ loading: true, text: null, label: "Bauzeitverlängerung", par: "§ 6 Abs. 4 VOB/B" });
                  try {
                    const r = await aiApi.generateBauzeitverlaengerung(stoerungId);
                    setAiBauzeit({ loading: false, text: r.text, label: "Bauzeitverlängerung", par: "§ 6 Abs. 4 VOB/B" });
                  } catch {
                    setAiBauzeit({ loading: false, text: "Fehler beim Generieren.", label: "Bauzeitverlängerung", par: "§ 6 Abs. 4 VOB/B" });
                  }
                }}
              >
                {aiBauzeit.loading ? "⏳ Generiert…" : "Bauzeitverlängerung (§ 6 Abs. 4 VOB/B)"}
              </button>
              <AiPanel state={aiBauzeit} />
            </div>

            {/* Sonstige Dokumente */}
            <div>
              <div className="flex items-center gap-2">
                <select
                  className="text-xs border border-violet-300 rounded px-2 py-1.5 bg-white text-gray-700"
                  value={dokTyp}
                  onChange={(e) => setDokTyp(e.target.value)}
                >
                  {DOKUMENT_TYPEN.map((d) => (
                    <option key={d.value} value={d.value}>{d.label} ({d.par})</option>
                  ))}
                </select>
                <button
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white rounded text-xs hover:bg-violet-700 disabled:opacity-50"
                  disabled={aiDokument.loading}
                  onClick={async () => {
                    const selected = DOKUMENT_TYPEN.find((d) => d.value === dokTyp)!;
                    setAiDokument({ loading: true, text: null, label: selected.label, par: selected.par });
                    try {
                      const r = await aiApi.generateDokumentText(stoerungId, dokTyp);
                      setAiDokument({ loading: false, text: r.text, label: r.label, par: r.paragraph });
                    } catch {
                      setAiDokument({ loading: false, text: "Fehler beim Generieren.", label: selected.label, par: selected.par });
                    }
                  }}
                >
                  {aiDokument.loading ? "⏳ Generiert…" : "Generieren"}
                </button>
              </div>
              <AiPanel state={aiDokument} />
            </div>
          </div>

          {/* Anzeigen-Liste */}
          {anzeigen?.map((a) => (
            <div key={a.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-sm font-medium capitalize">{a.typ}</span>
                  <span className="ml-2 text-xs text-gray-500">{a.adressat}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === "versendet" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {a.status}
                  </span>
                  <a
                    href={behinderungsanzeigeApi.pdfUrl(a.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs px-2 py-0.5 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    📄 Schreiben (PDF)
                  </a>
                  {a.status === "entwurf" && (
                    <button
                      onClick={() => versendeMutation.mutate(a.id)}
                      className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Versenden
                    </button>
                  )}
                </div>
              </div>
              {a.text && <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">{a.text}</p>}
            </div>
          ))}
          {(!anzeigen || anzeigen.length === 0) && <p className="text-gray-500 text-sm">Noch keine Anzeigen.</p>}
        </div>
      )}

      {/* ── Anlagen ── */}
      {tab === "anlagen" && (
        <div className="space-y-4">
          <div className="border border-dashed border-gray-300 rounded-lg p-4">
            <div className="flex gap-3 items-end flex-wrap">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Datei</label>
                <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} className="text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Typ</label>
                <select value={uploadTyp} onChange={(e) => setUploadTyp(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                  {dropdowns?.anlage_typen.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <button
                onClick={() => uploadFile && uploadMutation.mutate()}
                disabled={!uploadFile || uploadMutation.isPending}
                className="px-3 py-1.5 bg-primary-700 text-white rounded text-sm disabled:opacity-50 hover:bg-primary-800"
              >
                {uploadMutation.isPending ? "Hochladen…" : "Hochladen"}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {stoerung.anlagen_count === 0 && <p className="text-gray-500 text-sm">Noch keine Anlagen.</p>}
          </div>
        </div>
      )}

      {/* ── Kausalität ── */}
      {tab === "kausalitaet" && (
        <div className="space-y-4">
          {/* KI-Vorschläge */}
          <div className="border border-violet-200 rounded-xl p-4 bg-violet-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-violet-800 uppercase tracking-wide">✨ KI-Vorschläge für Kausalitätskette</span>
              <button
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white rounded text-xs hover:bg-violet-700 disabled:opacity-50"
                disabled={aiKausalitaet.loading}
                onClick={async () => {
                  setAiKausalitaet({ loading: true, vorschlaege: [], hinweis: "" });
                  try {
                    const r = await aiApi.generateKausalitaetVorschlaege(stoerungId);
                    setAiKausalitaet({ loading: false, vorschlaege: r.vorschlaege, hinweis: r.hinweis });
                  } catch {
                    setAiKausalitaet({ loading: false, vorschlaege: [], hinweis: "Fehler beim Generieren." });
                  }
                }}
              >
                {aiKausalitaet.loading ? "⏳ Analysiert…" : "Kausalitätskette analysieren"}
              </button>
            </div>

            {aiKausalitaet.loading && (
              <p className="text-sm text-violet-600 animate-pulse">KI analysiert Bautagesberichte und Störungsdaten…</p>
            )}

            {aiKausalitaet.hinweis && !aiKausalitaet.loading && (
              <p className="text-xs text-violet-700 mb-2">{aiKausalitaet.hinweis}</p>
            )}

            {aiKausalitaet.vorschlaege.length > 0 && !aiKausalitaet.loading && (
              <div className="space-y-3 mt-2">
                {aiKausalitaet.vorschlaege.map((v, i) => (
                  <div key={i} className="bg-white border border-violet-100 rounded-lg p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900">{v.ereignis}</span>
                      <button
                        onClick={() =>
                          createKausalitaetMutation.mutate({
                            stoerung_id: stoerungId,
                            ereignis: v.ereignis,
                            verantwortungsbereich: v.verantwortungsbereich,
                            geplante_leistung: v.geplante_leistung ?? null,
                            tatsaechliche_leistung: v.tatsaechliche_leistung ?? null,
                            unmittelbare_auswirkung_json: v.unmittelbare_auswirkung_json ?? null,
                            mittelbare_auswirkung: v.mittelbare_auswirkung ?? null,
                            bewertung: v.bewertung ?? null,
                          })
                        }
                        disabled={createKausalitaetMutation.isPending}
                        className="flex-shrink-0 text-xs px-2 py-1 bg-primary-700 text-white rounded hover:bg-primary-800 disabled:opacity-50"
                      >
                        Übernehmen
                      </button>
                    </div>
                    <p className="text-xs text-orange-700 bg-orange-50 rounded px-2 py-0.5 inline-block">
                      {v.verantwortungsbereich}
                    </p>
                    {v.unmittelbare_auswirkung_json && (
                      <p className="text-xs text-gray-600"><span className="font-medium">Unmittelbar:</span> {v.unmittelbare_auswirkung_json}</p>
                    )}
                    {v.mittelbare_auswirkung && (
                      <p className="text-xs text-gray-500"><span className="font-medium">Mittelbar:</span> {v.mittelbare_auswirkung}</p>
                    )}
                    {v.bewertung && <p className="text-xs text-gray-400 italic">Bewertung: {v.bewertung}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <CausalityMatrix stoerungId={stoerungId} kausalitaeten={kausalitaeten ?? []} />
        </div>
      )}

      {/* ── Protokoll ── */}
      {tab === "protokoll" && (
        <AuditLogTimeline stoerungId={stoerungId} />
      )}
    </div>
  );
}
