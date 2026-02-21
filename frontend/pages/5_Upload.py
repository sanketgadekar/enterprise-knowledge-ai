import streamlit as st
from utils import api_post

st.title("Upload Document")

if "jwt" not in st.session_state:
    st.stop()

file = st.file_uploader("Upload file")

if st.button("Upload") and file:
    response = api_post("/ingest/upload", files={"file": file})

    if response.status_code == 200:
        st.success("Uploaded successfully")
    else:
        st.error(response.text)