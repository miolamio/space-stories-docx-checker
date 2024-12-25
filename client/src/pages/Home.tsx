import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/FileUpload";
import { ProcessingLogs } from "@/components/ProcessingLogs";
import { ArticleResults } from "@/components/ArticleResults";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle, XCircle } from "lucide-react";
import type { ProcessingResult } from "@/lib/docxParser";
import { cn } from "@/lib/utils";

export function Home() {
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const { toast } = useToast();

  const { mutate: processFile, isPending } = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/process-docx', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json() as Promise<ProcessingResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: data.success ? "File processed successfully" : "Processing failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className={cn(
        "mb-8 border-2",
        result?.success ? "border-green-500/50" : result ? "border-red-500/50" : "border-gray-200"
      )}>
        <CardHeader className={cn(
          "rounded-t-lg",
          result?.success ? "bg-green-50" : result ? "bg-red-50" : "bg-white"
        )}>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            DOCX File Analyzer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload onFileSelected={processFile} isProcessing={isPending} />

          {result && (
            <Alert className={cn(
              "mt-4",
              result.success 
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            )}>
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <AlertTitle className={cn(
                "font-semibold",
                result.success ? "text-green-800" : "text-red-800"
              )}>
                {result.success ? "Document Valid" : "Validation Failed"}
              </AlertTitle>
              <AlertDescription>
                {result.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {result && (
        <>
          {result.articles.length > 0 && <ArticleResults articles={result.articles} />}
          <ProcessingLogs logs={result.logs} />
        </>
      )}
    </div>
  );
}