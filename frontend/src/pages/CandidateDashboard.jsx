import {useState, useEffect, useRef, useCallback} from 'react';
import {useNavigate, Link} from 'react-router-dom';
import
{
  Briefcase, Eye, TrendingUp, Star, Search, Bell, LogOut,
  Dumbbell, Code, Bot, Shield, FileText, ChevronRight,
  BookOpen, Target, Award, Clock, MapPin, Building2, Users,
  BarChart3, ChevronDown, Send, Trash2, Play, Upload,
  Video, UserCheck, CheckCircle, XCircle, ExternalLink, Trophy, Calendar,
  Phone, PhoneCall, PhoneOff, Mic, Volume2, Filter, Columns3, List,
  Palette, Server, Layers, Wrench, Smartphone, Monitor, MessageSquare, Terminal, Zap,
  Smile, Minus, Flame, Lightbulb, ClipboardList
} from 'lucide-react';
import api, {getMyInterviews} from '../services/api';
import CodeEditor from '../components/CodeEditor';
import CodingPractice from './CodingPractice';
import './CandidateDashboard.css';

/* ═══════════════════════════════════════════════════════════════════
   TAB DEFINITIONS
   ═══════════════════════════════════════════════════════════════════ */
const TABS=[
  {key: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={16} />},
  {key: 'jobs', label: 'Jobs', icon: <Briefcase size={16} />},
  {key: 'profile', label: 'Profile', icon: <UserCheck size={16} />},
  {key: 'quiz', label: 'Live Quiz', icon: <Trophy size={16} />},
  {key: 'contest', label: 'Coding Contest', icon: <Terminal size={16} />},
  {key: 'recruiter', label: 'Recruiter Interview', icon: <Video size={16} />},
  {key: 'practice', label: 'Practice', icon: <Dumbbell size={16} />},
  {key: 'coding', label: 'Coding Practice', icon: <Code size={16} />},
  {key: 'ai-interview', label: 'AI Interview', icon: <Bot size={16} />},
  {key: 'ai-calling', label: 'AI Calling', icon: <PhoneCall size={16} />},
  {key: 'axiom', label: 'Spec AI', icon: <BookOpen size={16} />},
];

function CandidateDashboard()
{
  const navigate=useNavigate();
  const [user, setUser]=useState(null);
  const [activeTab, setActiveTab]=useState('dashboard');
  const [searchQuery, setSearchQuery]=useState('');

  useEffect(() =>
  {
    try
    {
      const stored=localStorage.getItem('user');
      if (stored)
      {
        const u=JSON.parse(stored);
        console.log('[CandidateDashboard] User loaded from localStorage:', u);
        
        // Role validation
        if (u.role !== 'candidate')
        {
          console.warn('[CandidateDashboard] Invalid role for candidate dashboard:', u.role);
          navigate('/login');
          return;
        }
        
        setUser(u);
      } else
      {
        console.log('[CandidateDashboard] No user in localStorage, redirecting to login');
        navigate('/login');
      }
    } catch (err)
    {
      console.error('[CandidateDashboard] Error loading user:', err);
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout=() =>
  {
    localStorage.removeItem('user');
    localStorage.removeItem('practiceSession');
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('storage'));
    navigate('/login');
  };

  if (!user) return null;
  const initials=(user.username||'U').charAt(0).toUpperCase();

  return (
    <div className="cd-page">
      {/* ═══ Left Sidebar ═══ */}
      <aside className="cd-sidebar">
        <Link to="/candidate-dashboard" className="cd-logo">HireSpec</Link>

        <div className="cd-sidebar-nav">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`cd-nav-tab ${activeTab===t.key? 'active':''}`}
              onClick={() =>
              {
                if (t.key==='profile') return navigate('/candidate-profile');
                setActiveTab(t.key);
              }}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="cd-sidebar-footer">
          <div className="cd-sidebar-user">
            <div className="cd-avatar" title={user.username}>{initials}</div>
            <div className="cd-sidebar-user-info">
              <span className="cd-sidebar-username">{user.username}</span>
              <span className="cd-sidebar-role">{user.role==='candidate'? 'Candidate':user.role}</span>
            </div>
          </div>
          <button className="cd-icon-btn" title="Logout" onClick={handleLogout}><LogOut size={16} /></button>
        </div>
      </aside>

      {/* ═══ Main Area ═══ */}
      <div className="cd-main-wrapper">
        {/* Top Bar */}
        <header className="cd-topbar">
          <div className="cd-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search jobs, companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="cd-topbar-right">
            <button className="cd-icon-btn" title="Notifications"><Bell size={18} /></button>
          </div>
        </header>

        {/* ═══ Tab Content ═══ */}
        <main className="cd-main">
          {activeTab==='dashboard'&&<DashboardTab user={user} initials={initials} setActiveTab={setActiveTab} />}
          {activeTab==='jobs'&&<JobsTab user={user} />}
          {activeTab==='quiz'&&<LiveQuizTab user={user} />}
          {activeTab==='contest'&&<LiveContestTab user={user} />}
          {activeTab==='recruiter'&&<RecruiterInterviewTab user={user} />}
          {activeTab==='practice'&&<PracticeTab user={user} />}
          {activeTab==='coding'&&<CodingTab />}
          {activeTab==='ai-interview'&&<AIInterviewTab user={user} />}
          {activeTab==='ai-calling'&&<AICallingTab user={user} />}
          {activeTab==='axiom'&&<AxiomTab user={user} />}
        </main>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DASHBOARD TAB (home overview)
   ═══════════════════════════════════════════════════════════════════ */
function DashboardTab({user, initials, setActiveTab})
{
  const navigate=useNavigate();
  const [stats, setStats]=useState({applied: 0, assessments: 0, pending: 0, availableJobs: 0});
  const [jobs, setJobs]=useState([]);
  const [applications, setApplications]=useState([]);
  const [loadingJobs, setLoadingJobs]=useState(true);

  useEffect(() =>
  {
    fetchDashboardData();
  }, []);

  const fetchDashboardData=async () =>
  {
    try
    {
      const [statsRes, jobsRes, appsRes]=await Promise.all([
        api.get(`/jobs/stats/${user.id}`).catch(() => ({data: {applied: 0, assessments: 0, pending: 0, availableJobs: 0}})),
        api.get('/jobs/browse').catch(() => ({data: {jobs: []}})),
        api.get(`/jobs/applications/${user.id}`).catch(() => ({data: {applications: []}})),
      ]);
      setStats(statsRes.data);
      setJobs(jobsRes.data.jobs||[]);
      setApplications(appsRes.data.applications||[]);
    } catch (err)
    {
      console.error('Dashboard fetch error:', err);
    } finally
    {
      setLoadingJobs(false);
    }
  };

  const handleApply=async (jobId) =>
  {
    try
    {
      await api.post(`/jobs/${jobId}/apply`, {candidateId: user.id});
      fetchDashboardData();
    } catch (err)
    {
      alert(err.response?.data?.message||'Failed to apply');
    }
  };

  const appliedJobIds=new Set(applications.map(a => a.job?.id));

  const statCards=[
    {label: 'APPLIED', value: String(stats.applied), icon: <Briefcase size={20} />, color: '#3b82f6'},
    {label: 'ASSESSMENTS', value: String(stats.assessments), icon: <Eye size={20} />, color: '#a855f7'},
    {label: 'PENDING', value: String(stats.pending), icon: <TrendingUp size={20} />, color: '#14b8a6'},
    {label: 'AVAILABLE', value: String(stats.availableJobs), icon: <Star size={20} />, color: '#eab308'},
  ];

  const quickActions=[
    {label: 'My Profile', desc: 'Update resume, skills & experience', icon: <UserCheck size={22} />, tab: 'profile', badge: 'PROFILE', link: '/candidate-profile'},
    {label: 'Browse Jobs', desc: 'Find & apply to available positions', icon: <Briefcase size={22} />, tab: 'jobs', badge: 'JOBS'},
    {label: 'Job Prep', desc: 'Company-specific interview preparation', icon: <BookOpen size={22} />, tab: 'job-prep', badge: 'PREP', link: '/job-prep'},
    {label: 'Resume Verify', desc: '3-layer resume verification system', icon: <Shield size={22} />, tab: 'verify', badge: 'VERIFY', link: '/resume-verification'},
    {label: 'Recruiter Interview', desc: 'Join live interview with recruiter', icon: <Video size={22} />, tab: 'recruiter', badge: 'LIVE'},
    {label: 'Practice Interview', desc: 'AI interviewer with instant feedback', icon: <Dumbbell size={22} />, tab: 'practice', badge: 'PRACTICE'},
    {label: 'Coding Practice', desc: 'LeetCode-style problems with hints', icon: <Code size={22} />, tab: 'coding', badge: 'DSA'},
    {label: 'AI Interview', desc: 'Full AI-powered mock interview', icon: <Bot size={22} />, tab: 'ai-interview', badge: 'AI'},
    {label: 'AI Calling', desc: 'AI phone interview via Twilio', icon: <PhoneCall size={22} />, tab: 'ai-calling', badge: 'CALL'},
    {label: 'Spec AI', desc: 'AI assistant for interview prep', icon: <BookOpen size={22} />, tab: 'axiom', badge: 'CHAT'},
    {label: 'My Results', desc: 'Scores, rankings & leaderboard', icon: <Trophy size={22} />, tab: 'results', badge: 'SCORES', link: '/candidate-results'},
    {label: 'Analytics', desc: 'Deep visual analytics & insights', icon: <BarChart3 size={22} />, tab: 'analytics', badge: 'NEW', link: '/candidate-analytics'},
  ];

  const timeAgo=(dateStr) =>
  {
    const diff=Date.now()-new Date(dateStr).getTime();
    const days=Math.floor(diff/86400000);
    if (days===0) return 'Today';
    if (days===1) return 'Yesterday';
    if (days<7) return `${days}d ago`;
    return `${Math.floor(days/7)}w ago`;
  };

  return (
    <div className="cd-container">
      <div className="cd-welcome">
        <h1>Welcome back, {user.username}!</h1>
        <p>Here's what's happening with your job search today</p>
      </div>

      <div className="cd-stats-row">
        {statCards.map((s) => (
          <div className="cd-stat-card" key={s.label}>
            <div className="cd-stat-icon" style={{color: s.color, background: `${s.color}15`}}>{s.icon}</div>
            <div className="cd-stat-info">
              <span className="cd-stat-label">{s.label}</span>
              <span className="cd-stat-value">{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="cd-grid">
        {/* Profile Card */}
        <div className="cd-card cd-profile-card" style={{cursor: 'pointer'}} onClick={() => navigate('/candidate-profile')}>
          <div className="cd-profile-banner">
            <div className="cd-profile-avatar">{initials}</div>
          </div>
          <div className="cd-profile-body">
            <h3>{user.username}</h3>
            <span className="cd-role-badge">{user.role==='candidate'? 'Candidate':user.role}</span>
            <div className="cd-profile-stats">
              <div><strong>{stats.applied}</strong><span>APPLIED</span></div>
              <div><strong>{stats.assessments}</strong><span>TESTS</span></div>
              <div><strong>{stats.availableJobs}</strong><span>AVAILABLE</span></div>
            </div>
            <div className="cd-progress-section">
              <div className="cd-progress-header">
                <span>Profile Completion</span><span>50%</span>
              </div>
              <div className="cd-progress-bar">
                <div className="cd-progress-fill" style={{width: '50%'}}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="cd-card">
          <div className="cd-card-header">
            <h3><Target size={18} /> Recommended Jobs</h3>
            <span className="cd-badge">{jobs.length} available</span>
          </div>
          {loadingJobs? (
            <div className="cd-empty-state"><p>Loading jobs...</p></div>
          ):jobs.length===0? (
            <div className="cd-empty-state">
              <Briefcase size={40} /><h4>No jobs found</h4><p>Try adjusting your search or check back later</p>
            </div>
          ):(
            <div className="cd-jobs-list">
              {jobs.slice(0, 5).map(job => (
                <div className="cd-job-item" key={job.id}>
                  <div className="cd-job-info">
                    <strong>{job.title}</strong>
                    <span className="cd-job-meta">
                      <Building2 size={12} /> {job.companyName} · <MapPin size={12} /> {job.location} · <Clock size={12} /> {timeAgo(job.createdAt)}
                    </span>
                  </div>
                  <div className="cd-job-actions">
                    <span className="cd-job-type-badge">{job.type}</span>
                    {appliedJobIds.has(job.id)? (
                      <span className="cd-applied-badge"><CheckCircle size={14} /> Applied</span>
                    ):(
                      <button className="cd-apply-btn" onClick={() => handleApply(job.id)}>Apply</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cd-card">
          <div className="cd-card-header">
            <h3><FileText size={18} /> My Applications</h3>
          </div>
          {applications.length===0? (
            <div className="cd-empty-state">
              <FileText size={40} /><h4>No applications</h4><p>Apply to jobs to track your progress</p>
            </div>
          ):(
            <div className="cd-apps-list">
              {applications.slice(0, 5).map(app => (
                <div className="cd-app-item" key={app.id}>
                  <div className="cd-app-info">
                    <strong>{app.job?.title||'Unknown Job'}</strong>
                    <span>{app.job?.companyName} · {app.job?.location}</span>
                  </div>
                  <span className={`cd-app-status ${app.status}`}>{app.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="cd-section">
        <div className="cd-card-header" style={{marginBottom: 20}}>
          <h3><Award size={18} /> Quick Actions</h3>
        </div>
        <div className="cd-actions-grid">
          {quickActions.map((action) => (
            <div className="cd-action-card" key={action.label} onClick={() => action.link? navigate(action.link):setActiveTab(action.tab)}>
              <div className="cd-action-top">
                <div className="cd-action-icon">{action.icon}</div>
                <span className="cd-action-badge">{action.badge}</span>
              </div>
              <h4>{action.label}</h4>
              <p>{action.desc}</p>
              <ChevronRight size={16} className="cd-action-arrow" />
            </div>
          ))}
        </div>
      </div>

      <div className="cd-section">
        <div className="cd-card">
          <div className="cd-card-header">
            <h3><BookOpen size={18} /> My Assessments</h3>
            <span className="cd-badge">0 total</span>
          </div>
          <div className="cd-empty-state">
            <Shield size={40} /><h4>No assessments yet</h4><p>When companies assign assessments, they'll appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   JOBS TAB — Browse Available Jobs + Kanban Overview
   ═══════════════════════════════════════════════════════════════════ */
function JobsTab({user})
{
  const [viewMode, setViewMode]=useState('browse'); // 'browse' | 'kanban'
  const [jobs, setJobs]=useState([]);
  const [kanban, setKanban]=useState({applied: [], shortlisted: [], selected: [], rejected: []});
  const [counts, setCounts]=useState({applied: 0, shortlisted: 0, selected: 0, rejected: 0, total: 0});
  const [loading, setLoading]=useState(true);
  const [searchQuery, setSearchQuery]=useState('');
  const [locationFilter, setLocationFilter]=useState('All');
  const [typeFilter, setTypeFilter]=useState('All');
  const [appliedIds, setAppliedIds]=useState(new Set());
  const [selectedJob, setSelectedJob]=useState(null);
  const [applyingId, setApplyingId]=useState(null);

  useEffect(() => {fetchAll();}, []);

  const fetchAll=async () =>
  {
    setLoading(true);
    try
    {
      const [jobsRes, kanbanRes]=await Promise.all([
        api.get('/jobs/browse').catch(() => ({data: {jobs: []}})),
        api.get(`/jobs/kanban/${user.id}`).catch(() => ({data: {kanban: {applied: [], shortlisted: [], selected: [], rejected: []}, counts: {}}})),
      ]);
      setJobs(jobsRes.data.jobs||[]);
      setKanban(kanbanRes.data.kanban||{applied: [], shortlisted: [], selected: [], rejected: []});
      setCounts(kanbanRes.data.counts||{});
      // Build set of applied job IDs
      const allApps=[
        ...(kanbanRes.data.kanban?.applied||[]),
        ...(kanbanRes.data.kanban?.shortlisted||[]),
        ...(kanbanRes.data.kanban?.selected||[]),
        ...(kanbanRes.data.kanban?.rejected||[]),
      ];
      setAppliedIds(new Set(allApps.map(a => a.job?.id).filter(Boolean)));
    } catch (err)
    {
      console.error('Jobs fetch error:', err);
    } finally {setLoading(false);}
  };

  const handleApply=async (jobId) =>
  {
    setApplyingId(jobId);
    try
    {
      await api.post(`/jobs/${jobId}/apply`, {candidateId: user.id});
      await fetchAll();
    } catch (err)
    {
      alert(err.response?.data?.message||'Failed to apply');
    } finally {setApplyingId(null);}
  };

  const filteredJobs=jobs.filter(j =>
  {
    if (searchQuery)
    {
      const q=searchQuery.toLowerCase();
      if (!j.title?.toLowerCase().includes(q)&&!j.companyName?.toLowerCase().includes(q)&&!j.department?.toLowerCase().includes(q)) return false;
    }
    if (locationFilter!=='All'&&j.location!==locationFilter) return false;
    if (typeFilter!=='All'&&j.type!==typeFilter) return false;
    return true;
  });

  const timeAgo=(dateStr) =>
  {
    if (!dateStr) return '';
    const diff=Date.now()-new Date(dateStr).getTime();
    const days=Math.floor(diff/86400000);
    if (days===0) return 'Today';
    if (days===1) return 'Yesterday';
    if (days<7) return `${days}d ago`;
    return `${Math.floor(days/7)}w ago`;
  };

  const getStatusColor=(status) =>
  {
    const colors={applied: '#3b82f6', shortlisted: '#f59e0b', selected: '#22c55e', rejected: '#ef4444'};
    return colors[status]||'#6b7280';
  };

  return (
    <div className="cd-container cd-tab-content">
      <div className="cd-welcome">
        <h1>Available Jobs & Applications</h1>
        <p>Browse jobs, apply, and track your application status</p>
      </div>

      {/* Stats Strip */}
      <div className="jt-stats-strip">
        <div className="jt-stat" style={{borderColor: '#3b82f6'}}>
          <span className="jt-stat-num">{counts.applied||0}</span>
          <span className="jt-stat-label">Applied</span>
        </div>
        <div className="jt-stat" style={{borderColor: '#f59e0b'}}>
          <span className="jt-stat-num">{counts.shortlisted||0}</span>
          <span className="jt-stat-label">Shortlisted</span>
        </div>
        <div className="jt-stat" style={{borderColor: '#22c55e'}}>
          <span className="jt-stat-num">{counts.selected||0}</span>
          <span className="jt-stat-label">Selected</span>
        </div>
        <div className="jt-stat" style={{borderColor: '#ef4444'}}>
          <span className="jt-stat-num">{counts.rejected||0}</span>
          <span className="jt-stat-label">Rejected</span>
        </div>
      </div>

      {/* View Toggle */}
      <div className="jt-toolbar">
        <div className="jt-view-toggle">
          <button className={viewMode==='browse'? 'active':''} onClick={() => setViewMode('browse')}>
            <List size={16} /> Browse Jobs
          </button>
          <button className={viewMode==='kanban'? 'active':''} onClick={() => setViewMode('kanban')}>
            <Columns3 size={16} /> Kanban Board
          </button>
        </div>
        {viewMode==='browse'&&(
          <div className="jt-filters">
            <div className="jt-search-box">
              <Search size={14} />
              <input placeholder="Search jobs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
              <option value="All">All Locations</option>
              <option value="Remote">Remote</option>
              <option value="On-site">On-site</option>
              <option value="Hybrid">Hybrid</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="All">All Types</option>
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>
        )}
      </div>

      {loading? (
        <div className="cd-empty-state"><p>Loading...</p></div>
      ):viewMode==='browse'? (
        /* ── Browse View ── */
        <div className="jt-browse-layout">
          <div className="jt-jobs-list-full">
            {filteredJobs.length===0? (
              <div className="cd-empty-state">
                <Briefcase size={40} /><h4>No jobs found</h4><p>Try adjusting your search filters</p>
              </div>
            ):(
              filteredJobs.map(job => (
                <div className={`jt-job-card ${selectedJob?.id===job.id? 'active':''}`} key={job.id} onClick={() => setSelectedJob(job)}>
                  <div className="jt-job-card-header">
                    <div>
                      <h3>{job.title}</h3>
                      <div className="jt-job-meta">
                        <span><Building2 size={13} /> {job.companyName}</span>
                        <span><MapPin size={13} /> {job.location}</span>
                        <span><Clock size={13} /> {timeAgo(job.createdAt)}</span>
                      </div>
                    </div>
                    <div className="jt-job-card-actions">
                      <span className="jt-type-badge">{job.type}</span>
                      {job.skills?.length>0&&(
                        <div className="jt-skills-row">
                          {job.skills.slice(0, 3).map((s, i) => <span key={i} className="jt-skill-chip">{s}</span>)}
                          {job.skills.length>3&&<span className="jt-skill-chip more">+{job.skills.length-3}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  {job.description&&<p className="jt-job-desc">{job.description.slice(0, 150)}{job.description.length>150? '...':''}</p>}
                  
                  {/* Eligibility Criteria Display */}
                  {(job.eligibilityCriteria?.minCGPA > 0 || job.eligibilityCriteria?.requiredSkills?.length > 0 || job.eligibilityCriteria?.minExperience > 0) && (
                    <div className="jt-criteria-strip">
                      {job.eligibilityCriteria.minCGPA > 0 && (
                        <span className="jt-criteria-tag cgpa">Min CGPA: {job.eligibilityCriteria.minCGPA}</span>
                      )}
                      {job.eligibilityCriteria.minExperience > 0 && (
                        <span className="jt-criteria-tag exp">
                          {job.eligibilityCriteria.minExperience}{job.eligibilityCriteria.maxExperience ? `-${job.eligibilityCriteria.maxExperience}` : '+'} yrs
                        </span>
                      )}
                      {job.eligibilityCriteria.requiredSkills?.length > 0 && (
                        <span className="jt-criteria-tag skills">
                          Required: {job.eligibilityCriteria.requiredSkills.slice(0, 3).join(', ')}{job.eligibilityCriteria.requiredSkills.length > 3 ? ` +${job.eligibilityCriteria.requiredSkills.length - 3}` : ''}
                        </span>
                      )}
                    </div>
                  )}

                  {job.salary?.max > 0 && (
                    <div className="jt-salary-strip">
                      ₹{(job.salary.min/100000).toFixed(1)}L – ₹{(job.salary.max/100000).toFixed(1)}L
                    </div>
                  )}

                  <div className="jt-job-card-footer">
                    <span className="jt-applicants"><Users size={13} /> {job.applicantCount||0} applicants</span>
                    {appliedIds.has(job.id)? (
                      <span className="jt-applied-badge"><CheckCircle size={14} /> Applied</span>
                    ):(
                      <button className="jt-apply-btn" disabled={applyingId===job.id} onClick={(e) => {e.stopPropagation(); handleApply(job.id);}}>
                        {applyingId===job.id? 'Applying...':'Apply Now'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ):(
        /* ── Kanban View ── */
        <div className="jt-kanban-board">
          {[
            {key: 'applied', label: 'Applied', color: '#3b82f6', icon: <FileText size={16} />},
            {key: 'shortlisted', label: 'Shortlisted', color: '#f59e0b', icon: <Star size={16} />},
            {key: 'selected', label: 'Selected', color: '#22c55e', icon: <CheckCircle size={16} />},
            {key: 'rejected', label: 'Rejected', color: '#ef4444', icon: <XCircle size={16} />},
          ].map(col => (
            <div className="jt-kanban-column" key={col.key}>
              <div className="jt-kanban-col-header" style={{borderTopColor: col.color}}>
                <div className="jt-kanban-col-title">
                  {col.icon}
                  <span>{col.label}</span>
                  <span className="jt-kanban-count" style={{background: col.color}}>{kanban[col.key]?.length||0}</span>
                </div>
              </div>
              <div className="jt-kanban-col-body">
                {(kanban[col.key]||[]).length===0? (
                  <div className="jt-kanban-empty">No applications</div>
                ):(
                  (kanban[col.key]||[]).map(app => (
                    <div className="jt-kanban-card" key={app.id}>
                      <h4>{app.job?.title||'Unknown Job'}</h4>
                      <div className="jt-kanban-card-meta">
                        <span><Building2 size={12} /> {app.job?.companyName}</span>
                        <span><MapPin size={12} /> {app.job?.location}</span>
                      </div>
                      {app.score > 0 && (
                        <div className="jt-kanban-ats">
                          <span className={`jt-ats-badge ${app.score >= 70 ? 'good' : app.score >= 40 ? 'mid' : 'low'}`}>
                            ATS: {app.score}%
                          </span>
                        </div>
                      )}
                      {app.job?.skills?.length>0&&(
                        <div className="jt-kanban-skills">
                          {app.job.skills.slice(0, 3).map((s, i) => <span key={i} className="jt-skill-chip small">{s}</span>)}
                        </div>
                      )}
                      <div className="jt-kanban-card-footer">
                        <span className="jt-kanban-date">{timeAgo(app.appliedAt)}</span>
                        <span className="jt-kanban-status" style={{color: col.color}}>{(app.status||'').replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   AI CALLING TAB — Live AI Phone Interview
   ═══════════════════════════════════════════════════════════════════ */
function AICallingTab({user})
{
  const [serverStatus, setServerStatus]=useState('checking');
  const [candidates, setCandidates]=useState([]);
  const [selectedCandidate, setSelectedCandidate]=useState('');
  const [phoneNumber, setPhoneNumber]=useState('');
  const [callState, setCallState]=useState('idle'); // idle | calling | ringing | active | ended
  const [callInfo, setCallInfo]=useState(null);
  const [loading, setLoading]=useState(false);
  const [transcript, setTranscript]=useState([]);
  const [callDuration, setCallDuration]=useState(0);
  const [config, setConfig]=useState({ngrokUrl: '', hasTwilio: false, twilioPhone: ''});
  const transcriptRef=useRef(null);
  const timerRef=useRef(null);
  const pollRef=useRef(null);

  useEffect(() =>
  {
    checkServerStatus();
    fetchCandidates();
    fetchConfig();
    return () =>
    {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Auto-scroll transcript
  useEffect(() =>
  {
    if (transcriptRef.current)
    {
      transcriptRef.current.scrollTop=transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const fetchConfig=async () =>
  {
    try
    {
      const res=await api.get('/ai-calling/config');
      setConfig(res.data);
    } catch { /* ignore */}
  };

  const checkServerStatus=async () =>
  {
    try
    {
      const res=await api.get('/ai-calling/health');
      setServerStatus(res.data.status==='online'? 'online':'offline');
    } catch {setServerStatus('offline');}
  };

  const fetchCandidates=async () =>
  {
    try
    {
      const res=await api.get('/ai-calling/candidates');
      setCandidates(res.data.demos||[]);
    } catch { /* keep empty */}
  };

  const fetchTranscript=async () =>
  {
    try
    {
      const res=await api.get('/ai-calling/conversation');
      if (res.data.log&&res.data.log.length>0)
      {
        setTranscript(res.data.log);
      }
    } catch { /* ignore */}
  };

  const handleInitiateCall=async () =>
  {
    if (!phoneNumber.trim()) return alert('Please enter a phone number');
    setLoading(true);
    setCallState('calling');
    setTranscript([]);
    setCallDuration(0);

    try
    {
      const res=await api.post('/ai-calling/initiate-call', {
        phoneNumber: phoneNumber.trim(),
        candidateId: selectedCandidate||undefined,
      });
      setCallInfo(res.data);
      setCallState('ringing');

      // Add call initiated to transcript
      setTranscript([{speaker: 'system', text: `Call initiated to ${phoneNumber}`, timestamp: new Date().toISOString()}]);

      // Start polling call status + transcript
      if (res.data.callSid)
      {
        pollRef.current=setInterval(async () =>
        {
          try
          {
            const statusRes=await api.get(`/ai-calling/call-status/${res.data.callSid}`);
            setCallInfo(prev => ({...prev, ...statusRes.data}));

            if (statusRes.data.status==='in-progress'||statusRes.data.status==='ringing')
            {
              if (statusRes.data.status==='in-progress')
              {
                setCallState(prev =>
                {
                  if (prev!=='active')
                  {
                    // Start timer only on first transition to active
                    timerRef.current=setInterval(() => setCallDuration(d => d+1), 1000);
                  }
                  return 'active';
                });
              }
              // Fetch live transcript
              fetchTranscript();
            }

            if (['completed', 'failed', 'canceled', 'no-answer', 'busy'].includes(statusRes.data.status))
            {
              setCallState('ended');
              clearInterval(pollRef.current);
              if (timerRef.current) clearInterval(timerRef.current);
              // Final transcript fetch
              fetchTranscript();
              setTranscript(prev => [...prev, {speaker: 'system', text: `Call ${statusRes.data.status}. Duration: ${statusRes.data.duration||0}s`, timestamp: new Date().toISOString()}]);
            }
          } catch { /* keep polling */}
        }, 3000);

        // Stop polling after 10 minutes
        setTimeout(() => {if (pollRef.current) clearInterval(pollRef.current);}, 600000);
      }
    } catch (err)
    {
      alert(err.response?.data?.message||'Failed to initiate call');
      setCallState('idle');
    } finally {setLoading(false);}
  };

  const resetCall=() =>
  {
    setCallState('idle');
    setCallInfo(null);
    setTranscript([]);
    setCallDuration(0);
    setPhoneNumber('');
    setSelectedCandidate('');
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const formatDuration=(s) =>
  {
    const m=Math.floor(s/60);
    const sec=s%60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const selectedCandidateData=candidates.find(c => c.id===selectedCandidate);

  return (
    <div className="cd-container cd-tab-content">
      <div className="cd-welcome">
        <h1>AI Phone Interview</h1>
        <p>Live AI-powered voice interviews via Twilio — automated and real-time</p>
      </div>

      {/* Status Indicators */}
      <div className="aic-status-row">
        <div className={`aic-status-chip ${serverStatus}`}>
          <div className="aic-status-dot" />
          {serverStatus==='online'? 'AI Server Online':serverStatus==='offline'? 'AI Server Offline':'Checking...'}
        </div>
        <div className={`aic-status-chip ${config.hasTwilio? 'online':'offline'}`}>
          <div className="aic-status-dot" />
          {config.hasTwilio? 'Twilio Connected':'Twilio Not Configured'}
        </div>
        {config.ngrokUrl&&(
          <div className="aic-status-chip online">
            <div className="aic-status-dot" />
            Tunnel Active
          </div>
        )}
        <button className="aic-refresh-btn" onClick={() => {checkServerStatus(); fetchConfig();}}>
          Refresh
        </button>
      </div>

      <div className="aic-live-layout">
        {/* Left: Call Controls */}
        <div className="cd-card aic-controls-card">
          {callState==='idle'&&(
            <>
              <div className="aic-controls-header">
                <Phone size={20} />
                <h3>Start AI Call</h3>
              </div>
              <div className="aic-form">
                <div className="aic-form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="aic-input"
                  />
                </div>
                <div className="aic-form-group">
                  <label>Candidate Profile</label>
                  <select value={selectedCandidate} onChange={(e) => setSelectedCandidate(e.target.value)} className="aic-select">
                    <option value="">-- Auto Select --</option>
                    {candidates.map(c => (
                      <option key={c.id} value={c.id}>{c.name} — {c.position}</option>
                    ))}
                  </select>
                </div>

                {selectedCandidateData&&(
                  <div className="aic-candidate-preview">
                    <h4>{selectedCandidateData.name}</h4>
                    <p>{selectedCandidateData.position}</p>
                  </div>
                )}

                <button className="aic-call-btn" onClick={handleInitiateCall} disabled={loading||!phoneNumber.trim()}>
                  <PhoneCall size={18} /> {loading? 'Initiating...':'Start AI Call'}
                </button>
              </div>
            </>
          )}

          {(callState==='calling'||callState==='ringing')&&(
            <div className="aic-live-status">
              <div className="aic-live-ring">
                <div className="aic-ring-circle" />
                <div className="aic-ring-circle delay" />
                <PhoneCall size={32} className="aic-ring-icon" />
              </div>
              <h3>{callState==='calling'? 'Connecting...':'Ringing...'}</h3>
              <p className="aic-live-phone">{phoneNumber}</p>
              {selectedCandidateData&&<p className="aic-live-candidate">{selectedCandidateData.name} — {selectedCandidateData.position}</p>}
            </div>
          )}

          {callState==='active'&&(
            <div className="aic-live-status active">
              <div className="aic-live-active-icon">
                <Mic size={28} />
              </div>
              <h3>Call In Progress</h3>
              <div className="aic-live-timer">{formatDuration(callDuration)}</div>
              <p className="aic-live-phone">{callInfo?.to}</p>
              {callInfo?.status&&(
                <span className="aic-live-badge active">{callInfo.status}</span>
              )}
            </div>
          )}

          {callState==='ended'&&(
            <div className="aic-live-status ended">
              <div className="aic-live-ended-icon">
                <PhoneOff size={28} />
              </div>
              <h3>Call Ended</h3>
              {callInfo&&(
                <div className="aic-ended-details">
                  <span>Duration: {callInfo.duration||callDuration}s</span>
                  <span className="aic-live-badge ended">{callInfo.status}</span>
                </div>
              )}
              <button className="aic-call-btn" onClick={resetCall} style={{marginTop: 16}}>
                <Phone size={16} /> New Call
              </button>
            </div>
          )}
        </div>

        {/* Right: Live Transcript */}
        <div className="cd-card aic-transcript-card">
          <div className="aic-transcript-header">
            <div className="aic-transcript-title">
              <FileText size={18} />
              <h3>Live Call Script</h3>
            </div>
            {callState==='active'&&(
              <div className="aic-live-indicator">
                <span className="aic-live-dot" />
                LIVE
              </div>
            )}
          </div>

          <div className="aic-transcript-body" ref={transcriptRef}>
            {transcript.length===0? (
              <div className="aic-transcript-empty">
                <Volume2 size={40} />
                <h4>No call in progress</h4>
                <p>Start an AI call to see the live conversation script here</p>
              </div>
            ):(
              <div className="aic-transcript-messages">
                {transcript.map((msg, i) => (
                  <div key={i} className={`aic-msg ${msg.speaker}`}>
                    <div className="aic-msg-avatar">
                      {msg.speaker==='agent'? '🤖':msg.speaker==='user'? '👤':'📞'}
                    </div>
                    <div className="aic-msg-content">
                      <div className="aic-msg-speaker">
                        {msg.speaker==='agent'? 'AI Agent':msg.speaker==='user'? 'Candidate':'System'}
                      </div>
                      <div className="aic-msg-text">{msg.text}</div>
                      {msg.timestamp&&(
                        <div className="aic-msg-time">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                      )}
                    </div>
                  </div>
                ))}
                {callState==='active'&&(
                  <div className="aic-typing-indicator">
                    <span /><span /><span />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   RECRUITER INTERVIEW TAB
   ═══════════════════════════════════════════════════════════════════ */
function RecruiterInterviewTab({user})
{
  const navigate=useNavigate();
  const [interviewCode, setInterviewCode]=useState('');
  const [joinLoading, setJoinLoading]=useState(false);
  const [scheduledInterviews, setScheduledInterviews]=useState([]);
  const [loadingInterviews, setLoadingInterviews]=useState(true);

  useEffect(() =>
  {
    (async () =>
    {
      try
      {
        const res=await getMyInterviews();
        setScheduledInterviews(res.data?.data||res.data?.interviews||[]);
      } catch (e) {console.error('Failed to load interviews', e);}
      finally {setLoadingInterviews(false);}
    })();
  }, []);

  const handleJoinInterview=() =>
  {
    if (!interviewCode.trim()) return alert('Please enter an interview code');
    setJoinLoading(true);
    navigate(`/interview/${interviewCode.trim()}?mode=candidate&name=${encodeURIComponent(user.username)}&role=candidate`);
  };

  const handleQuickJoin=() =>
  {
    const code=`interview-${Date.now()}`;
    navigate(`/interview/${code}?mode=candidate&name=${encodeURIComponent(user.username)}&role=candidate`);
  };

  const tips=[
    {icon: <Target size={24} />, title: 'Be Prepared', desc: 'Review the job description and company background before the interview'},
    {icon: <Lightbulb size={24} />, title: 'Test Your Setup', desc: 'Check camera, microphone and internet connection before joining'},
    {icon: <ClipboardList size={24} />, title: 'Have Notes Ready', desc: 'Keep a pen and paper handy for any notes during the interview'},
    {icon: <Clock size={24} />, title: 'Join Early', desc: 'Try to join the interview 2-3 minutes before the scheduled time'},
  ];

  const features=[
    {icon: <Video size={24} />, title: 'Video Interview', desc: 'Face-to-face video call with your recruiter', color: '#3b82f6'},
    {icon: <Code size={24} />, title: 'Live Code Editor', desc: 'Collaborative code editor for technical rounds', color: '#a855f7'},
    {icon: <Shield size={24} />, title: 'AI Proctoring', desc: 'Secure & monitored interview environment', color: '#14b8a6'},
    {icon: <FileText size={24} />, title: 'Real-time Chat', desc: 'Text chat alongside video for sharing links', color: '#eab308'},
  ];

  return (
    <div className="cd-container cd-tab-content">
      <div className="cd-welcome">
        <h1>Recruiter Interview</h1>
        <p>Join a live interview session with your recruiter</p>
      </div>

      {/* Scheduled Interviews */}
      {loadingInterviews? (
        <div style={{textAlign: 'center', padding: '20px', color: 'var(--text-muted)'}}>
          Loading scheduled interviews...
        </div>
      ):scheduledInterviews.length>0&&(
        <div className="cdt-section" style={{marginBottom: '1.5rem'}}>
          <h2>📅 Scheduled Interviews ({scheduledInterviews.length})</h2>
          <div className="cdt-ri-scheduled-grid">
            {scheduledInterviews.map(iv => (
              <div className="cdt-ri-scheduled-card" key={iv.sessionId}>
                <div className="cdt-ri-scheduled-header">
                  <div>
                    <h3>{iv.jobTitle||'Interview'}</h3>
                    <p>{iv.companyName||''}{iv.department? ` · ${iv.department}`:''}</p>
                  </div>
                  <span className={`cdt-ri-status-pill ${iv.status}`}>{iv.status}</span>
                </div>
                <div className="cdt-ri-scheduled-details">
                  {iv.scheduledAt&&<span><Calendar size={14} /> {new Date(iv.scheduledAt).toLocaleString()}</span>}
                  {iv.duration&&<span><Clock size={14} /> {iv.duration} min</span>}
                  {iv.location&&<span><MapPin size={14} /> {iv.location}</span>}
                </div>
                {iv.notes&&<p className="cdt-ri-scheduled-notes">{iv.notes}</p>}
                <button
                  className="cdt-ri-join-btn"
                  onClick={() => navigate(`/interview/${iv.sessionId}?mode=candidate&name=${encodeURIComponent(user.username)}&role=candidate`)}
                  disabled={iv.status==='completed'}
                >
                  {iv.status==='completed'? '✅ Completed':iv.status==='active'? '🔴 Join Now':'🚀 Join Interview'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Join Interview Card */}
      <div className="cdt-ri-join-card">
        <div className="cdt-ri-join-left">
          <div className="cdt-ri-join-icon"><Video size={40} /></div>
          <div>
            <h2>Join Interview Session</h2>
            <p>Enter the interview code provided by your recruiter to join the session</p>
          </div>
        </div>
        <div className="cdt-ri-join-form">
          <input
            type="text"
            placeholder="Enter interview code (e.g., INT-2024-001)"
            value={interviewCode}
            onChange={(e) => setInterviewCode(e.target.value)}
            onKeyDown={(e) => e.key==='Enter'&&handleJoinInterview()}
            className="cdt-ri-input"
          />
          <button className="cdt-ri-join-btn" onClick={handleJoinInterview} disabled={joinLoading}>
            {joinLoading? 'Joining...':'🚀 Join Interview'}
          </button>
        </div>
        <div className="cdt-ri-divider"><span>or</span></div>
        <button className="cdt-ri-quick-btn" onClick={handleQuickJoin}>
          <ExternalLink size={16} /> Quick Join (Demo Session)
        </button>
      </div>

      {/* Features Grid */}
      <div className="cdt-section">
        <h2>Interview Features</h2>
        <div className="cdt-ri-features-grid">
          {features.map((f, i) => (
            <div className="cdt-ri-feature-card" key={i}>
              <div className="cdt-ri-feature-icon" style={{color: f.color, background: `${f.color}15`}}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tips Section */}
      <div className="cdt-section">
        <h2>Interview Tips</h2>
        <div className="cdt-ri-tips-grid">
          {tips.map((tip, i) => (
            <div className="cdt-ri-tip-card" key={i}>
              <span className="cdt-ri-tip-icon">{tip.icon}</span>
              <div>
                <h4>{tip.title}</h4>
                <p>{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PRACTICE TAB  (PracticeSessionSetup embedded)
   ═══════════════════════════════════════════════════════════════════ */
function PracticeTab({user})
{
  const navigate=useNavigate();
  const [config, setConfig]=useState({
    role: '', difficulty: 'medium', interviewType: 'technical', mode: 'quick', duration: 20,
  });

  const roles=[
    {id: 'frontend', name: 'Frontend Developer', icon: <Palette size={24} />},
    {id: 'backend', name: 'Backend Developer', icon: <Server size={24} />},
    {id: 'fullstack', name: 'Full Stack Developer', icon: <Layers size={24} />},
    {id: 'data-science', name: 'Data Scientist', icon: <BarChart3 size={24} />},
    {id: 'devops', name: 'DevOps Engineer', icon: <Wrench size={24} />},
    {id: 'mobile', name: 'Mobile Developer', icon: <Smartphone size={24} />},
  ];

  const interviewTypes=[
    {id: 'technical', name: 'Technical Interview', desc: 'Technical concepts and problem solving', icon: <Monitor size={24} />},
    {id: 'behavioral', name: 'Behavioral Interview', desc: 'Behavioral questions and soft skills', icon: <MessageSquare size={24} />},
    {id: 'coding', name: 'Coding Round', desc: 'Live coding challenges', icon: <Code size={24} />},
    {id: 'system-design', name: 'System Design', desc: 'Architecture and design discussions', icon: <Building2 size={24} />},
  ];

  const modes=[
    {
      id: 'quick', name: 'Quick Practice', desc: '5 questions, 10-15 min', duration: 15, icon: <Zap size={24} />,
      features: ['Fast feedback', 'No strict scoring', 'Basic evaluation']
    },
    {
      id: 'real', name: 'Real Interview Simulation', desc: '10-15 questions, 30-40 min', duration: 35, icon: <Target size={24} />,
      features: ['Timed session', 'Adaptive difficulty', 'Detailed scorecard', 'Follow-up questions']
    },
    {
      id: 'coding', name: 'Coding Challenge', desc: '2-3 problems, 45-60 min', duration: 50, icon: <Terminal size={24} />,
      features: ['Code editor', 'Run & test', 'Time complexity analysis', 'Code quality review']
    },
  ];

  const handleStart=() =>
  {
    if (!config.role) return alert('Please select a role');
    const sessionId=`practice-${Date.now()}`;
    localStorage.setItem('practiceSession', JSON.stringify({...config, sessionId, startTime: new Date().toISOString()}));
    navigate(`/practice-interview/${sessionId}?role=${config.role}&difficulty=${config.difficulty}&type=${config.interviewType}&mode=${config.mode}`);
  };

  return (
    <div className="cd-container cd-tab-content">
      <div className="cd-welcome"><h1>Interview Practice</h1><p>Practice with AI-powered interviews tailored to your needs</p></div>

      <div className="cdt-section">
        <h2>1. Select Your Target Role</h2>
        <div className="cdt-role-grid">
          {roles.map(r => (
            <div key={r.id} className={`cdt-role-card ${config.role===r.id? 'selected':''}`} onClick={() => setConfig({...config, role: r.id})}>
              <span className="cdt-role-icon">{r.icon}</span>
              <span className="cdt-role-name">{r.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cdt-section">
        <h2>2. Choose Interview Type</h2>
        <div className="cdt-type-grid">
          {interviewTypes.map(t => (
            <div key={t.id} className={`cdt-type-card ${config.interviewType===t.id? 'selected':''}`} onClick={() => setConfig({...config, interviewType: t.id})}>
              <span className="cdt-type-icon">{t.icon}</span>
              <h3>{t.name}</h3>
              <p>{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="cdt-section">
        <h2>3. Select Difficulty Level</h2>
        <div className="cdt-diff-grid">
          {['easy', 'medium', 'hard'].map(d => (
            <button key={d} className={`cdt-diff-btn ${d} ${config.difficulty===d? 'selected':''}`} onClick={() => setConfig({...config, difficulty: d})}>
              <span className="cdt-diff-emoji">{d==='easy'? <Smile size={24} />:d==='medium'? <Minus size={24} />:<Flame size={24} />}</span>
              <strong>{d.charAt(0).toUpperCase()+d.slice(1)}</strong>
              <span>{d==='easy'? 'Entry level':d==='medium'? 'Intermediate':'Advanced'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="cdt-section">
        <h2>4. Choose Practice Mode</h2>
        <div className="cdt-mode-grid">
          {modes.map(m => (
            <div key={m.id} className={`cdt-mode-card ${config.mode===m.id? 'selected':''}`} onClick={() => setConfig({...config, mode: m.id, duration: m.duration})}>
              <span className="cdt-mode-icon">{m.icon}</span>
              <h3>{m.name}</h3>
              <p>{m.desc}</p>
              <ul>{m.features.map((f, i) => <li key={i}>✓ {f}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>

      <div className="cdt-summary">
        <h3>Session Summary</h3>
        <div className="cdt-summary-items">
          <div><strong>Role</strong><span>{roles.find(r => r.id===config.role)?.name||'Not selected'}</span></div>
          <div><strong>Type</strong><span>{interviewTypes.find(t => t.id===config.interviewType)?.name}</span></div>
          <div><strong>Difficulty</strong><span className={`cdt-badge-${config.difficulty}`}>{config.difficulty}</span></div>
          <div><strong>Mode</strong><span>{modes.find(m => m.id===config.mode)?.name}</span></div>
          <div><strong>Duration</strong><span>~{config.duration} min</span></div>
        </div>
        <button className="cdt-start-btn" onClick={handleStart} disabled={!config.role}>🚀 Start Practice Interview</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CODING PRACTICE TAB – uses the full-featured standalone component
   ═══════════════════════════════════════════════════════════════════ */
function CodingTab()
{
  return (
    <div className="cdt-coding-wrapper">
      <CodingPractice embedded />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   AI INTERVIEW TAB
   ═══════════════════════════════════════════════════════════════════ */
function AIInterviewTab({user})
{
  const navigate=useNavigate();
  const [formData, setFormData]=useState({
    candidateName: user?.username||'', role: '', experience: 'entry', topics: [], duration: 30
  });
  const [loading, setLoading]=useState(false);

  const availableTopics=['JavaScript', 'React', 'Node.js', 'Python', 'Data Structures', 'Algorithms', 'System Design', 'Databases', 'APIs', 'Web Development'];

  const handleSubmit=async (e) =>
  {
    e.preventDefault();
    if (!formData.topics.length) return alert('Select at least one topic');
    setLoading(true);
    try
    {
      const res=await api.post('/ai-interview/create', formData);
      navigate(`/ai-interview/${res.data.sessionId}`);
    } catch {alert('Failed to create interview session'); setLoading(false);}
  };

  return (
    <div className="cd-container cd-tab-content">
      <div className="cd-welcome"><h1>AI Interview Setup</h1><p>Configure your AI-powered interview session</p></div>

      <div className="cdt-ai-card">
        <form onSubmit={handleSubmit}>
          <div className="cdt-form-group">
            <label>Your Name</label>
            <input value={formData.candidateName} onChange={(e) => setFormData({...formData, candidateName: e.target.value})} placeholder="Enter your name" required />
          </div>
          <div className="cdt-form-group">
            <label>Target Role</label>
            <input value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} placeholder="e.g., Frontend Developer" required />
          </div>
          <div className="cdt-form-group">
            <label>Experience Level</label>
            <select value={formData.experience} onChange={(e) => setFormData({...formData, experience: e.target.value})}>
              <option value="entry">Entry Level (0-2 years)</option>
              <option value="mid">Mid Level (3-5 years)</option>
              <option value="senior">Senior Level (5+ years)</option>
            </select>
          </div>
          <div className="cdt-form-group">
            <label>Select Topics</label>
            <div className="cdt-topics-grid">
              {availableTopics.map(t => (
                <button key={t} type="button" className={`cdt-topic-btn ${formData.topics.includes(t)? 'selected':''}`}
                  onClick={() => setFormData(p => ({...p, topics: p.topics.includes(t)? p.topics.filter(x => x!==t):[...p.topics, t]}))}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="cdt-form-group">
            <label>Duration</label>
            <select value={formData.duration} onChange={(e) => setFormData({...formData, duration: +e.target.value})}>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>
          <button type="submit" className="cdt-start-btn" disabled={loading}>
            {loading? 'Starting...':'🎯 Start AI Interview'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SPEC AI CHAT TAB
   ═══════════════════════════════════════════════════════════════════ */
function AxiomTab({user})
{
  const [messages, setMessages]=useState([]);
  const [input, setInput]=useState('');
  const [loading, setLoading]=useState(false);
  const endRef=useRef(null);

  useEffect(() => {endRef.current?.scrollIntoView({behavior: 'smooth'});}, [messages]);

  const handleSend=async (e) =>
  {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages(p => [...p, {role: 'user', content: input}]);
    setInput(''); setLoading(true);
    try
    {
      const res=await api.post('/spec-ai/chat', {
        message: input,
        conversationHistory: messages,
        userData: user? {
          id: user.id||user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          skills: user.skills||[],
          bio: user.bio||'',
          companyName: user.companyName||'',
        }:null,
      });
      setMessages(p => [...p, {role: 'assistant', content: res.data.response}]);
    } catch
    {
      setMessages(p => [...p, {role: 'assistant', content: 'Sorry, something went wrong. Please try again.'}]);
    } finally {setLoading(false);}
  };

  const suggestions=[
    'What jobs match my skills?',
    'Help me prepare for my upcoming interview',
    'What skills should I learn next?',
    'Review my application strategy',
    'Explain binary search algorithm',
    'Best practices for React development',
  ];

  return (
    <div className="cdt-chat-layout">
      <div className="cdt-chat-header">
        <div>
          <h2>Spec AI Assistant</h2>
          <p>Your personalized AI assistant for career guidance & interview preparation</p>
        </div>
        {messages.length>0&&(
          <button className="cdt-clear-btn" onClick={() => setMessages([])}><Trash2 size={14} /> Clear</button>
        )}
      </div>

      <div className="cdt-chat-messages">
        {messages.length===0? (
          <div className="cdt-chat-welcome">
            <h3>👋 Welcome to Spec AI{user? `, ${user.username}`:''}!</h3>
            <p>I'm your personalized AI assistant. I know your profile and can help with career guidance, interview prep, and coding.</p>
            <div className="cdt-suggestions">
              <h4>Try asking me:</h4>
              {suggestions.map((s, i) => (
                <button key={i} className="cdt-suggestion-btn" onClick={() => {setInput(s);}}>{s}</button>
              ))}
            </div>
          </div>
        ):(
          messages.map((msg, i) => (
            <div key={i} className={`cdt-msg ${msg.role}`}>
              <div className="cdt-msg-content">{msg.content}</div>
            </div>
          ))
        )}
        {loading&&(
          <div className="cdt-msg assistant">
            <div className="cdt-msg-content cdt-typing"><span /><span /><span /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form className="cdt-chat-input" onSubmit={handleSend}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Spec AI anything..." disabled={loading} />
        <button type="submit" disabled={loading||!input.trim()}><Send size={16} /></button>
      </form>
    </div>
  );
}

export default CandidateDashboard;

/* ═══════════════════════════════════════════════════════════════════
   LIVE QUIZ TAB — Auto-shows all available quizzes to students
   ═══════════════════════════════════════════════════════════════════ */
function LiveContestTab({user})
{
  const navigate=useNavigate();
  const API_URL=import.meta.env.VITE_API_URL||'http://localhost:5000';
  const [contests, setContests]=useState([]);
  const [loading, setLoading]=useState(true);
  const [joinCode, setJoinCode]=useState('');
  const [playerName, setPlayerName]=useState(user?.username||'');

  const fetchContests=useCallback(async () =>
  {
    try
    {
      const res=await fetch(`${API_URL}/api/contest/browse`, {credentials: 'include'});
      if (res.ok) {const data=await res.json(); setContests(data.contests||[]);}
    } catch (e) {console.error('Fetch contests error:', e);}
    finally {setLoading(false);}
  }, [API_URL]);

  useEffect(() =>
  {
    fetchContests();
    const interval=setInterval(fetchContests, 8000);
    return () => clearInterval(interval);
  }, [fetchContests]);

  const handleJoinByCode=() =>
  {
    if (!joinCode.trim()) return;
    navigate(`/contest/join?code=${joinCode.trim().toUpperCase()}`);
  };

  const handleJoinContest=(code) =>
  {
    const name=playerName||user?.username||'Student';
    navigate(`/contest/play?code=${code}&name=${encodeURIComponent(name)}`);
  };

  const difficultyColor={easy: '#22c55e', medium: '#f59e0b', hard: '#ef4444'};
  const statusLabel={waiting: 'Open to Join', active: 'Live Now'};

  return (
    <div className="cd-container cd-tab-content">
      <div className="cd-welcome">
        <h1>Coding Contests</h1>
        <p>Join a live coding contest — solve challenges and compete with others in real-time</p>
      </div>

      {/* Join by code */}
      <div className="cdt-section" style={{marginBottom: '1.5rem'}}>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap'}}>
          <input
            type="text"
            placeholder="Enter contest code (e.g. ABC123)"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key==='Enter'&&handleJoinByCode()}
            style={{padding: '10px 14px', background: 'var(--bg-secondary, #161b27)', border: '1px solid var(--border-color, #2a2d3e)', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.9rem', minWidth: '200px', fontFamily: 'monospace', letterSpacing: '2px'}}
            maxLength={6}
          />
          <button
            onClick={handleJoinByCode}
            style={{padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem'}}
            disabled={!joinCode.trim()}
          >
            Join by Code
          </button>
        </div>
      </div>

      {/* Available contests */}
      <div className="cdt-section">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
          <h2>Available Contests</h2>
          <button onClick={fetchContests} style={{padding: '6px 14px', background: 'var(--bg-secondary, #161b27)', border: '1px solid var(--border-color, #2a2d3e)', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem'}}>
            {loading? 'Loading...':'🔄 Refresh'}
          </button>
        </div>

        {loading? (
          <div style={{textAlign: 'center', padding: '40px', color: 'var(--text-muted, #64748b)'}}>Loading contests...</div>
        ):contests.length===0? (
          <div style={{textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted, #64748b)'}}>
            <Terminal size={48} style={{marginBottom: '16px', opacity: 0.3}} />
            <h3 style={{color: 'var(--text-secondary, #94a3b8)', margin: '0 0 8px'}}>No live coding contests right now</h3>
            <p style={{margin: 0, fontSize: '0.9rem'}}>Coding contests will appear here automatically when a host starts one.<br />You can also join directly with a contest code.</p>
          </div>
        ):(
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px'}}>
            {contests.map(c => (
              <div key={c.id} style={{background: 'var(--bg-secondary, #161b27)', border: '1px solid var(--border-color, #2a2d3e)', borderRadius: '14px', padding: '20px', transition: 'border-color 0.2s'}} onMouseEnter={e => e.currentTarget.style.borderColor='#10b981'} onMouseLeave={e => e.currentTarget.style.borderColor='var(--border-color, #2a2d3e)'}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                  <span style={{fontSize: '0.75rem', fontFamily: 'monospace', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: '4px'}}>#{c.code}</span>
                  <span style={{fontSize: '0.7rem', padding: '3px 8px', borderRadius: '12px', fontWeight: 600, textTransform: 'uppercase', background: c.status==='waiting'? 'rgba(59,130,246,0.15)':'rgba(34,197,94,0.15)', color: c.status==='waiting'? '#93c5fd':'#86efac'}}>
                    {statusLabel[c.status]||c.status}
                  </span>
                </div>
                <h3 style={{fontSize: '1.05rem', fontWeight: 600, marginBottom: '4px', color: '#f1f5f9'}}>{c.title}</h3>
                <p style={{fontSize: '0.82rem', color: '#64748b', marginBottom: '12px'}}>{c.topic}</p>
                <div style={{display: 'flex', gap: '12px', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '14px', flexWrap: 'wrap'}}>
                  <span style={{color: difficultyColor[c.difficulty]}}>● {c.difficulty}</span>
                  <span>💻 {c.challengeCount} challenges</span>
                  <span>👥 {c.participantCount} joined</span>
                  <span>⏱ {c.duration} min</span>
                </div>
                <button
                  onClick={() => handleJoinContest(c.code)}
                  style={{width: '100%', padding: '10px', background: c.status==='waiting'? '#10b981':'#22c55e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', transition: 'opacity 0.2s'}}
                  onMouseEnter={e => e.target.style.opacity='0.85'}
                  onMouseLeave={e => e.target.style.opacity='1'}
                >
                  {c.status==='active'? '🔴 Join Live Contest':'💻 Join Contest'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LiveQuizTab({user})
{
  const navigate=useNavigate();
  const API_URL=import.meta.env.VITE_API_URL||'http://localhost:5000';
  const [quizzes, setQuizzes]=useState([]);
  const [loading, setLoading]=useState(true);
  const [joinCode, setJoinCode]=useState('');
  const [playerName, setPlayerName]=useState(user?.username||'');

  const fetchQuizzes=useCallback(async () =>
  {
    try
    {
      const res=await fetch(`${API_URL}/api/quiz/browse`, {credentials: 'include'});
      if (res.ok) {const data=await res.json(); setQuizzes(data.quizzes||[]);}
    } catch (e) {console.error('Fetch quizzes error:', e);}
    finally {setLoading(false);}
  }, [API_URL]);

  // Auto-refresh every 8 seconds to show newly started quizzes
  useEffect(() =>
  {
    fetchQuizzes();
    const interval=setInterval(fetchQuizzes, 8000);
    return () => clearInterval(interval);
  }, [fetchQuizzes]);

  const handleJoinByCode=() =>
  {
    if (!joinCode.trim()) return;
    navigate(`/quiz/join?code=${joinCode.trim().toUpperCase()}`);
  };

  const handleJoinQuiz=(code) =>
  {
    const name=playerName||user?.username||'Student';
    navigate(`/quiz/play?code=${code}&name=${encodeURIComponent(name)}`);
  };

  const difficultyColor={easy: '#22c55e', medium: '#f59e0b', hard: '#ef4444'};
  const statusLabel={waiting: 'Open to Join', active: 'Live Now', question_open: '🔴 Live — Question Open', question_closed: 'Live — Between Questions'};

  return (
    <div className="cd-container cd-tab-content">
      <div className="cd-welcome">
        <h1>Live Quizzes</h1>
        <p>Join a live quiz session — quizzes appear automatically when a host starts one</p>
      </div>

      {/* Join by code */}
      <div className="cdt-section" style={{marginBottom: '1.5rem'}}>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap'}}>
          <input
            type="text"
            placeholder="Enter room code (e.g. ABC123)"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key==='Enter'&&handleJoinByCode()}
            style={{padding: '10px 14px', background: 'var(--bg-secondary, #161b27)', border: '1px solid var(--border-color, #2a2d3e)', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.9rem', minWidth: '200px', fontFamily: 'monospace', letterSpacing: '2px'}}
            maxLength={6}
          />
          <button
            onClick={handleJoinByCode}
            style={{padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem'}}
            disabled={!joinCode.trim()}
          >
            Join by Code
          </button>
        </div>
      </div>

      {/* Available quizzes */}
      <div className="cdt-section">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
          <h2>Available Quizzes</h2>
          <button onClick={fetchQuizzes} style={{padding: '6px 14px', background: 'var(--bg-secondary, #161b27)', border: '1px solid var(--border-color, #2a2d3e)', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem'}}>
            {loading? 'Loading...':'🔄 Refresh'}
          </button>
        </div>

        {loading? (
          <div style={{textAlign: 'center', padding: '40px', color: 'var(--text-muted, #64748b)'}}>Loading quizzes...</div>
        ):quizzes.length===0? (
          <div style={{textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted, #64748b)'}}>
            <Trophy size={48} style={{marginBottom: '16px', opacity: 0.3}} />
            <h3 style={{color: 'var(--text-secondary, #94a3b8)', margin: '0 0 8px'}}>No live quizzes right now</h3>
            <p style={{margin: 0, fontSize: '0.9rem'}}>Quizzes will appear here automatically when a recruiter starts one.<br />You can also join directly with a room code.</p>
          </div>
        ):(
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px'}}>
            {quizzes.map(q => (
              <div key={q.id} style={{background: 'var(--bg-secondary, #161b27)', border: '1px solid var(--border-color, #2a2d3e)', borderRadius: '14px', padding: '20px', transition: 'border-color 0.2s'}} onMouseEnter={e => e.currentTarget.style.borderColor='#6366f1'} onMouseLeave={e => e.currentTarget.style.borderColor='var(--border-color, #2a2d3e)'}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                  <span style={{fontSize: '0.75rem', fontFamily: 'monospace', color: '#818cf8', background: 'rgba(99,102,241,0.1)', padding: '3px 8px', borderRadius: '4px'}}>#{q.code}</span>
                  <span style={{fontSize: '0.7rem', padding: '3px 8px', borderRadius: '12px', fontWeight: 600, textTransform: 'uppercase', background: q.status==='waiting'? 'rgba(59,130,246,0.15)':'rgba(34,197,94,0.15)', color: q.status==='waiting'? '#93c5fd':'#86efac'}}>
                    {statusLabel[q.status]||q.status}
                  </span>
                </div>
                <h3 style={{fontSize: '1.05rem', fontWeight: 600, marginBottom: '4px', color: '#f1f5f9'}}>{q.title}</h3>
                <p style={{fontSize: '0.82rem', color: '#64748b', marginBottom: '12px'}}>{q.topic}</p>
                <div style={{display: 'flex', gap: '12px', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '14px', flexWrap: 'wrap'}}>
                  <span style={{color: difficultyColor[q.difficulty]}}>● {q.difficulty}</span>
                  <span>📝 {q.questionCount} Q</span>
                  <span>👥 {q.participantCount} joined</span>
                  <span>🎙 {q.hostName}</span>
                </div>
                <button
                  onClick={() => handleJoinQuiz(q.code)}
                  style={{width: '100%', padding: '10px', background: q.status==='waiting'? '#6366f1':'#22c55e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', transition: 'opacity 0.2s'}}
                  onMouseEnter={e => e.target.style.opacity='0.85'}
                  onMouseLeave={e => e.target.style.opacity='1'}
                >
                  {['active', 'question_open', 'question_closed'].includes(q.status)? '🔴 Join Live Quiz':'🎮 Join Quiz'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
