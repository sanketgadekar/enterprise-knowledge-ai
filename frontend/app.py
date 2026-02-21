import streamlit as st

st.set_page_config(
    page_title="Enterprise AI",
    layout="wide",
    page_icon="🧠"
)

st.markdown("""
<style>
.big-title { font-size:48px; font-weight:700; }
.subtitle { font-size:20px; color:#94a3b8; }
.card {
    background:#1e293b;
    padding:25px;
    border-radius:15px;
}
</style>
""", unsafe_allow_html=True)

st.markdown('<div class="big-title">Enterprise AI Platform</div>', unsafe_allow_html=True)
st.markdown('<div class="subtitle">Multi-Tenant RAG SaaS System</div>', unsafe_allow_html=True)

st.divider()

col1, col2, col3 = st.columns(3)

with col1:
    st.markdown('<div class="card">🔐 JWT Authentication</div>', unsafe_allow_html=True)

with col2:
    st.markdown('<div class="card">📄 Document Ingestion</div>', unsafe_allow_html=True)

with col3:
    st.markdown('<div class="card">💬 Streaming LLM Chat</div>', unsafe_allow_html=True)