import {Divider, Popover, theme} from "antd";
import {CaretDownFilled, DoubleRightOutlined} from "@ant-design/icons";
import type { ReactNode, CSSProperties } from 'react';

function Item(props: { children: ReactNode }) {
    const { token } = theme.useToken();
    return (
        <div
            style={{
                width: '33.33%',
                color: token.colorTextSecondary,
                fontSize: '14px',
                cursor: 'pointer',
                lineHeight: '22px',
                marginBottom: '8px',
            } as CSSProperties}
        >
            {props.children}
            <DoubleRightOutlined
                style={{
                    marginInlineStart: 4,
                }}
            />
        </div>
    );
};

function List(props: { title: string; style?: CSSProperties }) {
    const { token } = theme.useToken();

    return (
        <div
            style={{
                width: '100%',
                ...props.style,
            }}
        >
            <div
                style={{
                    fontSize: 16,
                    color: token.colorTextHeading,
                    lineHeight: '24px',
                    fontWeight: 500,
                    marginBlockEnd: 16,
                }}
            >
                {props.title}
            </div>
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                }}
            >
                {new Array(6).fill(1).map((_, index) => {
                    return <Item key={index}>具体的解决方案-{index}</Item>;
                })}
            </div>
        </div>
    );
};

/**
 * 头部菜单下拉卡片组件。
 */
export default function HeaderMenuCard() {
    const { token } = theme.useToken();
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
            }}
        >
            <Divider
                style={{
                    height: '1.5em',
                }}
                orientation={'vertical'}
            />
            <Popover
                placement="bottom"
                styles={{
                    root: {
                        width: 'calc(100vw - 24px)',
                        padding: '24px',
                        paddingTop: 8,
                        height: '307px',
                        borderRadius: '0 0 6px 6px',
                    }
                }}
                content={
                    <div style={{ display: 'flex', padding: '32px 40px' }}>
                        <div style={{ flex: 1 }}>
                            <List title="金融解决方案" />
                            <List
                                title="其他解决方案"
                                style={{
                                    marginBlockStart: 32,
                                }}
                            />
                        </div>
                        <div
                            style={{
                                width: '308px',
                                borderInlineStart: '1px solid ' + token.colorBorder,
                                paddingInlineStart: 16,
                            }}
                        >
                            <div
                                style={{ fontSize: '14px', color: token.colorText, lineHeight: '22px' }}
                            >
                                热门产品
                            </div>
                            {new Array(3).fill(1).map((_name, index) => {
                                return (
                                    <div
                                        key={index}
                                        style={{ borderRadius: '4px', padding: '16px', marginTop: '4px', display: 'flex', cursor: 'pointer' }}
                                    >
                                        <img
                                            src="https://gw.alipayobjects.com/zos/antfincdn/6FTGmLLmN/bianzu%25252013.svg"
                                            alt=""
                                        />
                                        <div
                                            style={{
                                                marginInlineStart: 14,
                                            }}
                                        >
                                            <div
                                                style={{ fontSize: '14px', color: token.colorText, lineHeight: '22px' }}
                                            >
                                                Ant Design
                                            </div>
                                            <div
                                                style={{ fontSize: '12px', color: token.colorTextSecondary, lineHeight: '20px' }}
                                            >
                                                杭州市较知名的 UI 设计语言
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                }
            >
                <div
                    style={{
                        color: token.colorTextHeading,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        gap: 4,
                        paddingInlineStart: 8,
                        paddingInlineEnd: 12,
                        alignItems: 'center',
                    }}
                >
                    <span> 企业级资产中心</span>
                    <CaretDownFilled />
                </div>
            </Popover>
        </div>
    );
}
