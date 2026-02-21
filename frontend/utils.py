import requests

API_BASE = "http://localhost:8000"


def get_headers():
    import streamlit as st
    if "jwt" not in st.session_state:
        return {}
    return {"Authorization": f"Bearer {st.session_state.jwt}"}


def api_get(endpoint):
    return requests.get(f"{API_BASE}{endpoint}", headers=get_headers())


def api_post(endpoint, json=None, files=None):
    return requests.post(
        f"{API_BASE}{endpoint}",
        json=json,
        files=files,
        headers=get_headers(),
    )


def api_delete(endpoint):
    return requests.delete(
        f"{API_BASE}{endpoint}",
        headers=get_headers(),
    )