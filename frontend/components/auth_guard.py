import streamlit as st

def require_login():
    if not st.session_state.get("token"):
        st.switch_page("pages/1_Login.py")