import streamlit as st
from utils import api_post

st.title("Register Company")

company_name = st.text_input("Company Name")
email = st.text_input("Admin Email")
password = st.text_input("Password", type="password")

if st.button("Register"):
    response = api_post("/auth/register", json={
        "company_name": company_name,
        "email": email,
        "password": password,
    })

    if response.status_code == 200:
        st.success("Company created. Please login.")
    else:
        st.error(response.text)