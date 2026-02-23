import streamlit as st
from components.auth_guard import require_login
from components.sidebar import render_sidebar
from utils import upload_file

require_login()
render_sidebar()

st.title("📄 Upload Document")

# ---------------- INIT STATE ----------------
if "uploaded_file" not in st.session_state:
    st.session_state.uploaded_file = None


# ---------------- FILE SELECT ----------------
file = st.file_uploader(
    "Choose a file",
    type=["pdf", "txt", "docx", "csv"]
)

if file:
    st.session_state.uploaded_file = file


# ---------------- UPLOAD BUTTON ----------------
if st.button("Upload Document"):

    if st.session_state.uploaded_file is None:
        st.warning("Please select a file first.")
    else:
        with st.spinner("Uploading..."):

            r = upload_file(st.session_state.uploaded_file)

        st.write("Status:", r.status_code)

        if r.status_code == 200:
            st.success("✅ Uploaded successfully")
        else:
            st.error(r.text)