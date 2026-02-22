import requests
import streamlit as st

API_BASE = "http://127.0.0.1:8000"


# ---------------- AUTH ----------------

def login(company_slug, email, password):
    res = requests.post(
        f"{API_BASE}/auth/login",
        json={
            "company_slug": company_slug,
            "email": email,
            "password": password
        }
    )

    if res.status_code == 200:
        data = res.json()
        st.session_state.token = data["access_token"]
        return True
    return False


def register(company, email, password, slug):
    return requests.post(
        f"{API_BASE}/auth/register",
        json={
            "company_name": company,
            "admin_email": email,
            "admin_password": password,
            "custom_slug": slug
        }
    )


def headers():
    return {"Authorization": f"Bearer {st.session_state.token}"}


# ---------------- USERS ----------------

def get_users():
    return requests.get(f"{API_BASE}/users/", headers=headers())


def create_user(email, password, role):
    return requests.post(
        f"{API_BASE}/users/",
        json={"email": email, "password": password, "role": role},
        headers=headers()
    )


# ---------------- UPLOAD ----------------

def upload_file(file):
    files = {"file": file}
    return requests.post(
        f"{API_BASE}/ingest/upload",
        files=files,
        headers=headers()
    )


# ---------------- CHAT ----------------

def chat(query, session_id=None):
    params = {"query": query}

    if session_id:
        params["session_id"] = session_id

    return requests.post(
        f"{API_BASE}/chat/",
        params=params,
        headers=headers()
    )


def list_sessions():
    return requests.get(
        f"{API_BASE}/chat/sessions",
        headers=headers()
    )


def get_messages(session_id):
    return requests.get(
        f"{API_BASE}/chat/sessions/{session_id}",
        headers=headers()
    )


def delete_session(session_id):
    return requests.delete(
        f"{API_BASE}/chat/sessions/{session_id}",
        headers=headers()
    )