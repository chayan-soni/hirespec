import mongoose from 'mongoose';

const companyProfileSchema=new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  logo: {
    type: String,
    default: '',  // URL to company logo
  },
  profile: {
    type: String,
    required: true,
    maxlength: 500,  // 1-2 line company description
  },
  description: {
    type: String,
    default: '',
    maxlength: 2000,
  },
  website: {
    type: String,
    default: '',
  },
  industry: {
    type: String,
    default: '',
  },
  headquarter: {
    type: String,
    default: '',
  },
  
  // Prep questions for this company
  prepQuestions: [{
    _id: mongoose.Schema.Types.ObjectId,
    question: {type: String, required: true},
    description: {type: String, default: ''},
    category: {type: String, enum: ['technical', 'behavioral', 'coding'], default: 'technical'},
    difficulty: {type: String, enum: ['easy', 'medium', 'hard'], default: 'medium'},
    hints: [{type: String}],
    sampleAnswer: {type: String, default: ''},
    resources: [{type: String}],  // Links to study materials
    createdAt: {type: Date, default: Date.now},
  }],

  // Quiz/Interview mappings
  quizzes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
  }],

  // Company admin (if they want to manage)
  managedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {timestamps: true});

// Indexes
companyProfileSchema.index({name: 1});
companyProfileSchema.index({industry: 1});
companyProfileSchema.index({isActive: 1});

const CompanyProfile=mongoose.model('CompanyProfile', companyProfileSchema);
export default CompanyProfile;
