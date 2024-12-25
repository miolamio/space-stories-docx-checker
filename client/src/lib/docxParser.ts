export interface Article {
  title: string;
  content: string;
}

export interface ProcessingLog {
  stage: string;
  success: boolean;
  details: string;
  htmlPreview?: string;
  error?: any;
  diagnostics?: Record<string, any>;
}

export interface ProcessingResult {
  success: boolean;
  message: string;
  articles: Article[];
  logs: ProcessingLog[];
}
