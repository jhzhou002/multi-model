const Joi = require('joi');
const KnowledgePoint = require('../models/KnowledgePoint');

// 验证schema
const createKnowledgePointSchema = Joi.object({
  code: Joi.string().min(1).max(32).required(),
  name: Joi.string().min(1).max(64).required(),
  category: Joi.string().min(1).max(32).required(),
  description: Joi.string().max(500).optional(),
  parentId: Joi.number().integer().positive().optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional()
});

const updateKnowledgePointSchema = Joi.object({
  name: Joi.string().min(1).max(64).optional(),
  category: Joi.string().min(1).max(32).optional(),
  description: Joi.string().max(500).allow('').optional(),
  parentId: Joi.number().integer().positive().allow(null).optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional()
}).min(1); // 至少需要一个字段

class KnowledgePointController {
  // 获取所有知识点
  static async getAllKnowledgePoints(req, res, next) {
    try {
      const knowledgePoints = await KnowledgePoint.getAll();
      
      // 构建树形结构（可选）
      const { tree } = req.query;
      
      if (tree === 'true') {
        const treeData = KnowledgePointController.buildTree(knowledgePoints);
        return res.json({
          success: true,
          data: {
            tree: treeData,
            flat: knowledgePoints
          }
        });
      }
      
      res.json({
        success: true,
        data: knowledgePoints
      });

    } catch (error) {
      next(error);
    }
  }

  // 获取知识点分类
  static async getCategories(req, res, next) {
    try {
      const categories = await KnowledgePoint.getCategories();
      
      res.json({
        success: true,
        data: categories
      });

    } catch (error) {
      next(error);
    }
  }

  // 根据分类获取知识点
  static async getKnowledgePointsByCategory(req, res, next) {
    try {
      const { category } = req.params;
      
      if (!category) {
        return res.status(400).json({
          error: 'Invalid Parameter',
          message: '缺少分类参数',
          code: 'MISSING_CATEGORY'
        });
      }

      const knowledgePoints = await KnowledgePoint.getByCategory(category);
      
      res.json({
        success: true,
        data: knowledgePoints
      });

    } catch (error) {
      next(error);
    }
  }

  // 获取知识点统计信息
  static async getKnowledgePointStatistics(req, res, next) {
    try {
      const statistics = await KnowledgePoint.getStatistics();
      
      // 处理数据，计算百分比等
      const processedStats = statistics.map(stat => ({
        ...stat,
        total_generated: parseInt(stat.total_generated) || 0,
        confirmed_count: parseInt(stat.confirmed_count) || 0,
        auto_pass_count: parseInt(stat.auto_pass_count) || 0,
        ai_reject_count: parseInt(stat.ai_reject_count) || 0,
        avg_quality_score: stat.avg_quality_score ? parseFloat(stat.avg_quality_score).toFixed(2) : null,
        success_rate: stat.total_generated > 0 
          ? ((stat.confirmed_count / stat.total_generated) * 100).toFixed(2) + '%'
          : '0%'
      }));
      
      res.json({
        success: true,
        data: processedStats
      });

    } catch (error) {
      next(error);
    }
  }

  // 创建知识点
  static async createKnowledgePoint(req, res, next) {
    try {
      // 输入验证
      const { error, value } = createKnowledgePointSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }

      const { code, name, category, description, parentId, sortOrder, isActive } = value;

      // 检查代码是否已存在
      const codeExists = await KnowledgePoint.existsByCode(code);
      if (codeExists) {
        return res.status(400).json({
          error: 'Conflict',
          message: '知识点代码已存在',
          code: 'CODE_EXISTS'
        });
      }

      // 如果指定了父级ID，检查父级是否存在
      if (parentId) {
        const parent = await KnowledgePoint.getByCode(parentId);
        if (!parent) {
          return res.status(400).json({
            error: 'Invalid Reference',
            message: '指定的父级知识点不存在',
            code: 'PARENT_NOT_FOUND'
          });
        }
      }

      // 创建知识点
      const id = await KnowledgePoint.create({
        code,
        name,
        category,
        description,
        parentId,
        sortOrder,
        isActive
      });

      console.log(`✅ 知识点创建成功 - ID: ${id}, Code: ${code}`);

      res.status(201).json({
        success: true,
        data: {
          id,
          message: '知识点创建成功'
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // 更新知识点
  static async updateKnowledgePoint(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          error: 'Invalid Parameter',
          message: '无效的知识点ID',
          code: 'INVALID_ID'
        });
      }

      // 输入验证
      const { error, value } = updateKnowledgePointSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }

      // 检查知识点是否存在
      const existingKnowledgePoint = await KnowledgePoint.getById(parseInt(id));
      if (!existingKnowledgePoint) {
        return res.status(404).json({
          error: 'Not Found',
          message: '知识点不存在',
          code: 'KNOWLEDGE_POINT_NOT_FOUND'
        });
      }

      // 如果要修改父级ID，检查父级是否存在
      if (value.parentId) {
        const parent = await KnowledgePoint.getById(value.parentId);
        if (!parent) {
          return res.status(400).json({
            error: 'Invalid Reference',
            message: '指定的父级知识点不存在',
            code: 'PARENT_NOT_FOUND'
          });
        }
        
        // 检查是否会造成循环引用
        if (value.parentId === parseInt(id)) {
          return res.status(400).json({
            error: 'Invalid Reference',
            message: '不能将自己设为父级',
            code: 'CIRCULAR_REFERENCE'
          });
        }
      }

      // 更新知识点
      await KnowledgePoint.update(parseInt(id), value);

      console.log(`✅ 知识点更新成功 - ID: ${id}`);

      res.json({
        success: true,
        data: {
          message: '知识点更新成功'
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // 删除知识点（软删除）
  static async deleteKnowledgePoint(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          error: 'Invalid Parameter',
          message: '无效的知识点ID',
          code: 'INVALID_ID'
        });
      }

      // 检查知识点是否存在
      const existingKnowledgePoint = await KnowledgePoint.getById(parseInt(id));
      if (!existingKnowledgePoint) {
        return res.status(404).json({
          error: 'Not Found',
          message: '知识点不存在',
          code: 'KNOWLEDGE_POINT_NOT_FOUND'
        });
      }

      // 检查是否有关联的题目
      const { query } = require('../config/database');
      const relatedQuestions = await query(
        'SELECT COUNT(*) as count FROM raw_questions WHERE knowledge_point = ?',
        [existingKnowledgePoint.code]
      );

      if (relatedQuestions[0].count > 0) {
        return res.status(400).json({
          error: 'Conflict',
          message: `无法删除，该知识点关联了 ${relatedQuestions[0].count} 道题目`,
          code: 'HAS_RELATED_QUESTIONS'
        });
      }

      // 删除知识点
      await KnowledgePoint.delete(parseInt(id));

      console.log(`✅ 知识点删除成功 - ID: ${id}`);

      res.json({
        success: true,
        data: {
          message: '知识点删除成功'
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // 构建树形结构的辅助方法
  static buildTree(knowledgePoints) {
    const map = new Map();
    const roots = [];

    // 创建映射
    knowledgePoints.forEach(kp => {
      map.set(kp.id, { ...kp, children: [] });
    });

    // 构建树形结构
    knowledgePoints.forEach(kp => {
      const node = map.get(kp.id);
      if (kp.parent_id && map.has(kp.parent_id)) {
        map.get(kp.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  // 获取知识点详情
  static async getKnowledgePointById(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          error: 'Invalid Parameter',
          message: '无效的知识点ID',
          code: 'INVALID_ID'
        });
      }

      const knowledgePoint = await KnowledgePoint.getById(parseInt(id));
      
      if (!knowledgePoint) {
        return res.status(404).json({
          error: 'Not Found',
          message: '知识点不存在',
          code: 'KNOWLEDGE_POINT_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: knowledgePoint
      });

    } catch (error) {
      next(error);
    }
  }

  // 根据代码获取知识点
  static async getKnowledgePointByCode(req, res, next) {
    try {
      const { code } = req.params;
      
      if (!code) {
        return res.status(400).json({
          error: 'Invalid Parameter',
          message: '缺少知识点代码',
          code: 'MISSING_CODE'
        });
      }

      const knowledgePoint = await KnowledgePoint.getByCode(code);
      
      if (!knowledgePoint) {
        return res.status(404).json({
          error: 'Not Found',
          message: '知识点不存在',
          code: 'KNOWLEDGE_POINT_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: knowledgePoint
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = KnowledgePointController;