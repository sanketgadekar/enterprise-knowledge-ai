import streamlit as st
from utils import api_post

st.title("Login")

email = st.text_input("Email")
password = st.text_input("Password", type="password")

if st.button("Login"):
    response = api_post("/auth/login", json={
        "email": email,
        "password": password,
    })

    if response.status_code == 200:
        st.session_state.jwt = response.json()["access_token"]
        st.success("Login successful")
        st.rerun()
    else:
        st.error("Invalid credentials")