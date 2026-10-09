import React, { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../services/apiClient';

// 创建用户配置上下文
const UserConfigContext = createContext(null);

/**
 * 用户配置上下文提供者组件
 */
export const UserConfigProvider = ({ children }) => {
  // 用户联系人列表
  const [contacts, setContacts] = useState([]);
  
  // 用户钱包信息
  const [wallets, setWallets] = useState([]);
  
  // 是否正在加载
  const [isLoading, setIsLoading] = useState(false);
  
  // 错误信息
  const [error, setError] = useState(null);
  
  // 当用户ID变化时获取配置
  const loadUserConfig = async (userId) => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const config = await apiClient.getUserConfig(userId);
      
      if (config) {
        setContacts(config.contacts || []);
        setWallets(config.wallets || []);
      }
    } catch (err) {
      console.error('加载用户配置失败:', err);
      setError('无法加载用户配置，请重试');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * 添加联系人
   * @param {Object} contact - 联系人对象
   */
  const addContact = async (contact, userId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 添加到本地状态
      const updatedContacts = [...contacts, contact];
      setContacts(updatedContacts);
      
      // 如果有用户ID，同步到服务器
      if (userId) {
        await apiClient.updateUserConfig(userId, {
          contacts: updatedContacts,
          wallets
        });
      }
    } catch (err) {
      console.error('添加联系人失败:', err);
      setError('添加联系人失败，请重试');
      // 恢复原始状态
      setContacts(contacts);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * 更新联系人
   * @param {string} id - 联系人ID
   * @param {Object} updatedContact - 更新后的联系人对象
   */
  const updateContact = async (id, updatedContact, userId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 更新本地状态
      const updatedContacts = contacts.map(contact => 
        contact.id === id ? { ...contact, ...updatedContact } : contact
      );
      setContacts(updatedContacts);
      
      // 如果有用户ID，同步到服务器
      if (userId) {
        await apiClient.updateUserConfig(userId, {
          contacts: updatedContacts,
          wallets
        });
      }
    } catch (err) {
      console.error('更新联系人失败:', err);
      setError('更新联系人失败，请重试');
      // 恢复原始状态
      setContacts(contacts);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * 删除联系人
   * @param {string} id - 联系人ID
   */
  const deleteContact = async (id, userId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 保存之前的状态以便恢复
      const previousContacts = [...contacts];
      
      // 更新本地状态
      const updatedContacts = contacts.filter(contact => contact.id !== id);
      setContacts(updatedContacts);
      
      // 如果有用户ID，同步到服务器
      if (userId) {
        await apiClient.updateUserConfig(userId, {
          contacts: updatedContacts,
          wallets
        });
      }
    } catch (err) {
      console.error('删除联系人失败:', err);
      setError('删除联系人失败，请重试');
      // 恢复原始状态
      setContacts(contacts);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * 添加钱包
   * @param {Object} wallet - 钱包对象
   */
  const addWallet = async (wallet, userId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 添加到本地状态
      const updatedWallets = [...wallets, wallet];
      setWallets(updatedWallets);
      
      // 如果有用户ID，同步到服务器
      if (userId) {
        await apiClient.updateUserConfig(userId, {
          contacts,
          wallets: updatedWallets
        });
      }
    } catch (err) {
      console.error('添加钱包失败:', err);
      setError('添加钱包失败，请重试');
      // 恢复原始状态
      setWallets(wallets);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * 更新钱包
   * @param {string} id - 钱包ID
   * @param {Object} updatedWallet - 更新后的钱包对象
   */
  const updateWallet = async (id, updatedWallet, userId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 更新本地状态
      const updatedWallets = wallets.map(wallet => 
        wallet.id === id ? { ...wallet, ...updatedWallet } : wallet
      );
      setWallets(updatedWallets);
      
      // 如果有用户ID，同步到服务器
      if (userId) {
        await apiClient.updateUserConfig(userId, {
          contacts,
          wallets: updatedWallets
        });
      }
    } catch (err) {
      console.error('更新钱包失败:', err);
      setError('更新钱包失败，请重试');
      // 恢复原始状态
      setWallets(wallets);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * 删除钱包
   * @param {string} id - 钱包ID
   */
  const deleteWallet = async (id, userId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 保存之前的状态以便恢复
      const previousWallets = [...wallets];
      
      // 更新本地状态
      const updatedWallets = wallets.filter(wallet => wallet.id !== id);
      setWallets(updatedWallets);
      
      // 如果有用户ID，同步到服务器
      if (userId) {
        await apiClient.updateUserConfig(userId, {
          contacts,
          wallets: updatedWallets
        });
      }
    } catch (err) {
      console.error('删除钱包失败:', err);
      setError('删除钱包失败，请重试');
      // 恢复原始状态
      setWallets(previousWallets);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 提供的上下文值
  const contextValue = {
    contacts,
    wallets,
    isLoading,
    error,
    loadUserConfig,
    addContact,
    updateContact,
    deleteContact,
    addWallet,
    updateWallet,
    deleteWallet
  };
  
  return (
    <UserConfigContext.Provider value={contextValue}>
      {children}
    </UserConfigContext.Provider>
  );
};

/**
 * 使用用户配置上下文的自定义hook
 */
export const useUserConfig = () => {
  const context = useContext(UserConfigContext);
  
  if (!context) {
    throw new Error('useUserConfig must be used within a UserConfigProvider');
  }
  
  return context;
};

export default UserConfigContext; 