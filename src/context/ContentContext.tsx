import {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useCallback,
} from "react";
import { ContentMetrics, WORKSPACES, getContentMetrics } from "@/lib/client";

// Add refresh interval constant (1 hour in milliseconds)
const REFRESH_INTERVAL = 60 * 60 * 1000;

interface ContentState {
  selectedWorkspace: string | null;
  metrics: ContentMetrics | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

type ContentAction =
  | { type: "SET_SELECTED_WORKSPACE"; payload: string }
  | { type: "SET_METRICS"; payload: ContentMetrics }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_LAST_UPDATED"; payload: number }
  | { type: "CLEAR_CONTENT_DATA" };

const initialState: ContentState = {
  selectedWorkspace: WORKSPACES[0]?.id || null,
  metrics: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

const contentReducer = (
  state: ContentState,
  action: ContentAction
): ContentState => {
  switch (action.type) {
    case "SET_SELECTED_WORKSPACE":
      return {
        ...state,
        selectedWorkspace: action.payload,
        metrics: null,
        lastUpdated: null,
      };
    case "SET_METRICS":
      return {
        ...state,
        metrics: action.payload,
        lastUpdated: Date.now(),
        error: null,
      };
    case "SET_LOADING":
      return {
        ...state,
        loading: action.payload,
      };
    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    case "SET_LAST_UPDATED":
      return {
        ...state,
        lastUpdated: action.payload,
      };
    case "CLEAR_CONTENT_DATA":
      return {
        ...state,
        metrics: null,
        lastUpdated: null,
      };
    default:
      return state;
  }
};

interface ContentContextValue {
  state: ContentState;
  dispatch: React.Dispatch<ContentAction>;
  refreshMetrics: (force?: boolean) => Promise<void>;
}

const ContentContext = createContext<ContentContextValue | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(contentReducer, initialState);

  const refreshMetrics = useCallback(
    async (force = false) => {
      const { selectedWorkspace, lastUpdated } = state;

      if (!selectedWorkspace) return;

      // Only check cache if we have metrics and not forcing refresh
      const now = Date.now();
      if (
        !force &&
        lastUpdated &&
        state.metrics &&
        now - lastUpdated < REFRESH_INTERVAL
      ) {
        return;
      }

      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const data = await getContentMetrics(selectedWorkspace);
        dispatch({ type: "SET_METRICS", payload: data });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch metrics";

        // Only set error for rate limits, ignore other errors
        if (message.includes("rate limit")) {
          dispatch({
            type: "SET_ERROR",
            payload: message,
          });
          // Set a longer cache time
          dispatch({
            type: "SET_LAST_UPDATED",
            payload: Date.now() + 60 * 60 * 1000, // Add 1 hour
          });
        }
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [state.selectedWorkspace, state.lastUpdated, state.metrics]
  );

  return (
    <ContentContext.Provider value={{ state, dispatch, refreshMetrics }}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent() {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error("useContent must be used within a ContentProvider");
  }
  return context;
}
