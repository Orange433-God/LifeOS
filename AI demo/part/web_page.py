# app.py
import streamlit as st

st.set_page_config(page_title="验证前端", layout="centered")

st.title("🧪 前端验证")

user_input = st.text_input("请输入你的问题：", placeholder="例如：什么是五段流水线？")

if user_input:
    st.write("✅ 收到输入：", user_input)
    st.info("前端已正常接收用户输入，后端集成待开发")