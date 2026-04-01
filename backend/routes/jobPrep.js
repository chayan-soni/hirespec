import express from 'express';
import CompanyProfile from '../models/CompanyProfile.js';
import Quiz from '../models/Quiz.js';
import {verifyAuth, verifyAuthOptional, verifyRole} from '../middleware/auth.js';
import {APIResponse} from '../middleware/response.js';

const router=express.Router();

/* ═══════════════════════════════════════════════════════════════════
   JOB PREP ROUTES
   ═══════════════════════════════════════════════════════════════════ */

// Get all companies for job prep browsing
router.get('/companies', verifyAuthOptional, async (req, res) =>
{
  try
  {
    const companies=await CompanyProfile.find({isActive: true})
      .select('name logo profile industry headquarter')
      .sort({createdAt: -1})
      .lean();

    return APIResponse.success(res, {companies}, 'Companies loaded');
  } catch (err)
  {
    console.error('[JOB-PREP] Error fetching companies:', err);
    return APIResponse.error(res, err.message, 500);
  }
});

// Get single company profile with prep questions
router.get('/company/:companyName', verifyAuthOptional, async (req, res) =>
{
  try
  {
    const {companyName}=req.params;
    const company=await CompanyProfile.findOne({name: {$regex: companyName, $options: 'i'}, isActive: true})
      .populate('quizzes', 'title description questionCount');

    if (!company)
    {
      return APIResponse.error(res, 'Company not found', 404);
    }

    return APIResponse.success(res, {
      company: {
        id: company._id,
        name: company.name,
        logo: company.logo,
        profile: company.profile,
        description: company.description,
        website: company.website,
        industry: company.industry,
        headquarter: company.headquarter,
        prepQuestions: company.prepQuestions,
        quizzes: company.quizzes||[],
      },
    }, 'Company profile loaded');
  } catch (err)
  {
    console.error('[JOB-PREP] Error fetching company:', err);
    return APIResponse.error(res, err.message, 500);
  }
});

// Get prep questions for a company (for quiz/interview setup)
router.get('/company/:companyId/prep-questions', verifyAuthOptional, async (req, res) =>
{
  try
  {
    const {companyId}=req.params;
    const company=await CompanyProfile.findById(companyId);

    if (!company)
    {
      return APIResponse.error(res, 'Company not found', 404);
    }

    return APIResponse.success(res, {
      prepQuestions: company.prepQuestions,
      total: company.prepQuestions.length,
    }, 'Prep questions loaded');
  } catch (err)
  {
    console.error('[JOB-PREP] Error fetching prep questions:', err);
    return APIResponse.error(res, err.message, 500);
  }
});

// Add prep question (Company admin only)
router.post('/company/:companyId/add-question', verifyAuth, async (req, res) =>
{
  try
  {
    const {companyId}=req.params;
    const {question, description, category, difficulty, hints, sampleAnswer, resources}=req.body;

    if (!question)
    {
      return APIResponse.error(res, 'Question is required', 400);
    }

    const company=await CompanyProfile.findById(companyId);
    if (!company)
    {
      return APIResponse.error(res, 'Company not found', 404);
    }

    // Verify user is company admin or the company manager
    if (req.user &&company.managedBy?.toString()!==req.user.userId)
    {
      return APIResponse.error(res, 'Unauthorized to modify this company', 403);
    }

    const newQuestion={
      _id: new (require('mongoose')).Types.ObjectId(),
      question,
      description: description||'',
      category: category||'technical',
      difficulty: difficulty||'medium',
      hints: hints||[],
      sampleAnswer: sampleAnswer||'',
      resources: resources||[],
      createdAt: new Date(),
    };

    company.prepQuestions.push(newQuestion);
    await company.save();

    return APIResponse.success(res, {question: newQuestion}, 'Question added successfully');
  } catch (err)
  {
    console.error('[JOB-PREP] Error adding question:', err);
    return APIResponse.error(res, err.message, 500);
  }
});

// Delete prep question (Company admin only)
router.delete('/company/:companyId/question/:questionId', verifyAuth, async (req, res) =>
{
  try
  {
    const {companyId, questionId}=req.params;

    const company=await CompanyProfile.findById(companyId);
    if (!company)
    {
      return APIResponse.error(res, 'Company not found', 404);
    }

    // Verify user is authorized
    if (req.user&&company.managedBy?.toString()!==req.user.userId)
    {
      return APIResponse.error(res, 'Unauthorized to modify this company', 403);
    }

    company.prepQuestions=company.prepQuestions.filter(q => q._id.toString()!==questionId);
    await company.save();

    return APIResponse.success(res, {}, 'Question deleted');
  } catch (err)
  {
    console.error('[JOB-PREP] Error deleting question:', err);
    return APIResponse.error(res, err.message, 500);
  }
});

// Seed companies (admin/dev only)
router.post('/seed-companies', async (req, res) =>
{
  try
  {
    const companies=[
      {
        name: 'Google',
        logo: 'https://www.google.com/favicon.ico',
        profile: 'Google is a multinational technology company specializing in search, advertising, cloud computing, and AI.',
        description: 'Founded in 1998, Google is one of the most influential tech companies in the world.',
        website: 'https://www.google.com',
        industry: 'Technology',
        headquarter: 'Mountain View, USA',
        isActive: true,
        prepQuestions: [
          {question: 'What is the difference between REST and GraphQL?', category: 'technical', difficulty: 'medium', sampleAnswer: 'REST uses multiple endpoints while GraphQL uses a single endpoint with flexible queries...'},
          {question: 'Explain system design for a URL shortener', category: 'technical', difficulty: 'hard', sampleAnswer: 'Use hash tables for storage, implement collision handling...'},
          {question: 'Tell us about a time you had to work with a difficult team member', category: 'behavioral', difficulty: 'easy', sampleAnswer: 'I focused on communication and finding common ground...'},
          {question: 'Write code to reverse a linked list', category: 'coding', difficulty: 'medium', sampleAnswer: 'Use three pointers: prev, current, next...'},
          {question: 'How do you handle performance optimization?', category: 'technical', difficulty: 'medium', sampleAnswer: 'Profile code, identify bottlenecks, use caching, optimize algorithms...'},
        ],
      },
      {
        name: 'Amazon',
        logo: 'https://www.amazon.com/favicon.ico',
        profile: 'Amazon is a global e-commerce and cloud computing leader providing AWS services.',
        description: 'Founded in 1994, Amazon revolutionized online retail and now operates AWS, the leading cloud platform.',
        website: 'https://www.amazon.com',
        industry: 'Technology & Retail',
        headquarter: 'Seattle, USA',
        isActive: true,
        prepQuestions: [
          {question: 'Design an e-commerce platform at scale', category: 'technical', difficulty: 'hard', sampleAnswer: 'Use microservices, databases for different domains, load balancing...'},
          {question: 'What is the CAP theorem?', category: 'technical', difficulty: 'medium', sampleAnswer: 'Consistency, Availability, Partition tolerance - you can only guarantee 2 of 3...'},
          {question: 'Describe your leadership style', category: 'behavioral', difficulty: 'easy', sampleAnswer: 'I believe in empowering team members and clear communication...'},
          {question: 'Implement binary search', category: 'coding', difficulty: 'easy', sampleAnswer: 'Use two pointers approach, check middle element...'},
          {question: 'What is eventual consistency?', category: 'technical', difficulty: 'medium', sampleAnswer: 'A consistency model where data becomes consistent over time...'},
        ],
      },
      {
        name: 'Microsoft',
        logo: 'https://www.microsoft.com/favicon.ico',
        profile: 'Microsoft is a technology leader in cloud computing, AI, gaming, and enterprise software.',
        description: 'Founded in 1975, Microsoft provides solutions including Azure, Office 365, and gaming services.',
        website: 'https://www.microsoft.com',
        industry: 'Technology',
        headquarter: 'Redmond, USA',
        isActive: true,
        prepQuestions: [
          {question: 'Explain OAuth 2.0 authentication flow', category: 'technical', difficulty: 'medium', sampleAnswer: 'OAuth 2.0 uses tokens instead of passwords for secure authentication...'},
          {question: 'Design a distributed cache system', category: 'technical', difficulty: 'hard', sampleAnswer: 'Use consistent hashing, replication, TTL management...'},
          {question: 'Give an example of innovative thinking', category: 'behavioral', difficulty: 'medium', sampleAnswer: 'I identified a problem, researched solutions, and implemented an efficient fix...'},
          {question: 'Find the longest substring without repeating characters', category: 'coding', difficulty: 'medium', sampleAnswer: 'Use sliding window with hash map to track characters...'},
          {question: 'What is JSON and why is it important?', category: 'technical', difficulty: 'easy', sampleAnswer: 'JSON is a lightweight data format that is human-readable and language-independent...'},
        ],
      },
      {
        name: 'Meta',
        logo: 'https://www.meta.com/favicon.ico',
        profile: 'Meta (formerly Facebook) is a leader in social media, VR/AR, and decentralized technologies.',
        description: 'Founded in 2004, Meta operates Facebook, Instagram, WhatsApp, and is investing heavily in the metaverse.',
        website: 'https://www.meta.com',
        industry: 'Technology & Entertainment',
        headquarter: 'Menlo Park, USA',
        isActive: true,
        prepQuestions: [
          {question: 'How would you design a social media feed algorithm?', category: 'technical', difficulty: 'hard', sampleAnswer: 'Use ranking algorithms, personalization, real-time updates...'},
          {question: 'What is a NoSQL database and when to use it?', category: 'technical', difficulty: 'medium', sampleAnswer: 'NoSQL databases offer flexibility for unstructured data and horizontal scaling...'},
          {question: 'Tell us about handling failure or setback', category: 'behavioral', difficulty: 'medium', sampleAnswer: 'I analyzed what went wrong, learned from it, and applied lessons to future projects...'},
          {question: 'Merge two sorted arrays', category: 'coding', difficulty: 'easy', sampleAnswer: 'Use two pointers to merge in O(n+m) time...'},
          {question: 'Explain WebSocket technology', category: 'technical', difficulty: 'medium', sampleAnswer: 'WebSocket enables persistent, bidirectional communication between client and server...'},
        ],
      },
      {
        name: 'Apple',
        logo: 'https://www.apple.com/favicon.ico',
        profile: 'Apple is a leader in consumer electronics, software, and services with focus on innovation.',
        description: 'Founded in 1976, Apple is known for iPhone, Mac, and creating an integrated ecosystem.',
        website: 'https://www.apple.com',
        industry: 'Technology',
        headquarter: 'Cupertino, USA',
        isActive: true,
        prepQuestions: [
          {question: 'Explain SOLID principles in software design', category: 'technical', difficulty: 'hard', sampleAnswer: 'Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion...'},
          {question: 'Design a recommendation system', category: 'technical', difficulty: 'hard', sampleAnswer: 'Use collaborative filtering, content-based filtering, hybrid approaches...'},
          {question: 'Describe your experience with user-centered design', category: 'behavioral', difficulty: 'medium', sampleAnswer: 'I focus on understanding user needs and iterating based on feedback...'},
          {question: 'Implement a LRU cache', category: 'coding', difficulty: 'hard', sampleAnswer: 'Use HashMap + DoublyLinkedList for O(1) operations...'},
          {question: 'What is dependency injection?', category: 'technical', difficulty: 'medium', sampleAnswer: 'Dependency injection is a pattern that provides dependencies to a class rather than having it create them...'},
        ],
      },
      {
        name: 'Tesla',
        logo: 'https://www.tesla.com/favicon.ico',
        profile: 'Tesla is a manufacturer of electric vehicles, energy storage, and renewable energy systems.',
        description: 'Founded in 2003, Tesla is revolutionizing transportation and sustainable energy.',
        website: 'https://www.tesla.com',
        industry: 'Automotive & Energy',
        headquarter: 'Austin, USA',
        isActive: true,
        prepQuestions: [
          {question: 'How would you optimize electric vehicle battery performance?', category: 'technical', difficulty: 'hard', sampleAnswer: 'Use thermal management, efficient algorithms, real-time monitoring...'},
          {question: 'Explain machine learning basics', category: 'technical', difficulty: 'medium', sampleAnswer: 'ML involves training models on data to make predictions or decisions...'},
          {question: 'Share an example of pushing technical boundaries', category: 'behavioral', difficulty: 'medium', sampleAnswer: 'I optimized a slow process by 40% using a novel approach...'},
          {question: 'Find the median of two sorted arrays', category: 'coding', difficulty: 'hard', sampleAnswer: 'Use binary search for O(log n) solution...'},
          {question: 'What is an API and REST principles?', category: 'technical', difficulty: 'easy', sampleAnswer: 'APIs allow software to communicate. REST uses HTTP methods and resources...'},
        ],
      },
      {
        name: 'Netflix',
        logo: 'https://www.netflix.com/favicon.ico',
        profile: 'Netflix is a streaming entertainment service with millions of subscribers worldwide.',
        description: 'Founded in 1997, Netflix transformed entertainment through on-demand streaming.',
        website: 'https://www.netflix.com',
        industry: 'Entertainment & Technology',
        headquarter: 'Los Gatos, USA',
        isActive: true,
        prepQuestions: [
          {question: 'Design a video streaming service at scale', category: 'technical', difficulty: 'hard', sampleAnswer: 'Use CDN, adaptive bitrate streaming, load balancing...'},
          {question: 'What is containerization and Docker?', category: 'technical', difficulty: 'medium', sampleAnswer: 'Containers package applications with dependencies for consistency across environments...'},
          {question: 'Tell us about a time you improved team productivity', category: 'behavioral', difficulty: 'medium', sampleAnswer: 'I implemented automation that reduced manual work by 50%...'},
          {question: 'Find top K frequent elements', category: 'coding', difficulty: 'medium', sampleAnswer: 'Use HashMap for counting, then min-heap or quickselect...'},
          {question: 'Explain microservices architecture', category: 'technical', difficulty: 'medium', sampleAnswer: 'Microservices break large applications into smaller, independent services...'},
        ],
      },
      {
        name: 'LinkedIn',
        logo: 'https://www.linkedin.com/favicon.ico',
        profile: 'LinkedIn is the world\'s largest professional networking platform.',
        description: 'Founded in 2002, LinkedIn connects professionals globally for career development.',
        website: 'https://www.linkedin.com',
        industry: 'Technology & Professional Services',
        headquarter: 'Sunnyvale, USA',
        isActive: true,
        prepQuestions: [
          {question: 'Design a professional network graph', category: 'technical', difficulty: 'hard', sampleAnswer: 'Use graph databases, connection indexing, efficient traversal...'},
          {question: 'What is DevOps and CI/CD?', category: 'technical', difficulty: 'medium', sampleAnswer: 'DevOps combines development and operations. CI/CD automates building, testing, and deployment...'},
          {question: 'Describe your approach to continuous learning', category: 'behavioral', difficulty: 'easy', sampleAnswer: 'I regularly read technical blogs, take courses, and practice new technologies...'},
          {question: 'Check if word exists in letter matrix', category: 'coding', difficulty: 'hard', sampleAnswer: 'Use DFS with backtracking to search in all directions...'},
          {question: 'What are database transactions?', category: 'technical', difficulty: 'medium', sampleAnswer: 'Transactions ensure ACID properties for database consistency...'},
        ],
      },
    ];

    const created=[];
    for (const companyData of companies)
    {
      const exists=await CompanyProfile.findOne({name: companyData.name});
      if (!exists)
      {
        const company=await CompanyProfile.create(companyData);
        created.push(company.name);
        console.log(`[JOB-PREP] ✅ Company seeded: ${company.name}`);
      }
    }

    return APIResponse.success(res, {created}, `${created.length} companies seeded`);
  } catch (err)
  {
    console.error('[JOB-PREP] Seed error:', err);
    return APIResponse.error(res, err.message, 500);
  }
});

export default router;
