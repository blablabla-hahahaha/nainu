const page_canvas_style = {
    position: 'absolute' as const,
    height: 'calc(100vh - 56px)',
    width: '100%',
    right: 0,
    top: 0,
} as const

/**
 * Demo 示例页（默认）。
 */
export default function DemoPage() {
    return (
        <div style={page_canvas_style}>
        </div>
    );
}
