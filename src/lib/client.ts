import { LinearClient } from "@linear/sdk";
import { addDays, startOfMonth, isAfter, isBefore, parseISO } from "date-fns";
import type { Issue, IssueConnection, TeamConnection } from "@linear/sdk";

// Map of workspace IDs to their API keys
const WORKSPACE_API_KEYS: Record<string, string> = {
  cloudinary: process.env.NEXT_PUBLIC_LINEAR_CLOUDINARY_API_KEY || "",
  coderabbit: process.env.NEXT_PUBLIC_LINEAR_CODERABBIT_API_KEY || "",
  jozu: process.env.NEXT_PUBLIC_LINEAR_JOZU_API_KEY || "",
  // flutterwave: process.env.NEXT_PUBLIC_LINEAR_FLUTTERWAVE_API_KEY || "",
  localazy: process.env.NEXT_PUBLIC_LINEAR_LOCALAZY_API_KEY || "",
  miaplatform: process.env.NEXT_PUBLIC_LINEAR_MIAPLATFORM_API_KEY || "",
  monogram: process.env.NEXT_PUBLIC_LINEAR_MONOGRAM_API_KEY || "",
  neon: process.env.NEXT_PUBLIC_LINEAR_NEON_API_KEY || "",
  novu: process.env.NEXT_PUBLIC_LINEAR_NOVU_API_KEY || "",
  nuvo: process.env.NEXT_PUBLIC_LINEAR_NUVO_API_KEY || "",
  roadmap: process.env.NEXT_PUBLIC_LINEAR_ROADMAP_API_KEY || "",
  simli: process.env.NEXT_PUBLIC_LINEAR_SIMLI_API_KEY || "",
  sourcegraph: process.env.NEXT_PUBLIC_SOURCEGRAPH_API_KEY || "",
  tns: process.env.NEXT_PUBLIC_LINEAR_TNS_API_KEY || "",
  // Add more workspaces as needed
};

console.log(
  "Available workspaces:",
  Object.keys(WORKSPACE_API_KEYS).filter((key) => WORKSPACE_API_KEYS[key])
);

// Map to store workspace-specific Linear clients
const clientsMap = new Map<string, LinearClient>();
const teamCache = new Map<string, string>();

// Add workflow states cache
const workflowStatesCache = new Map<string, any[]>();

async function getWorkflowStates(client: LinearClient, workspaceId: string) {
  if (workflowStatesCache.has(workspaceId)) {
    return workflowStatesCache.get(workspaceId)!;
  }

  const states = await client.workflowStates();
  workflowStatesCache.set(workspaceId, states.nodes);
  return states.nodes;
}

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

export const WORKSPACES = [
  { id: "all", name: "All Workspaces" },
  ...Object.keys(WORKSPACE_API_KEYS).map((id) => ({
    id,
    name: `Workspace - ${id}`,
  })),
];

async function getTeamId(workspaceId: string): Promise<string> {
  if (teamCache.has(workspaceId)) {
    return teamCache.get(workspaceId)!;
  }

  const client = getLinearClient(workspaceId);
  const teams = (await client.teams({
    first: 1,
  })) as TeamConnection;

  if (teams.nodes.length === 0) {
    throw new Error(`No teams found for workspace ${workspaceId}`);
  }

  const teamId = teams.nodes[0].id;
  teamCache.set(workspaceId, teamId);
  return teamId;
}

export interface Author {
  id: string;
  name: string;
  contentCount: number;
}

export interface ContentItem {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  assignee: string | null;
  project: string | null;
  workspace?: string;
}

export interface MonthlyContent {
  month: string;
  planned: number;
  completed: number;
}

export interface WorkflowStateCount {
  name: string;
  count: number;
}

export interface ContentMetrics {
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
  workflowStates: WorkflowStateCount[];
}

interface LinearIssue {
  id: string;
  title: string;
  state: {
    id: string;
    name: string;
    type: string;
  };
  dueDate: string | null;
  createdAt: string;
  startedAt: Date | null;
  completedAt: Date | null;
  canceledAt: Date | null;
  assignee?: {
    id: string;
    displayName: string;
  };
  project?: {
    id: string;
    name: string;
  };
}

export async function getContentMetrics(
  workspaceId: string
): Promise<ContentMetrics> {
  try {
    const client = getLinearClient(workspaceId);
    const teamId = await getTeamId(workspaceId);

    // Fetch states and issues in parallel
    const [states, issuesResponse] = await Promise.all([
      getWorkflowStates(client, workspaceId),
      client.issues({
        filter: {
          team: { id: { eq: teamId } },
        },
        first: 100,
        orderBy: "updatedAt",
        include: {
          assignee: true,
          state: true,
          project: true,
        },
      }) as Promise<IssueConnection>,
    ]);

    // Wait for all issue states and assignees to be resolved
    const issues = await Promise.all(
      issuesResponse.nodes.map(async (issue: any) => {
        const [state, assignee] = await Promise.all([
          issue.state,
          issue.assignee,
        ]);
        return {
          ...issue,
          state: state,
          assignee: assignee,
        };
      })
    );

    // Add debug logging
    console.log(
      "Resolved issues with states and assignees:",
      issues.map((i) => ({
        title: i.title,
        state: i.state?.name,
        assignee: i.assignee?.displayName,
      }))
    );

    // Map state types to our categories using the fetched states
    const getStateCategory = (state: any) => {
      if (!state) return "backlog";
      const name = state.name?.toLowerCase();

      // Map based on your Linear workflow states
      if (name === "published") {
        return "completed";
      }

      // Review states
      if (
        name === "editor review" ||
        name === "final review" ||
        name === "seo review" ||
        name === "grammar review" ||
        name === "author/peer review"
      ) {
        return "inProgress";
      }

      // Active states
      if (
        name === "in progress" ||
        name === "approved" ||
        name === "approved for publishing"
      ) {
        return "inProgress";
      }

      // Terminal states
      if (name === "duplicate" || name === "canceled") {
        return "canceled";
      }

      // Default states
      if (name === "backlog") {
        return "backlog";
      }

      // Log any unhandled states
      console.log("Unhandled state:", state.name);
      return "backlog";
    };

    // Add today and nextWeek variables back
    const today = new Date();
    const nextWeek = addDays(today, 7);
    const nextMonth = addDays(today, 30);

    // Calculate metrics with resolved states
    const totalIssues = issues.length;
    const completedIssues = issues.filter(
      (issue) => getStateCategory(issue.state) === "completed"
    ).length;
    const inProgressIssues = issues.filter(
      (issue) => getStateCategory(issue.state) === "inProgress"
    ).length;
    const backlogIssues = issues.filter(
      (issue) =>
        getStateCategory(issue.state) === "backlog" ||
        getStateCategory(issue.state) === "canceled"
    ).length;

    // Log state distribution for debugging
    console.log("State distribution:", {
      total: totalIssues,
      completed: completedIssues,
      inProgress: inProgressIssues,
      backlog: backlogIssues,
      stateCategories: issues.map((i) => ({
        name: i.state?.name,
        category: getStateCategory(i.state),
      })),
    });

    console.log(issues);

    // Map issues to content items - use resolved assignee
    const mapToContentItem = (
      issue: Issue,
      workspaceId: string
    ): ContentItem => ({
      id: issue.id,
      title: issue.title,
      status: issue.state?.name || "Unknown",
      dueDate: issue.dueDate,
      assignee: issue.assignee?.displayName || null,
      project: issue.project?.name || null,
      workspace: workspaceId,
    });

    // Calculate author metrics with resolved assignee data
    const authorMap = new Map<string, { count: number; name: string }>();
    issues.forEach((issue) => {
      if (issue.assignee?.displayName) {
        const name = issue.assignee.displayName;
        const current = authorMap.get(name) || { count: 0, name };
        current.count++;
        authorMap.set(name, current);
      }
    });

    const authors = Array.from(authorMap.values())
      .map(({ name, count }) => ({
        id: name,
        name,
        contentCount: count,
      }))
      .sort((a, b) => b.contentCount - a.contentCount);

    // Get unique projects
    const projects = [
      ...new Set(
        issues.map((issue) => issue.project?.name).filter(Boolean) as string[]
      ),
    ];

    // Calculate monthly growth based on creation date instead of due date
    const monthlyMap = new Map<
      string,
      { planned: number; completed: number }
    >();
    issues.forEach((issue) => {
      const createdAt = startOfMonth(new Date(issue.createdAt)).toISOString();
      const current = monthlyMap.get(createdAt) || { planned: 0, completed: 0 };
      current.planned++;
      if (issue.state?.name?.toLowerCase() === "published") {
        current.completed++;
      }
      monthlyMap.set(createdAt, current);
    });

    const monthlyGrowth = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        ...data,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Filter upcoming and overdue content
    const upcomingContent = issues
      .filter(
        (issue) =>
          issue.dueDate &&
          isAfter(parseISO(issue.dueDate), today) &&
          isBefore(parseISO(issue.dueDate), nextMonth) &&
          getStateCategory(issue.state) !== "completed"
      )
      .map((issue) => mapToContentItem(issue, workspaceId))
      .sort((a, b) =>
        a.dueDate && b.dueDate
          ? parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime()
          : 0
      );

    const overdueContent = issues
      .filter(
        (issue) =>
          issue.dueDate &&
          isBefore(parseISO(issue.dueDate), today) &&
          issue.state?.name !== "Published" &&
          issue.state?.name !== "Final Review"
      )
      .map((issue) => mapToContentItem(issue, workspaceId))
      .sort((a, b) =>
        a.dueDate && b.dueDate
          ? parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime()
          : 0
      );

    // Calculate workflow state counts
    const stateCountMap = new Map<string, number>();
    issues.forEach((issue) => {
      const stateName = issue.state?.name || "Unknown";
      stateCountMap.set(stateName, (stateCountMap.get(stateName) || 0) + 1);
    });

    const workflowStates = Array.from(stateCountMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

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
      workflowStates,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Rate limit exceeded")
    ) {
      console.error("Linear API rate limit reached. Please try again later.");
      throw new Error(
        "API rate limit reached. Please try again in a few minutes."
      );
    }
    throw error;
  }
}

export async function getAllWorkspacesMetrics(): Promise<ContentMetrics> {
  // Get all active workspace IDs
  const activeWorkspaces = Object.keys(WORKSPACE_API_KEYS).filter(
    (key) => WORKSPACE_API_KEYS[key]
  );

  // Fetch metrics for all workspaces in parallel
  const allMetrics = await Promise.all(
    activeWorkspaces.map((id) => getContentMetrics(id))
  );

  // Combine metrics
  return allMetrics.reduce(
    (combined, current) => ({
      total: combined.total + current.total,
      completed: combined.completed + current.completed,
      inProgress: combined.inProgress + current.inProgress,
      backlog: combined.backlog + current.backlog,
      completionRate:
        ((combined.completed + current.completed) /
          (combined.total + current.total)) *
        100,
      authors: mergeAuthors(combined.authors, current.authors),
      projects: [...new Set([...combined.projects, ...current.projects])],
      monthlyGrowth: mergeMontlyGrowth(
        combined.monthlyGrowth,
        current.monthlyGrowth
      ),
      upcomingContent: [
        ...combined.upcomingContent,
        ...current.upcomingContent,
      ],
      overdueContent: [...combined.overdueContent, ...current.overdueContent],
      workflowStates: mergeWorkflowStates(
        combined.workflowStates,
        current.workflowStates
      ),
    }),
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
      workflowStates: [],
    } as ContentMetrics
  );
}

// Helper functions for merging metrics
function mergeAuthors(a1: Author[], a2: Author[]): Author[] {
  const authorMap = new Map<string, number>();

  [...a1, ...a2].forEach((author) => {
    authorMap.set(
      author.name,
      (authorMap.get(author.name) || 0) + author.contentCount
    );
  });

  return Array.from(authorMap.entries())
    .map(([name, count]) => ({
      id: name,
      name,
      contentCount: count,
    }))
    .sort((a, b) => b.contentCount - a.contentCount);
}

function mergeMontlyGrowth(
  m1: MonthlyContent[],
  m2: MonthlyContent[]
): MonthlyContent[] {
  const monthMap = new Map<string, { planned: number; completed: number }>();

  [...m1, ...m2].forEach((item) => {
    const current = monthMap.get(item.month) || { planned: 0, completed: 0 };
    monthMap.set(item.month, {
      planned: current.planned + item.planned,
      completed: current.completed + item.completed,
    });
  });

  return Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      ...data,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function mergeWorkflowStates(
  w1: WorkflowStateCount[],
  w2: WorkflowStateCount[]
): WorkflowStateCount[] {
  const stateMap = new Map<string, number>();

  [...w1, ...w2].forEach((state) => {
    stateMap.set(state.name, (stateMap.get(state.name) || 0) + state.count);
  });

  return Array.from(stateMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
