/**
 * 工具管理状态管理
 */

// 初始状态
export const initialToolsState = {
  availableTools: [],
  selectedTool: null,
  executingTool: null,
  toolResults: {},
  toolHistory: [],
  loading: false,
  error: null,
  filters: {
    category: 'all',
    search: '',
    favorites: false,
  },
  favorites: [],
  recentTools: [],
};

// Action Types
export const TOOLS_ACTIONS = {
  FETCH_TOOLS_START: 'TOOLS/FETCH_TOOLS_START',
  FETCH_TOOLS_SUCCESS: 'TOOLS/FETCH_TOOLS_SUCCESS',
  FETCH_TOOLS_FAILURE: 'TOOLS/FETCH_TOOLS_FAILURE',
  SELECT_TOOL: 'TOOLS/SELECT_TOOL',
  EXECUTE_TOOL_START: 'TOOLS/EXECUTE_TOOL_START',
  EXECUTE_TOOL_SUCCESS: 'TOOLS/EXECUTE_TOOL_SUCCESS',
  EXECUTE_TOOL_FAILURE: 'TOOLS/EXECUTE_TOOL_FAILURE',
  ADD_TO_HISTORY: 'TOOLS/ADD_TO_HISTORY',
  CLEAR_HISTORY: 'TOOLS/CLEAR_HISTORY',
  UPDATE_FILTERS: 'TOOLS/UPDATE_FILTERS',
  ADD_TO_FAVORITES: 'TOOLS/ADD_TO_FAVORITES',
  REMOVE_FROM_FAVORITES: 'TOOLS/REMOVE_FROM_FAVORITES',
  ADD_TO_RECENT: 'TOOLS/ADD_TO_RECENT',
  CLEAR_ERROR: 'TOOLS/CLEAR_ERROR',
  RESET_TOOL_STATE: 'TOOLS/RESET_TOOL_STATE',
};

// Reducer
export const toolsReducer = (state = initialToolsState, action) => {
  switch (action.type) {
    case TOOLS_ACTIONS.FETCH_TOOLS_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case TOOLS_ACTIONS.FETCH_TOOLS_SUCCESS:
      return {
        ...state,
        availableTools: action.payload.tools,
        loading: false,
        error: null,
      };

    case TOOLS_ACTIONS.FETCH_TOOLS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload.error,
      };

    case TOOLS_ACTIONS.SELECT_TOOL:
      return {
        ...state,
        selectedTool: action.payload.tool,
      };

    case TOOLS_ACTIONS.EXECUTE_TOOL_START:
      return {
        ...state,
        executingTool: action.payload.tool,
        error: null,
      };

    case TOOLS_ACTIONS.EXECUTE_TOOL_SUCCESS:
      const { toolId, result } = action.payload;
      return {
        ...state,
        executingTool: null,
        toolResults: {
          ...state.toolResults,
          [toolId]: result,
        },
      };

    case TOOLS_ACTIONS.EXECUTE_TOOL_FAILURE:
      return {
        ...state,
        executingTool: null,
        error: action.payload.error,
      };

    case TOOLS_ACTIONS.ADD_TO_HISTORY:
      const historyItem = action.payload.item;
      return {
        ...state,
        toolHistory: [historyItem, ...state.toolHistory.slice(0, 49)], // 保留最近50条
      };

    case TOOLS_ACTIONS.CLEAR_HISTORY:
      return {
        ...state,
        toolHistory: [],
      };

    case TOOLS_ACTIONS.UPDATE_FILTERS:
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload.filters,
        },
      };

    case TOOLS_ACTIONS.ADD_TO_FAVORITES:
      const toolToAdd = action.payload.toolId;
      return {
        ...state,
        favorites: [...new Set([...state.favorites, toolToAdd])],
      };

    case TOOLS_ACTIONS.REMOVE_FROM_FAVORITES:
      const toolToRemove = action.payload.toolId;
      return {
        ...state,
        favorites: state.favorites.filter(id => id !== toolToRemove),
      };

    case TOOLS_ACTIONS.ADD_TO_RECENT:
      const recentTool = action.payload.toolId;
      const updatedRecent = [recentTool, ...state.recentTools.filter(id => id !== recentTool)].slice(0, 10);
      return {
        ...state,
        recentTools: updatedRecent,
      };

    case TOOLS_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case TOOLS_ACTIONS.RESET_TOOL_STATE:
      return {
        ...initialToolsState,
        favorites: state.favorites, // 保留收藏
        recentTools: state.recentTools, // 保留最近使用
      };

    default:
      return state;
  }
};