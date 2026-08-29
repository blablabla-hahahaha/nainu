import { useEffect, useState, type ReactNode } from "react";
import { Button, Card, Flex, notification, theme, Tooltip } from "antd";
import { ApiOutlined, CloseOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { Panel as XYFlowPanel } from "@xyflow/react";
import type { ComponentType } from "react";
import { default as EditableText } from "@/components/editable-text/editable-text";
import { useWorkflowState, node_name } from "../graph";

/**
 * onValidate 返回类型。
 */
export type validate_result = ReactNode | string | null;

/**
 * 各节点 Settings 面板通用 Props。
 */
export interface node_settings_props {
    nodeId: string;
    onClose: () => void;
    children?: ReactNode;
    onValidate?: () => validate_result;
}

/**
 * 节点类型 → 面板组件映射。
 */
export type node_setting_types = Record<string, ComponentType<node_settings_props> | undefined>;

/**
 * 各节点 Settings 面板容器（Card 标题 + 校验 + 运行）。
 */
export function NodeSetting({
    nodeId,
    onClose,
    children,
    onValidate,
}: node_settings_props) {
    const { token } = theme.useToken();
    const { state, dispatch } = useWorkflowState();
    const [label, setLabel] = useState('');

    useEffect(() => {
        const currentNode = state.graph.nodes.find(n => n.id === nodeId);
        setLabel(currentNode ? node_name(currentNode) : '');
    }, [nodeId, state.graph.nodes]);

    const handle_label_change = (newLabel: string) => {
        const currentNode = state.graph.nodes.find(n => n.id === nodeId);
        if (currentNode) {
            dispatch({
                type: 'graph/update_node',
                nodeId,
                config: { ...((currentNode.config ?? {}) as Record<string, unknown>), name: newLabel },
            });
        }
        setLabel(newLabel);
    };

    const handle_run = () => {
        if (!onValidate) {
            notification.info({ title: '此节点暂无可校验内容' });
            return;
        }
        const result = onValidate();
        if (result) {
            notification.error({ title: '节点配置有误', description: result });
            return;
        }
        notification.success({ title: '校验通过，开始运行节点' });
    };

    return (
        <XYFlowPanel
            position="top-right"
            style={{
                margin: '16px',
                width: '450px',
                height: 'calc(100% - 32px)',
                pointerEvents: 'auto',
            }}
        >
            <Card
                variant="borderless"
                styles={{
                    body: { padding: '20px', height: '100%', overflowY: 'auto' },
                    header: { borderBottom: 'none', padding: '0 20px' },
                }}
                style={{
                    height: '100%',
                    borderRadius: '12px',
                    boxShadow: `-4px 0 24px ${token.colorFillSecondary}`,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
                title={
                    <EditableText
                        value={label}
                        onChange={handle_label_change}
                        placeholder="未命名节点"
                    />
                }
                extra={
                    <Flex gap={6} align="center">
                        <Tooltip title="运行此节点">
                            <Button type="text" icon={<PlayCircleOutlined />} size="small" onClick={handle_run} />
                        </Tooltip>
                        <Tooltip title="节点文档">
                            <Button type="text" icon={<ApiOutlined />} size="small" />
                        </Tooltip>
                        <span style={{
                            width: 1,
                            height: 15,
                            background: token.colorBorderSecondary,
                            margin: '0 10px',
                            display: 'inline-block',
                            verticalAlign: 'middle',
                        }} />
                        <Button type="text" icon={<CloseOutlined />} onClick={onClose} size="small" />
                    </Flex>
                }
            >
                {children}
            </Card>
        </XYFlowPanel>
    );
}
