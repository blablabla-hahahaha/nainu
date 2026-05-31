import { Routes, Route } from 'react-router-dom'
import { default as Layout } from "@/components/layout/layout";
import routes from "@/config/routes";
import { default as MessageProvider } from '@/components/message/message-provider';

const app_root_style = {
    width: '100vw',
    height: '100vh',
} as const

export default function App() {
    return (
        <MessageProvider>
            <div style={app_root_style}>
                <Routes>
                    <Route path="/" element={<Layout/>}>
                        {routes.map((route) => (
                            <Route
                                key={route.path}
                                path={route.path}
                                element={route.component}
                            />
                        ))}
                    </Route>
                </Routes>
            </div>
        </MessageProvider>
    );
}
