import mammoth from 'mammoth';
import { readFileSync } from 'fs';

interface Article {
    title: string;
    content: string;
}

interface ProcessingLog {
    stage: string;
    success: boolean;
    details: string;
    htmlPreview?: string;
    error?: any;
    diagnostics?: Record<string, any>;
}

interface ErrorWithDetails extends Error {
    name: string;
    message: string;
    stack?: string;
}

export class DocumentAnalyzer {
    private logs: ProcessingLog[] = [];

    private log(stage: string, success: boolean, details: string, error?: any, htmlPreview?: string, diagnostics?: Record<string, any>) {
        this.logs.push({
            stage,
            success,
            details,
            error,
            htmlPreview,
            diagnostics
        });
    }

    private stripHtmlTags(html: string): string {
        if (!html) {
            return "";
        }
        return html.replace(/<[^>]*>/g, '');
    }

    private analyzeHtmlStructure(html: string): void {
        const expectedPatterns = [
            { pattern: /<p>/g, name: "Paragraphs <p>" },
            { pattern: /<strong>/g, name: "Bold text <strong>" },
            { pattern: /Заголовок/g, name: "'Заголовок' keyword" },
            { pattern: /Содержимое/g, name: "'Содержимое' keyword" }
        ];

        // Analyze line breaks and spacing
        const lineBreakAnalysis = {
            paragraphBreaks: (html.match(/<\/p>\s*<p>/g) || []).length,
            consecutiveBreaks: (html.match(/<\/p>\s*<\/p>/g) || []).length,
            brTags: (html.match(/<br\s*\/?>/g) || []).length,
            whitespaceBlocks: (html.match(/\s{2,}/g) || []).length
        };

        this.log(
            "HTML Structure Analysis",
            true,
            "Analyzing HTML structure for expected patterns",
            undefined,
            html.slice(0, 200) + "...",
            {
                documentLength: html.length,
                lineBreakAnalysis,
                htmlPreview: html.slice(0, 500)
            }
        );

        for (const { pattern, name } of expectedPatterns) {
            const matches = (html.match(pattern) || []).length;
            const matchPositions: number[] = [];
            let match;
            const regex = new RegExp(pattern);
            let tempHtml = html;
            let offset = 0;

            while ((match = regex.exec(tempHtml)) !== null) {
                matchPositions.push(offset + match.index);
                offset += match.index + 1;
                tempHtml = tempHtml.slice(match.index + 1);
            }

            this.log(
                "Pattern Check",
                matches > 0,
                `Found ${matches} occurrences of ${name}`,
                matches === 0 ? `Missing pattern: ${name}` : undefined,
                undefined,
                {
                    pattern: pattern.toString(),
                    matchCount: matches,
                    matchPositions: matchPositions,
                    surroundingContext: matchPositions.map(pos => {
                        const start = Math.max(0, pos - 50);
                        const end = Math.min(html.length, pos + 50);
                        return {
                            position: pos,
                            context: html.slice(start, end),
                            beforeMatch: html.slice(Math.max(0, pos - 20), pos),
                            afterMatch: html.slice(pos, Math.min(html.length, pos + 20))
                        };
                    })
                }
            );
        }
    }

    private analyzePatternMatch(pattern: RegExp, html: string, patternName: string): {
        matches: RegExpExecArray[];
        diagnostics: any;
    } {
        const matches: RegExpExecArray[] = [];
        const matchPositions: number[] = [];
        const matchContexts: any[] = [];
        let match: RegExpExecArray | null;
        let tempHtml = html;
        let offset = 0;

        // Reset the pattern's lastIndex
        pattern.lastIndex = 0;

        while ((match = pattern.exec(tempHtml)) !== null) {
            matches.push(match);
            const position = offset + match.index;
            matchPositions.push(position);

            // Get surrounding context
            const start = Math.max(0, position - 100);
            const end = Math.min(html.length, position + match[0].length + 100);

            matchContexts.push({
                position,
                matchedText: match[0],
                titleGroup: match[1] || 'NO_TITLE_GROUP',
                contentGroup: match[2] || 'NO_CONTENT_GROUP',
                beforeMatch: html.slice(Math.max(0, position - 50), position),
                afterMatch: html.slice(position + match[0].length, Math.min(html.length, position + match[0].length + 50)),
                fullContext: html.slice(start, end)
            });

            if (!pattern.global) break;
        }

        return {
            matches,
            diagnostics: {
                patternName,
                pattern: pattern.toString(),
                matchCount: matches.length,
                matchPositions,
                matchContexts,
                patternParts: {
                    titlePart: pattern.toString().split('Содержимое')[0],
                    contentPart: pattern.toString().split('Содержимое')[1]
                },
                fullHtmlLength: html.length,
                htmlStructure: {
                    paragraphCount: (html.match(/<p>/g) || []).length,
                    strongTagCount: (html.match(/<strong>/g) || []).length,
                    titleKeywordCount: (html.match(/Заголовок/g) || []).length,
                    contentKeywordCount: (html.match(/Содержимое/g) || []).length
                }
            }
        };
    }

    private async extractArticles(fileContent: string): Promise<Article[]> {
        try {
            // Main article extraction pattern
            const articleRegex = /<p>(?:<strong>)?Заголовок(?:<\/strong>)?:\s*(.*?)(?:<\/p>|<br \/>)\s*(?:<p>(?:<strong>)?Содержимое(?:<\/strong>)?:\s*<\/p>|<br \/>)\s*([\s\S]*?)(?=<p>(?:<strong>)?Заголовок|$)/g;

            // Analyze main pattern matches
            const mainPatternAnalysis = this.analyzePatternMatch(articleRegex, fileContent, 'Main Pattern');

            this.log(
                "Main Pattern Analysis",
                mainPatternAnalysis.matches.length > 0,
                `Main pattern analysis complete - found ${mainPatternAnalysis.matches.length} potential matches`,
                undefined,
                undefined,
                mainPatternAnalysis.diagnostics
            );

            const articles: Article[] = [];

            for (const match of mainPatternAnalysis.matches) {
                const title = this.stripHtmlTags(match[1]).trim();
                const content = match[2].trim();

                this.log(
                    "Article Found (Main Pattern)",
                    true,
                    `Found article with title: "${title.slice(0, 50)}${title.length > 50 ? '...' : ''}"`,
                    undefined,
                    undefined,
                    {
                        rawMatch: match[0],
                        titleGroup: {
                            raw: match[1],
                            stripped: title,
                            length: title.length
                        },
                        contentGroup: {
                            raw: match[2],
                            stripped: content,
                            length: content.length,
                            preview: content.slice(0, 100)
                        },
                        matchIndex: match.index,
                        fullMatchLength: match[0].length
                    }
                );

                articles.push({ title, content });
            }

            if (articles.length === 0) {
                // Try single article pattern
                const singleArticleRegex = /<p>(?:<strong>)?Заголовок(?:<\/strong>)?:\s*(.*?)(?:<\/p>|<br \/>)\s*(?:<p>(?:<strong>)?Содержимое(?:<\/strong>)?:\s*<\/p>|<br \/>)\s*([\s\S]*)/s;

                // Analyze single pattern matches
                const singlePatternAnalysis = this.analyzePatternMatch(singleArticleRegex, fileContent, 'Single Pattern');

                this.log(
                    "Single Pattern Analysis",
                    singlePatternAnalysis.matches.length > 0,
                    `Single pattern analysis complete - found ${singlePatternAnalysis.matches.length} potential matches`,
                    undefined,
                    undefined,
                    singlePatternAnalysis.diagnostics
                );

                if (singlePatternAnalysis.matches.length > 0) {
                    const match = singlePatternAnalysis.matches[0];
                    const title = this.stripHtmlTags(match[1]).trim();
                    const content = match[2].trim();

                    this.log(
                        "Article Found (Single Pattern)",
                        true,
                        `Found single article with title: "${title.slice(0, 50)}${title.length > 50 ? '...' : ''}"`,
                        undefined,
                        undefined,
                        {
                            rawMatch: match[0],
                            titleGroup: {
                                raw: match[1],
                                stripped: title,
                                length: title.length
                            },
                            contentGroup: {
                                raw: match[2],
                                stripped: content,
                                length: content.length,
                                preview: content.slice(0, 100)
                            },
                            matchIndex: match.index,
                            fullMatchLength: match[0].length
                        }
                    );

                    articles.push({ title, content });
                } else {
                    this.log(
                        "Pattern Matching Failed",
                        false,
                        "Both patterns failed to find any articles",
                        undefined,
                        fileContent,
                        {
                            mainPatternDiagnostics: mainPatternAnalysis.diagnostics,
                            singlePatternDiagnostics: singlePatternAnalysis.diagnostics,
                            documentStructure: {
                                totalLength: fileContent.length,
                                paragraphs: fileContent.split('</p>').length - 1,
                                possibleTitlePositions: (fileContent.match(/Заголовок/g) || []).map(
                                    (_, i) => fileContent.indexOf('Заголовок', i === 0 ? 0 : fileContent.indexOf('Заголовок') + 1)
                                ),
                                possibleContentPositions: (fileContent.match(/Содержимое/g) || []).map(
                                    (_, i) => fileContent.indexOf('Содержимое', i === 0 ? 0 : fileContent.indexOf('Содержимое') + 1)
                                )
                            }
                        }
                    );
                }
            }

            return articles;
        } catch (error) {
            const typedError = error as ErrorWithDetails;
            this.log(
                "Article Extraction Error",
                false,
                "Error during article extraction",
                typedError,
                fileContent,
                {
                    errorDetails: {
                        name: typedError.name || 'Unknown Error',
                        message: typedError.message || 'No error message available',
                        stack: typedError.stack || 'No stack trace available'
                    }
                }
            );
            return [];
        }
    }

    async processDocument(filePath: string): Promise<{
        success: boolean;
        message: string;
        articles: Article[];
        logs: ProcessingLog[];
    }> {
        try {
            // Read file
            this.log("File Reading", true, `Reading file: ${filePath}`);
            const buffer = readFileSync(filePath);

            // Convert DOCX to HTML
            this.log("DOCX Conversion", true, "Converting DOCX to HTML");
            const result = await mammoth.convertToHtml({ buffer });
            const fileContent = result.value;

            if (result.messages && result.messages.length > 0) {
                this.log(
                    "Mammoth Messages",
                    true,
                    "Conversion completed with messages",
                    result.messages,
                    undefined,
                    {
                        messageTypes: result.messages.map(m => m.type),
                        messagesByType: result.messages.reduce((acc, m) => {
                            acc[m.type] = (acc[m.type] || []).concat(m);
                            return acc;
                        }, {} as Record<string, any[]>)
                    }
                );
            }

            // Analyze HTML structure
            this.analyzeHtmlStructure(fileContent);

            // Extract articles
            const articles = await this.extractArticles(fileContent);

            if (articles.length === 0) {
                return {
                    success: false,
                    message: `File ${filePath} process started error. Articles not found`,
                    articles: [],
                    logs: this.logs
                };
            }

            return {
                success: true,
                message: `Successfully extracted ${articles.length} articles from ${filePath}`,
                articles,
                logs: this.logs
            };

        } catch (error) {
            const typedError = error as ErrorWithDetails;
            this.log(
                "Process Error",
                false,
                "Critical error during document processing",
                typedError,
                undefined,
                {
                    errorDetails: {
                        name: typedError.name || 'Unknown Error',
                        message: typedError.message || 'No error message available',
                        stack: typedError.stack || 'No stack trace available'
                    }
                }
            );

            return {
                success: false,
                message: `Error processing file: ${typedError.message || 'Unknown error'}`,
                articles: [],
                logs: this.logs
            };
        }
    }
}