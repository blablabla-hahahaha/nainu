import {
    SmileFilled,
    BranchesOutlined,
} from '@ant-design/icons';
import { default as Demo } from '@/pages/demo/demo-page'
import { default as WorkflowPage } from '@/pages/workflow/workflow-page'

/**
 * 路由配置数组。
 */
export default [
    {
        path: '/welcome',
        name: '欢迎',
        icon: <SmileFilled />,
        component: <Demo />,
    },
    {
        path: '/workflow',
        name: '工作流',
        icon: <BranchesOutlined />,
        component: <WorkflowPage />,
    }
]
