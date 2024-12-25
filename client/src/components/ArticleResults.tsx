import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import type { Article } from "@/lib/docxParser";
import { cn } from "@/lib/utils";

interface ArticleResultsProps {
  articles: Article[];
}

export function ArticleResults({ articles }: ArticleResultsProps) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <Card className="mb-8 border-2 border-green-500/50">
      <CardHeader className="bg-green-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            Found Articles
            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
              {articles.length}
            </Badge>
          </CardTitle>
          <CheckCircle className="h-5 w-5 text-green-500" />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Title</TableHead>
              <TableHead>Content Preview</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.map((article, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{article.title}</TableCell>
                <TableCell className="text-sm text-gray-600">
                  {article.content.slice(0, 200)}
                  {article.content.length > 200 && "..."}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}