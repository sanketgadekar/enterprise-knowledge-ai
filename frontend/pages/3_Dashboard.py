import streamlit as st
from components.auth_guard import require_login
import streamlit as st
from components.auth_guard import require_login
from components.sidebar import render_sidebar

require_login()
render_sidebar()

st.title("Dashboard")
require_login()

st.title("Dashboard")
st.write("Welcome to Enterprise AI System")