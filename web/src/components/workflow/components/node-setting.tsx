import { useEffect, useState, type ReactNode } from "react";
import { Button, Flex, notification, theme, Tooltip } from "antd";
import { ApiOutlined, CloseOutlined, DeleteOutlined, PlayCircleOutlined } from "@ant-design/icons";
import type { ComponentType } from "react";
import { default as EditableText } from "@/components/editable-text/editable-text";
import { useWorkflowState, node_name } from "../graph";
import { default as InspectorCard } from "./inspector-card";

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
 * 各节点 Settings 面板卡片（复用 InspectorCard + 标题 + 校验 + 运行）。
 * 由页面右侧检查器渲染，与事件日志卡片并排、二者复用同一张卡片（视觉完全一致）。
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

    /**
     * 删除当前节点。设置面板里常驻 Monaco 编辑器（会抢占焦点，使 Delete/Backspace 落入编辑器），
     * 键盘删除对这类节点不可靠，故提供图标按钮作为确定性的删除入口。
     */
    const handle_delete = () => {
        dispatch({ type: 'graph/remove_node', nodeId });
        onClose();
    };

    return (
        <InspectorCard
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
                    <Tooltip title="删除节点">
                        <Button type="text" icon={<DeleteOutlined />} size="small" onClick={handle_delete} />
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
        </InspectorCard>
    );
}
