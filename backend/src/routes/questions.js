const express = require('express');
const QuestionController = require('../controllers/questionController');

const router = express.Router();

// 题目生成相关路由
router.post('/generate', QuestionController.generateQuestion);
router.get('/status/:requestId', QuestionController.getQuestionStatus);

// 原始题目管理路由
router.get('/raw', QuestionController.getRawQuestions);
router.get('/raw/:id', QuestionController.getRawQuestionById);
router.post('/:id/confirm', QuestionController.confirmQuestion);
router.post('/:id/reject', QuestionController.rejectQuestion);

// 正式题目查询路由
router.get('/', QuestionController.getQuestions);

// 统计信息路由
router.get('/statistics', QuestionController.getStatistics);

module.exports = router;