-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS math CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE math;

-- 原始题目表（包含AI生成和审核信息）
CREATE TABLE IF NOT EXISTS raw_questions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    request_id VARCHAR(32) UNIQUE NOT NULL COMMENT '请求唯一标识',
    type ENUM('choice', 'blank', 'solution') NOT NULL COMMENT '题目类型：选择题、填空题、解答题',
    knowledge_point VARCHAR(64) NOT NULL COMMENT '知识点',
    difficulty TINYINT NOT NULL CHECK (difficulty BETWEEN 1 AND 5) COMMENT '难度等级1-5',
    custom_prompt TEXT COMMENT '自定义提示词',
    
    -- DeepSeek生成的原始数据
    deepseek_raw JSON NOT NULL COMMENT 'DeepSeek生成的原始题目数据',
    deepseek_tokens INT COMMENT 'DeepSeek使用的token数',
    deepseek_cost DECIMAL(10, 6) COMMENT 'DeepSeek API调用成本',
    
    -- Kimi审核数据
    kimi_check JSON COMMENT 'Kimi审核结果和建议',
    kimi_tokens INT COMMENT 'Kimi使用的token数',
    kimi_cost DECIMAL(10, 6) COMMENT 'Kimi API调用成本',
    
    -- 状态和元数据
    status ENUM('auto_pass', 'ai_reject', 'confirmed', 'human_reject') NOT NULL DEFAULT 'auto_pass' COMMENT '状态：自动通过、AI拒绝、人工确认、人工拒绝',
    human_feedback TEXT COMMENT '人工审核反馈',
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_status (status),
    INDEX idx_type_knowledge (type, knowledge_point),
    INDEX idx_created_at (created_at),
    INDEX idx_difficulty (difficulty)
) COMMENT='原始题目表，包含AI生成和审核的完整流程数据';

-- 正式题目表（已确认的题目）
CREATE TABLE IF NOT EXISTS questions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    raw_question_id BIGINT NOT NULL COMMENT '关联raw_questions表的ID',
    
    -- 题目基本信息
    type ENUM('choice', 'blank', 'solution') NOT NULL,
    knowledge_point VARCHAR(64) NOT NULL,
    difficulty TINYINT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    
    -- 题目内容
    question_text TEXT NOT NULL COMMENT '题目内容（LaTeX格式）',
    options JSON COMMENT '选择题选项（仅选择题使用）',
    correct_answer TEXT NOT NULL COMMENT '标准答案',
    solution TEXT NOT NULL COMMENT '详细解析（LaTeX格式）',
    
    -- 元数据
    tags JSON COMMENT '题目标签',
    estimated_time INT COMMENT '预计答题时间（分钟）',
    usage_count INT DEFAULT 0 COMMENT '使用次数统计',
    
    -- 质量评估
    quality_score DECIMAL(3, 2) COMMENT '质量评分（1.00-5.00）',
    feedback_count INT DEFAULT 0 COMMENT '反馈次数',
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (raw_question_id) REFERENCES raw_questions(id),
    INDEX idx_type_knowledge (type, knowledge_point),
    INDEX idx_difficulty (difficulty),
    INDEX idx_quality (quality_score),
    INDEX idx_usage (usage_count),
    FULLTEXT INDEX idx_question_content (question_text, solution)
) COMMENT='正式题目表，存储已确认的高质量题目';

-- 知识点配置表
CREATE TABLE IF NOT EXISTS knowledge_points (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(32) UNIQUE NOT NULL COMMENT '知识点代码',
    name VARCHAR(64) NOT NULL COMMENT '知识点名称',
    category VARCHAR(32) NOT NULL COMMENT '分类（必修/选修）',
    description TEXT COMMENT '知识点描述',
    parent_id INT COMMENT '父级知识点ID',
    sort_order INT DEFAULT 0 COMMENT '排序权重',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES knowledge_points(id),
    INDEX idx_category (category),
    INDEX idx_active (is_active)
) COMMENT='知识点配置表';

-- API调用日志表
CREATE TABLE IF NOT EXISTS api_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    request_id VARCHAR(32) NOT NULL COMMENT '关联的请求ID',
    api_provider ENUM('deepseek', 'kimi') NOT NULL COMMENT 'API提供商',
    endpoint VARCHAR(255) NOT NULL COMMENT 'API端点',
    
    -- 请求信息
    request_data JSON COMMENT '请求数据',
    request_tokens INT COMMENT '请求token数',
    
    -- 响应信息
    response_data JSON COMMENT '响应数据',
    response_tokens INT COMMENT '响应token数',
    response_time_ms INT COMMENT '响应时间（毫秒）',
    
    -- 状态和成本
    status_code INT COMMENT 'HTTP状态码',
    error_message TEXT COMMENT '错误信息',
    cost DECIMAL(10, 6) COMMENT 'API调用成本',
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_request_id (request_id),
    INDEX idx_provider (api_provider),
    INDEX idx_created_at (created_at)
) COMMENT='API调用日志表，用于监控和成本分析';

-- 插入默认知识点数据
INSERT IGNORE INTO knowledge_points (code, name, category, description, sort_order) VALUES
('func_basic', '函数基础', '必修', '函数的定义、性质、图像', 1),
('func_inverse', '反函数', '必修', '反函数的定义和性质', 2),
('func_composite', '复合函数', '必修', '复合函数的运算和性质', 3),
('trigonometry', '三角函数', '必修', '三角函数的定义、图像、性质', 4),
('logarithm', '对数函数', '必修', '对数函数的定义、性质、运算', 5),
('exponential', '指数函数', '必修', '指数函数的定义、性质、图像', 6),
('inequality', '不等式', '必修', '一元二次不等式、基本不等式', 7),
('sequence', '数列', '必修', '等差数列、等比数列', 8),
('limit', '极限', '选修', '数列极限、函数极限', 9),
('derivative', '导数', '选修', '导数的定义、计算、应用', 10),
('integral', '积分', '选修', '定积分、不定积分的计算', 11),
('probability', '概率', '选修', '古典概率、条件概率', 12),
('statistics', '统计', '选修', '数据分析、假设检验', 13),
('geometry_plane', '平面几何', '必修', '平面几何的基本概念和定理', 14),
('geometry_solid', '立体几何', '必修', '空间几何体的性质和计算', 15),
('analytic_geometry', '解析几何', '选修', '直线、圆、椭圆、双曲线、抛物线', 16),
('vector', '向量', '必修', '平面向量、空间向量的运算', 17),
('complex', '复数', '选修', '复数的四则运算、几何意义', 18);