import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeveloperConsolePage from './DeveloperConsolePage';
import { AuthContext } from '../../contexts/AuthContext';
import apiClient from '../../services/apiClient';

// Mock apiClient
jest.mock('../../services/apiClient');

const mockDeveloperTools = [
  {
    tool_id: 'dev_tool_1',
    name: 'My Test Dify App',
    description: 'A Dify application for testing.',
    type: 'http',
    provider: 'devuser',
    isDeveloperTool: true,
    status: 'enabled',
    endpoint: {
      url: 'https://dify.example.com/api/test-app-1',
      method: 'POST',
      platform_type: 'dify',
      authentication: { type: 'bearer', token: 'test-dify-token' },
      dify_config: { user_query_variable: 'query', fixed_inputs: {} }
    },
    created_at: '2024-05-20T10:00:00Z',
  },
  {
    tool_id: 'dev_tool_2',
    name: 'My Test Coze Bot',
    description: 'A Coze bot for testing.',
    type: 'http',
    provider: 'devuser',
    isDeveloperTool: true,
    status: 'disabled',
    endpoint: {
      url: 'https://coze.example.com/api/test-bot-1',
      method: 'POST',
      platform_type: 'coze',
      authentication: { type: 'api_key', key_name: 'Authorization', api_key: 'Bearer test-coze-key' },
      coze_config: { bot_id: 'test-coze-bot-id', user_query_variable: 'query' }
    },
    created_at: '2024-05-19T11:00:00Z',
  },
];

const developerUserProps = {
  user: { id: 2, username: 'devuser', role: 'developer' },
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  loading: false,
};

// Helper function to render the component with AuthContext provider
const renderWithAuth = (ui, { providerProps, ...renderOptions }) => {
  return render(
    <AuthContext.Provider value={providerProps}>{ui}</AuthContext.Provider>,
    renderOptions
  );
};

describe('DeveloperConsolePage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    apiClient.get.mockReset();
    apiClient.put.mockReset();
    apiClient.delete.mockReset();
    // Mock window.confirm for delete operations
    window.confirm = jest.fn(() => true); 
  });

  test('renders access restricted message if user is not a developer', () => {
    const providerProps = {
      user: { id: 1, username: 'testuser', role: 'user' },
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      loading: false,
    };
    renderWithAuth(<DeveloperConsolePage />, { providerProps });
    expect(screen.getByText('访问受限')).toBeInTheDocument();
    expect(screen.getByText('您需要以开发者身份登录才能访问此页面。')).toBeInTheDocument();
  });

  test('renders access restricted message if user is not authenticated', () => {
    const providerProps = {
      user: null,
      isAuthenticated: false,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      loading: false,
    };
    renderWithAuth(<DeveloperConsolePage />, { providerProps });
    expect(screen.getByText('访问受限')).toBeInTheDocument();
  });

  describe('when user is a developer', () => {
    test('shows loading state initially then displays tools', async () => {
      apiClient.get.mockResolvedValueOnce({ data: { tools: mockDeveloperTools } });
      renderWithAuth(<DeveloperConsolePage />, { providerProps: developerUserProps });

      expect(screen.getByText('正在加载工具...')).toBeInTheDocument();
      
      expect(await screen.findByText('My Test Dify App')).toBeInTheDocument();
      expect(screen.getByText('My Test Coze Bot')).toBeInTheDocument();
      expect(apiClient.get).toHaveBeenCalledWith('/api/dev/tools');
      expect(apiClient.get).toHaveBeenCalledTimes(1);
      // Check for status displays
      expect(screen.getByText('已启用')).toBeInTheDocument();
      expect(screen.getByText('已禁用')).toBeInTheDocument();
    });

    test('displays empty message if no tools are fetched', async () => {
      apiClient.get.mockResolvedValueOnce({ data: { tools: [] } });
      renderWithAuth(<DeveloperConsolePage />, { providerProps: developerUserProps });

      expect(await screen.findByText('您还没有上传任何工具。')).toBeInTheDocument();
    });

    test('displays error message if fetching tools fails', async () => {
      apiClient.get.mockRejectedValueOnce(new Error('API Error'));
      renderWithAuth(<DeveloperConsolePage />, { providerProps: developerUserProps });

      expect(await screen.findByText('无法加载您的工具，请稍后再试。')).toBeInTheDocument();
    });

    test('handles tool status toggle successfully', async () => {
      apiClient.get.mockResolvedValueOnce({ data: { tools: [mockDeveloperTools[0]] } }); // Load only one tool for simplicity
      apiClient.put.mockResolvedValueOnce({ data: { ...mockDeveloperTools[0], status: 'disabled' } });
      
      renderWithAuth(<DeveloperConsolePage />, { providerProps: developerUserProps });

      const initialToolName = mockDeveloperTools[0].name;
      expect(await screen.findByText(initialToolName)).toBeInTheDocument();
      // Initial status is 'enabled', so button should say '禁用'
      const toggleButton = screen.getByRole('button', { name: '禁用' });
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledWith(`/api/dev/tools/${mockDeveloperTools[0].tool_id}`, { status: 'disabled' });
      });
      // After click, status should be 'disabled', and button text '启用'
      expect(await screen.findByText('已禁用')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '启用' })).toBeInTheDocument();
    });

    test('handles tool deletion successfully', async () => {
      apiClient.get.mockResolvedValueOnce({ data: { tools: mockDeveloperTools } });
      apiClient.delete.mockResolvedValueOnce({}); // Successful delete returns 204 or empty object
      
      renderWithAuth(<DeveloperConsolePage />, { providerProps: developerUserProps });

      const toolNameToDelete = mockDeveloperTools[1].name;
      expect(await screen.findByText(toolNameToDelete)).toBeInTheDocument();
      
      // Find delete button associated with the second tool
      // Assuming order is preserved and each item has 3 buttons: Edit, Toggle, Delete
      const deleteButtons = screen.getAllByRole('button', { name: '删除' });
      fireEvent.click(deleteButtons[1]); // Click the delete button for the second tool

      expect(window.confirm).toHaveBeenCalledWith('您确定要删除这个工具吗？此操作无法撤销。');
      
      await waitFor(() => {
        expect(apiClient.delete).toHaveBeenCalledWith(`/api/dev/tools/${mockDeveloperTools[1].tool_id}`);
      });

      // Wait for the UI to update and the element to be removed
      await waitFor(() => {
        expect(screen.queryByText(toolNameToDelete)).not.toBeInTheDocument();
      });

      // Ensure the other tool is still present
      expect(screen.getByText(mockDeveloperTools[0].name)).toBeInTheDocument();
    });

    test('Add New Tool button is present', async () => {
      apiClient.get.mockResolvedValueOnce({ data: { tools: [] } });
      renderWithAuth(<DeveloperConsolePage />, { providerProps: developerUserProps });
      expect(await screen.findByRole('button', { name: '+ 添加新工具' })).toBeInTheDocument();
    });
  });
}); 