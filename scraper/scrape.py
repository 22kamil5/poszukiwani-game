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
    """Parse a single person profile page.

    HTML structure: data is in <p> tags with <strong> children
    inside section.grid .col-md-8. No tables.
    """
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

    # Name: find h2 with an all-caps person name (SURNAME FIRSTNAME)
    for h2 in soup.find_all("h2"):
        h2_text = h2.get_text(strip=True)
        # Person name h2s are all-caps with at least 2 words
        if h2_text and h2_text == h2_text.upper() and len(h2_text.split()) >= 2:
            parts = h2_text.split()
            # Format: SURNAME FIRSTNAME -> Firstname S.
            person["name"] = parts[1].capitalize() + " " + parts[0][0].upper() + "."
            break

    # Photo
    photo_el = soup.select_one("img[src*='/dokumenty/form/']")
    if photo_el and photo_el.get("src"):
        src = photo_el["src"]
        person["photo_url"] = BASE_URL + src if src.startswith("/") else src

    # Parse all <p> tags on the page for personal info
    for p_tag in soup.find_all("p"):
        text = p_tag.get_text(" ", strip=True)
        text_lower = text.lower()

        # Date of birth: "Data urodzenia: 1975-08-24"
        if text_lower.startswith("data urodzenia"):
            date_match = re.search(r"(\d{4})-(\d{2})-(\d{2})", text)
            if date_match:
                birth_year = int(date_match.group(1))
                person["age"] = 2026 - birth_year

        # Gender: "Płeć: mężczyzna"
        if "eć:" in text or "lec:" in text_lower:
            val = text_lower
            if "mężczyzna" in val or "mezczyzna" in val:
                person["gender"] = "M"
            elif "kobieta" in val:
                person["gender"] = "K"

        # Region: "Poszukujące jednostki policji:"
        if "ce jednostki policji" in text_lower:
            ul = p_tag.find_next_sibling("ul")
            if ul:
                for li in ul.find_all("li"):
                    li_text = li.get_text(strip=True)
                    region_match = re.search(r"(KWP|KSP)\s+\w+", li_text)
                    if region_match:
                        person["region"] = region_match.group(0)
                        break

        # Crime articles: "Podstawy poszukiwań:"
        if "podstawy poszukiwa" in text_lower:
            ul = p_tag.find_next_sibling("ul")
            if ul:
                for li in ul.find_all("li"):
                    article_text = li.get_text(strip=True)
                    # Extract "Art. 286 § 1" from "Art. 286 § 1 Oszustwo - typ podstawowy"
                    art_match = re.match(r"(Art\.\s*\d+\s*§?\s*\d*)", article_text)
                    if art_match:
                        person["article_raw"] = art_match.group(1).strip()
                        break

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


def normalize_article(text):
    """Normalize article string for matching."""
    text = text.replace("SS", "§")
    text = re.sub(r"\s+", " ", text).strip()
    # Remove trailing descriptions after the article number
    text = re.sub(r"\s+[A-ZĄĆĘŁŃÓŚŹŻ].*$", "", text)
    return text


def match_article(article_raw, taxonomy):
    """Try to match a raw article string to the taxonomy."""
    if not article_raw:
        return None

    normalized = normalize_article(article_raw)

    # Direct match
    if normalized in taxonomy:
        return normalized

    # Normalized match against taxonomy keys
    for key in taxonomy:
        if normalize_article(key) == normalized:
            return key

    # Extract article number and paragraph for partial match
    num_match = re.search(r"Art\.\s*(\d+)\s*§?\s*(\d*)", normalized)
    if num_match:
        art_num = num_match.group(1)
        paragraph = num_match.group(2)

        # Try exact article+paragraph match
        for key in taxonomy:
            key_match = re.search(r"Art\.\s*(\d+)\s*§?\s*(\d*)", key)
            if key_match and key_match.group(1) == art_num:
                if paragraph and key_match.group(2) == paragraph:
                    return key

        # Fallback: match article number only (take first matching paragraph)
        for key in taxonomy:
            key_match = re.search(r"Art\.\s*(\d+)", key)
            if key_match and key_match.group(1) == art_num:
                return key

    # Check for narcotics/KKS articles with "ust." pattern
    ust_match = re.search(r"Art\.\s*(\d+)\s*ust\.\s*(\d+)", normalized)
    if ust_match:
        for key in taxonomy:
            if f"Art. {ust_match.group(1)} ust. {ust_match.group(2)}" in key:
                return key
        # Fallback: just article number
        for key in taxonomy:
            if f"Art. {ust_match.group(1)} ust." in key:
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
