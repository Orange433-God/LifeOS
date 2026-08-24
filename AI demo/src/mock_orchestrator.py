"""
模拟编排器（演示模式）
当没有配置 API Key 时，使用预置的模拟数据展示完整的 UI 流程
"""

import json
import re
from typing import Optional


class MockOrchestrator:
    """模拟编排器 - 无需 API Key，返回示范数据"""

    REFUSAL_MESSAGE = """## ❌ 抱歉，我只能回答教学相关问题

我是**AI 学习助手**，专注于提供学习辅导和教学支持。

**我可以帮你：**
- 📖 **讲解知识点**：如「什么是深度学习？」
- 📝 **出题练习**：如「出几道机器学习的题」
- 🗺️ **规划路径**：如「我想学 NLP，该按什么顺序？」

请提出与学习相关的问题吧！"""

    # 非教学问题关键词
    _NON_TEACHING_KEYWORDS = [
        "笑话", "天气", "新闻", "股票", "彩票", "星座", "娱乐",
        "你是谁", "你叫什么", "吃了没", "再见", "拜拜",
        "游戏", "电影", "音乐", "体育", "八卦", "购物",
    ]

    def __init__(self):
        # 预置的知识库样例数据
        self.knowledge_base = {
            "机器学习": "机器学习是人工智能的核心分支，使计算机能从数据中自动学习模式。主要分为监督学习、无监督学习和强化学习。",
            "深度学习": "深度学习使用多层神经网络自动学习数据的层次化特征。包含 CNN、RNN、Transformer 等架构。",
            "神经网络": "神经网络由输入层、隐藏层和输出层组成，通过激活函数引入非线性，使用反向传播训练。",
            "自然语言处理": "NLP 让计算机理解人类语言，核心任务包括文本分类、命名实体识别、机器翻译等。",
            "计算机视觉": "计算机视觉使机器能看懂图像，核心任务包括图像分类、目标检测、图像分割等。",
            "强化学习": "强化学习通过智能体与环境交互，用奖励信号学习最优策略。",
            "Transformer": "Transformer 基于自注意力机制，是 GPT、BERT 等大模型的基础架构。",
            "CNN": "卷积神经网络通过卷积核提取局部特征，广泛用于图像处理。",
            "RNN": "循环神经网络处理序列数据，LSTM 和 GRU 解决了长期依赖问题。",
        }

    def _simulate_profile(self, query: str) -> dict:
        """模拟学情分析"""
        query_lower = query.lower()

        if any(kw in query_lower for kw in ["入门", "基础", "什么是", "介绍"]):
            return {
                "knowledge_level": "入门",
                "weak_points": ["缺乏系统知识框架", "核心概念不清晰"],
                "learning_goal": "建立基础知识体系",
                "cognitive_style": "理论型",
                "teaching_strategy": "从基本概念入手，多使用类比和示意图",
                "current_topic": self._extract_topic(query),
            }
        elif any(kw in query_lower for kw in ["进阶", "深入", "原理", "高级"]):
            return {
                "knowledge_level": "中级",
                "weak_points": ["底层原理理解不够深入"],
                "learning_goal": "深入理解核心原理",
                "cognitive_style": "理论型",
                "teaching_strategy": "结合数学推导和代码实践",
                "current_topic": self._extract_topic(query),
            }
        elif any(kw in query_lower for kw in ["题", "练习", "作业", "考试"]):
            return {
                "knowledge_level": "初级",
                "weak_points": ["需要更多练习巩固"],
                "learning_goal": "通过练习巩固知识",
                "cognitive_style": "实践型",
                "teaching_strategy": "侧重习题训练和错题解析",
                "current_topic": self._extract_topic(query),
            }
        elif any(kw in query_lower for kw in ["路径", "规划", "顺序", "怎么学"]):
            return {
                "knowledge_level": "入门",
                "weak_points": ["缺乏系统性学习规划"],
                "learning_goal": "制定高效学习路径",
                "cognitive_style": "综合型",
                "teaching_strategy": "提供结构化学习路径图",
                "current_topic": self._extract_topic(query),
            }
        else:
            return {
                "knowledge_level": "初级",
                "weak_points": ["特定知识点理解不足"],
                "learning_goal": "深入理解相关知识点",
                "cognitive_style": "综合型",
                "teaching_strategy": "概念讲解 + 案例驱动",
                "current_topic": self._extract_topic(query),
            }

    def _extract_topic(self, query: str) -> str:
        """从查询中提取核心知识点"""
        for topic in self.knowledge_base:
            if topic.lower() in query.lower():
                return topic
        return "人工智能"

    def _simulate_rag(self, query: str) -> str:
        """模拟 RAG 检索结果"""
        topic = self._extract_topic(query)
        context = self.knowledge_base.get(topic, "")
        if not context:
            # 返回最相关的结果
            for kw, content in self.knowledge_base.items():
                if any(word in query.lower() for word in kw.lower().split()):
                    context = content
                    break
        if not context:
            context = "人工智能是一门研究如何使计算机能够模拟人类智能行为的学科。"
        return f"【检索到相关知识】\n{context}"

    def _simulate_resource(self, query: str, profile: dict, rag: str) -> str:
        """模拟教学资源生成"""
        topic = profile.get("current_topic", "人工智能")
        level = profile.get("knowledge_level", "初级")

        intro = f"## 📖 {topic} 概念讲解\n\n"
        if level == "入门":
            intro += f"**{topic}** 是人工智能领域中一个重要的基础概念。简单来说，它就像..."
        elif level == "中级":
            intro += f"**{topic}** 的核心原理可以从以下几个层面来理解..."
        else:
            intro += f"**{topic}** 是一个涉及多学科交叉的前沿领域..."

        content = f"""
{intro}

### 核心要点

1. **基本定义**: {topic} 使计算机能够模拟或扩展人类智能
2. **发展历程**: 从早期的理论探索到如今的大规模应用
3. **关键技术**: 数据、算法、算力三大要素

### 💡 重点与难点

| 重点 | 说明 |
|------|------|
| ✅ 核心概念 | 理解 {topic} 的基本定义和应用场景 |
| ✅ 主要方法 | 掌握 {topic} 中的经典算法和模型 |
| ⚠️ 难点 | 数学推导和参数调优需要更多实践 |

### 📝 配套练习题

**第1题（选择题）** ⭐
以下哪个是 {topic} 的核心特征？
A. 手动编程规则
B. 从数据中自动学习
C. 无需计算资源
D. 完全替代人类

**第2题（简答题）** ⭐⭐
请简述 {topic} 的主要应用场景，并举例说明。

**第3题（思考题）** ⭐⭐⭐
如果你要设计一个 {topic} 系统来解决实际问题，你会如何设计？请说明你的思路。

### 📚 拓展阅读
- 《{topic}: 从入门到精通》
- 相关论文和开源项目推荐
- 在线课程资源
"""
        return content

    def _simulate_path(self, query: str, profile: dict, resource: str) -> str:
        """模拟学习路径规划"""
        topic = profile.get("current_topic", "人工智能")
        level = profile.get("knowledge_level", "入门")

        if level == "入门":
            steps = [
                ("Step 1", "基础概念学习", "了解核心术语和基本思想", "2小时"),
                ("Step 2", "经典算法入门", "掌握最常用的3-5种算法", "4小时"),
                ("Step 3", "动手实践", "完成一个入门级项目", "6小时"),
                ("Step 4", "进阶学习", "深入理解原理和高级技术", "8小时"),
            ]
        else:
            steps = [
                ("Step 1", "复习基础知识", "快速回顾核心概念", "1小时"),
                ("Step 2", "深入学习", "阅读经典论文和源码", "6小时"),
                ("Step 3", "项目实战", "独立完成中等难度项目", "10小时"),
                ("Step 4", "前沿探索", "关注最新研究动态", "持续"),
            ]

        path_content = f"""
## 🗺️ 个性化学习路径

根据你的知识水平（{level}），为你规划以下学习路径：

### 前置知识
- ✅ 编程基础（Python/Java）
- ✅ 数学基础（线性代数、概率论）

### 推荐学习步骤

| 步骤 | 目标 | 内容 | 预估时间 |
|------|------|------|---------|
"""
        for step_name, goal, content, duration in steps:
            path_content += f"| **{step_name}** | {goal} | {content} | {duration} |\n"

        path_content += f"""
### 进阶方向
完成本阶段学习后，可以继续探索：
- 🔹 **高级专题**: 深入学习特定方向（NLP/CV/RL）
- 🔹 **论文阅读**: 跟踪顶会最新成果
- 🔹 **开源贡献**: 参与知名开源项目

### 知识关联
{topic} 与以下知识领域紧密相关：
- 机器学习 → 深度学习 → {topic}
- 数学基础（线代、概率、微积分）
- 编程与工程实践
"""
        return path_content

    def _simulate_assessment(self, query: str, profile: dict, resource: str) -> str:
        """模拟测评生成"""
        return """
## 📝 配套测评

### 自测题

**1. 概念理解题**
请用你自己的话解释今天学的核心概念，写一段200字以内的总结。

**2. 应用题**
举一个现实生活中的例子，说明这些知识可以如何应用。

**3. 反思题**
你在学习过程中遇到了哪些困难？下一步打算如何克服？

---

### 💪 学习建议
1. **间隔重复**: 今天学完后，明天、一周后、一个月后各复习一次
2. **费曼学习法**: 尝试把这个知识点讲给别人听
3. **实践出真知**: 光看不练是不够的，一定要动手编码实践
"""

    def _is_teaching_related(self, query: str) -> bool:
        """判断是否与教学相关（关键词过滤，不调 API）"""
        for kw in self._NON_TEACHING_KEYWORDS:
            if kw in query.lower() or kw in query:
                return False
        return True

    def process_query(
        self,
        user_query: str,
        history_context: str = "",
        existing_profile: dict = None,
    ) -> dict:
        """模拟处理用户查询（无需 API Key）"""
        # 前置过滤：非教学问题直接拒绝
        if not self._is_teaching_related(user_query):
            return {
                "student_profile": "",
                "profile_parsed": {},
                "rag_context": "",
                "teaching_resource": self.REFUSAL_MESSAGE,
                "learning_path": "",
                "assessment": "",
                "is_refused": True,
            }

        # Step 1: 学情分析
        profile = self._simulate_profile(user_query)

        # Step 2: RAG 检索
        rag = self._simulate_rag(user_query)

        # Step 3: 资源生成
        resource = self._simulate_resource(user_query, profile, rag)

        # Step 4: 路径规划
        path = self._simulate_path(user_query, profile, resource)

        # Step 5: 测评生成
        assessment = self._simulate_assessment(user_query, profile, resource)

        return {
            "student_profile": json.dumps(profile, ensure_ascii=False),
            "profile_parsed": profile,
            "rag_context": rag,
            "teaching_resource": resource,
            "learning_path": path,
            "assessment": assessment,
        }


def format_mock_answer(result: dict) -> str:
    """将模拟结果格式化为前端展示文本"""
    # 拒绝的非教学问题
    if result.get("is_refused"):
        return result.get("teaching_resource", MockOrchestrator.REFUSAL_MESSAGE)

    parts = []

    # 教学资源
    if result.get("teaching_resource"):
        parts.append(result["teaching_resource"])

    # 学习路径
    if result.get("learning_path"):
        parts.append("\n---\n")
        parts.append(result["learning_path"])

    # 测评
    if result.get("assessment"):
        parts.append("\n---\n")
        parts.append(result["assessment"])

    parts.append("\n---\n")
    parts.append("> 💡 *当前为演示模式，回答由预设模板生成。配置 API Key 后可获得真实的大模型回答。*")

    return "\n".join(parts)
