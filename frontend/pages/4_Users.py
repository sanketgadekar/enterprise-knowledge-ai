import streamlit as st
from components.auth_guard import require_login
from utils import get_users, create_user
import streamlit as st
from components.auth_guard import require_login
from components.sidebar import render_sidebar

require_login()
render_sidebar()

st.title("Dashboard")
require_login()

st.title("Users")

users = get_users().json()
st.write(users)

st.subheader("Create User")

email = st.text_input("Email")
password = st.text_input("Password", type="password")
role = st.selectbox("Role", ["admin", "user"])

if st.button("Create"):
    create_user(email, password, role)
    st.success("User created")