import { useMemo, useEffect } from 'react';
import { Button, Flex, Form } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useNodes, useEdges } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { NodeFieldItem } from './node-field-item';
import { node_field_definition_support, ensure_ids } from './node-field';
import type { internal_ref_option, node_input_field_definition } from './node-field';

/**
 * node_input_fields Props：接收 Form.List 的 name。
 */
export interface node_input_fields_props {
    name: string | number | (string | number)[];
}

/**
 * 从当前节点逆向遍历，收集所有上游节点的输出字段。
 */
function compute_upstream_outputs(
    nodeId: string,
    nodes: Node[],
    edges: Edge[],
): internal_ref_option[] {
    const reverse_adj = new Map<string, string[]>();
    for (const edge of edges) {
        const sources = reverse_adj.get(edge.target) ?? [];
        sources.push(edge.source);
        reverse_adj.set(edge.target, sources);
    }

    const visited = new Set<string>();
    const queue = [nodeId];
    const upstream_node_ids: string[] = [];

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) break;
        const sources = reverse_adj.get(current) ?? [];
        for (const src of sources) {
            if (!visited.has(src)) {
                visited.add(src);
                queue.push(src);
                upstream_node_ids.push(src);
            }
        }
    }

    const node_map = new Map(nodes.map(n => [n.id, n]));
    const result: internal_ref_option[] = [];

    for (const upstream_id of upstream_node_ids) {
        const upstream_node = node_map.get(upstream_id);
        if (!upstream_node) continue;

        const data = (upstream_node.data ?? {}) as Record<string, unknown>;
        const outputs_raw = data.outputs as unknown[] | undefined;
        if (!Array.isArray(outputs_raw)) continue;

        const node_label = (data.label as string) || upstream_id;

        for (const raw of outputs_raw) {
            const output = raw as Record<string, unknown>;
            const alias = (output.alias as string) ?? '';
            const id = (output.id as string) ?? '';
            if (!id.trim()) continue;

            result.push({
                label: `${node_label} → ${alias}`,
                value: `${upstream_id}::${id}`,
            });
        }
    }

    return result;
}

/**
 * Form.List 封装的输入字段列表（三列 alias + type + value）。
 * 自动计算上游节点输出字段供 INTERNAL_REF 使用。
 */
export function NodeInputFields({ name }: node_input_fields_props) {
    const form = Form.useFormInstance();
    const nodes = useNodes();
    const edges = useEdges();

    const currentNode = nodes.find(n => n.selected);

    const internal_ref_options = useMemo(
        () => currentNode ? compute_upstream_outputs(currentNode.id, nodes, edges) : [],
        [currentNode, nodes, edges],
    );

    useEffect(() => {
        if (!form) return;
        const inputs = form.getFieldValue(name) as node_input_field_definition[] | undefined;
        if (!inputs) return;

        const { changed, result } = ensure_ids(inputs);
        if (changed) {
            form.setFieldsValue({ [String(name)]: result });
        }
    }, [form, name]);

    return (
        <Form.List name={name}>
            {(fields, { add, remove }) => (
                <>
                    {fields.map(({ key, name: field_name }) => (
                        <Flex key={key} gap={6} align="flex-start">
                            <NodeFieldItem
                                name={[field_name]}
                                style={{ marginBottom: 6 }}
                                help=""
                                internal_ref_options={internal_ref_options}
                            />
                            <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => remove(field_name)}
                            />
                        </Flex>
                    ))}
                    <Button
                        block
                        icon={<PlusOutlined />}
                        style={{ marginTop: 6 }}
                        onClick={() => add(node_field_definition_support.getDefaultDefinition())}
                    >
                        添加输入字段
                    </Button>
                </>
            )}
        </Form.List>
    );
}
