import { Handle as XYFlowHandle, type HandleProps } from '@xyflow/react';
import { Popover, theme } from "antd";
import { PlusOutlined } from '@ant-design/icons';
import { useState, type CSSProperties, type ReactNode } from "react";
import styles from './status.module.css';
/**
 * RightHandle Props（含 menuSlot）。
 */
export interface right_handle_props extends HandleProps {
    menuSlot?: (props: { sourceId: string; sourceHandleId?: string | null; onClose: () => void }) => ReactNode;
    nodeId: string;
    style?: CSSProperties;
}

/**
 * 节点右侧连接点（hover 放大 + 弹出菜单）。
 */
export default function RightHandle(props: right_handle_props) {
    const { token } = theme.useToken();
    const [isHover, setIsHover] = useState(false);
    const [isPopover, setIsPopover] = useState(false);

    const { nodeId, style: customStyle, menuSlot, ...handleProps } = props;

    return (
        <XYFlowHandle
            {...handleProps}
            className={styles['handle-host']}
            style={customStyle}
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
        >
            <div
                className={styles['handle-dot'] + ' ' + styles['handle-dot-right']}
                style={{
                    backgroundColor: token.colorPrimary,
                    transform: isHover ? 'scale(1.2)' : 'scale(1)',
                }}
            />
            <Popover
                styles={{container: {padding: '2px'}}}
                placement="right"
                content={menuSlot ? menuSlot({ sourceId: nodeId, sourceHandleId: handleProps.id, onClose: () => setIsPopover(false) }) : null}
                trigger="click"
                arrow={false}
                open={isPopover}
                onOpenChange={setIsPopover}
            >
                <PlusOutlined
                    className={styles['handle-plus']}
                    style={{
                        backgroundColor: token.colorPrimary,
                        color: token.colorBgBase,
                        transform: isHover ? 'scale(1.3)' : 'scale(1)',
                        opacity: isHover || isPopover ? 1 : 0,
                    }}
                    onClick={(e) => e.stopPropagation()}
                />
            </Popover>
        </XYFlowHandle>
    );
}
