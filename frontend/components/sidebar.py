import streamlit as st


def render_sidebar():
    """Reusable sidebar for all authenticated pages"""

    with st.sidebar:
        st.title("Enterprise AI")

        # ---------------- USER INFO ----------------
        if st.session_state.get("token"):
            st.success("Logged in")

        st.divider()

        # ---------------- NAVIGATION ----------------
        st.subheader("Navigation")

        if st.button("🏠 Dashboard"):
            st.switch_page("pages/3_Dashboard.py")

        if st.button("👥 Users"):
            st.switch_page("pages/4_Users.py")

        if st.button("📄 Upload Documents"):
            st.switch_page("pages/5_Upload.py")

        if st.button("💬 Chat"):
            st.switch_page("pages/6_Chat.py")

        st.divider()

        # ---------------- LOGOUT ----------------
        if st.button("🚪 Logout"):
            logout()


def logout():
    """Clear session safely"""
    st.session_state.token = None
    st.session_state.clear()
    st.switch_page("pages/1_Login.py")