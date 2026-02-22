import streamlit as st
from utils import login

st.title("Login")

slug = st.text_input("Company Slug")
email = st.text_input("Email")
password = st.text_input("Password", type="password")

if st.button("Login"):
    if login(slug, email, password):
        st.success("Login successful")
        st.switch_page("pages/3_Dashboard.py")
    else:
        st.error("Invalid credentials")