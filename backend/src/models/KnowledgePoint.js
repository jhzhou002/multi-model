const { query } = require('../config/database');

class KnowledgePoint {
  // 获取所有知识点
  static async getAll() {
    const sql = `
      SELECT 
        id, code, name, category, description, parent_id, sort_order, is_active
      FROM knowledge_points 
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, id ASC
    `;
    
    return await query(sql);
  }

  // 获取分类列表
  static async getCategories() {
    const sql = `
      SELECT DISTINCT category 
      FROM knowledge_points 
      WHERE is_active = TRUE
      ORDER BY category
    `;
    
    const result = await query(sql);
    return result.map(row => row.category);
  }

  // 根据分类获取知识点
  static async getByCategory(category) {
    const sql = `
      SELECT 
        id, code, name, category, description, parent_id, sort_order
      FROM knowledge_points 
      WHERE category = ? AND is_active = TRUE
      ORDER BY sort_order ASC, id ASC
    `;
    
    return await query(sql, [category]);
  }

  // 根据代码获取知识点
  static async getByCode(code) {
    const sql = `
      SELECT 
        id, code, name, category, description, parent_id, sort_order, is_active
      FROM knowledge_points 
      WHERE code = ?
    `;
    
    const result = await query(sql, [code]);
    return result[0] || null;
  }

  // 获取知识点的统计信息
  static async getStatistics() {
    const sql = `
      SELECT 
        kp.code,
        kp.name,
        kp.category,
        COUNT(rq.id) as total_generated,
        SUM(CASE WHEN rq.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
        SUM(CASE WHEN rq.status = 'auto_pass' THEN 1 ELSE 0 END) as auto_pass_count,
        SUM(CASE WHEN rq.status = 'ai_reject' THEN 1 ELSE 0 END) as ai_reject_count,
        AVG(CASE WHEN rq.status = 'confirmed' THEN q.quality_score END) as avg_quality_score
      FROM knowledge_points kp
      LEFT JOIN raw_questions rq ON kp.code = rq.knowledge_point
      LEFT JOIN questions q ON rq.id = q.raw_question_id
      WHERE kp.is_active = TRUE
      GROUP BY kp.id, kp.code, kp.name, kp.category
      ORDER BY kp.sort_order ASC
    `;
    
    return await query(sql);
  }

  // 创建知识点
  static async create(data) {
    const sql = `
      INSERT INTO knowledge_points 
      (code, name, category, description, parent_id, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      data.code,
      data.name,
      data.category,
      data.description || null,
      data.parentId || null,
      data.sortOrder || 0,
      data.isActive !== false // 默认为true
    ];
    
    const result = await query(sql, params);
    return result.insertId;
  }

  // 更新知识点
  static async update(id, data) {
    const fields = [];
    const params = [];
    
    if (data.name !== undefined) {
      fields.push('name = ?');
      params.push(data.name);
    }
    
    if (data.category !== undefined) {
      fields.push('category = ?');
      params.push(data.category);
    }
    
    if (data.description !== undefined) {
      fields.push('description = ?');
      params.push(data.description);
    }
    
    if (data.parentId !== undefined) {
      fields.push('parent_id = ?');
      params.push(data.parentId);
    }
    
    if (data.sortOrder !== undefined) {
      fields.push('sort_order = ?');
      params.push(data.sortOrder);
    }
    
    if (data.isActive !== undefined) {
      fields.push('is_active = ?');
      params.push(data.isActive);
    }
    
    if (fields.length === 0) {
      throw new Error('没有提供要更新的字段');
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    
    const sql = `UPDATE knowledge_points SET ${fields.join(', ')} WHERE id = ?`;
    
    await query(sql, params);
    return true;
  }

  // 删除知识点（软删除）
  static async delete(id) {
    const sql = `
      UPDATE knowledge_points 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    await query(sql, [id]);
    return true;
  }

  // 检查知识点代码是否已存在
  static async existsByCode(code, excludeId = null) {
    let sql = 'SELECT COUNT(*) as count FROM knowledge_points WHERE code = ?';
    const params = [code];
    
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    
    const result = await query(sql, params);
    return result[0].count > 0;
  }
}

module.exports = KnowledgePoint;