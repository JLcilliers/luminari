/**
 * TypeScript types for the 6-agent content generation pipeline
 */

// Pipeline stages
export type PipelineStage =
  | 'brand-analyzer'
  | 'content-planner'
  | 'writer'
  | 'editor'
  | 'schema-generator'
  | 'output-generator';

export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed';

// Brand Analysis types
export interface BrandVoice {
  tone: string;
  personality: string[];
  writingStyle: string;
  vocabularyLevel: string;
  doList: string[];
  dontList: string[];
}

export interface BrandIdentity {
  name: string;
  industry: string;
  mission?: string;
  valueProposition?: string;
  targetAudience?: string;
  competitors?: string[];
  uniqueSellingPoints?: string[];
}

export interface BrandAnalysis {
  identity: BrandIdentity;
  voice: BrandVoice;
  contentGuidelines: string[];
  keyMessages: string[];
  contextSummary: string;
}

// Content Planning types
export interface ContentOutlineSection {
  heading: string;
  type: 'h2' | 'h3';
  keyPoints: string[];
  wordCountTarget: number;
  keywords: string[];
}

export interface ContentPlan {
  title: string;
  metaDescription: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  searchIntent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  introduction: {
    hook: string;
    keyPoints: string[];
    wordCountTarget: number;
  };
  sections: ContentOutlineSection[];
  conclusion: {
    keyTakeaways: string[];
    callToAction: string;
    wordCountTarget: number;
  };
  faqs: {
    question: string;
    answerGuidance: string;
  }[];
  totalWordCountTarget: number;
}

// Writer types
export interface WrittenSection {
  heading: string;
  content: string;
  wordCount: number;
}

export interface WrittenContent {
  title: string;
  metaTitle: string;
  metaDescription: string;
  introduction: string;
  sections: WrittenSection[];
  conclusion: string;
  faqs: {
    question: string;
    answer: string;
  }[];
  totalWordCount: number;
}

// Editor types
export interface EditedContent extends WrittenContent {
  readabilityScore: number;
  seoScore: number;
  editSummary: string[];
  improvements: string[];
}

// Schema Generator types
export interface ArticleSchema {
  '@type': 'Article' | 'BlogPosting';
  headline: string;
  description: string;
  author: {
    '@type': 'Organization' | 'Person';
    name: string;
    url?: string;
  };
  publisher: {
    '@type': 'Organization';
    name: string;
    logo?: {
      '@type': 'ImageObject';
      url: string;
    };
  };
  datePublished: string;
  dateModified: string;
  mainEntityOfPage?: string;
  image?: string;
  wordCount: number;
}

export interface FAQSchema {
  '@type': 'FAQPage';
  mainEntity: {
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }[];
}

export interface GeneratedSchema {
  article: ArticleSchema;
  faq: FAQSchema;
  jsonLd: string;
}

// Output Generator types
export type OutputFormat = 'markdown' | 'html' | 'json' | 'docx';

export interface ContentOutput {
  markdown: string;
  html: string;
  json: {
    meta: {
      title: string;
      description: string;
      keywords: string[];
    };
    content: {
      title: string;
      introduction: string;
      sections: WrittenSection[];
      conclusion: string;
      faqs: { question: string; answer: string }[];
    };
    schema: GeneratedSchema;
  };
  wordCount: number;
}

// Pipeline Input/Output types
export interface PipelineInput {
  projectId: string;
  topic: string;
  targetKeyword: string;
  secondaryKeywords?: string[];
  targetWordCount?: number;
  contentType?: 'article' | 'blog-post' | 'guide' | 'how-to';
  additionalNotes?: string;
  // Brand context (fetched from DB or provided)
  brandName?: string;
  websiteUrl?: string;
  brandBible?: Record<string, unknown>;
  siteContext?: string;
}

export interface PipelineProgress {
  stage: PipelineStage;
  status: PipelineStatus;
  message: string;
  progress: number; // 0-100
  timestamp: Date;
  data?: unknown;
}

export interface PipelineResult {
  success: boolean;
  pipelineId: string;
  stages: {
    brandAnalysis?: BrandAnalysis;
    contentPlan?: ContentPlan;
    writtenContent?: WrittenContent;
    editedContent?: EditedContent;
    schema?: GeneratedSchema;
    output?: ContentOutput;
  };
  finalOutput?: ContentOutput;
  error?: string;
  duration: number;
  progress: PipelineProgress[];
}

// Streaming event types
export interface PipelineStreamEvent {
  type: 'progress' | 'stage-complete' | 'error' | 'complete';
  stage?: PipelineStage;
  status?: PipelineStatus;
  message: string;
  progress?: number;
  data?: unknown;
  timestamp: string;
}

// API Request/Response types
export interface PipelineRequest {
  projectId: string;
  topic: string;
  targetKeyword: string;
  secondaryKeywords?: string[];
  targetWordCount?: number;
  contentType?: 'article' | 'blog-post' | 'guide' | 'how-to';
  additionalNotes?: string;
}

export interface PipelineResponse {
  success: boolean;
  pipelineId: string;
  result?: PipelineResult;
  error?: string;
}
