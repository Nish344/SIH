import requests

SOURCE_URL = "https://www.sih.gov.in/sih2026PS"
MIN_BODY_BYTES = 100_000
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://www.sih.gov.in/",
}


class FetchError(Exception):
    def __init__(self, status: int, url: str, message: str):
        self.status = status
        self.url = url
        super().__init__(message)


def fetch_page(session=None) -> str:
    client = session if session is not None else requests
    response = client.get(SOURCE_URL, headers=HEADERS, timeout=60)
    if response.status_code != 200:
        raise FetchError(
            response.status_code,
            SOURCE_URL,
            f"HTTP {response.status_code}",
        )
    if len(response.content) < MIN_BODY_BYTES:
        raise FetchError(
            response.status_code,
            SOURCE_URL,
            "body shorter than 100 KB",
        )
    return response.text
