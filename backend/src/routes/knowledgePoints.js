const express = require('express');
const KnowledgePointController = require('../controllers/knowledgePointController');

const router = express.Router();

// 获取所有知识点
router.get('/', KnowledgePointController.getAllKnowledgePoints);

// 获取知识点分类
router.get('/categories', KnowledgePointController.getCategories);

// 获取知识点统计信息
router.get('/statistics', KnowledgePointController.getKnowledgePointStatistics);

// 根据分类获取知识点
router.get('/category/:category', KnowledgePointController.getKnowledgePointsByCategory);

// 根据ID获取知识点
router.get('/:id', KnowledgePointController.getKnowledgePointById);

// 根据代码获取知识点
router.get('/code/:code', KnowledgePointController.getKnowledgePointByCode);

// 创建知识点
router.post('/', KnowledgePointController.createKnowledgePoint);

// 更新知识点
router.put('/:id', KnowledgePointController.updateKnowledgePoint);

// 删除知识点
router.delete('/:id', KnowledgePointController.deleteKnowledgePoint);

module.exports = router;