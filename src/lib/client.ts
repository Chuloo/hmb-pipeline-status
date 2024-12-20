import { LinearClient } from "@linear/sdk";
import {
  // subDays,
  addDays,
  startOfMonth,
  // endOfMonth,
  isAfter,
  isBefore,
  parseISO,
} from "date-fns";

// Map of workspace IDs to their API keys
const WORKSPACE_API_KEYS: Record<string, string> = {
  cloudinary: process.env.NEXT_PUBLIC_LINEAR_CLOUDINARY_API_KEY || "",
  coderabbit: process.env.NEXT_PUBLIC_LINEAR_CODERABBIT_API_KEY || "",
  jozu: process.env.NEXT_PUBLIC_LINEAR_JOZU_API_KEY || "",
  // flutterwave: process.env.NEXT_PUBLIC_LINEAR_FLUTTERWAVE_API_KEY || "",
  // localazy: process.env.NEXT_PUBLIC_LINEAR_LOCALAZY_API_KEY || "",
  // miaplatform: process.env.NEXT_PUBLIC_LINEAR_MIAPLATFORM_API_KEY || "",
  // monogram: process.env.NEXT_PUBLIC_LINEAR_MONOGRAM_API_KEY || "",
  // neon: process.env.NEXT_PUBLIC_LINEAR_NEON_API_KEY || "",
  // novu: process.env.NEXT_PUBLIC_LINEAR_NOVU_API_KEY || "",
  // nuvo: process.env.NEXT_PUBLIC_LINEAR_NUVO_API_KEY || "",
  // roadmap: process.env.NEXT_PUBLIC_LINEAR_ROADMAP_API_KEY || "",
  // simli: process.env.NEXT_PUBLIC_LINEAR_SIMLI_API_KEY || "",
  // sourcegraph: process.env.NEXT_PUBLIC_SOURCEGRAPH_API_KEY || "",
  // tns: process.env.NEXT_PUBLIC_LINEAR_TNS_API_KEY || "",
  // Add more workspaces as needed
};

// Map to store workspace-specific Linear clients
const clientsMap = new Map<string, LinearClient>();

export function getLinearClient(workspaceId: string): LinearClient {
  if (!clientsMap.has(workspaceId)) {
    const apiKey = WORKSPACE_API_KEYS[workspaceId];
    if (!apiKey) {
      throw new Error(`No API key found for workspace ${workspaceId}`);
    }
    clientsMap.set(workspaceId, new LinearClient({ apiKey }));
  }
  return clientsMap.get(workspaceId)!;
}

// List of available workspaces
export const WORKSPACES = Object.keys(WORKSPACE_API_KEYS).map((id) => ({
  id,
  name: `Workspace - ${id}`, // You can customize workspace names
}));

export async function getWorkspaceIssues(workspaceId: string) {
  try {
    const client = getLinearClient(workspaceId);
    const issues = await client.issues({
      filter: {
        team: { id: { eq: workspaceId } },
      },
      include: {
        state: true,
      },
    });
    return issues.nodes;
  } catch (error) {
    console.error("Error fetching workspace issues:", error);
    throw error;
  }
}

export type Author = {
  id: string;
  name: string;
  contentCount: number;
};

export type ContentItem = {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  assignee: string | null;
  project: string | null;
};

export type MonthlyContent = {
  month: string;
  planned: number;
  completed: number;
};

export type ContentMetrics = {
  total: number;
  completed: number;
  inProgress: number;
  backlog: number;
  completionRate: number;
  authors: Author[];
  projects: string[];
  monthlyGrowth: MonthlyContent[];
  upcomingContent: ContentItem[];
  overdueContent: ContentItem[];
};

export async function getContentMetrics(
  workspaceId: string
): Promise<ContentMetrics> {
  try {
    const client = getLinearClient(workspaceId);
    const today = new Date();
    const nextWeek = addDays(today, 7);

    // Fetch all issues with necessary data
    const issues = await client.issues({
      filter: {
        team: { id: { eq: workspaceId } },
      },
      include: {
        state: true,
        assignee: true,
        project: true,
      },
    });

    // Basic metrics
    const totalIssues = issues.nodes.length;
    const completedIssues = issues.nodes.filter(
      (issue) => issue.state?.type?.toLowerCase() === "completed"
    ).length;
    const inProgressIssues = issues.nodes.filter(
      (issue) => issue.state?.type?.toLowerCase() === "started"
    ).length;
    const backlogIssues = issues.nodes.filter(
      (issue) => issue.state?.type?.toLowerCase() === "backlog"
    ).length;

    // Author metrics
    const authorMap = new Map<string, number>();
    issues.nodes.forEach((issue) => {
      if (issue.assignee?.name) {
        authorMap.set(
          issue.assignee.name,
          (authorMap.get(issue.assignee.name) || 0) + 1
        );
      }
    });
    const authors = Array.from(authorMap.entries())
      .map(([name, count]) => ({ id: name, name, contentCount: count }))
      .sort((a, b) => b.contentCount - a.contentCount);

    // Project list
    const projects = [
      ...new Set(
        issues.nodes
          .map((issue) => issue.project?.name)
          .filter(Boolean) as string[]
      ),
    ];

    // Monthly growth
    const monthlyMap = new Map<
      string,
      { planned: number; completed: number }
    >();
    issues.nodes.forEach((issue) => {
      if (issue.dueDate) {
        const month = startOfMonth(parseISO(issue.dueDate)).toISOString();
        const current = monthlyMap.get(month) || { planned: 0, completed: 0 };
        current.planned++;
        if (issue.state?.type?.toLowerCase() === "completed") {
          current.completed++;
        }
        monthlyMap.set(month, current);
      }
    });
    const monthlyGrowth = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        ...data,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Upcoming content (due within next week)
    const upcomingContent = issues.nodes
      .filter(
        (issue) =>
          issue.dueDate &&
          isAfter(parseISO(issue.dueDate), today) &&
          isBefore(parseISO(issue.dueDate), nextWeek)
      )
      .map((issue) => ({
        id: issue.id,
        title: issue.title,
        status: issue.state?.name || "Unknown",
        dueDate: issue.dueDate,
        assignee: issue.assignee?.name || null,
        project: issue.project?.name || null,
      }));

    // Overdue content
    const overdueContent = issues.nodes
      .filter(
        (issue) =>
          issue.dueDate &&
          isBefore(parseISO(issue.dueDate), today) &&
          issue.state?.type?.toLowerCase() !== "completed"
      )
      .map((issue) => ({
        id: issue.id,
        title: issue.title,
        status: issue.state?.name || "Unknown",
        dueDate: issue.dueDate,
        assignee: issue.assignee?.name || null,
        project: issue.project?.name || null,
      }));

    return {
      total: totalIssues,
      completed: completedIssues,
      inProgress: inProgressIssues,
      backlog: backlogIssues,
      completionRate:
        totalIssues > 0 ? (completedIssues / totalIssues) * 100 : 0,
      authors,
      projects,
      monthlyGrowth,
      upcomingContent,
      overdueContent,
    };
  } catch (error) {
    console.error("Error fetching content metrics:", error);
    throw error;
  }
}

export async function getAggregateMetrics(): Promise<ContentMetrics> {
  try {
    // Get metrics from all workspaces in parallel
    const allMetrics = await Promise.all(
      WORKSPACES.map((workspace) => getContentMetrics(workspace.id))
    );

    // Combine metrics
    const aggregateMetrics = allMetrics.reduce(
      (acc, metrics) => {
        // Basic metrics
        acc.total += metrics.total;
        acc.completed += metrics.completed;
        acc.inProgress += metrics.inProgress;
        acc.backlog += metrics.backlog;

        // Combine authors
        metrics.authors.forEach((author) => {
          const existingAuthor = acc.authors.find((a) => a.id === author.id);
          if (existingAuthor) {
            existingAuthor.contentCount += author.contentCount;
          } else {
            acc.authors.push({ ...author });
          }
        });

        // Combine projects
        acc.projects = [...new Set([...acc.projects, ...metrics.projects])];

        // Combine monthly growth
        metrics.monthlyGrowth.forEach((monthly) => {
          const existing = acc.monthlyGrowth.find(
            (m) => m.month === monthly.month
          );
          if (existing) {
            existing.planned += monthly.planned;
            existing.completed += monthly.completed;
          } else {
            acc.monthlyGrowth.push({ ...monthly });
          }
        });

        // Combine upcoming and overdue content
        acc.upcomingContent.push(...metrics.upcomingContent);
        acc.overdueContent.push(...metrics.overdueContent);

        return acc;
      },
      {
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
      }
    );

    // Calculate overall completion rate
    aggregateMetrics.completionRate =
      aggregateMetrics.total > 0
        ? (aggregateMetrics.completed / aggregateMetrics.total) * 100
        : 0;

    // Sort combined data
    aggregateMetrics.authors.sort((a, b) => b.contentCount - a.contentCount);
    aggregateMetrics.monthlyGrowth.sort((a, b) =>
      a.month.localeCompare(b.month)
    );
    aggregateMetrics.upcomingContent.sort((a, b) =>
      a.dueDate && b.dueDate ? a.dueDate.localeCompare(b.dueDate) : 0
    );
    aggregateMetrics.overdueContent.sort((a, b) =>
      a.dueDate && b.dueDate ? b.dueDate.localeCompare(a.dueDate) : 0
    );

    return aggregateMetrics;
  } catch (error) {
    console.error("Error fetching aggregate metrics:", error);
    throw error;
  }
}
