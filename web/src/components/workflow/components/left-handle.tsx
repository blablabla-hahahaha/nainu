import { Handle as XYFlowHandle, type HandleProps } from '@xyflow/react';
import { theme } from "antd";
import { useState, type CSSProperties } from "react";
import styles from './status.module.css';

/**
 * 节点左侧连接点。
 */
export default function LeftHandle(props: HandleProps & { style?: CSSProperties }) {
    const { token } = theme.useToken();
    const [isHover, setIsHover] = useState(false);

    const { style: customStyle, ...handleProps } = props;

    return (
        <XYFlowHandle
            {...handleProps}
            className={styles['handle-host']}
            style={customStyle}
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
        >
            <div
                className={styles['handle-dot'] + ' ' + styles['handle-dot-left']}
                style={{
                    backgroundColor: token.colorPrimary,
                    transform: isHover ? 'scale(1.2)' : 'scale(1)',
                }}
            />
        </XYFlowHandle>
    );
}
