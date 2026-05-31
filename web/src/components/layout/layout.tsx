import {
    GithubFilled,
    InfoCircleFilled,
    LogoutOutlined,
    QuestionCircleFilled,
} from '@ant-design/icons';
import {
    ProConfigProvider,
    ProLayout,
    type ProSettings
} from '@ant-design/pro-components';
import {
    ConfigProvider,
    Dropdown,
} from 'antd';
import { useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import defaultProps from './default-props';
import { default as HeaderMenuCard } from "./header-menu-card";

/**
 * 全局布局容器（ProLayout）。
 */
export default function Layout() {
    const [settings] = useState<Partial<ProSettings> | undefined>({
        fixSiderbar: true,
        layout: 'mix',
        splitMenus: true,
    });

    const location = useLocation();
    const navigate = useNavigate();

    const [pathname, setPathname] = useState(location.pathname);
    if (typeof document === 'undefined') {
        return <div />;
    }

    return (
        <div
            id="nainu-pro-layout"
            style={{
                height: '100vh',
                overflow: 'auto',
            }}
        >
            <ProConfigProvider hashed={false}>
                <ConfigProvider
                    getTargetContainer={() => {
                        return document.getElementById('nainu-pro-layout') || document.body;
                    }}
                >
                    <ProLayout
                        prefixCls="nainu-layout-prefix"
                        {...defaultProps}
                        location={{
                            pathname,
                        }}
                        token={{
                            header: {
                                colorBgMenuItemSelected: 'rgba(0,0,0,0.04)',
                            },
                        }}
                        siderMenuType="group"
                        menu={{
                            collapsedShowGroupTitle: true,
                        }}
                        avatarProps={{
                            src: 'https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg',
                            size: 'small',
                            title: '七妮妮',
                            render: (_props, dom) => {
                                return (
                                    <Dropdown
                                        menu={{
                                            items: [
                                                {
                                                    key: 'logout',
                                                    icon: <LogoutOutlined />,
                                                    label: '退出登录',
                                                },
                                            ],
                                        }}
                                    >
                                        {dom}
                                    </Dropdown>
                                );
                            },
                        }}
                        actionsRender={(props) => {
                            if (props.isMobile) return [];
                            if (typeof window === 'undefined') return [];
                            return [
                                <InfoCircleFilled key="InfoCircleFilled" />,
                                <QuestionCircleFilled key="QuestionCircleFilled" />,
                                <GithubFilled key="GithubFilled" />,
                            ];
                        }}
                        headerTitleRender={(logo, title, props) => {
                            const default_dom = (
                                <a>
                                    {logo}
                                    {title}
                                </a>
                            );
                            if (typeof window === 'undefined') return default_dom;
                            if (document.body.clientWidth < 1400) {
                                return default_dom;
                            }
                            if (props.isMobile) return default_dom;
                            return (
                                <>
                                    {default_dom}
                                    <HeaderMenuCard />
                                </>
                            );
                        }}
                        menuFooterRender={(props) => {
                            if (props?.collapsed) return undefined;
                            return (
                                <div
                                    style={{
                                        textAlign: 'center',
                                        paddingBlockStart: 12,
                                    }}
                                >
                                    <div>© 2021 Made with love</div>
                                    <div>by Ant Design</div>
                                </div>
                            );
                        }}
                        menuItemRender={(item, dom) => (
                            <div
                                onClick={() => {
                                    setPathname(item.path || '/welcome');
                                    navigate(item.path || '/welcome');
                                }}
                            >
                                {dom}
                            </div>
                        )}
                        {...settings}
                    >
                        <Outlet />
                    </ProLayout>
                </ConfigProvider>
            </ProConfigProvider>
        </div>
    );
}
