import streamlit as st

st.set_page_config(page_title="Enterprise AI", layout="wide")

if "token" not in st.session_state:
    st.session_state.token = None

st.title("Enterprise Knowledge AI")

if not st.session_state.token:
    st.info("Please login from sidebar pages.")
else:
    st.success("Logged in ✅")