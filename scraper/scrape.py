#!/usr/bin/env python3
"""
Scrapes poszukiwani.policja.gov.pl for wanted persons data.
Outputs public/data/persons.json and downloads photos to public/assets/photos/.
"""

import argparse
import json
import logging
import os
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://poszukiwani.policja.gov.pl"
SEARCH_URL = f"{BASE_URL}/pos/form/5,Poszukiwani.html"
PROFILE_BASE = f"{BASE_URL}/pos/form/"
PHOTO_BASE = f"{BASE_URL}/dokumenty/form/"

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = PROJECT_ROOT / "public"
PHOTOS_DIR = PUBLIC_DIR / "assets" / "photos"
DATA_DIR = PUBLIC_DIR / "data"
TAXONOMY_PATH = DATA_DIR / "taxonomy.json"
OUTPUT_PATH = DATA_DIR / "persons.json"

REQUEST_DELAY = 1.5  # seconds between requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

session = requests.Session()
session.headers.update({
    "User-Agent": "PoszukiwaniGame/1.0 (educational project)"
})


def load_taxonomy():
    """Load taxonomy.json mapping articles to map coordinates."""
    with open(TAXONOMY_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def fetch_page(url, params=None):
    """Fetch a page with politeness delay."""
    time.sleep(REQUEST_DELAY)
    try:
        resp = session.get(url, params=params, timeout=30)
        resp.raise_for_status()
        return resp
    except requests.RequestException as e:
        logger.error("Failed to fetch %s: %s", url, e)
        return None


def discover_person_links(limit=34):
    """Iterate alphabetical index to find all person profile links."""
    max_letters = min(limit, 34)
    links = []
    for letter_idx in range(1, max_letters + 1):
        logger.info("Fetching letter index %d/34", letter_idx)
        resp = fetch_page(SEARCH_URL, params={"l": letter_idx})
        if not resp:
            continue
        soup = BeautifulSoup(resp.text, "html.parser")
        for a_tag in soup.select("a[href*='/pos/form/r']"):
            href = a_tag.get("href", "")
            if href and href not in links:
                links.append(href)
    logger.info("Discovered %d person links", len(links))
    return links


def parse_person_page(url):
    """Parse a single person profile page."""
    resp = fetch_page(BASE_URL + url if url.startswith("/") else url)
    if not resp:
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    person = {}

    # Extract ID from URL pattern: /pos/form/r{ID},{NAME}.html
    id_match = re.search(r"/pos/form/r(\d+),", url)
    if not id_match:
        return None
    person["id"] = id_match.group(1)

    # Name extraction
    name_el = soup.select_one("h1, .dane-osobowe h2, .tytul")
    if name_el:
        full_name = name_el.get_text(strip=True)
        parts = full_name.split()
        if len(parts) >= 2:
            person["name"] = parts[1] + " " + parts[0][0] + "."
        elif parts:
            person["name"] = parts[0]

    # Photo URL
    photo_el = soup.select_one("img[src*='/dokumenty/form/']")
    if photo_el:
        person["photo_url"] = BASE_URL + photo_el["src"] if photo_el["src"].startswith("/") else photo_el["src"]

    # Parse data table rows for age, gender, region, article
    for row in soup.select("tr, .dana"):
        text = row.get_text(" ", strip=True).lower()
        full_text = row.get_text(" ", strip=True)

        if "data urodzenia" in text:
            date_match = re.search(r"(\d{4})-(\d{2})-(\d{2})", full_text)
            if date_match:
                birth_year = int(date_match.group(1))
                person["age"] = 2026 - birth_year

        if "płeć" in text or "plec" in text:
            if "mężczyzna" in text or "mezczyzna" in text:
                person["gender"] = "M"
            elif "kobieta" in text:
                person["gender"] = "K"

        if "jednostka" in text or "kwp" in text.lower() or "ksp" in text.lower():
            region_match = re.search(r"(KWP|KSP)\s+\w+", full_text)
            if region_match:
                person["region"] = region_match.group(0)

        if "art." in text or "art " in text:
            article_match = re.search(r"(Art\.\s*\d+[^,\n]*)", full_text)
            if article_match:
                person["article_raw"] = article_match.group(1).strip()

    return person


def download_photo(person_id, photo_url):
    """Download photo if not already on disk. Returns local relative path."""
    filename = person_id + ".jpg"
    filepath = PHOTOS_DIR / filename
    relative_path = "assets/photos/" + filename

    if filepath.exists():
        return relative_path

    time.sleep(REQUEST_DELAY)
    try:
        resp = session.get(photo_url, timeout=30)
        resp.raise_for_status()
        filepath.write_bytes(resp.content)
        return relative_path
    except requests.RequestException as e:
        logger.warning("Failed to download photo for %s: %s", person_id, e)
        return "assets/placeholder.svg"


def match_article(article_raw, taxonomy):
    """Try to match a raw article string to the taxonomy."""
    if not article_raw:
        return None

    # Direct match
    if article_raw in taxonomy:
        return article_raw

    # Normalized match (strip extra spaces)
    normalized = re.sub(r"\s+", " ", article_raw).strip()
    for key in taxonomy:
        if re.sub(r"\s+", " ", key).strip() == normalized:
            return key

    # Partial match (article number only)
    num_match = re.search(r"Art\.\s*(\d+)\s*§?\s*(\d*)", normalized)
    if num_match:
        art_num = num_match.group(1)
        paragraph = num_match.group(2)
        for key in taxonomy:
            key_match = re.search(r"Art\.\s*(\d+)\s*§?\s*(\d*)", key)
            if key_match and key_match.group(1) == art_num:
                if paragraph and key_match.group(2) == paragraph:
                    return key
                if not paragraph:
                    return key

    return None


def main():
    parser = argparse.ArgumentParser(description="Scrape poszukiwani.policja.gov.pl")
    parser.add_argument("--limit", type=int, default=34,
                        help="Number of letter indices to scrape (1-34, default: all)")
    args = parser.parse_args()

    PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    taxonomy = load_taxonomy()
    logger.info("Loaded taxonomy with %d articles", len(taxonomy))

    links = discover_person_links(limit=args.limit)
    if not links:
        logger.error("No person links discovered — aborting")
        sys.exit(1)

    persons = []
    unmapped = set()

    for i, link in enumerate(links):
        logger.info("Parsing person %d/%d: %s", i + 1, len(links), link)
        person = parse_person_page(link)
        if not person:
            continue

        # Match article to taxonomy
        article_key = match_article(person.get("article_raw"), taxonomy)
        if not article_key:
            unmapped.add(person.get("article_raw", "UNKNOWN"))
            logger.warning("Unmapped article: %s (person %s)", person.get("article_raw"), person.get("id"))
            continue

        tax = taxonomy[article_key]

        # Download photo
        photo_path = "assets/placeholder.svg"
        if "photo_url" in person:
            photo_path = download_photo(person["id"], person["photo_url"])

        persons.append({
            "id": person["id"],
            "name": person.get("name", "Nieznany"),
            "age": person.get("age"),
            "gender": person.get("gender", "?"),
            "region": person.get("region", "Nieznany"),
            "photo": photo_path,
            "article": article_key,
            "articleName": tax["name"],
            "category": tax["category"],
            "mapX": tax["mapX"],
            "mapY": tax["mapY"]
        })

    logger.info("Scraped %d persons total, %d with mapped articles", len(links), len(persons))

    if unmapped:
        logger.warning("Unmapped articles (%d): %s", len(unmapped), ", ".join(sorted(unmapped)))

    if not persons:
        logger.error("No persons with mapped articles — aborting")
        sys.exit(1)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(persons, f, ensure_ascii=False, indent=2)

    logger.info("Written %d persons to %s", len(persons), OUTPUT_PATH)


if __name__ == "__main__":
    main()
