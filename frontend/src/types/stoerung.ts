export type NachweisAmpel = "gruen" | "gelb" | "rot";
export type StoerungStatus =
  | "entwurf" | "offen" | "angezeigt" | "in_beobachtung"
  | "teilweise_behoben" | "behoben" | "abgemeldet"
  | "in_anspruchspruefung" | "abgeschlossen" | "verworfen";

export interface StoerungListItem {
  id: number;
  stoerung_number: string;
  titel: string;
  stoerungsart: string | null;
  status: StoerungStatus;
  kritikalitaet: string | null;
  stoerungsbeginn: string | null;
  stoerungsende: string | null;
  verantwortungsbereich: string | null;
  nachweis_ampel: NachweisAmpel;
  anzeigen_count: number;
  anlagen_count: number;
}

export interface Stoerung {
  id: number;
  project_id: number;
  stoerung_number: string;
  titel: string;
  stoerungsart: string | null;
  unterkategorie: string | null;
  beschreibung: string | null;
  stoerungsbeginn: string | null;
  kenntniszeitpunkt: string | null;
  stoerungsende: string | null;
  verantwortungsbereich: string | null;
  verursacher: string | null;
  betroffener_bereich: string | null;
  betroffener_vorgang_id: number | null;
  hindernde_wirkung: string | null;
  auswirkungen_json: string | null;
  leistungsbereitschaft: boolean;
  ausweichleistung_moeglich: boolean;
  sofortmassnahme: string | null;
  erforderliche_mitwirkung_ag: string | null;
  status: StoerungStatus;
  kritikalitaet: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  nachweis_ampel: NachweisAmpel;
  anzeigen_count: number;
  anlagen_count: number;
}

export interface Behinderungsanzeige {
  id: number;
  stoerung_id: number;
  typ: "erstanzeige" | "zwischenmeldung" | "abmeldung";
  adressat: string | null;
  cc: string | null;
  text: string | null;
  versandart: string | null;
  versanddatum: string | null;
  status: string;
  pdf_filename: string | null;
  sent_at: string | null;
  sent_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Kausalitaet {
  id: number;
  stoerung_id: number;
  ereignis: string | null;
  verantwortungsbereich: string | null;
  behinderte_leistung_id: number | null;
  geplante_leistung: string | null;
  tatsaechliche_leistung: string | null;
  unmittelbare_auswirkung_json: string | null;
  mittelbare_auswirkung: string | null;
  eigenverschulden_geprueft: boolean;
  ergebnis_eigenverschulden: string | null;
  bewertung: string | null;
}

export interface Stoerungsanlage {
  id: number;
  stoerung_id: number;
  anlage_typ: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  beschreibung: string | null;
  datum: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface Bautagesbericht {
  id: number;
  project_id: number;
  datum: string;
  wetter: string | null;
  temperatur_min: number | null;
  temperatur_max: number | null;
  wind: string | null;
  niederschlag: string | null;
  personalanzahl: number | null;
  arbeitszeit_von: string | null;
  arbeitszeit_bis: string | null;
  soll_menge: number | null;
  ist_menge: number | null;
  soll_einheit: string | null;
  ist_einheit: string | null;
  abweichung_kommentar: string | null;
  stoerung_vorhanden: boolean;
  stoerung_id: number | null;
  anordnung_vorhanden: boolean;
  anordnung_beschreibung: string | null;
  allgemeine_bemerkungen: string | null;
  freigabestatus: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DropdownItem {
  value: string;
  label: string;
}

export interface DropdownsResponse {
  stoerungsarten: DropdownItem[];
  auswirkungen: DropdownItem[];
  verantwortungsbereiche: DropdownItem[];
  stoerungsstatus: DropdownItem[];
  kritikalitaet: DropdownItem[];
  wetterbedingungen: DropdownItem[];
  anlage_typen: DropdownItem[];
  anzeige_typen: DropdownItem[];
}
