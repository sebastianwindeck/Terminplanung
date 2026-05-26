from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, ConfigDict


# ── Störung ───────────────────────────────────────────────────────────────────

class StoerungCreate(BaseModel):
    titel: str
    stoerungsart: Optional[str] = None
    unterkategorie: Optional[str] = None
    beschreibung: str
    stoerungsbeginn: datetime
    kenntniszeitpunkt: Optional[datetime] = None
    stoerungsende: Optional[datetime] = None
    verantwortungsbereich: Optional[str] = None
    verursacher: Optional[str] = None
    betroffener_bereich: Optional[str] = None
    betroffener_vorgang_id: Optional[int] = None
    hindernde_wirkung: Optional[str] = None
    auswirkungen_json: Optional[str] = None
    leistungsbereitschaft: Optional[str] = None
    ausweichleistung_moeglich: Optional[str] = None
    sofortmassnahme: Optional[str] = None
    erforderliche_mitwirkung_ag: Optional[str] = None
    kritikalitaet: Optional[str] = None
    created_by: Optional[str] = None


class StoerungUpdate(BaseModel):
    titel: Optional[str] = None
    stoerungsart: Optional[str] = None
    unterkategorie: Optional[str] = None
    beschreibung: Optional[str] = None
    stoerungsbeginn: Optional[datetime] = None
    kenntniszeitpunkt: Optional[datetime] = None
    stoerungsende: Optional[datetime] = None
    verantwortungsbereich: Optional[str] = None
    verursacher: Optional[str] = None
    betroffener_bereich: Optional[str] = None
    betroffener_vorgang_id: Optional[int] = None
    hindernde_wirkung: Optional[str] = None
    auswirkungen_json: Optional[str] = None
    leistungsbereitschaft: Optional[str] = None
    ausweichleistung_moeglich: Optional[str] = None
    sofortmassnahme: Optional[str] = None
    erforderliche_mitwirkung_ag: Optional[str] = None
    kritikalitaet: Optional[str] = None


class StoerungResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    stoerung_number: str
    titel: str
    stoerungsart: Optional[str] = None
    unterkategorie: Optional[str] = None
    beschreibung: str
    stoerungsbeginn: datetime
    kenntniszeitpunkt: Optional[datetime] = None
    stoerungsende: Optional[datetime] = None
    verantwortungsbereich: Optional[str] = None
    verursacher: Optional[str] = None
    betroffener_bereich: Optional[str] = None
    betroffener_vorgang_id: Optional[int] = None
    hindernde_wirkung: Optional[str] = None
    auswirkungen_json: Optional[str] = None
    leistungsbereitschaft: Optional[str] = None
    ausweichleistung_moeglich: Optional[str] = None
    sofortmassnahme: Optional[str] = None
    erforderliche_mitwirkung_ag: Optional[str] = None
    kritikalitaet: Optional[str] = None
    status: str
    nachweis_ampel: str = "rot"
    anzeigen_count: int = 0
    anlagen_count: int = 0
    deleted_at: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class StoerungListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    stoerung_number: str
    titel: str
    stoerungsart: Optional[str] = None
    status: str
    kritikalitaet: Optional[str] = None
    nachweis_ampel: str = "rot"
    stoerungsbeginn: datetime
    stoerungsende: Optional[datetime] = None
    anzeigen_count: int = 0
    anlagen_count: int = 0
    created_at: datetime


class StatusTransition(BaseModel):
    to_status: str
    comment: Optional[str] = None


# ── Behinderungsanzeige ───────────────────────────────────────────────────────

class BehinderungsanzeigeCreate(BaseModel):
    typ: str = "erstanzeige"
    adressat: Optional[str] = None
    cc: Optional[str] = None
    text: Optional[str] = None
    versandart: Optional[str] = None


class BehinderungsanzeigeUpdate(BaseModel):
    typ: Optional[str] = None
    adressat: Optional[str] = None
    cc: Optional[str] = None
    text: Optional[str] = None
    versandart: Optional[str] = None


class BehinderungsanzeigeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    stoerung_id: int
    typ: str
    adressat: Optional[str] = None
    cc: Optional[str] = None
    text: Optional[str] = None
    versandart: Optional[str] = None
    status: str
    pdf_filename: Optional[str] = None
    sent_at: Optional[datetime] = None
    sent_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ── Bautagesbericht ───────────────────────────────────────────────────────────

class BautagesberichtCreate(BaseModel):
    datum: date
    wetter: Optional[str] = None
    temperatur_min: Optional[float] = None
    temperatur_max: Optional[float] = None
    wind: Optional[str] = None
    niederschlag: Optional[str] = None
    personalanzahl: Optional[int] = None
    arbeitszeit_von: Optional[str] = None
    arbeitszeit_bis: Optional[str] = None
    geplanter_vorgang_id: Optional[int] = None
    ausgefuehrter_vorgang_id: Optional[int] = None
    soll_menge: Optional[float] = None
    soll_einheit: Optional[str] = None
    ist_menge: Optional[float] = None
    ist_einheit: Optional[str] = None
    abweichung_kommentar: Optional[str] = None
    stoerung_vorhanden: bool = False
    stoerung_id: Optional[int] = None
    anordnung_vorhanden: bool = False
    anordnung_beschreibung: Optional[str] = None
    allgemeine_bemerkungen: Optional[str] = None
    created_by: Optional[str] = None


class BautagesberichtUpdate(BaseModel):
    wetter: Optional[str] = None
    temperatur_min: Optional[float] = None
    temperatur_max: Optional[float] = None
    wind: Optional[str] = None
    niederschlag: Optional[str] = None
    personalanzahl: Optional[int] = None
    arbeitszeit_von: Optional[str] = None
    arbeitszeit_bis: Optional[str] = None
    geplanter_vorgang_id: Optional[int] = None
    ausgefuehrter_vorgang_id: Optional[int] = None
    soll_menge: Optional[float] = None
    soll_einheit: Optional[str] = None
    ist_menge: Optional[float] = None
    ist_einheit: Optional[str] = None
    abweichung_kommentar: Optional[str] = None
    stoerung_vorhanden: Optional[bool] = None
    stoerung_id: Optional[int] = None
    anordnung_vorhanden: Optional[bool] = None
    anordnung_beschreibung: Optional[str] = None
    allgemeine_bemerkungen: Optional[str] = None


class BautagesberichtResponse(BautagesberichtCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    freigabestatus: str
    created_at: datetime
    updated_at: datetime


# ── Kausalität ────────────────────────────────────────────────────────────────

class KausalitaetCreate(BaseModel):
    ereignis: str
    verantwortungsbereich: Optional[str] = None
    behinderte_leistung_id: Optional[int] = None
    geplante_leistung: Optional[str] = None
    tatsaechliche_leistung: Optional[str] = None
    unmittelbare_auswirkung_json: Optional[str] = None
    mittelbare_auswirkung: Optional[str] = None
    eigenverschulden_geprueft: bool = False
    ergebnis_eigenverschulden: Optional[str] = None
    bewertung: Optional[str] = None


class KausalitaetUpdate(BaseModel):
    ereignis: Optional[str] = None
    verantwortungsbereich: Optional[str] = None
    behinderte_leistung_id: Optional[int] = None
    geplante_leistung: Optional[str] = None
    tatsaechliche_leistung: Optional[str] = None
    unmittelbare_auswirkung_json: Optional[str] = None
    mittelbare_auswirkung: Optional[str] = None
    eigenverschulden_geprueft: Optional[bool] = None
    ergebnis_eigenverschulden: Optional[str] = None
    bewertung: Optional[str] = None


class KausalitaetResponse(KausalitaetCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    stoerung_id: int
    created_at: datetime
    updated_at: datetime


# ── Stoerungsanlage ───────────────────────────────────────────────────────────

class StoerungsanlageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    stoerung_id: int
    anlage_typ: str
    filename: str
    mime_type: Optional[str] = None
    size_bytes: int
    beschreibung: Optional[str] = None
    datum: Optional[datetime] = None
    uploaded_by: Optional[str] = None
    created_at: datetime
