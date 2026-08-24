from crewai import Agent, Task, Crew, LLM

# 你的 HTTP 接口认证信息
API_PASSWORD = "FedaFrKygffKXXNxCOdQ:kzAirnVMOJlsZrAIybUD"  # 替换成你的实际 APIPassword

# 创建 LLM 对象，明确指定使用 LiteLLM 作为提供商
llm = LLM(
    model="openai/lite",           # 使用 openai/ 前缀，让 LiteLLM 识别为 OpenAI 兼容接口
    base_url="https://spark-api-open.xf-yun.com/v1",  # 基础路径，LiteLLM 会自动拼接 /chat/completions
    api_key=API_PASSWORD,                # 只需要 APIPassword
    provider="litellm",                  # 关键：告诉 CrewAI 直接交给 LiteLLM 处理
    temperature=0.7,
    streaming=True,
    litellm_drop_params=True
)

# 定义 Agent（传入 llm）
analyst = Agent(
    role="学情分析师",
    goal="根据学生的自我描述，分析其知识掌握情况和学习特征",
    backstory="你是一名资深教育数据挖掘专家",
    verbose=True,
    llm=llm,
)

teacher = Agent(
    role="课程设计师",
    goal="根据学生的学情画像，推荐个性化的学习重点和资源",
    backstory="你是高校课程设计专家",
    verbose=True,
    llm=llm,
)

# Task 和 Crew 定义不变
task1 = Task(
    description="""分析以下学生描述，输出结构化的学情画像JSON：
    学生说：'我学过Python基础，能写简单的爬虫和数据处理脚本，但高等数学基本忘光了，线性代数也只记得矩阵乘法，想学人工智能方向'
    请输出包含以下维度的JSON：
    - 已掌握技能列表
    - 薄弱知识点列表
    - 推荐学习优先级（高/中/低）
    - 学习风格偏好（从描述中推断）
    """,
    expected_output="结构化学情画像JSON",
    agent=analyst
)

task2 = Task(
    description="""基于以下学情画像，为该学生设计一个为期4周的人工智能入门学习重点清单：
    {task1.output}
    请输出：
    1. 4周的学习主题（每周一个主题）
    2. 每个主题下的3个核心知识点
    3. 推荐的学习资源类型（视频/文档/代码实践）
    """,
    expected_output="4周学习重点清单",
    agent=teacher,
    context=[task1]
)

crew = Crew(agents=[analyst, teacher], tasks=[task1, task2], verbose=True)

result = crew.kickoff()
print(result)