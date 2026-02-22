import streamlit as st
from components.auth_guard import require_login
from utils import upload_file
import streamlit as st
from components.auth_guard import require_login
from components.sidebar import render_sidebar

require_login()
render_sidebar()

st.title("Dashboard")
require_login()

st.title("Upload Document")

file = st.file_uploader("Upload File")

if file and st.button("Upload"):
    r = upload_file(file)
    if r.status_code == 200:
        st.success("Uploaded")
    else:
        st.error(r.text)