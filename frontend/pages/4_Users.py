import streamlit as st
from utils import api_get

st.title("Users")

if "jwt" not in st.session_state:
    st.stop()

response = api_get("/users/")

if response.status_code == 200:
    for user in response.json():
        st.write(user["email"])
else:
    st.error("Not authorized")