import express from 'express';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import User from '../models/User.js';
import {verifyAuth, verifyAuthOptional, verifyRole} from '../middleware/auth.js';
import {APIResponse} from '../middleware/response.js';
import {parseResume, extractCGPA, extractProjects, calculateJobMatchScore, extractSkills} from '../services/resumeParser.js';

const router=express.Router();

/* ═══════════════════════════════════════════════════════════════════
   JOB ROUTES (Company-side)
   ═══════════════════════════════════════════════════════════════════ */

// Create a new job posting
router.post('/', verifyAuth, async (req, res) =>
{
  try
  {
    const {title, department, location, type, description, requirements, skills, userId, companyName, salary, eligibilityCriteria}=req.body;

    if (!title||!department)
    {
      return res.status(400).json({message: 'Title and department are required'});
    }

    if (!userId)
    {
      return res.status(401).json({message: 'User ID is required'});
    }

    // Verify the user is a company role
    const user=await User.findById(userId);
    if (!user||!['company_admin', 'company_hr', 'recruiter'].includes(user.role))
    {
      return res.status(403).json({message: 'Only company users can post jobs'});
    }

    const job=await Job.create({
      title,
      department,
      location: location||'Remote',
      type: type||'Full-Time',
      description: description||'',
      requirements: requirements||'',
      skills: skills||[],
      salary: salary || {min: 0, max: 0, currency: 'INR'},
      postedBy: userId,
      companyName: companyName||user.companyName||user.username,
      status: 'active',
      eligibilityCriteria: eligibilityCriteria || {},
    });

    console.log(`[JOBS] ✅ Job posted: "${title}" by ${user.username}`);

    return res.status(201).json({
      message: 'Job posted successfully',
      job: {
        id: job._id,
        title: job.title,
        department: job.department,
        location: job.location,
        type: job.type,
        description: job.description,
        requirements: job.requirements,
        skills: job.skills,
        salary: job.salary,
        companyName: job.companyName,
        status: job.status,
        eligibilityCriteria: job.eligibilityCriteria,
        applicantCount: 0,
        createdAt: job.createdAt,
      },
    });
  } catch (err)
  {
    console.error('[JOBS] Post error:', err);
    return res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// Get all jobs for a company (by userId)
router.get('/company/:userId', verifyAuth, async (req, res) =>
{
  try
  {
    const jobs=await Job.find({postedBy: req.params.userId})
      .sort({createdAt: -1})
      .lean();

    const jobsWithApplicants=await Promise.all(
      jobs.map(async (job) =>
      {
        const applicantCount=await Application.countDocuments({job: job._id});
        return {
          id: job._id,
          title: job.title,
          department: job.department,
          location: job.location,
          type: job.type,
          description: job.description,
          requirements: job.requirements,
          skills: job.skills,
          salary: job.salary,
          companyName: job.companyName,
          status: job.status,
          eligibilityCriteria: job.eligibilityCriteria,
          applicantCount,
          createdAt: job.createdAt,
        };
      })
    );

    return res.json({jobs: jobsWithApplicants});
  } catch (err)
  {
    return res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// Get all active jobs (for candidates to browse)
router.get('/browse', verifyAuthOptional, async (req, res) =>
{
  try
  {
    const {search, location, type, department}=req.query;
    const filter={status: 'active'};

    if (search)
    {
      filter.$or=[
        {title: {$regex: search, $options: 'i'}},
        {description: {$regex: search, $options: 'i'}},
        {companyName: {$regex: search, $options: 'i'}},
        {department: {$regex: search, $options: 'i'}},
      ];
    }
    if (location&&location!=='All') filter.location=location;
    if (type&&type!=='All') filter.type=type;
    if (department) filter.department={$regex: department, $options: 'i'};

    const jobs=await Job.find(filter)
      .sort({createdAt: -1})
      .lean();

    const jobsWithApplicants=jobs.map((job) => ({
      id: job._id,
      title: job.title,
      department: job.department,
      location: job.location,
      type: job.type,
      description: job.description,
      requirements: job.requirements,
      skills: job.skills,
      salary: job.salary,
      companyName: job.companyName,
      status: job.status,
      eligibilityCriteria: job.eligibilityCriteria,
      applicantCount: job.applicantCount||0,
      createdAt: job.createdAt,
    }));

    return res.json({jobs: jobsWithApplicants});
  } catch (err)
  {
    return res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// Get single job details
router.get('/:jobId', verifyAuthOptional, async (req, res) =>
{
  try
  {
    const job=await Job.findById(req.params.jobId).lean();
    if (!job) return res.status(404).json({message: 'Job not found'});

    const applicantCount=await Application.countDocuments({job: job._id});

    return res.json({
      id: job._id,
      title: job.title,
      department: job.department,
      location: job.location,
      type: job.type,
      description: job.description,
      requirements: job.requirements,
      skills: job.skills,
      salary: job.salary,
      companyName: job.companyName,
      status: job.status,
      eligibilityCriteria: job.eligibilityCriteria,
      applicantCount,
      createdAt: job.createdAt,
    });
  } catch (err)
  {
    return res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// Update job status
router.put('/:jobId', verifyAuth, async (req, res) =>
{
  try
  {
    const {status, title, department, location, type, description, requirements, skills, salary, eligibilityCriteria}=req.body;
    const update={};
    if (status) update.status=status;
    if (title) update.title=title;
    if (department) update.department=department;
    if (location) update.location=location;
    if (type) update.type=type;
    if (description!==undefined) update.description=description;
    if (requirements!==undefined) update.requirements=requirements;
    if (skills) update.skills=skills;
    if (salary) update.salary=salary;
    if (eligibilityCriteria) update.eligibilityCriteria=eligibilityCriteria;

    const job=await Job.findByIdAndUpdate(req.params.jobId, update, {new: true});
    if (!job) return res.status(404).json({message: 'Job not found'});

    return res.json({message: 'Job updated', job});
  } catch (err)
  {
    return res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// Delete job
router.delete('/:jobId', verifyAuth, async (req, res) =>
{
  try
  {
    await Job.findByIdAndDelete(req.params.jobId);
    await Application.deleteMany({job: req.params.jobId});
    return res.json({message: 'Job deleted'});
  } catch (err)
  {
    return res.status(500).json({message: `Server error: ${err.message}`});
  }
});

/* ═══════════════════════════════════════════════════════════════════
   APPLICATION ROUTES (Candidate-side)
   ═══════════════════════════════════════════════════════════════════ */

// Apply to a job
router.post('/:jobId/apply', verifyAuth, async (req, res) =>
{
  try
  {
    const {candidateId, coverLetter}=req.body;
    const {jobId}=req.params;

    if (!candidateId)
    {
      return res.status(401).json({message: 'Candidate ID is required'});
    }

    const job=await Job.findById(jobId);
    if (!job) return res.status(404).json({message: 'Job not found'});
    if (job.status!=='active') return res.status(400).json({message: 'This job is no longer accepting applications'});

    // Check for duplicate application
    const existing=await Application.findOne({job: jobId, candidate: candidateId});
    if (existing)
    {
      return res.status(400).json({message: 'You have already applied to this job'});
    }

    // ── ATS Scoring on Apply ──
    const candidate=await User.findById(candidateId);
    let atsData={atsScore: 0, skillMatchScore: 0, matchedSkills: [], missingSkills: [], eligible: true, eligibilityReasons: [], cgpa: 0, experienceYears: 0, projectDetails: [], resumeParsed: null};

    if (candidate) {
      // Parse resume if available
      const resumeText=candidate.resumeText || '';
      let resumeResult=candidate.resumeParsed || null;
      
      if (resumeText && !resumeResult) {
        resumeResult=parseResume(resumeText);
      }

      // Also try to build skills from user.skills if no resume
      if (!resumeResult || !resumeResult.success) {
        const candidateSkills=candidate.skills || [];
        resumeResult={
          success: true,
          skills: {technical: candidateSkills, soft: [], all: candidateSkills, categorized: {}},
          experience: {years: 0, range: null, seniority: null},
          education: [],
          atsScore: 0,
        };
      }

      // Extract CGPA from resume text or education
      let cgpa=0;
      if (resumeText) {
        const cgpaResult=extractCGPA(resumeText);
        cgpa=cgpaResult.cgpa;
      }
      // Also check user education for grade
      if (!cgpa && candidate.education?.length > 0) {
        for (const edu of candidate.education) {
          if (edu.grade) {
            const gradeNum=parseFloat(edu.grade);
            if (!isNaN(gradeNum) && gradeNum > 0 && gradeNum <= 10) {
              cgpa=gradeNum;
              break;
            }
          }
        }
      }

      // Extract projects from resume or user profile
      let projectDetails=[];
      if (resumeText) {
        projectDetails=extractProjects(resumeText);
      }
      if (projectDetails.length === 0 && candidate.projects?.length > 0) {
        projectDetails=candidate.projects.map(p => ({
          name: p.name || '',
          description: p.description || '',
          technologies: Array.isArray(p.technologies) ? p.technologies : [],
          relevanceScore: 0,
        }));
        // Calculate relevance for profile projects
        for (const p of projectDetails) {
          const fullText=`${p.name} ${p.description} ${p.technologies.join(' ')}`;
          const skills=extractSkills(fullText);
          p.technologies=skills.technical.length > 0 ? skills.technical : p.technologies;
          p.relevanceScore=Math.min(p.technologies.length * 15 + (p.description?.length > 30 ? 15 : 0), 100);
        }
      }

      // Calculate job match score
      const matchResult=calculateJobMatchScore({
        resumeResult,
        job,
        candidateCGPA: cgpa,
      });

      atsData={
        atsScore: matchResult.atsScore,
        skillMatchScore: matchResult.skillMatchScore,
        matchedSkills: matchResult.matchedSkills,
        missingSkills: matchResult.missingSkills,
        eligible: matchResult.eligible,
        eligibilityReasons: matchResult.eligibilityReasons,
        cgpa,
        experienceYears: matchResult.experienceYears || resumeResult?.experience?.years || 0,
        projectDetails: projectDetails.slice(0, 5),
        resumeParsed: resumeResult?.success ? {
          skills: resumeResult.skills,
          experience: resumeResult.experience,
          education: resumeResult.education,
        } : null,
      };
    }

    // Determine initial status based on eligibility & auto-shortlisting
    let initialStatus='applied';
    let initialRound='Applied';
    if (!atsData.eligible) {
      initialStatus='not_eligible';
      initialRound='Not Eligible';
    } else if (job.eligibilityCriteria?.autoShortlist && atsData.atsScore >= (job.eligibilityCriteria?.minATSScore || 60)) {
      initialStatus='shortlisted';
      initialRound='Auto-Shortlisted';
    }

    const application=await Application.create({
      job: jobId,
      candidate: candidateId,
      coverLetter: coverLetter||'',
      status: initialStatus,
      round: initialRound,
      score: atsData.atsScore,
      atsScore: atsData.atsScore,
      skillMatchScore: atsData.skillMatchScore,
      matchedSkills: atsData.matchedSkills,
      missingSkills: atsData.missingSkills,
      cgpa: atsData.cgpa,
      experienceYears: atsData.experienceYears,
      eligible: atsData.eligible,
      eligibilityReasons: atsData.eligibilityReasons,
      projectDetails: atsData.projectDetails,
      resumeParsed: atsData.resumeParsed,
      shortlistedAt: initialStatus === 'shortlisted' ? new Date() : undefined,
    });

    // Increment applicant count
    await Job.findByIdAndUpdate(jobId, {$inc: {applicantCount: 1}});

    console.log(`[JOBS] ✅ Application submitted for job "${job.title}" by candidate ${candidateId} (ATS: ${atsData.atsScore}, Eligible: ${atsData.eligible})`);

    return res.status(201).json({
      message: atsData.eligible
        ? (initialStatus === 'shortlisted' ? 'Application submitted & auto-shortlisted!' : 'Application submitted successfully')
        : 'Application submitted — does not meet minimum criteria',
      application: {
        id: application._id,
        jobId: application.job,
        status: application.status,
        atsScore: atsData.atsScore,
        skillMatchScore: atsData.skillMatchScore,
        matchedSkills: atsData.matchedSkills,
        missingSkills: atsData.missingSkills,
        eligible: atsData.eligible,
        eligibilityReasons: atsData.eligibilityReasons,
        createdAt: application.createdAt,
      },
    });
  } catch (err)
  {
    if (err.code===11000)
    {
      return res.status(400).json({message: 'You have already applied to this job'});
    }
    return res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// Get candidate's applications
router.get('/applications/:candidateId', verifyAuth, async (req, res) =>
{
  try
  {
    const applications=await Application.find({candidate: req.params.candidateId})
      .populate('job', 'title department location type companyName status createdAt')
      .sort({createdAt: -1})
      .lean();

    const result=applications.map((app) => ({
      id: app._id,
      status: app.status,
      round: app.round,
      score: app.score,
      appliedAt: app.createdAt,
      job: app.job? {
        id: app.job._id,
        title: app.job.title,
        department: app.job.department,
        location: app.job.location,
        type: app.job.type,
        companyName: app.job.companyName,
        status: app.job.status,
      }:null,
    }));

    return res.json({applications: result});
  } catch (err)
  {
    return res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// Get applicants for a job (company-side) — with ATS data
router.get('/:jobId/applicants', verifyAuth, async (req, res) =>
{
  try
  {
    const {sortBy='atsScore', filterStatus, minScore}=req.query;
    
    const query={job: req.params.jobId};
    if (filterStatus && filterStatus !== 'all') {
      query.status=filterStatus;
    }
    if (minScore) {
      query.atsScore={$gte: parseInt(minScore)};
    }

    const sortOptions={};
    if (sortBy === 'atsScore') sortOptions.atsScore=-1;
    else if (sortBy === 'skillMatch') sortOptions.skillMatchScore=-1;
    else if (sortBy === 'cgpa') sortOptions.cgpa=-1;
    else if (sortBy === 'date') sortOptions.createdAt=-1;
    else sortOptions.atsScore=-1;

    const applications=await Application.find(query)
      .populate('candidate', 'username email skills bio createdAt fullName education experience projects resumeText')
      .sort(sortOptions)
      .lean();

    const result=applications.map((app) => ({
      id: app._id,
      status: app.status,
      round: app.round,
      score: app.score,
      atsScore: app.atsScore || 0,
      skillMatchScore: app.skillMatchScore || 0,
      matchedSkills: app.matchedSkills || [],
      missingSkills: app.missingSkills || [],
      cgpa: app.cgpa || 0,
      experienceYears: app.experienceYears || 0,
      eligible: app.eligible !== false,
      eligibilityReasons: app.eligibilityReasons || [],
      projectDetails: app.projectDetails || [],
      appliedAt: app.createdAt,
      shortlistedAt: app.shortlistedAt,
      candidate: app.candidate? {
        id: app.candidate._id,
        name: app.candidate.fullName || app.candidate.username,
        email: app.candidate.email,
        skills: app.candidate.skills,
        bio: app.candidate.bio,
        education: app.candidate.education,
        experience: app.candidate.experience,
        projects: app.candidate.projects,
      }:null,
    }));

    return res.json({applicants: result});
  } catch (err)
  {
    return res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// Bulk shortlist applicants by ATS threshold
router.post('/:jobId/shortlist', verifyAuth, async (req, res) =>
{
  try
  {
    const {jobId}=req.params;
    const {minATSScore=60, changedBy}=req.body;

    const job=await Job.findById(jobId);
    if (!job) return res.status(404).json({message: 'Job not found'});

    // Find eligible applications above threshold
    const applications=await Application.find({
      job: jobId,
      status: 'applied',
      eligible: true,
      atsScore: {$gte: minATSScore},
    });

    let shortlistedCount=0;
    for (const app of applications) {
      app.status='shortlisted';
      app.round='Shortlisted';
      app.shortlistedAt=new Date();
      app.statusHistory.push({
        status: 'shortlisted',
        changedAt: new Date(),
        changedBy: changedBy || null,
        note: `Auto-shortlisted (ATS Score: ${app.atsScore} >= ${minATSScore})`,
      });
      await app.save();
      shortlistedCount++;
    }

    console.log(`[JOBS] ✅ Bulk shortlisted ${shortlistedCount} applicants for job "${job.title}" (threshold: ${minATSScore})`);

    return res.json({
      message: `${shortlistedCount} applicant(s) shortlisted`,
      shortlistedCount,
      threshold: minATSScore,
    });
  } catch (err) {
    return res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// Re-score all applicants for a job (useful after criteria change)
router.post('/:jobId/rescore', verifyAuth, async (req, res) =>
{
  try
  {
    const {jobId}=req.params;
    const job=await Job.findById(jobId);
    if (!job) return res.status(404).json({message: 'Job not found'});

    const applications=await Application.find({job: jobId}).populate('candidate', 'resumeText skills education projects resumeParsed');
    let rescored=0;

    for (const app of applications) {
      const candidate=app.candidate;
      if (!candidate) continue;

      const resumeText=candidate.resumeText || '';
      let resumeResult=candidate.resumeParsed || null;
      if (resumeText && !resumeResult) {
        resumeResult=parseResume(resumeText);
      }
      if (!resumeResult || !resumeResult.success) {
        resumeResult={
          success: true,
          skills: {technical: candidate.skills || [], soft: [], all: candidate.skills || [], categorized: {}},
          experience: {years: 0},
          education: [],
          atsScore: 0,
        };
      }

      let cgpa=0;
      if (resumeText) cgpa=extractCGPA(resumeText).cgpa;
      if (!cgpa && candidate.education?.length > 0) {
        for (const edu of candidate.education) {
          if (edu.grade) {
            const g=parseFloat(edu.grade);
            if (!isNaN(g) && g > 0 && g <= 10) { cgpa=g; break; }
          }
        }
      }

      const matchResult=calculateJobMatchScore({resumeResult, job, candidateCGPA: cgpa});
      
      app.atsScore=matchResult.atsScore;
      app.skillMatchScore=matchResult.skillMatchScore;
      app.matchedSkills=matchResult.matchedSkills;
      app.missingSkills=matchResult.missingSkills;
      app.eligible=matchResult.eligible;
      app.eligibilityReasons=matchResult.eligibilityReasons;
      app.cgpa=cgpa;
      app.experienceYears=matchResult.experienceYears;
      app.score=matchResult.atsScore;
      await app.save();
      rescored++;
    }

    return res.json({message: `Re-scored ${rescored} applications`, rescored});
  } catch (err) {
    return res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// Update application status (company-side)
router.put('/applications/:applicationId', verifyAuth, async (req, res) =>
{
  try
  {
    const {status, round, score, notes}=req.body;
    const update={};
    if (status) update.status=status;
    if (round) update.round=round;
    if (score!==undefined) update.score=score;
    if (notes!==undefined) update.notes=notes;

    const application=await Application.findByIdAndUpdate(req.params.applicationId, update, {new: true});
    if (!application) return res.status(404).json({message: 'Application not found'});

    return res.json({message: 'Application updated', application});
  } catch (err)
  {
    return res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// Get candidate dashboard stats
router.get('/stats/:candidateId', verifyAuth, async (req, res) =>
{
  try
  {
    const candidateId=req.params.candidateId;

    const [totalApplied, inProgress, pending, totalJobs, shortlisted, selected]=await Promise.all([
      Application.countDocuments({candidate: candidateId}),
      Application.countDocuments({candidate: candidateId, status: {$in: ['screening', 'interview', 'assessment']}}),
      Application.countDocuments({candidate: candidateId, status: 'applied'}),
      Job.countDocuments({status: 'active'}),
      Application.countDocuments({candidate: candidateId, status: 'shortlisted'}),
      Application.countDocuments({candidate: candidateId, status: {$in: ['selected', 'offered', 'hired']}}),
    ]);

    return res.json({
      applied: totalApplied,
      assessments: inProgress,
      pending,
      availableJobs: totalJobs,
      shortlisted,
      selected,
    });
  } catch (err)
  {
    return res.status(500).json({message: `Server error: ${err.message}`});
  }
});

/* ═══════════════════════════════════════════════════════════════════
   KANBAN ROUTES (Candidate-side grouped by status)
   ═══════════════════════════════════════════════════════════════════ */

// Get Kanban-grouped applications for a candidate
router.get('/kanban/:candidateId', verifyAuth, async (req, res) =>
{
  try
  {
    const candidateId=req.params.candidateId;

    const applications=await Application.find({candidate: candidateId})
      .populate('job', 'title department location type companyName status createdAt skills salary description')
      .sort({createdAt: -1})
      .lean();

    // Group applications by Kanban columns
    const kanban={
      applied: [],
      shortlisted: [],
      selected: [],
      rejected: [],
    };

    applications.forEach(app =>
    {
      const item={
        id: app._id,
        status: app.status,
        round: app.round,
        score: app.score,
        notes: app.notes,
        appliedAt: app.appliedAt||app.createdAt,
        shortlistedAt: app.shortlistedAt,
        selectedAt: app.selectedAt,
        statusHistory: app.statusHistory||[],
        job: app.job? {
          id: app.job._id,
          title: app.job.title,
          department: app.job.department,
          location: app.job.location,
          type: app.job.type,
          companyName: app.job.companyName,
          status: app.job.status,
          skills: app.job.skills||[],
          salary: app.job.salary,
          description: app.job.description,
          createdAt: app.job.createdAt,
        }:null,
      };

      if (['applied', 'screening'].includes(app.status))
      {
        kanban.applied.push(item);
      } else if (['shortlisted', 'interview', 'assessment'].includes(app.status))
      {
        kanban.shortlisted.push(item);
      } else if (['selected', 'offered', 'hired'].includes(app.status))
      {
        kanban.selected.push(item);
      } else if (['rejected', 'withdrawn'].includes(app.status))
      {
        kanban.rejected.push(item);
      } else
      {
        kanban.applied.push(item);
      }
    });

    return res.json({
      kanban,
      counts: {
        applied: kanban.applied.length,
        shortlisted: kanban.shortlisted.length,
        selected: kanban.selected.length,
        rejected: kanban.rejected.length,
        total: applications.length,
      },
    });
  } catch (err)
  {
    console.error('[JOBS] Kanban error:', err);
    return res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// Update application status (company-side — for Kanban management)
router.put('/applications/:applicationId/status', verifyAuth, async (req, res) =>
{
  try
  {
    const {status, note, changedBy}=req.body;
    if (!status) return res.status(400).json({message: 'Status is required'});

    const validStatuses=['applied', 'shortlisted', 'selected', 'screening', 'interview', 'assessment', 'offered', 'hired', 'rejected', 'withdrawn'];
    if (!validStatuses.includes(status))
    {
      return res.status(400).json({message: 'Invalid status'});
    }

    const application=await Application.findById(req.params.applicationId);
    if (!application) return res.status(404).json({message: 'Application not found'});

    const oldStatus=application.status;
    application.status=status;

    // Set timestamps for Kanban columns
    if (status==='shortlisted'&&!application.shortlistedAt)
    {
      application.shortlistedAt=new Date();
    }
    if (['selected', 'offered', 'hired'].includes(status)&&!application.selectedAt)
    {
      application.selectedAt=new Date();
    }

    // Add to status history
    if (!application.statusHistory) application.statusHistory=[];
    application.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: changedBy||null,
      note: note||`Status changed from ${oldStatus} to ${status}`,
    });

    await application.save();

    console.log(`[JOBS] ✅ Application ${application._id} status: ${oldStatus} → ${status}`);

    return res.json({
      message: 'Application status updated',
      application: {
        id: application._id,
        status: application.status,
        shortlistedAt: application.shortlistedAt,
        selectedAt: application.selectedAt,
        statusHistory: application.statusHistory,
      },
    });
  } catch (err)
  {
    console.error('[JOBS] Status update error:', err);
    return res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// Get company dashboard stats
router.get('/company-stats/:userId', verifyAuth, async (req, res) =>
{
  try
  {
    const userId=req.params.userId;

    const jobs=await Job.find({postedBy: userId}).lean();
    const jobIds=jobs.map(j => j._id);

    const [totalApplicants, inInterview, offered, hired]=await Promise.all([
      Application.countDocuments({job: {$in: jobIds}}),
      Application.countDocuments({job: {$in: jobIds}, status: 'interview'}),
      Application.countDocuments({job: {$in: jobIds}, status: 'offered'}),
      Application.countDocuments({job: {$in: jobIds}, status: 'hired'}),
    ]);

    return res.json({
      activeJobs: jobs.filter(j => j.status==='active').length,
      totalApplicants,
      inInterview,
      offered,
      hired,
    });
  } catch (err)
  {
    return res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// SEED JOBS - Create sample jobs for testing
router.post('/seed-jobs', async (req, res) =>
{
  try
  {
    // First, check if any jobs already exist
    const existingJobs=await Job.findOne();
    if (existingJobs) {
      return APIResponse.success(res, {message: 'Jobs already seeded'}, 'Jobs data exists');
    }

    // Get or create demo company user
    let demoCompanyUser=await User.findOne({username: 'demo_company', role: 'company_admin'});
    if (!demoCompanyUser) {
      demoCompanyUser=await User.create({
        username: 'demo_company',
        email: 'demo_company@hirespec.com',
        password: 'demo123',
        role: 'company_admin',
        companyName: 'Google',
        fullName: 'Demo Company Admin',
        phone: '+919999999999',
      });
    }

    const sampleJobs=[
      {
        title: 'Senior Software Engineer',
        department: 'Engineering',
        location: 'On-site',
        type: 'Full-Time',
        description: 'Join as a Senior Software Engineer to build scalable systems that impact billions of users. We\'re looking for experienced engineers passionate about solving complex problems.',
        requirements: '5+ years of experience in software development, strong C++ or Java skills, experience with distributed systems',
        skills: ['C++', 'Java', 'Python', 'System Design', 'Distributed Systems'],
        salary: {min: 180000, max: 250000, currency: 'USD'},
        companyName: 'Google',
        status: 'active',
        eligibilityCriteria: {minCGPA: 7.0, minExperience: 5, requiredSkills: ['C++', 'System Design'], autoShortlist: true, minATSScore: 65},
        applicantCount: 0,
      },
      {
        title: 'Data Scientist',
        department: 'AI & ML',
        location: 'On-site',
        type: 'Full-Time',
        description: 'Build machine learning models and data pipelines for Amazon\'s e-commerce platform. Work with large-scale data and modern ML tools.',
        requirements: '3+ years in data science, proficiency in Python and SQL, experience with ML frameworks like TensorFlow or PyTorch',
        skills: ['Python', 'SQL', 'Machine Learning', 'TensorFlow', 'Statistics'],
        salary: {min: 150000, max: 220000, currency: 'USD'},
        companyName: 'Amazon',
        status: 'active',
        eligibilityCriteria: {minCGPA: 6.5, minExperience: 3, requiredSkills: ['Python', 'Machine Learning'], autoShortlist: true, minATSScore: 60},
        applicantCount: 0,
      },
      {
        title: 'Cloud Solutions Architect',
        department: 'Cloud',
        location: 'Hybrid',
        type: 'Full-Time',
        description: 'Design cloud solutions for enterprises using Microsoft Azure. Lead technical discussions and mentor junior architects.',
        requirements: '7+ years in cloud technologies, Azure certification, strong architecture and design skills',
        skills: ['Azure', 'Cloud Architecture', 'C#', '.NET', 'Solutions Design'],
        salary: {min: 200000, max: 280000, currency: 'USD'},
        companyName: 'Microsoft',
        status: 'active',
        eligibilityCriteria: {minCGPA: 7.5, minExperience: 7, requiredSkills: ['Azure', 'Cloud Architecture'], autoShortlist: true, minATSScore: 70},
        applicantCount: 0,
      },
      {
        title: 'Product Manager',
        department: 'Product',
        location: 'On-site',
        type: 'Full-Time',
        description: 'Lead product strategy for Meta\'s next-generation social platforms. Drive product vision and work cross-functionally with engineering and design.',
        requirements: '5+ years of product management experience, strong analytical skills, background in social or consumer tech',
        skills: ['Product Strategy', 'Analytics', 'Communication', 'Leadership', 'Data Analysis'],
        salary: {min: 170000, max: 240000, currency: 'USD'},
        companyName: 'Meta',
        status: 'active',
        eligibilityCriteria: {minCGPA: 7.0, minExperience: 5, requiredSkills: ['Product Strategy', 'Analytics'], autoShortlist: true, minATSScore: 65},
        applicantCount: 0,
      },
      {
        title: 'Hardware Design Engineer',
        department: 'Hardware Engineering',
        location: 'On-site',
        type: 'Full-Time',
        description: 'Design next-generation Apple devices. Work on cutting-edge hardware design with the world\'s best engineers.',
        requirements: '6+ years in hardware design, expertise in circuit design and testing, knowledge of modern semiconductors',
        skills: ['Circuit Design', 'VHDL', 'Hardware Testing', 'Signal Processing', 'Semiconductors'],
        salary: {min: 190000, max: 260000, currency: 'USD'},
        companyName: 'Apple',
        status: 'active',
        eligibilityCriteria: {minCGPA: 7.5, minExperience: 6, requiredSkills: ['Circuit Design', 'VHDL'], autoShortlist: true, minATSScore: 68},
        applicantCount: 0,
      },
      {
        title: 'Embedded Systems Engineer',
        department: 'Engineering',
        location: 'On-site',
        type: 'Full-Time',
        description: 'Build firmware and control systems for Tesla\'s electric vehicles. Work on safety-critical systems and autonomous driving.',
        requirements: '5+ years in embedded systems, proficiency in C/C++, experience with real-time operating systems',
        skills: ['Embedded C', 'C++', 'RTOS', 'Firmware Development', 'Automotive Electronics'],
        salary: {min: 160000, max: 230000, currency: 'USD'},
        companyName: 'Tesla',
        status: 'active',
        eligibilityCriteria: {minCGPA: 7.0, minExperience: 5, requiredSkills: ['Embedded C', 'RTOS'], autoShortlist: true, minATSScore: 65},
        applicantCount: 0,
      },
      {
        title: 'Backend Engineer',
        department: 'Engineering',
        location: 'Hybrid',
        type: 'Full-Time',
        description: 'Build scalable services for Netflix\'s streaming platform. Handle billions of requests daily with high reliability.',
        requirements: '4+ years of backend development, expertise in Java or Go, experience with microservices',
        skills: ['Java', 'Go', 'Microservices', 'Kafka', 'PostgreSQL'],
        salary: {min: 155000, max: 225000, currency: 'USD'},
        companyName: 'Netflix',
        status: 'active',
        eligibilityCriteria: {minCGPA: 6.8, minExperience: 4, requiredSkills: ['Java', 'Microservices'], autoShortlist: true, minATSScore: 62},
        applicantCount: 0,
      },
      {
        title: 'Full Stack Developer',
        department: 'Engineering',
        location: 'Hybrid',
        type: 'Full-Time',
        description: 'Develop professional networking features for LinkedIn. Work with millions of professionals worldwide.',
        requirements: '3+ years in full-stack development, proficiency in React and Node.js, experience with social networks',
        skills: ['React', 'Node.js', 'JavaScript', 'MongoDB', 'REST APIs'],
        salary: {min: 140000, max: 200000, currency: 'USD'},
        companyName: 'LinkedIn',
        status: 'active',
        eligibilityCriteria: {minCGPA: 6.5, minExperience: 3, requiredSkills: ['React', 'Node.js'], autoShortlist: true, minATSScore: 60},
        applicantCount: 0,
      },
      {
        title: 'QA Automation Engineer',
        department: 'Quality Assurance',
        location: 'Remote',
        type: 'Full-Time',
        description: 'Build automated testing frameworks for Google\'s products. Ensure quality at scale with advanced testing strategies.',
        requirements: '3+ years in QA automation, expertise in Selenium or Cypress, strong understanding of testing principles',
        skills: ['Selenium', 'Python', 'JavaScript', 'Test Automation', 'CI/CD'],
        salary: {min: 120000, max: 170000, currency: 'USD'},
        companyName: 'Google',
        status: 'active',
        eligibilityCriteria: {minCGPA: 6.5, minExperience: 3, requiredSkills: ['Selenium', 'Test Automation'], autoShortlist: true, minATSScore: 60},
        applicantCount: 0,
      },
      {
        title: 'Frontend Engineer',
        department: 'Engineering',
        location: 'Remote',
        type: 'Full-Time',
        description: 'Build beautiful and responsive web applications for Amazon AWS console. Millions of developers use your code daily.',
        requirements: '4+ years in frontend development, expert-level JavaScript, experience with React or Vue',
        skills: ['React', 'TypeScript', 'CSS', 'JavaScript', 'Redux'],
        salary: {min: 145000, max: 210000, currency: 'USD'},
        companyName: 'Amazon',
        status: 'active',
        eligibilityCriteria: {minCGPA: 6.8, minExperience: 4, requiredSkills: ['React', 'JavaScript'], autoShortlist: true, minATSScore: 62},
        applicantCount: 0,
      },
    ];

    // Add postedBy field to all jobs
    const jobsWithUser=sampleJobs.map(job => ({
      ...job,
      postedBy: demoCompanyUser._id,
    }));

    // Insert all jobs
    const createdJobs=await Job.insertMany(jobsWithUser);

    console.log(`[JOBS] ✅ Seeded ${createdJobs.length} sample jobs successfully`);

    return APIResponse.success(res, {
      message: `${createdJobs.length} jobs seeded successfully`,
      jobs: createdJobs.map(j => ({
        id: j._id,
        title: j.title,
        company: j.companyName,
        department: j.department,
        location: j.location,
      })),
    }, 'Jobs seeded');
  } catch (err)
  {
    console.error('[JOBS] Seed error:', err);
    return APIResponse.error(res, `Failed to seed jobs: ${err.message}`, 500);
  }
});

export default router;
