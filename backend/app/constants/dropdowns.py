from typing import NamedTuple


class DropdownItem(NamedTuple):
    value: str
    label: str


STOERUNGSARTEN: tuple[DropdownItem, ...] = (
    DropdownItem("fehlende_planung", "Fehlende Planung"),
    DropdownItem("verspaetete_planfreigabe", "Verspätete Planfreigabe"),
    DropdownItem("planaenderung", "Planänderung"),
    DropdownItem("fehlende_entscheidung", "Fehlende Entscheidung"),
    DropdownItem("fehlende_vorleistung", "Fehlende Vorleistung"),
    DropdownItem("mangelhafte_vorleistung", "Mangelhafte Vorleistung"),
    DropdownItem("fehlender_zugang", "Fehlender Zugang"),
    DropdownItem("fehlendes_geruest", "Fehlendes Gerüst"),
    DropdownItem("baustellenlogistik", "Baustellenlogistik gestört"),
    DropdownItem("kran_nicht_verfuegbar", "Kran / Hebetechnik nicht verfügbar"),
    DropdownItem("andere_gewerke", "Andere Gewerke behindern"),
    DropdownItem("anordnung_auftraggeber", "Anordnung Auftraggeber"),
    DropdownItem("zusaetzliche_leistung", "Zusätzliche Leistung"),
    DropdownItem("geaenderte_leistung", "Geänderte Leistung"),
    DropdownItem("mengenänderung", "Mengenänderung"),
    DropdownItem("witterung", "Witterung"),
    DropdownItem("behoerdliche_auflage", "Behördliche Auflage"),
    DropdownItem("materialbeistellung_fehlt", "Materialbeistellung fehlt"),
    DropdownItem("eigenbereich", "Eigenbereich"),
    DropdownItem("unklar", "Unklar / zu prüfen"),
)

AUSWIRKUNGEN: tuple[DropdownItem, ...] = (
    DropdownItem("vollstaendiger_stillstand", "Vollständiger Stillstand"),
    DropdownItem("teilweiser_stillstand", "Teilweiser Stillstand"),
    DropdownItem("wartezeit", "Wartezeit"),
    DropdownItem("umsetzen_kolonne", "Umsetzen der Kolonne"),
    DropdownItem("ausweichleistung", "Ausweichleistung"),
    DropdownItem("minderleistung", "Minderleistung"),
    DropdownItem("unterbrechung", "Unterbrechung"),
    DropdownItem("verschiebung_montagebeginn", "Verschiebung Montagebeginn"),
    DropdownItem("verlaengerung_montagezeit", "Verlängerung Montagezeit"),
    DropdownItem("verschiebung_jahreszeit", "Verschiebung in ungünstige Jahreszeit"),
    DropdownItem("beschleunigung", "Beschleunigung erforderlich"),
    DropdownItem("mehrarbeit", "Mehrarbeit / Überstunden"),
    DropdownItem("nu_mehrkosten", "Nachunternehmermehrkosten"),
    DropdownItem("verlaengerte_vorhaltung", "Verlängerte Vorhaltung"),
    DropdownItem("zusaetzliche_be", "Zusätzliche Baustelleneinrichtung"),
    DropdownItem("terminrisiko", "Terminrisiko ohne aktuelle Auswirkung"),
)

VERANTWORTUNGSBEREICHE: tuple[DropdownItem, ...] = (
    DropdownItem("auftraggeber", "Auftraggeber"),
    DropdownItem("objektplanung_architekt", "Objektplanung / Architekt"),
    DropdownItem("fachplanung", "Fachplanung"),
    DropdownItem("bauleitung_ag", "Bauleitung AG"),
    DropdownItem("vorunternehmer_ag", "Vorunternehmer AG"),
    DropdownItem("behoerde", "Behörde"),
    DropdownItem("versorger", "Versorger"),
    DropdownItem("witterung", "Witterung"),
    DropdownItem("nachunternehmer_an", "Nachunternehmer AN"),
    DropdownItem("eigenes_unternehmen", "Eigenes Unternehmen"),
    DropdownItem("lieferant", "Lieferant"),
    DropdownItem("unklar", "Unklar / in Prüfung"),
)

STOERUNGSSTATUS: tuple[DropdownItem, ...] = (
    DropdownItem("entwurf", "Entwurf"),
    DropdownItem("offen", "Offen"),
    DropdownItem("angezeigt", "Angezeigt"),
    DropdownItem("in_beobachtung", "In Beobachtung"),
    DropdownItem("teilweise_behoben", "Teilweise behoben"),
    DropdownItem("behoben", "Behoben"),
    DropdownItem("abgemeldet", "Abgemeldet"),
    DropdownItem("in_anspruchspruefung", "In Anspruchsprüfung"),
    DropdownItem("abgeschlossen", "Abgeschlossen"),
    DropdownItem("verworfen", "Verworfen"),
)

KRITIKALITAET: tuple[DropdownItem, ...] = (
    DropdownItem("niedrig", "Niedrig"),
    DropdownItem("mittel", "Mittel"),
    DropdownItem("hoch", "Hoch"),
    DropdownItem("kritisch", "Kritisch"),
)

WETTERBEDINGUNGEN: tuple[DropdownItem, ...] = (
    DropdownItem("sonnig", "Sonnig"),
    DropdownItem("bewoelkt", "Bewölkt"),
    DropdownItem("regen", "Regen"),
    DropdownItem("schnee", "Schnee"),
    DropdownItem("frost", "Frost"),
    DropdownItem("sturm", "Sturm"),
    DropdownItem("nebel", "Nebel"),
    DropdownItem("hitze", "Hitze"),
)

ANLAGE_TYPEN: tuple[DropdownItem, ...] = (
    DropdownItem("foto", "Foto"),
    DropdownItem("email", "E-Mail"),
    DropdownItem("protokoll", "Protokoll"),
    DropdownItem("plan", "Plan"),
    DropdownItem("tagesbericht", "Tagesbericht"),
    DropdownItem("sonstiges", "Sonstiges"),
)

ANZEIGE_TYPEN: tuple[DropdownItem, ...] = (
    DropdownItem("erstanzeige", "Erstanzeige"),
    DropdownItem("zwischenmeldung", "Zwischenmeldung"),
    DropdownItem("abmeldung", "Behinderungsabmeldung"),
)


def all_dropdowns() -> dict:
    return {
        "stoerungsarten": [{"value": i.value, "label": i.label} for i in STOERUNGSARTEN],
        "auswirkungen": [{"value": i.value, "label": i.label} for i in AUSWIRKUNGEN],
        "verantwortungsbereiche": [{"value": i.value, "label": i.label} for i in VERANTWORTUNGSBEREICHE],
        "stoerungsstatus": [{"value": i.value, "label": i.label} for i in STOERUNGSSTATUS],
        "kritikalitaet": [{"value": i.value, "label": i.label} for i in KRITIKALITAET],
        "wetterbedingungen": [{"value": i.value, "label": i.label} for i in WETTERBEDINGUNGEN],
        "anlage_typen": [{"value": i.value, "label": i.label} for i in ANLAGE_TYPEN],
        "anzeige_typen": [{"value": i.value, "label": i.label} for i in ANZEIGE_TYPEN],
    }
