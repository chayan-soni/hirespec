import {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {Search, Building2, BookOpen, Play, Bot, ChevronRight, Loader, ArrowLeft} from 'lucide-react';
import api from '../services/api';
import './JobPrep.css';

function JobPrep()
{
  const navigate=useNavigate();
  const [companies, setCompanies]=useState([]);
  const [loading, setLoading]=useState(true);
  const [searchQuery, setSearchQuery]=useState('');
  const [selectedCompany, setSelectedCompany]=useState(null);
  const [companyDetail, setCompanyDetail]=useState(null);
  const [detailLoading, setDetailLoading]=useState(false);

  // Fetch companies
  useEffect(() =>
  {
    const fetchCompanies=async () =>
    {
      try
      {
        const res=await api.get('/job-prep/companies');
        setCompanies(res.data.data.companies||[]);
      } catch (err)
      {
        console.error('Error fetching companies:', err);
      } finally
      {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  // Fetch company detail
  const handleCompanyClick=async (companyName) =>
  {
    setDetailLoading(true);
    try
    {
      const res=await api.get(`/job-prep/company/${companyName}`);
      setCompanyDetail(res.data.data.company);
      setSelectedCompany(companyName);
    } catch (err)
    {
      console.error('Error fetching company detail:', err);
      alert('Failed to load company details');
    } finally
    {
      setDetailLoading(false);
    }
  };

  // Filter companies
  const filteredCompanies=companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())||
    c.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle quiz start
  const handleStartQuiz=() =>
  {
    if (companyDetail)
    {
      navigate('/quiz/dashboard', {state: {company: companyDetail, mode: 'prep'}});
    }
  };

  // Handle AI interview
  const handleStartInterview=() =>
  {
    if (companyDetail)
    {
      navigate('/ai-interview-setup', {state: {company: companyDetail, mode: 'prep'}});
    }
  };

  return (
    <div className="job-prep-container">
      {!selectedCompany? (
        <>
          {/* Header */}
          <div className="jp-header">
            <div className="jp-header-content">
              <h1>Company Preparation</h1>
              <p>Learn from top companies and master interview prep</p>
            </div>
          </div>

          {/* Search */}
          <div className="jp-search-bar">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search companies or industry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Companies Grid */}
          {loading? (
            <div className="jp-loading">
              <Loader size={40} className="spin" />
              <p>Loading companies...</p>
            </div>
          ):(
            <div className="jp-companies-grid">
              {filteredCompanies.length===0? (
                <div className="jp-empty">
                  <Building2 size={48} />
                  <h3>No companies found</h3>
                  <p>Try adjusting your search</p>
                </div>
              ):filteredCompanies.map((company) => (
                <div className="jp-company-card" key={company.id} onClick={() => handleCompanyClick(company.name)}>
                  <div className="jp-card-header">
                    {company.logo? (
                      <img src={company.logo} alt={company.name} className="jp-company-logo" />
                    ):(
                      <div className="jp-company-logo-placeholder">{company.name[0]}</div>
                    )}
                  </div>
                  <div className="jp-card-content">
                    <h3 className="jp-company-name-box">{company.name}</h3>
                    <p className="jp-company-industry">{company.industry}</p>
                    <p className="jp-company-location" title={company.headquarter}>{company.headquarter}</p>
                  </div>
                  <div className="jp-card-footer">
                    <span className="jp-explore-btn">Explore <ChevronRight size={14} /></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ):(
        <>
          {/* Company Detail View */}
          <div className="jp-detail-container">
            {/* Back Button */}
            <button className="jp-back-btn" onClick={() => {setSelectedCompany(null); setCompanyDetail(null);}}>
              <ArrowLeft size={18} /> Back to Companies
            </button>

            {detailLoading? (
              <div className="jp-detail-loading">
                <Loader size={40} className="spin" />
                <p>Loading company details...</p>
              </div>
            ):companyDetail? (
              <>
                {/* Company Header */}
                <div className="jp-detail-header">
                  <div className="jp-detail-header-left">
                    {companyDetail.logo? (
                      <img src={companyDetail.logo} alt={companyDetail.name} className="jp-detail-logo" />
                    ):(
                      <div className="jp-detail-logo-placeholder">{companyDetail.name[0]}</div>
                    )}
                    <div>
                      <h1 className="jp-detail-name-box">{companyDetail.name}</h1>
                      <p className="jp-detail-subtitle">{companyDetail.industry}</p>
                    </div>
                  </div>
                </div>

                {/* Company Profile */}
                <div className="jp-profile-section">
                  <div className="jp-profile-info">
                    <p className="jp-profile-text">{companyDetail.profile}</p>
                    {companyDetail.description&&(
                      <p className="jp-description-text">{companyDetail.description}</p>
                    )}
                    {companyDetail.website&&(
                      <a href={companyDetail.website} target="_blank" rel="noopener noreferrer" className="jp-website-link">
                        {companyDetail.website}
                      </a>
                    )}
                  </div>
                </div>

                {/* Prep Questions Overview */}
                <div className="jp-questions-overview">
                  <h3>Preparation Questions ({companyDetail.prepQuestions?.length||0})</h3>
                  <div className="jp-questions-list">
                    {companyDetail.prepQuestions?.slice(0, 5).map((q, idx) => (
                      <div className="jp-question-item" key={q._id||idx}>
                        <span className="jp-question-num">{idx+1}</span>
                        <div className="jp-question-info">
                          <p className="jp-question-text">{q.question}</p>
                          <div className="jp-question-meta">
                            <span className={`jp-category ${q.category}`}>{q.category}</span>
                            <span className={`jp-difficulty ${q.difficulty}`}>{q.difficulty}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {companyDetail.prepQuestions?.length>5&&(
                      <p className="jp-more-questions">+{companyDetail.prepQuestions.length-5} more questions</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="jp-action-buttons">
                  <button className="jp-btn jp-btn-quiz" onClick={handleStartQuiz}>
                    <BookOpen size={20} />
                    <div>
                      <span className="jp-btn-title">Take Quiz</span>
                      <span className="jp-btn-subtitle">Answer prep questions</span>
                    </div>
                    <ChevronRight size={18} />
                  </button>
                  <button className="jp-btn jp-btn-interview" onClick={handleStartInterview}>
                    <Bot size={20} />
                    <div>
                      <span className="jp-btn-title">AI Interview</span>
                      <span className="jp-btn-subtitle">Mock interview session</span>
                    </div>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </>
            ):(
              <div className="jp-error">
                <p>Failed to load company details</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default JobPrep;
