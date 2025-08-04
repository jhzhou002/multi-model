# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a documentation repository for a high school math AI question bank generation system (高中数学 AI 题库自动生成模块). The system uses a dual AI model architecture with DeepSeek-reasoner for question generation and Kimi-thinking-preview for review and validation.

## System Architecture

The system follows a microservices architecture with:

- **Frontend**: Vue3 + ElementPlus for admin dashboard
- **Backend**: Node.js 20 + Express 4 providing RESTful APIs
- **Database**: MySQL 8.0 with two main tables (`raw_questions`, `questions`)
- **Cache**: Redis 7 for rate limiting and API result caching
- **AI Models**: 
  - DeepSeek-reasoner for question generation (https://api.deepseek.com)
  - Kimi-thinking-preview for answer validation (https://api.moonshot.cn)

## Core Business Flow

1. Admin inputs question parameters (type, knowledge point, difficulty) via web console
2. Backend calls DeepSeek-reasoner to generate question + solution JSON
3. Generated content is immediately sent to Kimi-thinking-preview for logic/calculation/format validation
4. Validated questions are stored in MySQL `raw_questions` table with status flags
5. Admin can review and approve questions through the management console
6. Approved questions move to the `questions` table for production use

## Key Configuration

**API Keys** (stored in environment variables):
- `DEEPSEEK_KEY`: DeepSeek API key for question generation
- `KIMI_KEY`: Kimi API key for answer validation

**Database Configuration**:
- Host: 8.153.77.15
- Database: math
- User: connect
- Port: 3306
- Charset: utf8mb4
- Timezone: +08:00

## API Endpoints

- `POST /api/questions/generate` - Generate new questions
- `GET /api/questions/raw` - List questions for review (supports filtering by status)
- `POST /api/questions/{id}/confirm` - Approve a question
- `POST /api/questions/{id}/reject` - Reject a question

## Performance Requirements

- Single complete flow (generation + validation + storage): ≤ 25s average
- API timeout: 30s with 2 automatic retries
- Rate limiting: 5 requests/second
- Core system availability: ≥ 99%

## Development Notes

This repository currently contains only documentation and requirements. When implementing:

1. Follow the specified tech stack (Node.js + Express, Vue3 + ElementPlus, MySQL 8.0, Redis 7)
2. Implement proper error handling and fallback mechanisms for AI API failures
3. Use the exact API endpoints and model specifications documented
4. Implement rate limiting and caching as specified
5. Follow the database schema design with proper indexing for performance
6. Ensure all sensitive data (API keys, database credentials) are stored securely in environment variables

## Question Types Supported

- Multiple choice (`choice`)
- Fill-in-the-blank (`blank`) 
- Solution problems (`solution`)

Knowledge points cover 18 areas from the Chinese high school math curriculum (人教A版必修 & 选修).