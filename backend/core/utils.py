import re


def generate_slug(name: str) -> str:
    """
    Generate a URL-safe slug from company name.
    """
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug
