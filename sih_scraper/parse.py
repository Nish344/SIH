import re

from bs4 import BeautifulSoup

IDEA_COUNT_RE = re.compile(r"^(\d+)/(\d+)$")
BLANK_HREFS = {"", "#", " "}


def parse_html(html: str, scraped_at: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", id="dataTablePS")
    if table is None:
        return []
    tbody = table.find("tbody")
    if tbody is None:
        return []
    records = []
    for row in tbody.find_all("tr", recursive=False):
        record = _parse_row(row, scraped_at)
        if record is not None:
            records.append(record)
    return records


def _parse_row(row, scraped_at: str) -> dict | None:
    cells = row.find_all("td", recursive=False)
    if len(cells) < 8:
        return None

    serial_text = cells[0].get_text(strip=True)
    organization = cells[1].get_text(strip=True)
    title_cell = cells[2]
    link = title_cell.find("a")
    title = link.get_text(strip=True) if link else title_cell.get_text(strip=True)
    category = cells[3].get_text(strip=True)
    ps_number = cells[4].get_text(strip=True)
    count_text = cells[5].get_text(strip=True)
    theme = cells[6].get_text(strip=True)
    deadline = cells[7].get_text(strip=True)

    match = IDEA_COUNT_RE.match(count_text)
    if match:
        idea_count = int(match.group(1))
        idea_cap = int(match.group(2))
        fill_ratio = idea_count / idea_cap if idea_cap else None
    else:
        idea_count = None
        idea_cap = None
        fill_ratio = None

    modal = title_cell.find("div", class_="modal")
    modal_fields = _parse_modal(modal) if modal is not None else {
        "ps_id": "",
        "description_html": "",
        "description_text": "",
        "department": "",
        "youtube_url": "",
        "dataset_url": "",
        "contact": "",
    }

    return {
        "serial": int(serial_text) if serial_text.isdigit() else serial_text,
        "organization": organization,
        "title": title,
        "category": category,
        "ps_number": ps_number,
        "idea_count": idea_count,
        "idea_cap": idea_cap,
        "theme": theme,
        "deadline": deadline,
        "scraped_at": scraped_at,
        "delta_1d": None,
        "delta_3d": None,
        "fill_ratio": fill_ratio,
        **modal_fields,
    }


def _parse_modal(modal) -> dict:
    fields = {
        "ps_id": "",
        "description_html": "",
        "description_text": "",
        "department": "",
        "youtube_url": "",
        "dataset_url": "",
        "contact": "",
    }
    for tr in modal.find_all("tr"):
        th = tr.find("th")
        td = tr.find("td")
        if th is None or td is None:
            continue
        label = th.get_text(strip=True)
        if label == "Problem Statement ID":
            fields["ps_id"] = td.get_text(strip=True)
        elif label == "Description":
            inner = td.find("div", class_="style-2") or td
            fields["description_html"] = inner.decode_contents().strip()
            fields["description_text"] = inner.get_text(" ", strip=True)
        elif label == "Department":
            fields["department"] = td.get_text(strip=True)
        elif label == "Youtube Link":
            fields["youtube_url"] = _href(td)
        elif label == "Dataset Link":
            fields["dataset_url"] = _href(td)
        elif label == "Contact info":
            fields["contact"] = _href(td)
    return fields


def _href(td) -> str:
    anchor = td.find("a")
    if anchor is None:
        return td.get_text(strip=True)
    href = (anchor.get("href") or "").strip()
    if href in BLANK_HREFS:
        return ""
    return href
