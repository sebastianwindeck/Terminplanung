import re
import warnings
from datetime import datetime, date
from typing import Optional
import xml.etree.ElementTree as ET

NS = "http://schemas.microsoft.com/project"
NS_PREFIX = f"{{{NS}}}"


def _tag(name: str) -> str:
    return f"{NS_PREFIX}{name}"


def _parse_iso_duration_to_days(duration_str: str) -> Optional[int]:
    if not duration_str:
        return None
    match = re.match(r"PT(\d+(?:\.\d+)?)H", duration_str)
    if match:
        hours = float(match.group(1))
        return max(1, round(hours / 8))
    match = re.match(r"P(\d+)D", duration_str)
    if match:
        return int(match.group(1))
    return None


def _parse_date(date_str: Optional[str]) -> Optional[date]:
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00")).date()
    except (ValueError, AttributeError):
        return None


def _outline_parent(outline_number: str) -> Optional[str]:
    parts = outline_number.rsplit(".", 1)
    if len(parts) == 2 and parts[0]:
        return parts[0]
    return None


def parse_mspdi(xml_bytes: bytes) -> tuple[list[dict], list[str]]:
    parse_warnings: list[str] = []
    positions: list[dict] = []

    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as exc:
        parse_warnings.append(f"XML-Fehler: {exc}")
        return [], parse_warnings

    tasks_el = root.find(_tag("Tasks"))
    if tasks_el is None:
        parse_warnings.append("Kein Tasks-Element gefunden.")
        return [], parse_warnings

    outline_to_pos_number: dict[str, str] = {}
    outline_to_index: dict[str, int] = {}

    raw_tasks = []
    for task_el in tasks_el.findall(_tag("Task")):
        uid_el = task_el.find(_tag("UID"))
        if uid_el is None or uid_el.text == "0":
            continue
        name_el = task_el.find(_tag("Name"))
        if name_el is None or not name_el.text:
            continue

        outline_el = task_el.find(_tag("OutlineNumber"))
        outline_number = outline_el.text if outline_el is not None else None
        pos_number = outline_number or (uid_el.text if uid_el is not None else None)

        if outline_number:
            outline_to_pos_number[outline_number] = pos_number or ""

        milestone_el = task_el.find(_tag("Milestone"))
        is_milestone = milestone_el is not None and milestone_el.text == "1"

        percent_el = task_el.find(_tag("PercentComplete"))
        progress = 0.0
        if percent_el is not None and percent_el.text:
            try:
                progress = float(percent_el.text) / 100.0
            except ValueError:
                pass

        duration_el = task_el.find(_tag("Duration"))
        duration_days = _parse_iso_duration_to_days(duration_el.text if duration_el is not None else "")

        raw_tasks.append({
            "pos_number": pos_number,
            "outline_number": outline_number,
            "title": name_el.text,
            "start_date": _parse_date((task_el.find(_tag("Start")) or ET.Element("x")).text),
            "end_date": _parse_date((task_el.find(_tag("Finish")) or ET.Element("x")).text),
            "duration_days": duration_days,
            "is_milestone": is_milestone,
            "progress": progress,
            "sort_order": len(raw_tasks),
        })
        outline_to_index[outline_number or ""] = len(raw_tasks) - 1

    for task in raw_tasks:
        parent_outline = _outline_parent(task.get("outline_number") or "")
        task["_parent_outline"] = parent_outline

    outline_to_db_id: dict[str, int] = {}
    result: list[dict] = []

    for task in raw_tasks:
        pos = {
            "pos_number": task["pos_number"],
            "title": task["title"],
            "start_date": task["start_date"],
            "end_date": task["end_date"],
            "duration_days": task["duration_days"],
            "is_milestone": task["is_milestone"],
            "progress": task["progress"],
            "sort_order": task["sort_order"],
            "status": "planned",
            "_outline": task.get("outline_number"),
            "_parent_outline": task.get("_parent_outline"),
        }
        result.append(pos)

    return result, parse_warnings


def generate_mspdi(version: object, positions: list[object]) -> bytes:
    ET.register_namespace("", NS)
    project_el = ET.Element(f"{NS_PREFIX}Project")
    tasks_el = ET.SubElement(project_el, _tag("Tasks"))

    summary = ET.SubElement(tasks_el, _tag("Task"))
    ET.SubElement(summary, _tag("UID")).text = "0"
    ET.SubElement(summary, _tag("ID")).text = "0"
    ET.SubElement(summary, _tag("Name")).text = getattr(version, "name", "Terminplan")
    ET.SubElement(summary, _tag("OutlineLevel")).text = "0"

    for idx, pos in enumerate(positions, start=1):
        task_el = ET.SubElement(tasks_el, _tag("Task"))
        ET.SubElement(task_el, _tag("UID")).text = str(getattr(pos, "id", idx))
        ET.SubElement(task_el, _tag("ID")).text = str(idx)
        ET.SubElement(task_el, _tag("Name")).text = getattr(pos, "title", "")
        outline = getattr(pos, "pos_number", None)
        if outline:
            ET.SubElement(task_el, _tag("OutlineNumber")).text = outline

        start_date = getattr(pos, "start_date", None)
        if start_date:
            ET.SubElement(task_el, _tag("Start")).text = start_date.isoformat() + "T00:00:00"

        end_date = getattr(pos, "end_date", None)
        if end_date:
            ET.SubElement(task_el, _tag("Finish")).text = end_date.isoformat() + "T00:00:00"

        duration_days = getattr(pos, "duration_days", None)
        if duration_days:
            hours = duration_days * 8
            ET.SubElement(task_el, _tag("Duration")).text = f"PT{hours}H0M0S"

        is_milestone = getattr(pos, "is_milestone", False)
        ET.SubElement(task_el, _tag("Milestone")).text = "1" if is_milestone else "0"

        progress = getattr(pos, "progress", 0.0)
        ET.SubElement(task_el, _tag("PercentComplete")).text = str(int((progress or 0.0) * 100))

    tree = ET.ElementTree(project_el)
    ET.indent(tree, space="  ")
    import io
    buf = io.BytesIO()
    tree.write(buf, encoding="utf-8", xml_declaration=True)
    return buf.getvalue()
