/**
 * 一条聊天消息。
 */
export interface chat_message {
    id: string;
    conversationId: string;
    content: string;
    reasoning?: string;
    roleType: 'USER' | 'ASSISTANT' | 'SYSTEM';
    createdAt?: string
}

/**
 * 会话基本信息。
 */
export interface conversation_info {
    id?: string;
    title: string;
    description?: string
    createdAt?: string;
    config: conversation_config
}

/**
 * 会话运行配置（模型 / 轮次 / 工具等）。
 */
export interface conversation_config {
    modelName?: string;
    systemPrompt?: string;
    maxToken: number;
    recentConversationRounds: number;
    disableMultiTurn?: boolean;
    conversationTools?: [string];
}

const api_base_url = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
/**
 * 流式聊天接口 URL。
 */
export const api_stream_url = `${api_base_url}/ai/stream_chat`;

/**
 * 拉取某会话消息列表。
 */
export async function list_message(conversationId: string, current: number, size: number): Promise<chat_message[]> {
    const response = await fetch(`${api_base_url}/ai/list_message?conversationId=${conversationId}&current=${current}&size=${size}`, {
        method: 'GET'
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
}

/**
 * 新建/更新会话。
 */
export async function save_conversation(config: conversation_info): Promise<conversation_info> {
    const response = await fetch(`${api_base_url}/ai/save_conversation`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

/**
 * 删除会话。
 */
export async function delete_conversation(id: string): Promise<void> {
    const response = await fetch(`${api_base_url}/ai/delete_conversation?id=${id}`, {
        method: 'DELETE'
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
}

/**
 * 清空会话消息。
 */
export async function clear_conversation(id: string): Promise<void> {
    const response = await fetch(`${api_base_url}/ai/clear_conversation?id=${id}`, {
        method: 'DELETE'
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
}

/**
 * 拉取全部会话列表。
 */
export async function list_conversation(): Promise<conversation_info[]> {
    const response = await fetch(`${api_base_url}/ai/list_conversation`, {
        method: 'GET'
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
}
