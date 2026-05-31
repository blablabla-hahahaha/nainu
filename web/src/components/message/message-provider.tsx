import { message } from 'antd';
import { message_context } from './use-message-context';

/**
 * MessageProvider 顶层 Provider。
 */
export default function MessageProvider({ children }: { children: React.ReactNode }) {
  const [message_api, context_holder] = message.useMessage();

  return (
    <message_context.Provider value={{ message_api }}>
      {context_holder}
      {children}
    </message_context.Provider>
  );
}
