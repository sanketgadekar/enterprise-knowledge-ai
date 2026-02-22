import streamlit as st
from utils import register

st.title("Register Company")

company = st.text_input("Company Name")
email = st.text_input("Admin Email")
password = st.text_input("Password", type="password")
slug = st.text_input("Custom Slug")

if st.button("Register"):
    r = register(company, email, password, slug)
    if r.status_code == 200:
        st.success("Registered Successfully")
    else:
        st.error(r.text)