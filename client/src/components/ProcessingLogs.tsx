import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ProcessingLog } from "@/lib/docxParser";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessingLogsProps {
  logs: ProcessingLog[];
}

export function ProcessingLogs({ logs }: ProcessingLogsProps) {
  const allSuccess = logs.every(log => log.success);

  return (
    <Card className={cn(
      "mb-8 border-2",
      allSuccess ? "border-green-500/50" : "border-red-500/50"
    )}>
      <CardHeader className={cn(
        "rounded-t-lg",
        allSuccess ? "bg-green-50" : "bg-red-50"
      )}>
        <CardTitle className="text-xl flex items-center gap-2">
          Processing Logs
          <Badge 
            variant={allSuccess ? "default" : "destructive"}
            className={cn(
              allSuccess ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
            )}
          >
            {logs.length} entries
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] rounded-md border p-4">
          <Accordion type="single" collapsible className="w-full">
            {logs.map((log, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className={cn(
                  "border rounded-lg mb-2 p-2",
                  log.success ? "bg-green-50/50" : "bg-red-50/50"
                )}
              >
                <AccordionTrigger className="flex items-center gap-2">
                  {log.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <span className={cn(
                    "font-semibold",
                    log.success ? "text-green-700" : "text-red-700"
                  )}>
                    {log.stage}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pl-6">
                    <p className="text-sm text-gray-600">{log.details}</p>

                    {log.error && (
                      <Alert variant="destructive" className="bg-red-50 border-red-200">
                        <AlertDescription className="text-sm text-red-600">
                          {log.error}
                        </AlertDescription>
                      </Alert>
                    )}

                    {log.htmlPreview && (
                      <div className="bg-gray-50 p-3 rounded-md">
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                          {log.htmlPreview}
                        </pre>
                      </div>
                    )}

                    {log.diagnostics && (
                      <div className="bg-gray-50 p-3 rounded-md">
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                          {JSON.stringify(log.diagnostics, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}