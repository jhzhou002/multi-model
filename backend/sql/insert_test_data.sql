-- 插入测试数据到高中数学AI题库系统

USE math;

-- 清理现有测试数据（可选）
-- DELETE FROM questions;
-- DELETE FROM raw_questions;

-- 插入一些测试的原始题目数据
INSERT INTO raw_questions (
  request_id, type, knowledge_point, difficulty, custom_prompt,
  deepseek_raw, deepseek_tokens, deepseek_cost,
  kimi_check, kimi_tokens, kimi_cost,
  status, human_feedback, created_at, updated_at
) VALUES 
(
  'req_test_001', 'choice', 'func_basic', 3, '关于一次函数的基础题目',
  JSON_OBJECT(
    'question', '已知函数 $f(x) = 2x + 3$，则 $f(1)$ 的值为？',
    'options', JSON_OBJECT('A', '3', 'B', '5', 'C', '7', 'D', '9'),
    'answer', 'B',
    'solution', '将 $x = 1$ 代入函数 $f(x) = 2x + 3$，得到 $f(1) = 2 \\times 1 + 3 = 5$。'
  ),
  450, 0.0045,
  JSON_OBJECT(
    'passed', true,
    'overall_score', 85,
    'logic_score', 90,
    'calculation_score', 85,
    'format_score', 80,
    'issues', JSON_ARRAY(),
    'suggestions', JSON_ARRAY('可以增加更多解题步骤的说明'),
    'positive_points', JSON_ARRAY('题目清晰', '答案正确')
  ),
  120, 0.0012,
  'auto_pass', NULL, NOW(), NOW()
),
(
  'req_test_002', 'blank', 'trigonometry', 4, '',
  JSON_OBJECT(
    'question', '在直角三角形中，若一个锐角为 $30°$，对边长为 $a$，斜边长为 $2a$，则另一个锐角为 ______。',
    'answer', '60°',
    'solution', '根据直角三角形的性质，三角之和为 $180°$。已知一个角为 $90°$，另一个锐角为 $30°$，所以第三个角为 $180° - 90° - 30° = 60°$。'
  ),
  520, 0.0052,
  JSON_OBJECT(
    'passed', true,
    'overall_score', 92,
    'logic_score', 95,
    'calculation_score', 90,
    'format_score', 90,
    'issues', JSON_ARRAY(),
    'suggestions', JSON_ARRAY(),
    'positive_points', JSON_ARRAY('逻辑清晰', '计算正确', '格式规范')
  ),
  95, 0.0009,
  'auto_pass', NULL, DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR)
),
(
  'req_test_003', 'solution', 'derivative', 5, '关于导数应用的综合题',
  JSON_OBJECT(
    'question', '设函数 $f(x) = x^3 - 3x^2 + 2$，求函数 $f(x)$ 的单调区间。',
    'answer', '单调递增区间：$(-\\infty, 0) \\cup (2, +\\infty)$；单调递减区间：$(0, 2)$',
    'solution', '首先求导数：$f\'(x) = 3x^2 - 6x = 3x(x-2)$。\\n\\n令 $f\'(x) = 0$，得到 $x = 0$ 或 $x = 2$。\\n\\n分析各区间内导数的符号：\\n- 当 $x < 0$ 时，$f\'(x) > 0$，函数单调递增\\n- 当 $0 < x < 2$ 时，$f\'(x) < 0$，函数单调递减\\n- 当 $x > 2$ 时，$f\'(x) > 0$，函数单调递增\\n\\n因此，函数的单调递增区间为 $(-\\infty, 0) \\cup (2, +\\infty)$，单调递减区间为 $(0, 2)$。'
  ),
  780, 0.0078,
  JSON_OBJECT(
    'passed', false,
    'overall_score', 65,
    'logic_score', 80,
    'calculation_score', 60,
    'format_score', 75,
    'issues', JSON_ARRAY(
      JSON_OBJECT('type', 'calculation', 'severity', 'medium', 'description', '解题步骤可以更详细'),
      JSON_OBJECT('type', 'format', 'severity', 'low', 'description', 'LaTeX格式可以优化')
    ),
    'suggestions', JSON_ARRAY('增加函数图像分析', '完善解题步骤说明'),
    'positive_points', JSON_ARRAY('导数计算正确')
  ),
  200, 0.002,
  'ai_reject', NULL, DATE_SUB(NOW(), INTERVAL 5 HOUR), DATE_SUB(NOW(), INTERVAL 5 HOUR)
),
(
  'req_test_004', 'choice', 'probability', 2, '',
  JSON_OBJECT(
    'question', '抛掷一枚均匀的硬币两次，至少出现一次正面的概率是？',
    'options', JSON_OBJECT('A', '1/4', 'B', '1/2', 'C', '3/4', 'D', '1'),
    'answer', 'C',
    'solution', '总共有 4 种等可能的结果：正正、正反、反正、反反。\\n\\n至少出现一次正面的结果有：正正、正反、反正，共 3 种。\\n\\n所以概率为 $\\frac{3}{4}$。'
  ),
  380, 0.0038,
  JSON_OBJECT(
    'passed', true,
    'overall_score', 88,
    'logic_score', 90,
    'calculation_score', 90,
    'format_score', 85,
    'issues', JSON_ARRAY(),
    'suggestions', JSON_ARRAY('可以补充用对立事件的方法求解'),
    'positive_points', JSON_ARRAY('思路清晰', '计算准确')
  ),
  110, 0.0011,
  'confirmed', '题目质量很好，适合学生练习', DATE_SUB(NOW(), INTERVAL 1 DAY), NOW()
),
(
  'req_test_005', 'blank', 'sequence', 3, '',
  JSON_OBJECT(
    'question', '等差数列 $\\{a_n\\}$ 中，$a_1 = 2$，$d = 3$，则 $a_{10} = $ ______。',
    'answer', '29',
    'solution', '等差数列的通项公式为 $a_n = a_1 + (n-1)d$。\\n\\n代入已知条件：$a_{10} = 2 + (10-1) \\times 3 = 2 + 27 = 29$。'
  ),
  420, 0.0042,
  JSON_OBJECT(
    'passed', true,
    'overall_score', 95,
    'logic_score', 95,
    'calculation_score', 95,
    'format_score', 95,
    'issues', JSON_ARRAY(),
    'suggestions', JSON_ARRAY(),
    'positive_points', JSON_ARRAY('完美的解答', '步骤清晰', '计算准确')
  ),
  88, 0.0008,
  'confirmed', '优秀的基础题目', DATE_SUB(NOW(), INTERVAL 3 HOUR), NOW()
);

-- 插入一些确认的题目到正式题库
INSERT INTO questions (
  raw_question_id, type, knowledge_point, difficulty,
  question_text, options, correct_answer, solution,
  quality_score, usage_count, estimated_time,
  created_at, updated_at
) VALUES 
(4, 'choice', 'probability', 2, 
 '抛掷一枚均匀的硬币两次，至少出现一次正面的概率是？',
 JSON_OBJECT('A', '1/4', 'B', '1/2', 'C', '3/4', 'D', '1'),
 'C',
 '总共有 4 种等可能的结果：正正、正反、反正、反反。至少出现一次正面的结果有：正正、正反、反正，共 3 种。所以概率为 $\\frac{3}{4}$。',
 4.4, 15, 3, DATE_SUB(NOW(), INTERVAL 1 DAY), NOW()
),
(5, 'blank', 'sequence', 3,
 '等差数列 $\\{a_n\\}$ 中，$a_1 = 2$，$d = 3$，则 $a_{10} = $ ______。',
 NULL,
 '29',
 '等差数列的通项公式为 $a_n = a_1 + (n-1)d$。代入已知条件：$a_{10} = 2 + (10-1) \\times 3 = 2 + 27 = 29$。',
 4.8, 23, 2, DATE_SUB(NOW(), INTERVAL 3 HOUR), NOW()
);

-- 插入一些API调用日志样例数据
INSERT INTO api_logs (
  request_id, api_provider, endpoint, 
  request_data, response_data, 
  request_tokens, response_tokens, response_time_ms,
  status_code, error_message, cost, created_at
) VALUES 
('req_test_001', 'deepseek', '/chat/completions',
 JSON_OBJECT('model', 'deepseek-reasoner', 'messages', JSON_ARRAY(JSON_OBJECT('role', 'user', 'content', '生成一道函数题目'))),
 JSON_OBJECT('choices', JSON_ARRAY(JSON_OBJECT('message', JSON_OBJECT('content', '题目内容...')))),
 320, 450, 2850, 200, NULL, 0.0045, DATE_SUB(NOW(), INTERVAL 6 HOUR)
),
('req_test_001', 'kimi', '/chat/completions',
 JSON_OBJECT('model', 'kimi-thinking-preview', 'messages', JSON_ARRAY(JSON_OBJECT('role', 'user', 'content', '审核题目质量'))),
 JSON_OBJECT('choices', JSON_ARRAY(JSON_OBJECT('message', JSON_OBJECT('content', '审核结果...')))),
 280, 120, 1650, 200, NULL, 0.0012, DATE_SUB(NOW(), INTERVAL 6 HOUR)
),
('req_test_002', 'deepseek', '/chat/completions',
 JSON_OBJECT('model', 'deepseek-reasoner', 'messages', JSON_ARRAY(JSON_OBJECT('role', 'user', 'content', '生成一道三角函数题目'))),
 JSON_OBJECT('choices', JSON_ARRAY(JSON_OBJECT('message', JSON_OBJECT('content', '题目内容...')))),
 380, 520, 3200, 200, NULL, 0.0052, DATE_SUB(NOW(), INTERVAL 2 HOUR)
),
('req_test_error', 'deepseek', '/chat/completions',
 JSON_OBJECT('model', 'deepseek-reasoner', 'messages', JSON_ARRAY(JSON_OBJECT('role', 'user', 'content', '错误请求'))),
 NULL, 150, 0, 30000, 500, 'API调用超时', 0, DATE_SUB(NOW(), INTERVAL 1 HOUR)
);

SELECT '✅ 测试数据插入完成！' as message;