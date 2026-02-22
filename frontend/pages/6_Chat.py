import streamlit as st
from components.auth_guard import require_login
from components.sidebar import render_sidebar
from utils import chat

require_login()
render_sidebar()

st.title("💬 Enterprise AI Chat")


# -------------------------------
# SESSION STATE INIT
# -------------------------------
if "messages" not in st.session_state:
    st.session_state.messages = []

if "session_id" not in st.session_state:
    st.session_state.session_id = None


# -------------------------------
# DISPLAY CHAT HISTORY
# -------------------------------
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])


# -------------------------------
# CHAT INPUT (ChatGPT style box)
# -------------------------------
prompt = st.chat_input("Ask something...")

if prompt:

    # 1️⃣ Show user message
    st.session_state.messages.append(
        {"role": "user", "content": prompt}
    )

    with st.chat_message("user"):
        st.markdown(prompt)

    # 2️⃣ Call API
    response = chat(
        query=prompt,
        session_id=st.session_state.session_id
    )

    if response.status_code == 200:

        data = response.json()

        # adjust depending on backend response format
        answer = data.get("answer", str(data))

        # if backend returns session id
        if "session_id" in data:
            st.session_state.session_id = data["session_id"]

        # 3️⃣ Store assistant reply
        st.session_state.messages.append(
            {"role": "assistant", "content": answer}
        )

        # 4️⃣ Display assistant reply
        with st.chat_message("assistant"):
            st.markdown(answer)

    else:
        st.error(response.text)