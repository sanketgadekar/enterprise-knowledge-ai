import streamlit as st
from utils import api_get

st.title("📊 Dashboard")

if "jwt" not in st.session_state:
    st.warning("Please login first.")
    st.stop()

me = api_get("/auth/me").json()

st.write("Company ID:", me["company_id"])
st.write("Role:", me["role"])

users = api_get("/users/")
sessions = api_get("/chat/sessions")

col1, col2 = st.columns(2)

col1.metric("Users", len(users.json()) if users.status_code == 200 else 0)
col2.metric("Sessions", len(sessions.json()) if sessions.status_code == 200 else 0)