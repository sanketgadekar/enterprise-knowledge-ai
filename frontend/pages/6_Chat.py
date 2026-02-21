import streamlit as st
import requests
from utils import api_get, api_post, api_delete, API_BASE, get_headers

st.title("💬 Enterprise Chat")

if "jwt" not in st.session_state:
    st.warning("Please login first.")
    st.stop()

# -----------------------------
# Load Sessions
# -----------------------------
sessions_resp = api_get("/chat/sessions")
sessions = sessions_resp.json() if sessions_resp.status_code == 200 else []

st.sidebar.title("Sessions")

if st.sidebar.button("➕ New Chat"):
    st.session_state.session_id = None

for s in sessions:
    if st.sidebar.button(s["session_id"]):
        st.session_state.session_id = s["session_id"]

    if st.sidebar.button("❌", key=f"del_{s['session_id']}"):
        api_delete(f"/chat/sessions/{s['session_id']}")
        st.rerun()

# -----------------------------
# Start new session automatically
# -----------------------------
if "session_id" not in st.session_state:
    st.session_state.session_id = None

# -----------------------------
# Chat Input
# -----------------------------
prompt = st.chat_input("Ask your knowledge base...")

if prompt:
    response = requests.post(
        f"{API_BASE}/chat/?query={prompt}&session_id={st.session_state.session_id}",
        headers=get_headers(),
        stream=True
    )

    full_text = ""
    placeholder = st.empty()

    for chunk in response.iter_content(chunk_size=None):
        if chunk:
            text = chunk.decode()
            full_text += text
            placeholder.markdown(full_text)

    st.rerun()