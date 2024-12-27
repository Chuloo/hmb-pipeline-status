"use client";

import { useEffect, useState } from "react";
import { useContent } from "@/context/ContentContext";
import {
  WORKSPACES,
  type ContentMetrics,
  type Author,
  type WorkflowStateCount,
  type ContentItem,
} from "@/lib/client";
import { createClient } from "@/lib/supabase/component";
import { useRouter } from "next/router";
import {
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Inbox,
  XCircle,
  RotateCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { Notification } from "@/components/ui/notification";
import { Button } from "@/components/ui/button";

export default function ContentDashboard() {
  const { state, dispatch, refreshMetrics } = useContent();
  const { selectedWorkspace, metrics, loading, error, lastUpdated } = state;
  const router = useRouter();
  const supabase = createClient();

  const [isAuthorsExpanded, setIsAuthorsExpanded] = useState(false);

  useEffect(() => {
    if (selectedWorkspace) {
      refreshMetrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkspace]);

  const handleWorkspaceChange = (value: string) => {
    dispatch({ type: "SET_SELECTED_WORKSPACE", payload: value });
  };

  const handleRefresh = () => {
    refreshMetrics(true);
  };

  const handleDismissError = () => {
    dispatch({ type: "SET_ERROR", payload: null });
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Default metrics when loading or no data
  const defaultMetrics: ContentMetrics = {
    total: 0,
    completed: 0,
    inProgress: 0,
    backlog: 0,
    completionRate: 0,
    authors: [],
    projects: [],
    monthlyGrowth: [],
    upcomingContent: [],
    overdueContent: [],
    workflowStates: [],
  };

  const displayMetrics = metrics || defaultMetrics;

  // Calculate month-over-month changes
  const lastMonth =
    displayMetrics.monthlyGrowth[displayMetrics.monthlyGrowth.length - 2];
  const currentMonth =
    displayMetrics.monthlyGrowth[displayMetrics.monthlyGrowth.length - 1];

  const totalChange =
    lastMonth && currentMonth
      ? ((currentMonth.planned - lastMonth.planned) / lastMonth.planned) * 100
      : 0;

  const completedChange =
    lastMonth && currentMonth
      ? ((currentMonth.completed - lastMonth.completed) / lastMonth.completed) *
        100
      : 0;

  const getDisplayedAuthors = (authors: Author[]) => {
    return isAuthorsExpanded ? authors : authors.slice(0, 5);
  };

  return (
    <>
      {error?.includes("rate limit") && (
        <Notification
          message="API rate limit reached. Data will refresh when available."
          onClose={handleDismissError}
        />
      )}
      <div className="flex min-h-screen flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              Hackmamba Content Pipeline {loading && "(Refreshing...)"}
            </h2>
            <div className="flex items-center space-x-4">
              <Select
                value={selectedWorkspace || undefined}
                onValueChange={handleWorkspaceChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Workspaces</SelectLabel>
                    {WORKSPACES.map((workspace) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className={cn(
                  "flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground",
                  loading && "opacity-50 cursor-not-allowed"
                )}
              >
                <RotateCw
                  className={cn("h-4 w-4", loading && "animate-spin")}
                />
                <span>
                  {lastUpdated
                    ? `Updated ${format(lastUpdated, "HH:mm")}`
                    : "Refresh"}
                </span>
              </button>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="text-sm text-muted-foreground"
              >
                Sign out
              </Button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Content
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{displayMetrics.total}</div>
                <p className="text-xs text-muted-foreground">
                  {totalChange > 0 ? "+" : ""}
                  {totalChange.toFixed(1)}% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Overdue Content
                </CardTitle>
                <XCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {displayMetrics.overdueContent.length}
                </div>
                <p className="text-xs text-muted-foreground">Past due date</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  In Progress
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {displayMetrics.inProgress}
                </div>
                <p className="text-xs text-muted-foreground">
                  {displayMetrics.upcomingContent.length} due this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {displayMetrics.completed}
                </div>
                <p className="text-xs text-muted-foreground">
                  {completedChange > 0 ? "+" : ""}
                  {completedChange.toFixed(1)}% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Backlog</CardTitle>
                <Inbox className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {displayMetrics.backlog}
                </div>
                <p className="text-xs text-muted-foreground">
                  Unassigned content
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Content Growth</CardTitle>
                <CardDescription>Content scheduled per month</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ChartContainer
                  config={{
                    planned: {
                      label: "Total Content",
                      color: "hsl(var(--chart-1))",
                    },
                    completed: {
                      label: "Published Content",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[300px] w-full [&_svg]:!w-full [&_svg]:!max-w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={displayMetrics.monthlyGrowth}
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                      <XAxis
                        dataKey="month"
                        tickFormatter={(value) =>
                          format(new Date(value), "MMM")
                        }
                      />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="planned"
                        strokeWidth={2}
                        activeDot={{
                          r: 8,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="completed"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Top Authors</CardTitle>
                    <CardDescription>
                      Content creation leaderboard
                    </CardDescription>
                  </div>
                  {displayMetrics.authors.length > 5 && (
                    <button
                      onClick={() => setIsAuthorsExpanded(!isAuthorsExpanded)}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      {isAuthorsExpanded ? (
                        <>
                          <span>Show Less</span>
                          <ChevronUp className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          <span>Show All</span>
                          <ChevronDown className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Author</TableHead>
                      <TableHead className="text-right">Content</TableHead>
                      <TableHead className="text-right">
                        Share of content
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getDisplayedAuthors(displayMetrics.authors).map(
                      (author: Author) => (
                        <TableRow key={author.id}>
                          <TableCell className="font-medium">
                            {author.name}
                          </TableCell>
                          <TableCell className="text-right">
                            {author.contentCount}
                          </TableCell>
                          <TableCell className="text-right">
                            {(
                              (author.contentCount / displayMetrics.total) *
                              100
                            ).toFixed(1)}
                            %
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
                {!isAuthorsExpanded && displayMetrics.authors.length > 5 && (
                  <div className="mt-2 text-center text-sm text-muted-foreground">
                    {displayMetrics.authors.length - 5} more authors
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <Card className="col-span-7">
            <CardHeader>
              <CardTitle>Workflow States</CardTitle>
              <CardDescription>
                Content distribution across workflow states
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {displayMetrics.workflowStates.map(
                  (state: WorkflowStateCount) => (
                    <div
                      key={state.name}
                      className="flex items-center justify-between space-x-2 rounded-lg border p-3"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{state.name}</p>
                        <div className="flex items-center gap-2">
                          <div className="text-2xl font-bold">
                            {state.count}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(
                              (state.count / displayMetrics.total) *
                              100
                            ).toFixed(1)}
                            %
                          </div>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          state.name.toLowerCase().includes("published") &&
                            "bg-green-500",
                          state.name.toLowerCase().includes("progress") &&
                            "bg-blue-500",
                          state.name.toLowerCase().includes("review") &&
                            "bg-purple-500",
                          state.name.toLowerCase().includes("backlog") &&
                            "bg-gray-500",
                          state.name.toLowerCase().includes("approved") &&
                            "bg-yellow-500",
                          state.name.toLowerCase().includes("canceled") &&
                            "bg-red-500"
                        )}
                      />
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Upcoming Content</CardTitle>
                  <CardDescription>Due within the next month</CardDescription>
                </div>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      {selectedWorkspace === "all" && (
                        <TableHead>Workspace</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayMetrics.upcomingContent.map(
                      (content: ContentItem) => (
                        <TableRow key={content.id}>
                          <TableCell className="font-medium">
                            {content.title}
                          </TableCell>
                          <TableCell>
                            {content.assignee || "Unassigned"}
                          </TableCell>
                          <TableCell>
                            {format(parseISO(content.dueDate!), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "capitalize",
                                content.status
                                  .toLowerCase()
                                  .includes("progress") &&
                                  "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
                                content.status
                                  .toLowerCase()
                                  .includes("review") &&
                                  "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
                                content.status
                                  .toLowerCase()
                                  .includes("published") &&
                                  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
                                content.status
                                  .toLowerCase()
                                  .includes("backlog") &&
                                  "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
                              )}
                            >
                              {content.status}
                            </Badge>
                          </TableCell>
                          {selectedWorkspace === "all" && (
                            <TableCell>
                              <Badge variant="secondary" className="capitalize">
                                {content.workspace}
                              </Badge>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Overdue Content</CardTitle>
                  <CardDescription>Past due date</CardDescription>
                </div>
                <XCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      {selectedWorkspace === "all" && (
                        <TableHead>Workspace</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayMetrics.overdueContent.map(
                      (content: ContentItem) => (
                        <TableRow key={content.id}>
                          <TableCell className="font-medium">
                            {content.title}
                          </TableCell>
                          <TableCell>
                            {content.assignee || "Unassigned"}
                          </TableCell>
                          <TableCell className="text-destructive">
                            {format(parseISO(content.dueDate!), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "capitalize",
                                content.status
                                  .toLowerCase()
                                  .includes("progress") &&
                                  "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
                                content.status
                                  .toLowerCase()
                                  .includes("review") &&
                                  "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
                                content.status
                                  .toLowerCase()
                                  .includes("published") &&
                                  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
                                content.status
                                  .toLowerCase()
                                  .includes("backlog") &&
                                  "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
                              )}
                            >
                              {content.status}
                            </Badge>
                          </TableCell>
                          {selectedWorkspace === "all" && (
                            <TableCell>
                              <Badge variant="secondary" className="capitalize">
                                {content.workspace}
                              </Badge>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
