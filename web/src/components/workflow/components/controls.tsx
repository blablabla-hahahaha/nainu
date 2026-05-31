import {
    MiniMap,
    Panel, useReactFlow, useViewport
} from '@xyflow/react';
import {Button, Flex, theme} from "antd";
import {ZoomInOutlined, ZoomOutOutlined} from "@ant-design/icons";

/**
 * ReactFlow 画布左上角缩放控件。
 */
export default function Controls() {
    const { token } = theme.useToken();
    const { zoom } = useViewport();
    const { zoomIn, zoomOut } = useReactFlow();

    const icon_style = {
        fontSize: '18px',
        fontWeight: 'bold',
    }

    return (
        <>
            <MiniMap
                maskColor={token.colorFill}
                style={{ bottom: '55px' }}
            />
            <Panel position="bottom-right">
                <div
                    style={{
                        width: '200px',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: token.colorBorder,
                        borderRadius: token.borderRadius,
                        backgroundColor: token.colorBgBase,
                        padding: token.paddingXXS
                    }}
                >
                    <Flex gap="middle" justify="space-between" align="center">
                        <Button
                            type="text"
                            icon={<ZoomOutOutlined style={icon_style} />}
                            onClick={() => zoomOut()}
                        />
                        <div style={{ fontSize: '16px', fontWeight: 'bold'}}>
                            {Math.round(zoom * 100)}%
                        </div>
                        <Button
                            type="text"
                            icon={<ZoomInOutlined style={icon_style} />}
                            onClick={() => zoomIn()}
                        />
                    </Flex>
                </div>
            </Panel>
        </>
    );
}
