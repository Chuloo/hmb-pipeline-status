import { useState } from "react";
import {
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Inbox,
  XCircle,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

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

// Sample data
const contentGrowth = [
  { month: "Jan", planned: 24, completed: 20 },
  { month: "Feb", planned: 28, completed: 25 },
  { month: "Mar", planned: 32, completed: 30 },
  { month: "Apr", planned: 40, completed: 35 },
  { month: "May", planned: 45, completed: 40 },
  { month: "Jun", planned: 50, completed: 48 },
];

const authors = [
  { name: "Sarah Johnson", count: 45, completion: "98%" },
  { name: "Mike Chen", count: 38, completion: "95%" },
  { name: "Alex Kumar", count: 32, completion: "92%" },
  { name: "Lisa Patel", count: 28, completion: "94%" },
  { name: "Tom Wilson", count: 25, completion: "90%" },
];

const upcomingContent = [
  {
    title: "2024 Tech Trends Analysis",
    author: "Sarah Johnson",
    dueDate: "2024-01-25",
    status: "in-progress",
  },
  {
    title: "AI in Healthcare Report",
    author: "Mike Chen",
    dueDate: "2024-01-26",
    status: "in-review",
  },
  {
    title: "Sustainable Energy Guide",
    author: "Lisa Patel",
    dueDate: "2024-01-27",
    status: "in-progress",
  },
];

const overdueContent = [
  {
    title: "Cloud Computing Basics",
    author: "Tom Wilson",
    dueDate: "2024-01-15",
    status: "in-progress",
  },
  {
    title: "Digital Marketing Strategy",
    author: "Alex Kumar",
    dueDate: "2024-01-18",
    status: "in-review",
  },
];

export default function ContentDashboard() {
  const [selectedProject, setSelectedProject] = useState("all");

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            Content Pipeline
          </h2>
          <div className="flex items-center space-x-2">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Projects</SelectLabel>
                  <SelectItem value="all">All Projects</SelectItem>
                  <SelectItem value="tech">Tech Articles</SelectItem>
                  <SelectItem value="health">Healthcare</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Content
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">168</div>
              <p className="text-xs text-muted-foreground">
                +20.1% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45</div>
              <p className="text-xs text-muted-foreground">23 due this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">103</div>
              <p className="text-xs text-muted-foreground">
                +10.5% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Backlog</CardTitle>
              <Inbox className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">20</div>
              <p className="text-xs text-muted-foreground">
                -15% from last month
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Content Growth</CardTitle>
              <CardDescription>
                Planned vs completed content over time
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ChartContainer
                config={{
                  planned: {
                    label: "Planned Content",
                    color: "hsl(var(--chart-1))",
                  },
                  completed: {
                    label: "Completed Content",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[300px] w-full [&_svg]:!w-full [&_svg]:!max-w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={contentGrowth}
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <XAxis dataKey="month" />
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
                    <Line type="monotone" dataKey="completed" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Top Authors</CardTitle>
              <CardDescription>Content creation leaderboard</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Author</TableHead>
                    <TableHead className="text-right">Content</TableHead>
                    <TableHead className="text-right">Completion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {authors.map((author) => (
                    <TableRow key={author.name}>
                      <TableCell className="font-medium">
                        {author.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {author.count}
                      </TableCell>
                      <TableCell className="text-right">
                        {author.completion}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Upcoming Content</CardTitle>
                <CardDescription>Due within the next week</CardDescription>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingContent.map((content) => (
                    <TableRow key={content.title}>
                      <TableCell className="font-medium">
                        {content.title}
                      </TableCell>
                      <TableCell>{content.author}</TableCell>
                      <TableCell>{content.dueDate}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize",
                            content.status === "in-progress" &&
                              "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
                            content.status === "in-review" &&
                              "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
                            content.status === "completed" &&
                              "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
                            content.status === "backlog" &&
                              "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
                          )}
                        >
                          {content.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueContent.map((content) => (
                    <TableRow key={content.title}>
                      <TableCell className="font-medium">
                        {content.title}
                      </TableCell>
                      <TableCell>{content.author}</TableCell>
                      <TableCell className="text-destructive">
                        {content.dueDate}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize",
                            content.status === "in-progress" &&
                              "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
                            content.status === "in-review" &&
                              "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
                            content.status === "completed" &&
                              "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
                            content.status === "backlog" &&
                              "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
                          )}
                        >
                          {content.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
