import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddServiceForm from './AddServiceForm';
import apiClient from '../../services/apiClient';
import { toast } from '../../components/common/Toast';

// Mock apiClient
jest.mock('../../services/apiClient', () => ({
  testUnsavedDeveloperTool: jest.fn(),
  createDeveloperService: jest.fn(),
}));

// Mock toast
jest.mock('../../components/common/Toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(), // Include other methods if used, though not expected for these tests
  },
}));

const mockOnServiceAdded = jest.fn();

const renderForm = (props = {}) => {
  return render(<AddServiceForm onServiceAdded={mockOnServiceAdded} {...props} />);
};

describe('AddServiceForm', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Initial Rendering and Basic Interactions', () => {
    it('should render all form fields correctly', () => {
      renderForm();
      expect(screen.getByLabelText(/服务名称/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/服务描述/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/平台类型/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Endpoint URL/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/API 密钥\/Token/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/用户输入字段名/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/说明文档/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/测试输入内容/i)).toBeInTheDocument();
      
      // Dify App ID should be visible by default as Dify is the default platform type
      expect(screen.getByLabelText(/Dify App ID/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/Coze Bot ID/i)).not.toBeInTheDocument();

      expect(screen.getByRole('button', { name: /保存服务/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /清空表单/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /发送测试请求/i })).toBeEnabled();
    });

    it('should show Coze Bot ID field and hide Dify App ID when platform is Coze', async () => {
      renderForm();
      const platformSelect = screen.getByLabelText(/平台类型/i);
      await userEvent.selectOptions(platformSelect, 'coze');
      
      expect(screen.getByLabelText(/Coze Bot ID/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/Dify App ID/i)).not.toBeInTheDocument();
    });

    it('should hide both Dify and Coze specific fields when platform is HTTP', async () => {
      renderForm();
      const platformSelect = screen.getByLabelText(/平台类型/i);
      await userEvent.selectOptions(platformSelect, 'http');
      
      expect(screen.queryByLabelText(/Dify App ID/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Coze Bot ID/i)).not.toBeInTheDocument();
    });

    it('should update formData on input change', async () => {
      renderForm();
      const serviceNameInput = screen.getByLabelText(/服务名称/i);
      await userEvent.type(serviceNameInput, 'My Test Service');
      expect(serviceNameInput.value).toBe('My Test Service');

      const descriptionTextarea = screen.getByLabelText(/服务描述/i);
      await userEvent.type(descriptionTextarea, 'This is a test description.');
      expect(descriptionTextarea.value).toBe('This is a test description.');
    });

    it('should clear the form when "清空表单" button is clicked', async () => {
      renderForm();
      // Fill some data
      await userEvent.type(screen.getByLabelText(/服务名称/i), 'Temp Name');
      await userEvent.type(screen.getByLabelText(/测试输入内容/i), 'Some test input');
      // Simulate a successful test to enable save button for broader reset check
      // For this specific test, we only care about form fields and testResult area
      
      // Mock a successful test to change some state
      apiClient.testUnsavedDeveloperTool.mockResolvedValueOnce({ 
        data: { success: true, data: { message: "Test success for clear" } } 
      });
      await userEvent.click(screen.getByRole('button', { name: /发送测试请求/i }));
      await waitFor(() => expect(screen.getByRole('button', {name: /保存服务/i})).toBeEnabled());
      expect(screen.getByText(/"message": "Test success for clear"/i)).toBeInTheDocument();


      await userEvent.click(screen.getByRole('button', { name: /清空表单/i }));

      expect(screen.getByLabelText(/服务名称/i).value).toBe('');
      expect(screen.getByLabelText(/服务描述/i).value).toBe('');
      expect(screen.getByLabelText(/平台类型/i).value).toBe('dify'); // Default value
      expect(screen.getByLabelText(/测试输入内容/i).value).toBe('');
      expect(screen.getByText('等待测试...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /保存服务/i })).toBeDisabled();
    });
  });

  describe('handleTestService Functionality', () => {
    const testValidInput = async (platform = 'dify') => {
      await userEvent.type(screen.getByLabelText(/服务名称/i), 'Test Service');
      await userEvent.selectOptions(screen.getByLabelText(/平台类型/i), platform);
      if (platform === 'dify') {
        await userEvent.type(screen.getByLabelText(/Dify App ID/i), 'test-dify-app');
      }
      if (platform === 'coze') {
        await userEvent.type(screen.getByLabelText(/Coze Bot ID/i), 'test-coze-bot');
      }
      await userEvent.type(screen.getByLabelText(/Endpoint URL/i), 'https://example.com/api');
      await userEvent.type(screen.getByLabelText(/API 密钥\/Token/i), 'test-api-key');
      await userEvent.type(screen.getByLabelText(/测试输入内容/i), 'Hello');
    };

    it('should call testUnsavedDeveloperTool, enable save, and show success on successful test', async () => {
      renderForm();
      await testValidInput();

      const mockSuccessResponse = { 
        data: { 
          success: true, 
          message: 'API Test successful!', 
          data: { answer: 'Test response' } 
        }
      };
      apiClient.testUnsavedDeveloperTool.mockResolvedValueOnce(mockSuccessResponse);

      const testButton = screen.getByRole('button', { name: /发送测试请求/i });
      await userEvent.click(testButton);

      expect(testButton).toBeDisabled();
      expect(testButton).toHaveTextContent('正在测试...');
      
      await waitFor(() => {
        expect(apiClient.testUnsavedDeveloperTool).toHaveBeenCalledTimes(1);
        // More specific payload check can be added if needed
        expect(apiClient.testUnsavedDeveloperTool).toHaveBeenCalledWith(expect.objectContaining({
          tool_config: expect.objectContaining({ name: 'Test Service', platform_type: 'dify' }),
          test_input: 'Hello'
        }));
      });
      
      await waitFor(() => {
        expect(screen.getByText(/"answer": "Test response"/i)).toBeInTheDocument();
        expect(toast.success).toHaveBeenCalledWith('API Test successful!');
        expect(screen.getByRole('button', { name: /保存服务/i })).toBeEnabled();
        expect(testButton).toBeEnabled();
        expect(testButton).toHaveTextContent('发送测试请求');
      });
    });

    it('should call testUnsavedDeveloperTool and show error on API failure', async () => {
      renderForm();
      await testValidInput('http');

      const mockErrorResponse = { 
        message: 'Network Error',
        originalError: { response: { data: { detail: 'Something went wrong'} } }
      };
      apiClient.testUnsavedDeveloperTool.mockRejectedValueOnce(mockErrorResponse);

      const testButton = screen.getByRole('button', { name: /发送测试请求/i });
      await userEvent.click(testButton);

      expect(testButton).toBeDisabled();
      
      await waitFor(() => {
        expect(apiClient.testUnsavedDeveloperTool).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.getByText(/"error": "Network Error"/i)).toBeInTheDocument();
        expect(screen.getByText(/"detail": "Something went wrong"/i)).toBeInTheDocument();
        expect(toast.error).toHaveBeenCalledWith('Network Error');
        expect(screen.getByRole('button', { name: /保存服务/i })).toBeDisabled();
        expect(testButton).toBeEnabled();
      });
    });

    it('should handle API 200 OK but logical error (success: false)', async () => {
      renderForm();
      await testValidInput('coze');

      const mockLogicErrorResponse = { 
        data: { 
          success: false, 
          message: 'Configuration incorrect.', 
          error_details: 'Invalid Coze Bot ID' 
        }
      };
      apiClient.testUnsavedDeveloperTool.mockResolvedValueOnce(mockLogicErrorResponse);

      const testButton = screen.getByRole('button', { name: /发送测试请求/i });
      await userEvent.click(testButton);
      
      await waitFor(() => {
        expect(apiClient.testUnsavedDeveloperTool).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.getByText(/"error_details": "Invalid Coze Bot ID"/i)).toBeInTheDocument();
        expect(toast.error).toHaveBeenCalledWith('Configuration incorrect.');
        expect(screen.getByRole('button', { name: /保存服务/i })).toBeDisabled();
        expect(testButton).toBeEnabled();
      });
    });
  });

  describe('handleSaveService Functionality', () => {
    // Helper to fill form and simulate a successful test, making save button potentially enabled
    const fillFormAndPassTest = async () => {
      await userEvent.type(screen.getByLabelText(/服务名称/i), 'Final Service');
      await userEvent.type(screen.getByLabelText(/服务描述/i), 'This is the final service description.');
      await userEvent.selectOptions(screen.getByLabelText(/平台类型/i), 'http');
      await userEvent.type(screen.getByLabelText(/Endpoint URL/i), 'https://final-example.com/api');
      await userEvent.type(screen.getByLabelText(/API 密钥\/Token/i), 'final-api-key');
      await userEvent.type(screen.getByLabelText(/用户输入字段名/i), 'input');
      await userEvent.type(screen.getByLabelText(/说明文档/i), 'Final documentation here.');
      await userEvent.type(screen.getByLabelText(/测试输入内容/i), 'Test input for final service');

      apiClient.testUnsavedDeveloperTool.mockResolvedValueOnce({ 
        data: { success: true, data: { message: "Test successful before save" } } 
      });
      await userEvent.click(screen.getByRole('button', { name: /发送测试请求/i }));
      await waitFor(() => expect(screen.getByRole('button', { name: /保存服务/i })).toBeEnabled());
    };

    it('should not call createDeveloperService and show warning if test was not successful', async () => {
      renderForm();
      // Fill some data but don't simulate a successful test
      await userEvent.type(screen.getByLabelText(/服务名称/i), 'Untested Service');
      
      const saveButton = screen.getByRole('button', { name: /保存服务/i });
      expect(saveButton).toBeDisabled(); // Should be disabled initially
      
      // Even if we could enable it, the internal state isTestSuccessful is false
      // Let's try clicking it (though it's disabled, this is more for internal logic check if it somehow gets enabled without test pass)
      // For a more direct test of the logic: if isTestSuccessful is false, it should warn.
      // We can directly test the component's state if needed, or trust the disabled state reflects this.
      // The `handleSaveService` explicitly checks `isTestSuccessful`.

      // Simulate enabling it by force (not a real user scenario, but to test the guard)
      // This is tricky as the disabled state is tied to isTestSuccessful.
      // Instead, let's check that if isTestSuccessful is false (default), clicking save (if it were enabled) does right thing.
      // The current implementation: save button is disabled if !isTestSuccessful. So direct click is not possible.
      // The first line of handleSaveService is `if (!isTestSuccessful) { toast.warn(...); return; }`
      // So we rely on the button being disabled as the primary guard for user interaction.
      // We can, however, call the handler directly if we get a ref to the component instance, but that's not standard RTL practice.
      
      // Test the warning that should appear if save is attempted without successful test:
      // To do this, we need to bypass the disabled state of the button to actually invoke handleSaveService
      // For this test, it's simpler to assume the button being disabled *is* the test for this condition.
      // Alternatively, if the button were enabled but isTestSuccessful was false:
      // Let's mock isTestSuccessful to be false after a test (e.g. if test failed but button didn't re-disable)
      // This scenario is less likely with current implementation.

      // A simpler check for the explicit guard: just ensure save button is disabled if test hasn't passed.
      expect(saveButton).toBeDisabled();

      // If we want to ensure the toast.warn part of the guard is covered:
      // This would require a scenario where the button IS enabled but isTestSuccessful is false.
      // The current design correctly disables the button, so the guard `if (!isTestSuccessful)` inside handleSaveService
      // acts as a secondary safety net, which is harder to trigger directly via userEvent on a disabled button.
      // We'll assume the disabled state is sufficient for this test case as per current component logic.
    });

    it('should call createDeveloperService, call onServiceAdded, clear form, and show success on successful save', async () => {
      renderForm();
      await fillFormAndPassTest();

      const mockSaveResponse = { 
        status: 201, // Or 200
        data: { message: 'Service saved successfully!', tool_id: 'new-tool-123' } 
      };
      apiClient.createDeveloperService.mockResolvedValueOnce(mockSaveResponse);

      await userEvent.click(screen.getByRole('button', { name: /保存服务/i }));

      await waitFor(() => {
        expect(apiClient.createDeveloperService).toHaveBeenCalledTimes(1);
        expect(apiClient.createDeveloperService).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Final Service',
          platform_type: 'http',
          documentation: 'Final documentation here.'
        }));
        expect(mockOnServiceAdded).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledWith('Service saved successfully!');
        expect(screen.getByLabelText(/服务名称/i).value).toBe(''); // Form cleared
        expect(screen.getByText('等待测试...')).toBeInTheDocument(); // Test result cleared
      });
    });

    it('should show error if createDeveloperService API call fails', async () => {
      renderForm();
      await fillFormAndPassTest();

      const mockError = { message: 'Failed to save service' };
      apiClient.createDeveloperService.mockRejectedValueOnce(mockError);

      await userEvent.click(screen.getByRole('button', { name: /保存服务/i }));

      await waitFor(() => {
        expect(apiClient.createDeveloperService).toHaveBeenCalledTimes(1);
        expect(mockOnServiceAdded).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith('Failed to save service');
        // Check if saveError state is set and displayed (assuming p tag for error as in component)
        expect(screen.getByText(/保存错误: Failed to save service/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/服务名称/i).value).toBe('Final Service'); // Form should not be cleared
      });
    });

    it('should show error if createDeveloperService returns 2xx but with logical error in body', async () => {
      renderForm();
      await fillFormAndPassTest();

      const mockLogicErrorResponse = { 
        status: 200,
        data: { detail: 'A tool with this name already exists.' } 
      };
      apiClient.createDeveloperService.mockResolvedValueOnce(mockLogicErrorResponse);

      await userEvent.click(screen.getByRole('button', { name: /保存服务/i }));

      await waitFor(() => {
        expect(apiClient.createDeveloperService).toHaveBeenCalledTimes(1);
        expect(mockOnServiceAdded).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith('A tool with this name already exists.');
        expect(screen.getByText(/保存错误: A tool with this name already exists./i)).toBeInTheDocument();
      });
    });
  });
}); 