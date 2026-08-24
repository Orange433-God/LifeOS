# test_stream.py —— 证明 HTTP 接口支持流式输出
from openai import OpenAI

API_PASSWORD = "FedaFrKygffKXXNxCOdQ:kzAirnVMOJlsZrAIybUD" # 替换成你的

client = OpenAI(
    api_key=API_PASSWORD,
    base_url="https://spark-api-open.xf-yun.com/v1"
)

print("🚀 流式输出效果（逐字打印）：")
print("-" * 40)

# 关键：stream=True 开启流式
response = client.chat.completions.create(
    model="lite",  # 你已经验证成功的模型名
    messages=[{"role": "user", "content": "请详细介绍什么是人工智能"}],
    stream=True  # 开启流式
)

# 逐块接收并打印（打字机效果）
for chunk in response:
    if chunk.choices[0].delta.content is not None:
        print(chunk.choices[0].delta.content, end="", flush=True)

print("\n" + "-" * 40)
print("✅ 流式输出验证完成")