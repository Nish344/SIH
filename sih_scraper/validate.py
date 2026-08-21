import re

PS_NUMBER_RE = re.compile(r"^SIH26\d{3}$")
REQUIRED_TEXT = (
    "ps_number",
    "title",
    "organization",
    "category",
    "theme",
    "deadline",
    "description_text",
)


class ValidationError(Exception):
    def __init__(self, rule: int, message: str, bad_rows: int = 0):
        self.rule = rule
        self.bad_rows = bad_rows
        super().__init__(message)


def validate_payload(payload: dict) -> None:
    records = payload.get("records") or []
    page_ps_count = payload.get("page_ps_count")
    if page_ps_count != len(records):
        raise ValidationError(
            3,
            f"page_ps_count {page_ps_count} != len(records) {len(records)}",
            abs((page_ps_count or 0) - len(records)),
        )
    validate_records(records)


def validate_records(records: list[dict]) -> None:
    if not records:
        raise ValidationError(2, "no listing rows parsed", 0)

    numbers = [r.get("ps_number") for r in records]
    counts: dict[str, int] = {}
    for number in numbers:
        counts[number] = counts.get(number, 0) + 1
    duplicate_rows = sum(n for n in counts.values() if n > 1)
    if duplicate_rows:
        raise ValidationError(8, "duplicate ps_number", duplicate_rows)

    matching = [n for n in numbers if isinstance(n, str) and PS_NUMBER_RE.match(n)]
    unique_matching = set(matching)
    if len(unique_matching) != len(records):
        raise ValidationError(
            2,
            "unique SIH26xxx ids do not equal listing rows",
            len(records) - len(unique_matching),
        )

    missing = 0
    for record in records:
        for field in REQUIRED_TEXT:
            value = record.get(field)
            if value is None or value == "":
                missing += 1
                break
    if missing:
        raise ValidationError(4, "missing required field", missing)

    bad_counts = 0
    for record in records:
        if not isinstance(record.get("idea_count"), int) or not isinstance(
            record.get("idea_cap"), int
        ):
            bad_counts += 1
    if bad_counts:
        raise ValidationError(5, "idea_count/idea_cap must be int", bad_counts)

    bad_category = 0
    for record in records:
        if record.get("category") not in ("Software", "Hardware"):
            bad_category += 1
    if bad_category:
        raise ValidationError(6, "category must be Software or Hardware", bad_category)

    bad_ids = 0
    for record in records:
        ps_number = record.get("ps_number") or ""
        expected = ps_number.removeprefix("SIH") if isinstance(ps_number, str) else ""
        if record.get("ps_id") != expected:
            bad_ids += 1
    if bad_ids:
        raise ValidationError(7, "ps_id does not match ps_number digits", bad_ids)
