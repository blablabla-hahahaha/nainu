import {
    ClockCircleOutlined,
    SyncOutlined,
    PauseCircleOutlined,
    CloseCircleFilled,
    CheckCircleFilled,
    CrownOutlined
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import type { node_status_type, node_status_style } from './types';

/**
 * Ant Design theme token 必要子集。
 */
export interface ant_design_token_ref {
    colorPrimary: string;
    colorSuccess: string;
    colorError: string;
    colorWarning: string;
    colorInfo: string;
    colorBgContainer: string;
    colorBgBase: string;
    colorBgLayout?: string;
    colorBorder: string;
    colorBorderSecondary?: string;
    colorText: string;
    colorTextSecondary?: string;
    colorTextQuaternary?: string;
}

type color_shade = {
    primary: string;
    border: string;
    background: string;
    text: string;
    boxShadow: string;
};

function derive_color_shade(base: string): color_shade {
    const upper = base.toUpperCase();
    return {
        primary: base,
        border: upper + '8C',
        background: upper + '15',
        text: upper + 'D5',
        boxShadow: upper + '8C',
    };
}

/**
 * 根据 token 生成所有节点状态颜色/边框/动画。
 */
export function create_node_status_styles(token: ant_design_token_ref): Record<node_status_type, node_status_style> {
    return {
        default: {
            label: '默认',
            color: {
                primary: token.colorText,
                border: token.colorBorder,
                background: token.colorBgContainer,
                text: token.colorText,
                boxShadow: token.colorBorder,
            },
            borderStyle: 'solid',
            borderWidth: 1,
            animation: 'none',
        },
        wait: {
            label: '待执行',
            color: derive_color_shade(token.colorWarning),
            icon: <ClockCircleOutlined />,
            borderStyle: 'solid',
            borderWidth: 1,
            animation: 'none',
        },
        runnable: {
            label: '执行中',
            color: derive_color_shade(token.colorPrimary),
            icon: <SyncOutlined spin />,
            borderStyle: 'solid',
            borderWidth: 1,
            animation: 'pulse',
        },
        suspended: {
            label: '已挂起',
            color: derive_color_shade(token.colorInfo),
            icon: <PauseCircleOutlined />,
            borderStyle: 'solid',
            borderWidth: 1,
            animation: 'none',
        },
        failed: {
            label: '执行失败',
            color: derive_color_shade(token.colorError),
            icon: <CloseCircleFilled />,
            borderStyle: 'solid',
            borderWidth: 1,
            animation: 'none',
        },
        success: {
            label: '执行成功',
            color: derive_color_shade(token.colorSuccess),
            icon: <CheckCircleFilled />,
            borderStyle: 'solid',
            borderWidth: 1,
            animation: 'none',
        },
        paused: {
            label: '已暂停',
            color: {
                primary: token.colorText,
                border: token.colorBorder,
                background: token.colorBgLayout || token.colorBgContainer,
                text: token.colorText,
                boxShadow: token.colorBorder,
            },
            icon: <PauseCircleOutlined />,
            borderStyle: 'solid',
            borderWidth: 1,
            animation: 'none',
        },
    };
}

/**
 * 起始/结束节点图标集合。
 */
export type node_status_icons = {
    start: ReactNode;
    end: ReactNode;
};

/**
 * 根据 token 生成起始/结束 CrownOutlined 图标。
 */
export function create_node_status_icons(token: ant_design_token_ref): node_status_icons {
    const icon_style = (bg: string): React.CSSProperties => ({
        background: bg,
        borderRadius: '6px',
        color: 'white',
        width: '22px',
        height: '22px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
    });

    return {
        start: <CrownOutlined style={icon_style(token.colorSuccess)} />,
        end: <CrownOutlined style={icon_style(token.colorPrimary)} />,
    };
}
