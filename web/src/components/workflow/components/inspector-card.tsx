import type { ReactNode } from 'react';
import { Card } from 'antd';

interface inspector_card_props {
    title: ReactNode;
    extra?: ReactNode;
    /** 卡片主体内容。 */
    children: ReactNode;
    /** 主体内边距（px）；节点配置用 20，列表/日志密集场景可调小。 */
    bodyPadding?: number;
}

/**
 * 右侧检查器卡片外壳：即「节点配置」卡片本身（borderless + 圆角 12px + 可滚动主体）。
 * 节点配置、事件日志、执行记录三处复用同一卡片，保证视觉与行为完全一致。
 * 不设 boxShadow：dock 后卡片投影会在四周/下方形成「蒙版」式灰影，故去掉以保持干净。
 * body 用 flex:1 在纵向 flex 卡片内撑满头部以下空间并滚动（避免 height:100% 与头部叠加导致的裁切）。
 */
export default function InspectorCard({ title, extra, children, bodyPadding = 20 }: inspector_card_props) {
    return (
        <Card
            variant="borderless"
            styles={{
                body: { padding: bodyPadding, flex: 1, overflowY: 'auto', minHeight: 0 },
                header: { borderBottom: 'none', padding: '0 20px' },
            }}
            style={{
                width: '100%',
                height: '100%',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
            title={title}
            extra={extra}
        >
            {children}
        </Card>
    );
}
