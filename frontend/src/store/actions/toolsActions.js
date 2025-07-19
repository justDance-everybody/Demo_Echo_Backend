/**
 * 工具管理相关的Action Creators
 */

import { TOOLS_ACTIONS } from '../reducers/toolsReducer';

// 工具获取相关actions
export const fetchToolsStart = () => ({
  type: TOOLS_ACTIONS.FETCH_TOOLS_START,
});

export const fetchToolsSuccess = (tools) => ({
  type: TOOLS_ACTIONS.FETCH_TOOLS_SUCCESS,
  payload: { tools },
});

export const fetchToolsFailure = (error) => ({
  type: TOOLS_ACTIONS.FETCH_TOOLS_FAILURE,
  payload: { error },
});

// 工具选择和执行actions
export const selectTool = (tool) => ({
  type: TOOLS_ACTIONS.SELECT_TOOL,
  payload: { tool },
});

export const executeToolStart = (tool) => ({
  type: TOOLS_ACTIONS.EXECUTE_TOOL_START,
  payload: { tool },
});

export const executeToolSuccess = (toolId, result) => ({
  type: TOOLS_ACTIONS.EXECUTE_TOOL_SUCCESS,
  payload: { toolId, result },
});

export const executeToolFailure = (error) => ({
  type: TOOLS_ACTIONS.EXECUTE_TOOL_FAILURE,
  payload: { error },
});

// 历史记录actions
export const addToHistory = (item) => ({
  type: TOOLS_ACTIONS.ADD_TO_HISTORY,
  payload: { item },
});

export const clearHistory = () => ({
  type: TOOLS_ACTIONS.CLEAR_HISTORY,
});

// 过滤器actions
export const updateFilters = (filters) => ({
  type: TOOLS_ACTIONS.UPDATE_FILTERS,
  payload: { filters },
});

// 收藏actions
export const addToFavorites = (toolId) => ({
  type: TOOLS_ACTIONS.ADD_TO_FAVORITES,
  payload: { toolId },
});

export const removeFromFavorites = (toolId) => ({
  type: TOOLS_ACTIONS.REMOVE_FROM_FAVORITES,
  payload: { toolId },
});

// 最近使用actions
export const addToRecent = (toolId) => ({
  type: TOOLS_ACTIONS.ADD_TO_RECENT,
  payload: { toolId },
});

// 错误处理actions
export const clearToolsError = () => ({
  type: TOOLS_ACTIONS.CLEAR_ERROR,
});

export const resetToolState = () => ({
  type: TOOLS_ACTIONS.RESET_TOOL_STATE,
});

// 复合actions（异步操作）
export const fetchAvailableTools = () => async (dispatch, getState, { toolsService }) => {
  try {
    dispatch(fetchToolsStart());
    const tools = await toolsService.getAvailableTools();
    dispatch(fetchToolsSuccess(tools));
    return { success: true, tools };
  } catch (error) {
    dispatch(fetchToolsFailure(error.message));
    return { success: false, error: error.message };
  }
};

export const executeTool = (tool, parameters) => async (dispatch, getState, { toolsService }) => {
  try {
    dispatch(executeToolStart(tool));
    
    // 添加到最近使用
    dispatch(addToRecent(tool.id));
    
    // 执行工具
    const result = await toolsService.executeTool(tool.id, parameters);
    
    // 保存结果
    dispatch(executeToolSuccess(tool.id, result));
    
    // 添加到历史记录
    const historyItem = {
      toolId: tool.id,
      toolName: tool.name,
      parameters,
      result,
      timestamp: new Date().toISOString(),
      success: true,
    };
    dispatch(addToHistory(historyItem));
    
    return { success: true, result };
  } catch (error) {
    dispatch(executeToolFailure(error.message));
    
    // 添加失败记录到历史
    const historyItem = {
      toolId: tool.id,
      toolName: tool.name,
      parameters,
      error: error.message,
      timestamp: new Date().toISOString(),
      success: false,
    };
    dispatch(addToHistory(historyItem));
    
    return { success: false, error: error.message };
  }
};

export const searchTools = (query) => async (dispatch, getState, { toolsService }) => {
  try {
    dispatch(fetchToolsStart());
    const tools = await toolsService.searchTools(query);
    dispatch(fetchToolsSuccess(tools));
    return { success: true, tools };
  } catch (error) {
    dispatch(fetchToolsFailure(error.message));
    return { success: false, error: error.message };
  }
};

export const getToolsByCategory = (category) => async (dispatch, getState, { toolsService }) => {
  try {
    dispatch(fetchToolsStart());
    const tools = await toolsService.getToolsByCategory(category);
    dispatch(fetchToolsSuccess(tools));
    return { success: true, tools };
  } catch (error) {
    dispatch(fetchToolsFailure(error.message));
    return { success: false, error: error.message };
  }
};

export const toggleFavorite = (toolId) => (dispatch, getState) => {
  const state = getState();
  const isFavorite = state.tools.favorites.includes(toolId);
  
  if (isFavorite) {
    dispatch(removeFromFavorites(toolId));
  } else {
    dispatch(addToFavorites(toolId));
  }
  
  return !isFavorite;
};