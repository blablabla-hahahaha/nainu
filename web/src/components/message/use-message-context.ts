import React, { useContext } from 'react';
import { message } from "antd";

/**
 * message_context hook 返回值类型。
 */
export interface message_context_type {
  message_api: ReturnType<typeof message.useMessage>[0];
}

/**
 * message 的 React Context 实例。
 */
export const message_context = React.createContext<message_context_type | null>(null);

/**
 * 获取 message 上下文的 Hook。
 */
export const useMessageContext = () => {
  const context = useContext(message_context);
  if (!context) throw new Error('useMessageContext must be used within message_provider');
  return context.message_api;
};
