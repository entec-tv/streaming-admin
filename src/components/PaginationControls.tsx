import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaginationControlsProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function PaginationControls({ total, page, pageSize, onPageChange, onPageSizeChange }: PaginationControlsProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-5 py-3 text-sm text-muted-foreground">
      <span>عرض {start}–{end} من {total}</span>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline">لكل صفحة</span>
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger className="h-9 w-[76px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[25, 50, 100].map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="px-1">صفحة {page} من {pages}</span>
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronRight className="ml-1 size-4" /> السابق
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          التالي <ChevronLeft className="mr-1 size-4" />
        </Button>
      </div>
    </div>
  );
}
