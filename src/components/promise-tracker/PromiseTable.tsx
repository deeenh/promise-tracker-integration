import { useMemo, useState } from "react";
import { Download, Search, MoreHorizontal, Lock, Unlock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EmptyState,
  EscalationBadge,
  LoadingRows,
  PriorityBadge,
  StatusBadge,
} from "./PTPrimitives";
import {
  PROMISE_PRIORITIES,
  PROMISE_STATUSES,
  downloadCsv,
  formatCurrency,
  formatDateTime,
  remainingTime,
  type PromiseWithCategory,
} from "@/lib/promise-tracker/constants";
import {
  useDeletePromise,
  useEscalatePromise,
  useExtendDeadline,
  useLogAction,
  useTicker,
  useToggleLock,
  useUpdatePromiseStatus,
} from "@/hooks/usePromiseTracker";

export function PromiseTable({
  promises,
  isLoading,
  showFilters = true,
  emptyTitle = "No promises found",
  emptyDescription = "Nothing matches the current view yet.",
  exportName = "promises",
}: {
  promises: PromiseWithCategory[];
  isLoading?: boolean;
  showFilters?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  exportName?: string;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const now = useTicker(30000);

  const updateStatus = useUpdatePromiseStatus();
  const extendDeadline = useExtendDeadline();
  const escalate = useEscalatePromise();
  const toggleLock = useToggleLock();
  const deletePromise = useDeletePromise();
  const logAction = useLogAction();

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return promises.filter((promiseRow) => {
      const matchesTerm =
        !term ||
        [promiseRow.code, promiseRow.title, promiseRow.owner, promiseRow.receiver]
          .join(" ")
          .toLowerCase()
          .includes(term);
      const matchesStatus = status === "all" || promiseRow.status === status;
      const matchesPriority = priority === "all" || promiseRow.priority === priority;
      return matchesTerm && matchesStatus && matchesPriority;
    });
  }, [promises, search, status, priority]);

  const handleExport = () => {
    downloadCsv(
      `${exportName}-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((row) => ({
        code: row.code,
        title: row.title,
        category: row.promise_categories?.label ?? "",
        sub_category: row.sub_category ?? "",
        owner: row.owner,
        receiver: row.receiver,
        status: row.status,
        priority: row.priority,
        deadline: row.deadline,
        escalation_level: row.escalation_level,
        fine_amount: row.fine_amount,
        tip_amount: row.tip_amount,
      })),
    );
    logAction.mutate({
      action: "Data Exported",
      details: `${rows.length} promises exported to CSV (${exportName})`,
    });
  };

  if (isLoading) return <LoadingRows rows={6} />;

  return (
    <div className="space-y-4">
      {showFilters ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search code, title, owner or receiver"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {PROMISE_STATUSES.map((entry) => (
                <SelectItem key={entry} value={entry} className="capitalize">
                  {entry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {PROMISE_PRIORITIES.map((entry) => (
                <SelectItem key={entry} value={entry} className="capitalize">
                  {entry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} disabled={rows.length === 0}>
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="glass-panel overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Promise</TableHead>
                <TableHead>Owner → Receiver</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Escalation</TableHead>
                <TableHead className="text-right">Fine / Tip</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const countdown = remainingTime(row.deadline, now);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="mono text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        {row.is_locked ? (
                          <Lock className="size-3 text-muted-foreground" />
                        ) : null}
                        {row.code}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-72">
                      <p className="truncate font-medium">{row.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.promise_categories?.label ?? "Uncategorised"}
                        {row.sub_category ? ` · ${row.sub_category}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">
                      <p>{row.owner}</p>
                      <p className="text-xs text-muted-foreground">{row.receiver}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      <p>{formatDateTime(row.deadline)}</p>
                      <p
                        className={
                          countdown.isOverdue && row.status !== "fulfilled"
                            ? "text-xs text-destructive"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        {row.status === "fulfilled" ? "Completed" : countdown.text}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={row.priority} />
                    </TableCell>
                    <TableCell>
                      <EscalationBadge level={row.escalation_level} />
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <p className="text-destructive">{formatCurrency(row.fine_amount)}</p>
                      <p className="text-success">{formatCurrency(row.tip_amount)}</p>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Actions for {row.code}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>{row.code}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={row.is_locked || row.status === "fulfilled"}
                            onClick={() =>
                              updateStatus.mutate({ promise: row, status: "fulfilled" })
                            }
                          >
                            Mark fulfilled
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={row.is_locked || row.status === "active"}
                            onClick={() => updateStatus.mutate({ promise: row, status: "active" })}
                          >
                            Set active
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={row.is_locked || row.status === "delayed"}
                            onClick={() => updateStatus.mutate({ promise: row, status: "delayed" })}
                          >
                            Flag delayed
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={row.is_locked || row.status === "broken"}
                            onClick={() => updateStatus.mutate({ promise: row, status: "broken" })}
                          >
                            Mark broken
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={row.is_locked}
                            onClick={() => extendDeadline.mutate({ promise: row, hours: 24 })}
                          >
                            Extend deadline 24h
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={row.is_locked || row.escalation_level >= 4}
                            onClick={() =>
                              escalate.mutate({
                                promise: row,
                                reason: "Manual escalation from promise register",
                              })
                            }
                          >
                            Escalate one level
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toggleLock.mutate(row)}>
                            {row.is_locked ? (
                              <>
                                <Unlock className="size-4" /> Unlock record
                              </>
                            ) : (
                              <>
                                <Lock className="size-4" /> Lock record
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            disabled={row.is_locked}
                            onClick={() => deletePromise.mutate(row)}
                          >
                            Delete promise
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
